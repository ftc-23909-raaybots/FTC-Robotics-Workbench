#pragma once

#include <nlohmann/json.hpp>

#include <functional>
#include <shared_mutex>
#include <string>
#include <unordered_map>

namespace robotics::network {

class CommandRouter {
public:
    using Handler = std::function<nlohmann::json(const nlohmann::json&)>;

    void registerCommand(std::string name, Handler handler);
    [[nodiscard]] nlohmann::json route(const nlohmann::json& message) const;

private:
    mutable std::shared_mutex mutex_;
    std::unordered_map<std::string, Handler> handlers_;
};

} // namespace robotics::network
