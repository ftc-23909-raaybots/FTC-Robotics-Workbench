#include "robotics/core/TelemetryValue.hpp"

#include <chrono>
#include <stdexcept>
#include <type_traits>

namespace robotics::core {

ValueType valueTypeOf(const TelemetryValue& value) {
    return std::visit([](const auto& item) -> ValueType {
        using T = std::decay_t<decltype(item)>;
        if constexpr (std::is_same_v<T, bool>) return ValueType::Boolean;
        if constexpr (std::is_same_v<T, int>) return ValueType::Integer;
        if constexpr (std::is_same_v<T, long>) return ValueType::Long;
        if constexpr (std::is_same_v<T, float>) return ValueType::Float;
        if constexpr (std::is_same_v<T, double>) return ValueType::Double;
        return ValueType::String;
    }, value);
}

std::string toString(ValueType type) {
    switch (type) {
        case ValueType::Boolean: return "bool";
        case ValueType::Integer: return "int";
        case ValueType::Long: return "long";
        case ValueType::Float: return "float";
        case ValueType::Double: return "double";
        case ValueType::String: return "string";
    }
    throw std::invalid_argument("Unknown telemetry value type");
}

std::int64_t unixTimestampMilliseconds() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
}

nlohmann::json toJson(const TelemetryValue& value) {
    return std::visit([](const auto& item) { return nlohmann::json(item); }, value);
}

} // namespace robotics::core
