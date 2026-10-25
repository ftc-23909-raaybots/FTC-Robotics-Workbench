#include "robotics/telemetry/ExampleRobotTelemetrySource.hpp"

#include <cmath>

namespace robotics::telemetry {

ExampleRobotTelemetrySource::ExampleRobotTelemetrySource(TelemetryRegistry& registry)
    : registry_(registry) {
    using core::ValueType;
    registry_.registerValue("imu.heading", ValueType::Double, true);
    registry_.registerValue("imu.pitch", ValueType::Double, true);
    registry_.registerValue("imu.roll", ValueType::Double);
    registry_.registerValue("battery.voltage", ValueType::Double, true);
    registry_.registerValue("battery.current", ValueType::Double);
    registry_.registerValue("drive.fl.encoder", ValueType::Long);
    registry_.registerValue("drive.fr.encoder", ValueType::Long);
    registry_.registerValue("drive.fl.velocity", ValueType::Double);
    registry_.registerValue("drive.fr.velocity", ValueType::Double);
    registry_.registerValue("robot.enabled", ValueType::Boolean);
    registry_.registerValue("robot.mode", ValueType::String);
}

void ExampleRobotTelemetrySource::update(double elapsedSeconds) {
    const auto phase = elapsedSeconds * 0.5;
    const auto leftPosition = static_cast<long>(elapsedSeconds * 450.0);
    const auto rightPosition = static_cast<long>(elapsedSeconds * 447.0);
    registry_.updateValue("imu.heading", std::fmod(elapsedSeconds * 18.0, 360.0));
    registry_.updateValue("imu.pitch", std::sin(phase) * 3.0);
    registry_.updateValue("imu.roll", std::cos(phase) * 2.0);
    registry_.updateValue("battery.voltage", 13.2 - elapsedSeconds * 0.002);
    registry_.updateValue("battery.current", 3.5 + std::abs(std::sin(phase)) * 2.0);
    registry_.updateValue("drive.fl.encoder", leftPosition);
    registry_.updateValue("drive.fr.encoder", rightPosition);
    registry_.updateValue("drive.fl.velocity", 450.0 + std::sin(phase) * 25.0);
    registry_.updateValue("drive.fr.velocity", 447.0 + std::cos(phase) * 25.0);
    registry_.updateValue("robot.enabled", true);
    registry_.updateValue("robot.mode", std::string("teleop"));
}

} // namespace robotics::telemetry
