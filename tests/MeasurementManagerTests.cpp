#include "TestSupport.hpp"

#include "robotics/core/TelemetryValue.hpp"
#include "robotics/measurements/BuiltinMeasurements.hpp"
#include "robotics/measurements/MeasurementManager.hpp"
#include "robotics/telemetry/TelemetryRegistry.hpp"

void testMeasurementManager() {
    robotics::telemetry::TelemetryRegistry registry;
    registry.registerValue("drive.fl.encoder", robotics::core::ValueType::Long);
    registry.updateValue("drive.fl.encoder", 100L);

    robotics::measurements::MeasurementManager manager(registry, std::chrono::milliseconds{1000});
    manager.registerMeasurement(
        std::make_shared<robotics::measurements::DriveDistanceMeasurement>("drive.fl.encoder"));
    const auto session = manager.startSession("unit-test");
    manager.updateOnce();
    registry.updateValue("drive.fl.encoder", 175L);
    manager.updateOnce();
    manager.stopSession();

    require(!session->isRunning(), "Stopped session should not report running");
    const auto json = session->toJson();
    require(json.at("id") == "unit-test", "Session ID should serialize");
    require(json.at("measurements").at(0).at("distance") == 75.0,
            "Drive distance should reflect the encoder delta");
}
