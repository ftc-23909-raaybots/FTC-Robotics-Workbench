#include "TestSupport.hpp"

#include "robotics/core/TelemetryValue.hpp"
#include "robotics/storage/MeasurementStorage.hpp"
#include "robotics/telemetry/TelemetryRegistry.hpp"

#include <filesystem>
#include <string>

void testJsonSerialization() {
    robotics::telemetry::TelemetryRegistry registry;
    registry.registerValue("battery.voltage", robotics::core::ValueType::Double);
    registry.registerValue("robot.enabled", robotics::core::ValueType::Boolean);
    registry.registerValue("robot.label", robotics::core::ValueType::String);
    registry.updateValue("battery.voltage", 13.4);
    registry.updateValue("robot.enabled", true);
    registry.updateValue("robot.label", std::string("competition"));
    const auto json = registry.snapshot();

    require(json.at("battery").at("voltage") == 13.4, "Floating point values should serialize");
    require(json.at("robot").at("enabled") == true, "Boolean values should serialize");
    require(json.at("robot").at("label") == "competition", "String values should serialize");
    const auto encoded = json.dump();
    require(nlohmann::json::parse(encoded) == json, "Serialized JSON should round-trip");

    const auto directory = std::filesystem::temp_directory_path() / "robotics_telemetry_json_test";
    std::filesystem::remove_all(directory);
    robotics::storage::MeasurementStorage storage(directory);
    const nlohmann::json measurement{{"id", "test"}, {"result", 12.5}};
    storage.exportMeasurement("sample.json", measurement);
    require(storage.importMeasurement("sample.json") == measurement,
            "Stored measurements should import as the original JSON");
    std::filesystem::remove_all(directory);
}
