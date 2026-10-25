#include "robotics/network/WebSocketServer.hpp"

#include <algorithm>
#include <array>
#include <chrono>
#include <stdexcept>
#include <string_view>
#include <utility>
#include <vector>

namespace robotics::network {
namespace {

constexpr std::string_view discoveryRequest{"RAAYBOTS_DISCOVER_V1"};
constexpr auto telemetryTimeout = std::chrono::milliseconds{500};

std::string decodeUriComponent(const std::string& value) {
    const auto hexValue = [](char character) -> int {
        if (character >= '0' && character <= '9') return character - '0';
        if (character >= 'A' && character <= 'F') return character - 'A' + 10;
        if (character >= 'a' && character <= 'f') return character - 'a' + 10;
        return -1;
    };
    std::string decoded;
    decoded.reserve(value.size());
    for (std::size_t index = 0; index < value.size(); ++index) {
        if (value[index] != '%') {
            decoded.push_back(value[index]);
            continue;
        }
        if (index + 2 >= value.size()) {
            throw std::invalid_argument("Malformed percent-encoding in API path");
        }
        const auto high = hexValue(value[index + 1]);
        const auto low = hexValue(value[index + 2]);
        if (high < 0 || low < 0) {
            throw std::invalid_argument("Malformed percent-encoding in API path");
        }
        decoded.push_back(static_cast<char>((high << 4) | low));
        index += 2;
    }
    return decoded;
}

} // namespace

WebSocketServer::WebSocketServer(telemetry::TelemetryRegistry& telemetry,
                                 logging::StructuredLogger& logger,
                                 dashboard::DashboardRegistry& dashboards,
                                 CommandRouter& commands,
                                 std::string address,
                                 std::uint16_t port,
                                 std::uint16_t discoveryPort,
                                 std::chrono::milliseconds streamInterval)
    : telemetry_(telemetry), logger_(logger), dashboards_(dashboards), commands_(commands),
      address_(std::move(address)),
      port_(port), discoveryPort_(discoveryPort), streamInterval_(streamInterval) {
    if (address_.empty() || port_ == 0 || discoveryPort_ == 0 || discoveryPort_ == port_ ||
        streamInterval_ <= std::chrono::milliseconds::zero()) {
        throw std::invalid_argument("WebSocket address, ports, and stream interval must be valid");
    }
    server_.clear_access_channels(websocketpp::log::alevel::all);
    server_.init_asio();
    server_.set_reuse_addr(true);
    server_.set_max_message_size(1024 * 1024);
    server_.set_open_handler([this](ConnectionHandle handle) { onOpen(handle); });
    server_.set_close_handler([this](ConnectionHandle handle) { onClose(handle); });
    server_.set_http_handler([this](ConnectionHandle handle) { onHttp(handle); });
    server_.set_message_handler(
        [this](ConnectionHandle handle, Server::message_ptr message) { onMessage(handle, std::move(message)); });
}

WebSocketServer::~WebSocketServer() {
    stop();
}

void WebSocketServer::start() {
    bool expected = false;
    if (!running_.compare_exchange_strong(expected, true)) {
        throw std::logic_error("WebSocket server is already running");
    }
    try {
        const auto address = websocketpp::lib::asio::ip::address::from_string(address_);
        const websocketpp::lib::asio::ip::tcp::endpoint endpoint(address, port_);
        server_.listen(endpoint);
        server_.start_accept();
        serverThread_ = std::jthread([this](std::stop_token) {
            try {
                server_.run();
            } catch (const std::exception& error) {
                running_.store(false);
                logger_.log(logging::LogLevel::Error,
                            std::string("WebSocket server stopped unexpectedly: ") + error.what());
            }
        });
        broadcasterThread_ = std::jthread([this](std::stop_token stopToken) { broadcastLoop(stopToken); });
        discoveryThread_ = std::jthread(
            [this](std::stop_token stopToken) { discoveryLoop(stopToken); });
        logger_.log(logging::LogLevel::Info,
                    "WebSocket server listening on " + address_ + ':' + std::to_string(port_));
    } catch (...) {
        running_.store(false);
        server_.stop();
        throw;
    }
}

void WebSocketServer::stop() {
    if (!running_.exchange(false)) {
        return;
    }
    broadcasterThread_.request_stop();
    discoveryThread_.request_stop();
    if (discoveryThread_.joinable()) {
        discoveryThread_.join();
    }
    if (broadcasterThread_.joinable()) {
        broadcasterThread_.join();
    }
    server_.stop_listening();
    server_.stop();
    serverThread_.request_stop();
    if (serverThread_.joinable()) {
        serverThread_.join();
    }
}

bool WebSocketServer::isRunning() const noexcept {
    return running_.load();
}

void WebSocketServer::onOpen(ConnectionHandle handle) {
    bool telemetrySourceConnected = false;
    {
        std::lock_guard lock(clientsMutex_);
        clients_.insert(handle);
        telemetrySourceConnected = !telemetryPublishers_.empty();
    }
    logger_.log(logging::LogLevel::Info, "WebSocket client connected");
    send(handle, {{"type", "connected"}, {"message", "Telemetry stream ready"}});
    send(handle, {{"type", "robot_status"}, {"connected", telemetrySourceConnected}});
}

void WebSocketServer::onClose(ConnectionHandle handle) {
    bool publisherDisconnected = false;
    std::vector<ConnectionHandle> clients;
    {
        std::lock_guard lock(clientsMutex_);
        clients_.erase(handle);
        publisherDisconnected = telemetryPublishers_.erase(handle) != 0 &&
                                telemetryPublishers_.empty();
        if (publisherDisconnected) {
            telemetry_.clearValues();
            clients.assign(clients_.begin(), clients_.end());
        }
    }
    logger_.log(logging::LogLevel::Info, "WebSocket client disconnected");
    if (publisherDisconnected) {
        logger_.log(logging::LogLevel::Info, "Robot telemetry source disconnected");
        const auto emptyTelemetry =
            nlohmann::json{{"type", "telemetry"}, {"data", nlohmann::json::object()}};
        const nlohmann::json status{{"type", "robot_status"}, {"connected", false}};
        for (const auto& client : clients) {
            send(client, emptyTelemetry);
            send(client, status);
        }
    }
}

void WebSocketServer::onHttp(ConnectionHandle handle) {
    const auto connection = server_.get_con_from_hdl(handle);
    const auto& request = connection->get_request();
    const auto method = request.get_method();
    const auto& requestResource = connection->get_resource();
    const auto queryOffset = requestResource.find('?');
    const auto resource = requestResource.substr(0, queryOffset);
    auto status = websocketpp::http::status_code::ok;
    nlohmann::json response;

    try {
        if (method == "OPTIONS") {
            status = websocketpp::http::status_code::no_content;
        } else if (method != "GET") {
            status = websocketpp::http::status_code::method_not_allowed;
            response = {{"error", "Only GET requests are supported"}};
        } else if (resource == "/api/telemetry") {
            response = telemetry_.snapshot();
        } else if (resource == "/api/logs") {
            nlohmann::json records = nlohmann::json::array();
            for (const auto& record : logger_.recent(1000)) {
                records.push_back(record.toJson());
            }
            response = std::move(records);
        } else if (resource.starts_with("/api/history/")) {
            const auto path = resource.substr(std::string("/api/history/").size());
            nlohmann::json samples = nlohmann::json::array();
            for (const auto& sample : telemetry_.getHistory(path)) {
                samples.push_back({{"timestamp", sample.timestamp},
                                   {"value", core::toJson(sample.value)}});
            }
            response = {{"path", path}, {"samples", std::move(samples)}};
        } else if (resource == "/api/dashboards") {
            response = {{"dashboards", dashboards_.names()}};
        } else if (resource.starts_with("/api/dashboards/")) {
            const auto name = decodeUriComponent(
                resource.substr(std::string("/api/dashboards/").size()));
            response = dashboards_.get(name);
        } else {
            status = websocketpp::http::status_code::not_found;
            response = {{"error", "API route not found"}};
        }
    } catch (const std::invalid_argument& error) {
        status = websocketpp::http::status_code::bad_request;
        response = {{"error", error.what()}};
    } catch (const std::out_of_range& error) {
        status = websocketpp::http::status_code::not_found;
        response = {{"error", error.what()}};
    } catch (const std::exception& error) {
        status = websocketpp::http::status_code::internal_server_error;
        response = {{"error", "Internal API error"}};
        logger_.log(logging::LogLevel::Error, std::string("HTTP API request failed: ") + error.what());
    }

    connection->set_status(status);
    connection->append_header("Content-Type", "application/json; charset=utf-8");
    connection->append_header("Cache-Control", "no-store");
    connection->append_header("Access-Control-Allow-Origin", "*");
    connection->append_header("Access-Control-Allow-Methods", "GET, OPTIONS, POST");
    connection->append_header("Access-Control-Allow-Headers", "Content-Type");
    connection->set_body(response.dump());
}

void WebSocketServer::onMessage(ConnectionHandle handle, Server::message_ptr message) {
    try {
        const auto request = nlohmann::json::parse(message->get_payload());
        const auto type = request.value("type", std::string{});
        if (type == "command") {
            send(handle, commands_.route(request));
        } else if (type == "logs") {
            const auto limit = request.value("limit", std::size_t{100});
            nlohmann::json records = nlohmann::json::array();
            for (const auto& record : logger_.recent(std::min(limit, std::size_t{1000}))) {
                records.push_back(record.toJson());
            }
            send(handle, {{"type", "logs"}, {"data", std::move(records)}});
        } else if (type == "heartbeat") {
            {
                std::lock_guard lock(clientsMutex_);
                const auto publisher = telemetryPublishers_.find(handle);
                if (publisher != telemetryPublishers_.end()) {
                    publisher->second = std::chrono::steady_clock::now();
                }
            }
            send(handle, {{"type", "heartbeat"}, {"timestamp", core::unixTimestampMilliseconds()}});
        } else if (type == "telemetry_update") {
            if (!request.contains("data")) {
                throw std::invalid_argument("Telemetry update is missing its data object");
            }
            bool newPublisher = false;
            {
                std::lock_guard lock(clientsMutex_);
                telemetry_.updateFromJson(request.at("data"));
                newPublisher = telemetryPublishers_
                    .try_emplace(handle, std::chrono::steady_clock::now()).second;
                if (!newPublisher) {
                    telemetryPublishers_.at(handle) = std::chrono::steady_clock::now();
                }
            }
            if (newPublisher) {
                logger_.log(logging::LogLevel::Info, "Robot telemetry source connected");
                std::vector<ConnectionHandle> clients;
                {
                    std::lock_guard lock(clientsMutex_);
                    clients.assign(clients_.begin(), clients_.end());
                }
                const nlohmann::json status{{"type", "robot_status"}, {"connected", true}};
                for (const auto& client : clients) {
                    send(client, status);
                }
            }
            send(handle, {{"type", "telemetry_update_ack"}, {"ok", true}});
        } else {
            send(handle, {{"type", "error"}, {"error", "Unsupported message type"}});
        }
    } catch (const std::exception& error) {
        send(handle, {{"type", "error"}, {"error", std::string("Invalid JSON message: ") + error.what()}});
    }
}

void WebSocketServer::discoveryLoop(std::stop_token stopToken) {
    using Udp = websocketpp::lib::asio::ip::udp;
    websocketpp::lib::asio::io_context context;
    Udp::socket socket(context);
    websocketpp::lib::error_code error;

    socket.open(Udp::v4(), error);
    if (error) {
        logger_.log(logging::LogLevel::Error, "Unable to open telemetry discovery socket: " +
                                              error.message());
        return;
    }
    socket.set_option(websocketpp::lib::asio::socket_base::reuse_address(true), error);
    if (error) {
        logger_.log(logging::LogLevel::Error, "Unable to configure telemetry discovery socket: " +
                                              error.message());
        return;
    }
    socket.bind(Udp::endpoint(Udp::v4(), discoveryPort_), error);
    if (error) {
        logger_.log(logging::LogLevel::Error, "Unable to bind telemetry discovery port " +
                                              std::to_string(discoveryPort_) + ": " + error.message());
        return;
    }
    socket.non_blocking(true, error);
    if (error) {
        logger_.log(logging::LogLevel::Error, "Unable to configure telemetry discovery socket: " +
                                              error.message());
        return;
    }
    logger_.log(logging::LogLevel::Info, "Robot discovery listening on UDP port " +
                                         std::to_string(discoveryPort_));

    std::array<char, 256> buffer{};
    while (!stopToken.stop_requested()) {
        Udp::endpoint remote;
        const auto received = socket.receive_from(
            websocketpp::lib::asio::buffer(buffer), remote, 0, error);
        if (!error) {
            const std::string_view request(buffer.data(), received);
            if (request == discoveryRequest) {
                const nlohmann::json response{
                    {"service", "raaybots-telemetry"},
                    {"protocol", 1},
                    {"websocket_port", port_},
                    {"websocket_path", "/socket"}
                };
                const auto payload = response.dump();
                socket.send_to(websocketpp::lib::asio::buffer(payload), remote, 0, error);
                if (error) {
                    logger_.log(logging::LogLevel::Warning,
                                "Unable to reply to robot discovery request: " + error.message());
                }
            }
        } else if (error != websocketpp::lib::asio::error::would_block &&
                   error != websocketpp::lib::asio::error::try_again) {
            if (!stopToken.stop_requested()) {
                logger_.log(logging::LogLevel::Error,
                            "Robot discovery listener failed: " + error.message());
            }
            return;
        }
        error.clear();
        std::this_thread::sleep_for(std::chrono::milliseconds{20});
    }
}

void WebSocketServer::broadcastLoop(std::stop_token stopToken) {
    auto nextHeartbeat = std::chrono::steady_clock::now() + std::chrono::seconds{10};
    while (!stopToken.stop_requested()) {
        try {
            std::vector<ConnectionHandle> clients;
            bool publisherDisconnected = false;
            bool noPublishersRemaining = false;
            {
                std::lock_guard lock(clientsMutex_);
                const auto now = std::chrono::steady_clock::now();
                for (auto publisher = telemetryPublishers_.begin();
                     publisher != telemetryPublishers_.end();) {
                    if (now - publisher->second >= telemetryTimeout) {
                        publisher = telemetryPublishers_.erase(publisher);
                        publisherDisconnected = true;
                    } else {
                        ++publisher;
                    }
                }
                if (publisherDisconnected && telemetryPublishers_.empty()) {
                    telemetry_.clearValues();
                    noPublishersRemaining = true;
                }
                clients.assign(clients_.begin(), clients_.end());
            }
            if (noPublishersRemaining) {
                logger_.log(logging::LogLevel::Info,
                            "Robot telemetry source timed out after 500 ms without a frame or heartbeat");
                const nlohmann::json emptyTelemetry{
                    {"type", "telemetry"}, {"data", nlohmann::json::object()}};
                const nlohmann::json status{{"type", "robot_status"}, {"connected", false}};
                for (const auto& client : clients) {
                    send(client, emptyTelemetry);
                    send(client, status);
                }
            }
            if (!clients.empty()) {
                const auto snapshot = telemetry_.snapshot();
                const nlohmann::json update{{"type", "telemetry"}, {"data", snapshot}};
                const auto now = std::chrono::steady_clock::now();
                const auto newLogs = logger_.after(lastLogSequence_);
                for (const auto& record : newLogs) {
                    const nlohmann::json logMessage{{"type", "log"}, {"data", record.toJson()}};
                    for (const auto& client : clients) {
                        send(client, logMessage);
                    }
                    lastLogSequence_ = std::max(lastLogSequence_, record.sequence);
                }
                for (const auto& client : clients) {
                    send(client, update);
                    if (now >= nextHeartbeat) {
                        try {
                            server_.ping(client, "telemetry-heartbeat");
                        } catch (const websocketpp::exception&) {
                            // The client may have disconnected after the broadcast list was copied.
                        }
                    }
                }
                if (now >= nextHeartbeat) {
                    nextHeartbeat = now + std::chrono::seconds{10};
                }
            }
        } catch (const std::exception& error) {
            logger_.log(logging::LogLevel::Error,
                        std::string("Telemetry broadcast failed: ") + error.what());
        }
        std::this_thread::sleep_for(streamInterval_);
    }
}

void WebSocketServer::send(ConnectionHandle handle, const nlohmann::json& message) {
    try {
        server_.send(handle, message.dump(), websocketpp::frame::opcode::text);
    } catch (const std::exception& error) {
        logger_.log(logging::LogLevel::Warning, std::string("WebSocket send failed: ") + error.what());
    }
}

} // namespace robotics::network
