#include "robotics/config/AppConfig.hpp"

#include <nlohmann/json.hpp>

#include <fstream>
#include <stdexcept>

namespace robotics::config {

AppConfig AppConfig::load(const std::filesystem::path& file) {
    std::ifstream input(file, std::ios::binary);
    if (!input) {
        throw std::runtime_error("Unable to open configuration file: " + file.string());
    }
    const auto json = nlohmann::json::parse(input);
    if (!json.is_object()) {
        throw std::invalid_argument("Configuration root must be a JSON object");
    }

    AppConfig config;
    config.bindAddress = json.value("bind_address", config.bindAddress);
    const auto portValue = json.value("port", static_cast<unsigned int>(config.port));
    if (portValue > 65535) {
        throw std::invalid_argument("Configuration port must be between 1 and 65535");
    }
    config.port = static_cast<unsigned short>(portValue);
    const auto discoveryPortValue = json.value(
        "discovery_port", static_cast<unsigned int>(config.discoveryPort));
    if (discoveryPortValue > 65535) {
        throw std::invalid_argument("Configuration discovery_port must be between 1 and 65535");
    }
    config.discoveryPort = static_cast<unsigned short>(discoveryPortValue);
    config.historySize = json.value("history_size", config.historySize);
    config.streamRateHz = json.value("stream_rate_hz", config.streamRateHz);
    config.measurementDirectory = json.value("measurement_directory", config.measurementDirectory.string());
    config.dashboardDirectory = json.value("dashboard_directory", config.dashboardDirectory.string());
    config.validate();
    return config;
}

void AppConfig::validate() const {
    if (bindAddress.empty()) {
        throw std::invalid_argument("bind_address cannot be empty");
    }
    if (port == 0) {
        throw std::invalid_argument("port must be between 1 and 65535");
    }
    if (discoveryPort == 0 || discoveryPort == port) {
        throw std::invalid_argument("discovery_port must be between 1 and 65535 and differ from port");
    }
    if (streamRateHz == 0 || streamRateHz > 1000) {
        throw std::invalid_argument("stream_rate_hz must be between 1 and 1000");
    }
    if (measurementDirectory.empty() || dashboardDirectory.empty()) {
        throw std::invalid_argument("Storage and dashboard directories cannot be empty");
    }
}

} // namespace robotics::config
