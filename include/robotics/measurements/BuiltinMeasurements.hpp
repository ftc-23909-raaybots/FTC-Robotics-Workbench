#pragma once

#include "robotics/measurements/Measurement.hpp"

#include <optional>

namespace robotics::measurements {

class DriveDistanceMeasurement final : public Measurement {
public:
    explicit DriveDistanceMeasurement(std::string encoderPath);
    [[nodiscard]] std::string name() const override;
    void start() override;
    void stop() override;
    void update(const telemetry::TelemetryRegistry& telemetry) override;
    [[nodiscard]] nlohmann::json toJson() const override;

private:
    const std::string encoderPath_;
    mutable std::mutex mutex_;
    std::optional<double> initialPosition_;
    double distance_{0.0};
    bool running_{false};
};

class TurnAccuracyMeasurement final : public Measurement {
public:
    TurnAccuracyMeasurement(std::string headingPath, double targetDegrees);
    [[nodiscard]] std::string name() const override;
    void start() override;
    void stop() override;
    void update(const telemetry::TelemetryRegistry& telemetry) override;
    [[nodiscard]] nlohmann::json toJson() const override;

private:
    const std::string headingPath_;
    const double targetDegrees_;
    mutable std::mutex mutex_;
    std::optional<double> actualDegrees_;
    bool running_{false};
};

class VoltageDropMeasurement final : public Measurement {
public:
    explicit VoltageDropMeasurement(std::string voltagePath);
    [[nodiscard]] std::string name() const override;
    void start() override;
    void stop() override;
    void update(const telemetry::TelemetryRegistry& telemetry) override;
    [[nodiscard]] nlohmann::json toJson() const override;

private:
    const std::string voltagePath_;
    mutable std::mutex mutex_;
    std::optional<double> startVoltage_;
    std::optional<double> minimumVoltage_;
    bool running_{false};
};

class WheelSynchronizationMeasurement final : public Measurement {
public:
    WheelSynchronizationMeasurement(std::string leftEncoderPath, std::string rightEncoderPath);
    [[nodiscard]] std::string name() const override;
    void start() override;
    void stop() override;
    void update(const telemetry::TelemetryRegistry& telemetry) override;
    [[nodiscard]] nlohmann::json toJson() const override;

private:
    const std::string leftEncoderPath_;
    const std::string rightEncoderPath_;
    mutable std::mutex mutex_;
    std::optional<double> leftPosition_;
    std::optional<double> rightPosition_;
    std::optional<double> maximumDifference_;
    bool running_{false};
};

} // namespace robotics::measurements
