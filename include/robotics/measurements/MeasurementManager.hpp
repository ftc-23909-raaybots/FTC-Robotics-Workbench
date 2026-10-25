#pragma once

#include "robotics/measurements/Measurement.hpp"

#include <chrono>
#include <condition_variable>
#include <exception>
#include <memory>
#include <mutex>
#include <optional>
#include <optional>
#include <string>
#include <thread>
#include <vector>

namespace robotics::measurements {

class MeasurementManager {
public:
    explicit MeasurementManager(const telemetry::TelemetryRegistry& telemetry,
                                std::chrono::milliseconds processingInterval = std::chrono::milliseconds{50});
    ~MeasurementManager();

    MeasurementManager(const MeasurementManager&) = delete;
    MeasurementManager& operator=(const MeasurementManager&) = delete;

    void registerMeasurement(std::shared_ptr<Measurement> measurement);
    std::shared_ptr<MeasurementSession> startSession(std::string id);
    void stopSession();
    [[nodiscard]] std::shared_ptr<MeasurementSession> activeSession() const;
    [[nodiscard]] std::vector<std::shared_ptr<Measurement>> measurements() const;
    [[nodiscard]] std::optional<std::string> lastProcessingError() const;
    void updateOnce();

private:
    void run(std::stop_token stopToken);

    const telemetry::TelemetryRegistry& telemetry_;
    const std::chrono::milliseconds processingInterval_;
    mutable std::mutex mutex_;
    std::vector<std::shared_ptr<Measurement>> measurements_;
    std::shared_ptr<MeasurementSession> activeSession_;
    std::optional<std::string> lastProcessingError_;
    std::jthread worker_;
};

} // namespace robotics::measurements
