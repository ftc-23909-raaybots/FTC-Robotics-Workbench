#pragma once

#include <filesystem>
#include <cstddef>
#include <string>

namespace robotics::config {

struct AppConfig {
    std::string bindAddress{"0.0.0.0"};
    unsigned short port{8765};
    unsigned short discoveryPort{8766};
    std::size_t historySize{1000};
    unsigned int streamRateHz{30};
    std::filesystem::path measurementDirectory{"measurements"};
    std::filesystem::path dashboardDirectory{"resources/dashboards"};

    static AppConfig load(const std::filesystem::path& file);
    void validate() const;
};

} // namespace robotics::config
