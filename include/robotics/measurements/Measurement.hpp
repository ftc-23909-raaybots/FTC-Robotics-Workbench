#pragma once

#include "robotics/telemetry/TelemetryRegistry.hpp"

#include <nlohmann/json.hpp>

#include <chrono>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

namespace robotics::measurements {

class Measurement {
public:
    virtual ~Measurement() = default;
    [[nodiscard]] virtual std::string name() const = 0;
    virtual void start() = 0;
    virtual void stop() = 0;
    virtual void update(const telemetry::TelemetryRegistry& telemetry) = 0;
    [[nodiscard]] virtual nlohmann::json toJson() const = 0;
};

class MeasurementSession {
public:
    MeasurementSession(std::string id, std::vector<std::shared_ptr<Measurement>> measurements);

    void start();
    void stop();
    void update(const telemetry::TelemetryRegistry& telemetry);
    [[nodiscard]] bool isRunning() const;
    [[nodiscard]] nlohmann::json toJson() const;

private:
    const std::string id_;
    const std::vector<std::shared_ptr<Measurement>> measurements_;
    mutable std::mutex mutex_;
    std::chrono::system_clock::time_point startedAt_{};
    std::chrono::system_clock::time_point stoppedAt_{};
    bool running_{false};
};

} // namespace robotics::measurements
