#include "robotics/telemetry/TelemetryRegistry.hpp"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <limits>
#include <mutex>
#include <stdexcept>
#include <unordered_set>
#include <utility>
#include <vector>

namespace robotics::telemetry {
namespace {

using TelemetryUpdate = std::pair<std::string, core::TelemetryValue>;

core::TelemetryValue telemetryValueFromJson(const nlohmann::json& value,
                                            const std::string& path) {
    if (value.is_boolean()) {
        return value.get<bool>();
    }
    if (value.is_string()) {
        return value.get<std::string>();
    }
    if (value.is_number_unsigned()) {
        const auto number = value.get<std::uint64_t>();
        if (number <= static_cast<std::uint64_t>(std::numeric_limits<int>::max())) {
            return static_cast<int>(number);
        }
        if (number <= static_cast<std::uint64_t>(std::numeric_limits<long>::max())) {
            return static_cast<long>(number);
        }
        throw std::invalid_argument("Integer telemetry value is out of range: " + path);
    }
    if (value.is_number_integer()) {
        const auto number = value.get<std::int64_t>();
        if (number >= std::numeric_limits<int>::min() &&
            number <= std::numeric_limits<int>::max()) {
            return static_cast<int>(number);
        }
        if (number >= std::numeric_limits<long>::min() &&
            number <= std::numeric_limits<long>::max()) {
            return static_cast<long>(number);
        }
        throw std::invalid_argument("Integer telemetry value is out of range: " + path);
    }
    if (value.is_number_float()) {
        const auto number = value.get<double>();
        if (!std::isfinite(number)) {
            throw std::invalid_argument("Telemetry value must be finite: " + path);
        }
        return number;
    }
    throw std::invalid_argument("Telemetry value must be a boolean, number, string, or object: " + path);
}

void flattenJson(const nlohmann::json& object,
                 const std::string& prefix,
                 std::vector<TelemetryUpdate>& updates) {
    if (!object.is_object()) {
        throw std::invalid_argument("Telemetry payload must be a nested JSON object");
    }
    for (const auto& [key, value] : object.items()) {
        const auto path = prefix.empty() ? key : prefix + '.' + key;
        if (value.is_object()) {
            flattenJson(value, path, updates);
        } else {
            updates.emplace_back(path, telemetryValueFromJson(value, path));
        }
    }
}

} // namespace

TelemetryRegistry::TelemetryRegistry(std::size_t historyDepth)
    : historyDepth_(historyDepth) {}

void TelemetryRegistry::registerValue(const std::string& path, core::ValueType type, bool trackHistory) {
    const auto segments = splitPath(path);
    std::unique_lock lock(mutex_);
    if (entries_.contains(path)) {
        throw std::invalid_argument("Telemetry path is already registered: " + path);
    }
    validatePathAvailable(segments, path);
    entries_.emplace(path, TelemetryEntry{type, false, 0, false, trackHistory, {}});
}

void TelemetryRegistry::updateValue(const std::string& path, core::TelemetryValue value) {
    std::unique_lock lock(mutex_);
    const auto entry = entries_.find(path);
    if (entry == entries_.end()) {
        throw std::out_of_range("Telemetry path is not registered: " + path);
    }
    const auto actualType = core::valueTypeOf(value);
    if (actualType != entry->second.type) {
        throw std::invalid_argument("Telemetry type mismatch for " + path + ": expected " +
                                    core::toString(entry->second.type) + ", received " +
                                    core::toString(actualType));
    }

    const auto timestamp = core::unixTimestampMilliseconds();
    entry->second.value = std::move(value);
    entry->second.timestamp = timestamp;
    entry->second.hasValue = true;
    if (entry->second.historyEnabled && historyDepth_ > 0) {
        entry->second.history.push_back({timestamp, entry->second.value});
        while (entry->second.history.size() > historyDepth_) {
            entry->second.history.pop_front();
        }
    }
}

void TelemetryRegistry::updateFromJson(const nlohmann::json& values) {
    std::vector<TelemetryUpdate> updates;
    flattenJson(values, {}, updates);
    if (updates.empty()) {
        throw std::invalid_argument("Telemetry payload must contain at least one value");
    }

    std::unique_lock lock(mutex_);
    std::unordered_set<std::string> newPaths;
    newPaths.reserve(updates.size());
    for (const auto& [path, value] : updates) {
        const auto segments = splitPath(path);
        const auto entry = entries_.find(path);
        if (entry != entries_.end()) {
            if (entry->second.type != core::valueTypeOf(value)) {
                throw std::invalid_argument("Telemetry type mismatch for " + path + ": expected " +
                                            core::toString(entry->second.type) + ", received " +
                                            core::toString(core::valueTypeOf(value)));
            }
            continue;
        }

        std::string ancestor;
        for (std::size_t index = 0; index + 1 < segments.size(); ++index) {
            if (!ancestor.empty()) ancestor += '.';
            ancestor += segments[index];
            if (entries_.contains(ancestor) || newPaths.contains(ancestor)) {
                throw std::invalid_argument("Telemetry path conflicts with existing parent: " + ancestor);
            }
        }
        const auto descendantPrefix = path + '.';
        const auto conflictsWithExisting = std::any_of(entries_.begin(), entries_.end(),
            [&](const auto& item) { return item.first.starts_with(descendantPrefix); });
        const auto conflictsWithNew = std::any_of(newPaths.begin(), newPaths.end(),
            [&](const auto& existing) { return existing.starts_with(descendantPrefix); });
        if (conflictsWithExisting || conflictsWithNew) {
            throw std::invalid_argument("Telemetry path conflicts with an existing child: " + path);
        }
        newPaths.insert(path);
    }

    const auto timestamp = core::unixTimestampMilliseconds();
    for (auto& [path, value] : updates) {
        const auto type = core::valueTypeOf(value);
        auto [entry, inserted] = entries_.try_emplace(
            path, TelemetryEntry{type, false, 0, false, true, {}});
        static_cast<void>(inserted);
        entry->second.value = std::move(value);
        entry->second.timestamp = timestamp;
        entry->second.hasValue = true;
        if (historyDepth_ > 0) {
            entry->second.history.push_back({timestamp, entry->second.value});
            while (entry->second.history.size() > historyDepth_) {
                entry->second.history.pop_front();
            }
        }
    }
}

void TelemetryRegistry::clearValues() {
    std::unique_lock lock(mutex_);
    for (auto& [path, entry] : entries_) {
        static_cast<void>(path);
        entry.hasValue = false;
        entry.timestamp = 0;
        entry.history.clear();
    }
}

bool TelemetryRegistry::contains(const std::string& path) const {
    std::shared_lock lock(mutex_);
    return entries_.contains(path);
}

std::optional<core::TelemetryValue> TelemetryRegistry::getValue(const std::string& path) const {
    std::shared_lock lock(mutex_);
    const auto entry = entries_.find(path);
    if (entry == entries_.end() || !entry->second.hasValue) {
        return std::nullopt;
    }
    return entry->second.value;
}

std::vector<std::string> TelemetryRegistry::paths() const {
    std::shared_lock lock(mutex_);
    std::vector<std::string> result;
    result.reserve(entries_.size());
    for (const auto& [path, unused] : entries_) {
        static_cast<void>(unused);
        result.push_back(path);
    }
    std::sort(result.begin(), result.end());
    return result;
}

std::vector<HistorySample> TelemetryRegistry::getHistory(const std::string& path) const {
    std::shared_lock lock(mutex_);
    const auto entry = entries_.find(path);
    if (entry == entries_.end()) {
        throw std::out_of_range("Telemetry path is not registered: " + path);
    }
    return {entry->second.history.begin(), entry->second.history.end()};
}

nlohmann::json TelemetryRegistry::snapshot() const {
    std::shared_lock lock(mutex_);
    nlohmann::json root = nlohmann::json::object();
    for (const auto& [path, entry] : entries_) {
        if (!entry.hasValue) {
            continue;
        }
        const auto segments = splitPath(path);
        auto* object = &root;
        for (std::size_t index = 0; index < segments.size(); ++index) {
            const auto& segment = segments[index];
            if (index + 1 == segments.size()) {
                (*object)[segment] = core::toJson(entry.value);
            } else {
                object = &(*object)[segment];
            }
        }
    }
    return root;
}

std::vector<std::string> TelemetryRegistry::splitPath(const std::string& path) {
    if (path.empty()) {
        throw std::invalid_argument("Telemetry path cannot be empty");
    }

    std::vector<std::string> segments;
    std::size_t start = 0;
    while (start < path.size()) {
        const auto end = path.find('.', start);
        const auto length = end == std::string::npos ? path.size() - start : end - start;
        if (length == 0) {
            throw std::invalid_argument("Telemetry path contains an empty segment: " + path);
        }
        const auto segment = path.substr(start, length);
        if (!std::all_of(segment.begin(), segment.end(), [](unsigned char character) {
                return std::isalnum(character) || character == '_' || character == '-';
            })) {
            throw std::invalid_argument("Telemetry path contains an invalid segment: " + path);
        }
        segments.push_back(segment);
        if (end == std::string::npos) {
            break;
        }
        start = end + 1;
    }
    if (path.back() == '.') {
        throw std::invalid_argument("Telemetry path cannot end with a dot: " + path);
    }
    return segments;
}

void TelemetryRegistry::validatePathAvailable(const std::vector<std::string>& segments,
                                              const std::string& path) const {
    std::string ancestor;
    for (std::size_t index = 0; index + 1 < segments.size(); ++index) {
        if (!ancestor.empty()) ancestor += '.';
        ancestor += segments[index];
        if (entries_.contains(ancestor)) {
            throw std::invalid_argument("Telemetry path conflicts with existing parent: " + ancestor);
        }
    }
    const auto descendantPrefix = path + '.';
    const auto descendant = std::find_if(entries_.begin(), entries_.end(), [&](const auto& item) {
        return item.first.starts_with(descendantPrefix);
    });
    if (descendant != entries_.end()) {
        throw std::invalid_argument("Telemetry path conflicts with existing child: " + descendant->first);
    }
}

} // namespace robotics::telemetry
