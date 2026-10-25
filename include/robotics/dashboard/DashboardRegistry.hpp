#pragma once

#include <nlohmann/json.hpp>

#include <filesystem>
#include <shared_mutex>
#include <string>
#include <unordered_map>
#include <vector>

namespace robotics::dashboard {

class DashboardRegistry {
public:
    void loadDirectory(const std::filesystem::path& directory);
    void loadFile(const std::filesystem::path& file);
    [[nodiscard]] bool contains(const std::string& name) const;
    [[nodiscard]] nlohmann::json get(const std::string& name) const;
    [[nodiscard]] std::vector<std::string> names() const;

private:
    static void validate(const nlohmann::json& definition, const std::filesystem::path& file);
    mutable std::shared_mutex mutex_;
    std::unordered_map<std::string, nlohmann::json> dashboards_;
};

} // namespace robotics::dashboard
