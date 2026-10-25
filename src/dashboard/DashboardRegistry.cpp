#include "robotics/dashboard/DashboardRegistry.hpp"

#include <fstream>
#include <mutex>
#include <stdexcept>

namespace robotics::dashboard {

void DashboardRegistry::loadDirectory(const std::filesystem::path& directory) {
    if (!std::filesystem::exists(directory) || !std::filesystem::is_directory(directory)) {
        throw std::runtime_error("Dashboard directory does not exist: " + directory.string());
    }
    for (const auto& entry : std::filesystem::directory_iterator(directory)) {
        if (entry.is_regular_file() && entry.path().extension() == ".json") {
            loadFile(entry.path());
        }
    }
}

void DashboardRegistry::loadFile(const std::filesystem::path& file) {
    std::ifstream input(file, std::ios::binary);
    if (!input) {
        throw std::runtime_error("Unable to open dashboard definition: " + file.string());
    }
    auto definition = nlohmann::json::parse(input);
    validate(definition, file);
    const auto name = definition.at("name").get<std::string>();
    std::unique_lock lock(mutex_);
    dashboards_.insert_or_assign(name, std::move(definition));
}

bool DashboardRegistry::contains(const std::string& name) const {
    std::shared_lock lock(mutex_);
    return dashboards_.contains(name);
}

nlohmann::json DashboardRegistry::get(const std::string& name) const {
    std::shared_lock lock(mutex_);
    const auto dashboard = dashboards_.find(name);
    if (dashboard == dashboards_.end()) {
        throw std::out_of_range("Dashboard is not registered: " + name);
    }
    return dashboard->second;
}

std::vector<std::string> DashboardRegistry::names() const {
    std::shared_lock lock(mutex_);
    std::vector<std::string> result;
    result.reserve(dashboards_.size());
    for (const auto& [name, unused] : dashboards_) {
        static_cast<void>(unused);
        result.push_back(name);
    }
    return result;
}

void DashboardRegistry::validate(const nlohmann::json& definition,
                                 const std::filesystem::path& file) {
    if (!definition.is_object() || !definition.contains("name") ||
        !definition.at("name").is_string() || definition.at("name").get<std::string>().empty()) {
        throw std::invalid_argument("Dashboard must have a non-empty string name: " + file.string());
    }
    if (!definition.contains("widgets") || !definition.at("widgets").is_array()) {
        throw std::invalid_argument("Dashboard widgets must be an array: " + file.string());
    }
    for (const auto& widget : definition.at("widgets")) {
        if (!widget.is_object() || !widget.contains("type") || !widget.at("type").is_string() ||
            !widget.contains("source") || !widget.at("source").is_string() ||
            widget.at("type").get<std::string>().empty() ||
            widget.at("source").get<std::string>().empty()) {
            throw std::invalid_argument("Each dashboard widget needs non-empty type and source strings: " +
                                        file.string());
        }
    }
}

} // namespace robotics::dashboard
