#include "robotics/network/CommandRouter.hpp"

#include <mutex>
#include <stdexcept>
#include <utility>

namespace robotics::network {

void CommandRouter::registerCommand(std::string name, Handler handler) {
    if (name.empty() || !handler) {
        throw std::invalid_argument("Command name and handler are required");
    }
    std::unique_lock lock(mutex_);
    if (!handlers_.emplace(std::move(name), std::move(handler)).second) {
        throw std::invalid_argument("Command is already registered");
    }
}

nlohmann::json CommandRouter::route(const nlohmann::json& message) const {
    if (!message.is_object() || message.value("type", std::string{}) != "command") {
        return {{"type", "command_result"}, {"ok", false}, {"error", "Expected a command message"}};
    }
    const auto name = message.value("command", std::string{});
    if (name.empty()) {
        return {{"type", "command_result"}, {"ok", false}, {"error", "Command name is required"}};
    }

    Handler handler;
    {
        std::shared_lock lock(mutex_);
        const auto found = handlers_.find(name);
        if (found == handlers_.end()) {
            return {{"type", "command_result"}, {"ok", false},
                    {"command", name}, {"error", "Unknown command"}};
        }
        handler = found->second;
    }

    try {
        const auto arguments = message.value("arguments", nlohmann::json::object());
        if (!arguments.is_object()) {
            return {{"type", "command_result"}, {"ok", false},
                    {"command", name}, {"error", "Command arguments must be a JSON object"}};
        }
        return {{"type", "command_result"}, {"ok", true}, {"command", name},
                {"result", handler(arguments)}};
    } catch (const std::exception& error) {
        return {{"type", "command_result"}, {"ok", false},
                {"command", name}, {"error", error.what()}};
    } catch (...) {
        return {{"type", "command_result"}, {"ok", false},
                {"command", name}, {"error", "Command handler failed with an unknown error"}};
    }
}

} // namespace robotics::network
