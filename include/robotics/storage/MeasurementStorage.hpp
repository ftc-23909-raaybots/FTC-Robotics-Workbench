#pragma once

#include <nlohmann/json.hpp>

#include <filesystem>
#include <string>

namespace robotics::storage {

class MeasurementStorage {
public:
    explicit MeasurementStorage(std::filesystem::path directory);
    void exportMeasurement(const std::string& filename, const nlohmann::json& measurement) const;
    [[nodiscard]] nlohmann::json importMeasurement(const std::string& filename) const;
    [[nodiscard]] const std::filesystem::path& directory() const noexcept;

private:
    [[nodiscard]] std::filesystem::path resolveFilename(const std::string& filename) const;
    std::filesystem::path directory_;
};

} // namespace robotics::storage
