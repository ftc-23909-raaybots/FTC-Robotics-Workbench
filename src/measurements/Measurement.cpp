#include "robotics/measurements/Measurement.hpp"

#include "robotics/core/TelemetryValue.hpp"

#include <stdexcept>

namespace robotics::measurements {

MeasurementSession::MeasurementSession(std::string id,
                                       std::vector<std::shared_ptr<Measurement>> measurements)
    : id_(std::move(id)), measurements_(std::move(measurements)) {
    if (id_.empty()) {
        throw std::invalid_argument("Measurement session id cannot be empty");
    }
}

void MeasurementSession::start() {
    std::lock_guard lock(mutex_);
    if (running_) {
        throw std::logic_error("Measurement session is already running");
    }
    for (const auto& measurement : measurements_) {
        measurement->start();
    }
    startedAt_ = std::chrono::system_clock::now();
    stoppedAt_ = {};
    running_ = true;
}

void MeasurementSession::stop() {
    std::lock_guard lock(mutex_);
    if (!running_) {
        return;
    }
    for (const auto& measurement : measurements_) {
        measurement->stop();
    }
    stoppedAt_ = std::chrono::system_clock::now();
    running_ = false;
}

void MeasurementSession::update(const telemetry::TelemetryRegistry& telemetry) {
    std::lock_guard lock(mutex_);
    if (!running_) {
        return;
    }
    for (const auto& measurement : measurements_) {
        measurement->update(telemetry);
    }
}

bool MeasurementSession::isRunning() const {
    std::lock_guard lock(mutex_);
    return running_;
}

nlohmann::json MeasurementSession::toJson() const {
    std::lock_guard lock(mutex_);
    nlohmann::json results = nlohmann::json::array();
    for (const auto& measurement : measurements_) {
        results.push_back(measurement->toJson());
    }
    const auto toMilliseconds = [](const auto& point) -> std::int64_t {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
            point.time_since_epoch()).count();
    };
    return {
        {"id", id_},
        {"running", running_},
        {"started_at", startedAt_ == std::chrono::system_clock::time_point{} ? nlohmann::json(nullptr)
                                                                              : nlohmann::json(toMilliseconds(startedAt_))},
        {"stopped_at", stoppedAt_ == std::chrono::system_clock::time_point{} ? nlohmann::json(nullptr)
                                                                              : nlohmann::json(toMilliseconds(stoppedAt_))},
        {"measurements", std::move(results)}
    };
}

} // namespace robotics::measurements
