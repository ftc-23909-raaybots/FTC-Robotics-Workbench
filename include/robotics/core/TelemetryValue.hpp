#pragma once

#include <nlohmann/json.hpp>

#include <cstdint>
#include <string>
#include <variant>

namespace robotics::core {

enum class ValueType {
    Boolean,
    Integer,
    Long,
    Float,
    Double,
    String
};

using TelemetryValue = std::variant<bool, int, long, float, double, std::string>;

ValueType valueTypeOf(const TelemetryValue& value);
std::string toString(ValueType type);
std::int64_t unixTimestampMilliseconds();
nlohmann::json toJson(const TelemetryValue& value);

} // namespace robotics::core
