#pragma once

#include "robotics/logging/StructuredLogger.hpp"
#include "robotics/network/CommandRouter.hpp"
#include "robotics/dashboard/DashboardRegistry.hpp"
#include "robotics/telemetry/TelemetryRegistry.hpp"

#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

#include <atomic>
#include <chrono>
#include <map>
#include <mutex>
#include <set>
#include <string>
#include <thread>

namespace robotics::network {

class WebSocketServer {
public:
    WebSocketServer(telemetry::TelemetryRegistry& telemetry,
                    logging::StructuredLogger& logger,
                    dashboard::DashboardRegistry& dashboards,
                    CommandRouter& commands,
                    std::string address,
                    std::uint16_t port,
                    std::uint16_t discoveryPort,
                    std::chrono::milliseconds streamInterval);
    ~WebSocketServer();

    WebSocketServer(const WebSocketServer&) = delete;
    WebSocketServer& operator=(const WebSocketServer&) = delete;

    void start();
    void stop();
    [[nodiscard]] bool isRunning() const noexcept;

private:
    using Server = websocketpp::server<websocketpp::config::asio>;
    using ConnectionHandle = websocketpp::connection_hdl;

    void onOpen(ConnectionHandle handle);
    void onClose(ConnectionHandle handle);
    void onHttp(ConnectionHandle handle);
    void onMessage(ConnectionHandle handle, Server::message_ptr message);
    void discoveryLoop(std::stop_token stopToken);
    void broadcastLoop(std::stop_token stopToken);
    void send(ConnectionHandle handle, const nlohmann::json& message);

    telemetry::TelemetryRegistry& telemetry_;
    logging::StructuredLogger& logger_;
    dashboard::DashboardRegistry& dashboards_;
    CommandRouter& commands_;
    const std::string address_;
    const std::uint16_t port_;
    const std::uint16_t discoveryPort_;
    const std::chrono::milliseconds streamInterval_;
    Server server_;
    mutable std::mutex clientsMutex_;
    std::set<ConnectionHandle, std::owner_less<ConnectionHandle>> clients_;
    std::map<ConnectionHandle, std::chrono::steady_clock::time_point,
             std::owner_less<ConnectionHandle>> telemetryPublishers_;
    std::jthread serverThread_;
    std::jthread broadcasterThread_;
    std::jthread discoveryThread_;
    std::atomic<bool> running_{false};
    std::uint64_t lastLogSequence_{0};
};

} // namespace robotics::network
