#pragma once

#include "robotics/core/TelemetryValue.hpp"

#include <deque>
#include <optional>
#include <shared_mutex>
#include <string>
#include <unordered_map>
#include <vector>

namespace robotics::telemetry {

struct HistorySample {
    std::int64_t timestamp;
    core::TelemetryValue value;
};

struct TelemetryEntry {
    core::ValueType type;
    core::TelemetryValue value;
    std::int64_t timestamp;
    bool hasValue;
    bool historyEnabled;
    std::deque<HistorySample> history;
};

class TelemetryRegistry {
public:
    explicit TelemetryRegistry(std::size_t historyDepth = 1000);

    void registerValue(const std::string& path, core::ValueType type, bool trackHistory = false);
    void updateValue(const std::string& path, core::TelemetryValue value);
    void updateFromJson(const nlohmann::json& values);
    void clearValues();
    [[nodiscard]] bool contains(const std::string& path) const;
    [[nodiscard]] std::optional<core::TelemetryValue> getValue(const std::string& path) const;
    [[nodiscard]] std::vector<std::string> paths() const;
    [[nodiscard]] std::vector<HistorySample> getHistory(const std::string& path) const;
    [[nodiscard]] nlohmann::json snapshot() const;

private:
    static std::vector<std::string> splitPath(const std::string& path);
    void validatePathAvailable(const std::vector<std::string>& segments, const std::string& path) const;

    const std::size_t historyDepth_;
    mutable std::shared_mutex mutex_;
    std::unordered_map<std::string, TelemetryEntry> entries_;
};

} // namespace robotics::telemetry
