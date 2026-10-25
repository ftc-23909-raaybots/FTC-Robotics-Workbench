#include "TestSupport.hpp"

#include "robotics/core/TelemetryValue.hpp"
#include "robotics/telemetry/TelemetryRegistry.hpp"

#include <stdexcept>

void testTelemetryRegistry() {
    using robotics::core::ValueType;
    robotics::telemetry::TelemetryRegistry registry(2);
    registry.registerValue("imu.heading", ValueType::Double, true);
    registry.registerValue("robot.enabled", ValueType::Boolean);
    registry.updateValue("imu.heading", 91.0);
    registry.updateValue("imu.heading", 92.0);
    registry.updateValue("imu.heading", 93.0);
    registry.updateValue("robot.enabled", true);

    require(registry.contains("imu.heading"), "Registered telemetry path should exist");
    require(registry.getHistory("imu.heading").size() == 2, "History should respect configured depth");
    require(registry.snapshot().at("imu").at("heading") == 93.0,
            "Nested telemetry snapshot should contain the latest value");

    registry.clearValues();
    require(registry.snapshot().empty(),
            "Clearing telemetry should remove current values from snapshots");
    require(registry.getHistory("imu.heading").empty(),
            "Clearing telemetry should remove stale history");
    require(registry.contains("imu.heading"),
            "Clearing telemetry should retain registered path types");
    registry.updateValue("imu.heading", 94.0);
    require(registry.snapshot().at("imu").at("heading") == 94.0,
            "Registered paths should accept values after being cleared");

    bool typeMismatchThrown = false;
    try {
        registry.updateValue("imu.heading", 3);
    } catch (const std::invalid_argument&) {
        typeMismatchThrown = true;
    }

    require(typeMismatchThrown, "Type mismatches should be rejected");

    bool pathConflictThrown = false;
    try {
        registry.registerValue("imu", ValueType::String);
    } catch (const std::invalid_argument&) {
        pathConflictThrown = true;
    }
    require(pathConflictThrown, "Scalar and object paths should not conflict");
}

void testDynamicTelemetryIngestion() {
    robotics::telemetry::TelemetryRegistry registry(2);
    registry.updateFromJson({
        {"imu", {
            {"heading", 91.5},
            {"enabled", true},
            {"mode", "teleop"}
        }},
        {"drive", {{"fl", {{"encoder", 12345}}}}}
    });

    const auto snapshot = registry.snapshot();
    require(snapshot.at("imu").at("heading") == 91.5,
            "Nested floating-point values should register and update dynamically");
    require(snapshot.at("imu").at("enabled") == true,
            "Boolean values should register and update dynamically");
    require(snapshot.at("imu").at("mode") == "teleop",
            "String values should register and update dynamically");
    require(snapshot.at("drive").at("fl").at("encoder") == 12345,
            "Integer values should register and update dynamically");
    require(registry.getHistory("imu.heading").size() == 1,
            "Dynamically registered values should retain history");

    bool typeMismatchThrown = false;
    try {
        registry.updateFromJson({
            {"battery", {{"voltage", 12.4}}},
            {"imu", {{"heading", "not-a-number"}}}
        });
    } catch (const std::invalid_argument&) {
        typeMismatchThrown = true;
    }
    require(typeMismatchThrown, "Changing a registered telemetry type should be rejected");
    require(!registry.contains("battery.voltage"),
            "Invalid telemetry frames must not partially register values");
    require(registry.snapshot().at("imu").at("heading") == 91.5,
            "Invalid telemetry frames must not partially update existing values");

    bool unsupportedValueThrown = false;
    try {
        registry.updateFromJson({{"imu", {{"sample", nullptr}}}});
    } catch (const std::invalid_argument&) {
        unsupportedValueThrown = true;
    }
    require(unsupportedValueThrown, "Null telemetry values should be rejected");
    require(!registry.contains("imu.sample"),
            "Unsupported telemetry values must not register a path");
}
