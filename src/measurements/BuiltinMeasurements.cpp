#include "robotics/measurements/BuiltinMeasurements.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <type_traits>

namespace robotics::measurements {
namespace {

double numericValue(const std::optional<core::TelemetryValue>& value, const std::string& path) {
    if (!value) {
        throw std::out_of_range("Telemetry value has not been published: " + path);
    }
    return std::visit([](const auto& item) -> double {
        using T = std::decay_t<decltype(item)>;
        if constexpr (std::is_same_v<T, int> || std::is_same_v<T, long> ||
                      std::is_same_v<T, float> || std::is_same_v<T, double>) {
            return static_cast<double>(item);
        }
        throw std::invalid_argument("Measurement telemetry source must be numeric");
    }, *value);
}

} // namespace

DriveDistanceMeasurement::DriveDistanceMeasurement(std::string encoderPath)
    : encoderPath_(std::move(encoderPath)) {}

std::string DriveDistanceMeasurement::name() const { return "drive_distance"; }

void DriveDistanceMeasurement::start() {
    std::lock_guard lock(mutex_);
    initialPosition_.reset();
    distance_ = 0.0;
    running_ = true;
}

void DriveDistanceMeasurement::stop() {
    std::lock_guard lock(mutex_);
    running_ = false;
}

void DriveDistanceMeasurement::update(const telemetry::TelemetryRegistry& telemetry) {
    const auto position = numericValue(telemetry.getValue(encoderPath_), encoderPath_);
    std::lock_guard lock(mutex_);
    if (!running_) return;
    if (!initialPosition_) initialPosition_ = position;
    distance_ = std::abs(position - *initialPosition_);
}

nlohmann::json DriveDistanceMeasurement::toJson() const {
    std::lock_guard lock(mutex_);
    return {{"name", name()}, {"encoder_path", encoderPath_}, {"distance", distance_}};
}

TurnAccuracyMeasurement::TurnAccuracyMeasurement(std::string headingPath, double targetDegrees)
    : headingPath_(std::move(headingPath)), targetDegrees_(targetDegrees) {}

std::string TurnAccuracyMeasurement::name() const { return "turn_accuracy"; }

void TurnAccuracyMeasurement::start() {
    std::lock_guard lock(mutex_);
    actualDegrees_.reset();
    running_ = true;
}

void TurnAccuracyMeasurement::stop() {
    std::lock_guard lock(mutex_);
    running_ = false;
}

void TurnAccuracyMeasurement::update(const telemetry::TelemetryRegistry& telemetry) {
    const auto actual = numericValue(telemetry.getValue(headingPath_), headingPath_);
    std::lock_guard lock(mutex_);
    if (running_) actualDegrees_ = actual;
}

nlohmann::json TurnAccuracyMeasurement::toJson() const {
    std::lock_guard lock(mutex_);
    const auto error = actualDegrees_ ? std::remainder(*actualDegrees_ - targetDegrees_, 360.0) : 0.0;
    return {{"name", name()}, {"target_degrees", targetDegrees_},
            {"actual_degrees", actualDegrees_ ? nlohmann::json(*actualDegrees_) : nlohmann::json(nullptr)},
            {"error_degrees", actualDegrees_ ? nlohmann::json(error) : nlohmann::json(nullptr)}};
}

VoltageDropMeasurement::VoltageDropMeasurement(std::string voltagePath)
    : voltagePath_(std::move(voltagePath)) {}

std::string VoltageDropMeasurement::name() const { return "voltage_drop"; }

void VoltageDropMeasurement::start() {
    std::lock_guard lock(mutex_);
    startVoltage_.reset();
    minimumVoltage_.reset();
    running_ = true;
}

void VoltageDropMeasurement::stop() {
    std::lock_guard lock(mutex_);
    running_ = false;
}

void VoltageDropMeasurement::update(const telemetry::TelemetryRegistry& telemetry) {
    const auto voltage = numericValue(telemetry.getValue(voltagePath_), voltagePath_);
    std::lock_guard lock(mutex_);
    if (!running_) return;
    if (!startVoltage_) startVoltage_ = voltage;
    minimumVoltage_ = minimumVoltage_ ? std::min(*minimumVoltage_, voltage) : voltage;
}

nlohmann::json VoltageDropMeasurement::toJson() const {
    std::lock_guard lock(mutex_);
    const auto drop = startVoltage_ && minimumVoltage_ ? *startVoltage_ - *minimumVoltage_ : 0.0;
    return {{"name", name()}, {"voltage_path", voltagePath_},
            {"start_voltage", startVoltage_ ? nlohmann::json(*startVoltage_) : nlohmann::json(nullptr)},
            {"minimum_voltage", minimumVoltage_ ? nlohmann::json(*minimumVoltage_) : nlohmann::json(nullptr)},
            {"drop", startVoltage_ && minimumVoltage_ ? nlohmann::json(drop) : nlohmann::json(nullptr)}};
}

WheelSynchronizationMeasurement::WheelSynchronizationMeasurement(std::string leftEncoderPath,
                                                                   std::string rightEncoderPath)
    : leftEncoderPath_(std::move(leftEncoderPath)), rightEncoderPath_(std::move(rightEncoderPath)) {}

std::string WheelSynchronizationMeasurement::name() const { return "wheel_synchronization"; }

void WheelSynchronizationMeasurement::start() {
    std::lock_guard lock(mutex_);
    leftPosition_.reset();
    rightPosition_.reset();
    maximumDifference_.reset();
    running_ = true;
}

void WheelSynchronizationMeasurement::stop() {
    std::lock_guard lock(mutex_);
    running_ = false;
}

void WheelSynchronizationMeasurement::update(const telemetry::TelemetryRegistry& telemetry) {
    const auto left = numericValue(telemetry.getValue(leftEncoderPath_), leftEncoderPath_);
    const auto right = numericValue(telemetry.getValue(rightEncoderPath_), rightEncoderPath_);
    std::lock_guard lock(mutex_);
    if (!running_) return;
    if (!leftPosition_) leftPosition_ = left;
    if (!rightPosition_) rightPosition_ = right;
    const auto difference = std::abs((left - *leftPosition_) - (right - *rightPosition_));
    maximumDifference_ = maximumDifference_ ? std::max(*maximumDifference_, difference) : difference;
}

nlohmann::json WheelSynchronizationMeasurement::toJson() const {
    std::lock_guard lock(mutex_);
    return {{"name", name()},
            {"maximum_encoder_delta_difference", maximumDifference_ ? nlohmann::json(*maximumDifference_)
                                                                    : nlohmann::json(nullptr)}};
}

} // namespace robotics::measurements
