#include "robotics/measurements/MeasurementManager.hpp"

#include <stdexcept>
#include <utility>

namespace robotics::measurements {

MeasurementManager::MeasurementManager(const telemetry::TelemetryRegistry& telemetry,
                                       std::chrono::milliseconds processingInterval)
    : telemetry_(telemetry), processingInterval_(processingInterval) {
    if (processingInterval_ <= std::chrono::milliseconds::zero()) {
        throw std::invalid_argument("Measurement processing interval must be positive");
    }
    worker_ = std::jthread([this](std::stop_token stopToken) { run(stopToken); });
}

MeasurementManager::~MeasurementManager() {
    worker_.request_stop();
    if (worker_.joinable()) {
        worker_.join();
    }
}

void MeasurementManager::registerMeasurement(std::shared_ptr<Measurement> measurement) {
    if (!measurement) {
        throw std::invalid_argument("Cannot register a null measurement");
    }
    const auto measurementName = measurement->name();
    if (measurementName.empty()) {
        throw std::invalid_argument("Measurement name cannot be empty");
    }
    std::lock_guard lock(mutex_);
    for (const auto& existing : measurements_) {
        if (existing->name() == measurementName) {
            throw std::invalid_argument("Measurement is already registered: " + measurementName);
        }
    }
    measurements_.push_back(std::move(measurement));
}

std::shared_ptr<MeasurementSession> MeasurementManager::startSession(std::string id) {
    std::lock_guard lock(mutex_);
    if (activeSession_ && activeSession_->isRunning()) {
        throw std::logic_error("A measurement session is already running");
    }
    auto session = std::make_shared<MeasurementSession>(std::move(id), measurements_);
    session->start();
    activeSession_ = session;
    return session;
}

void MeasurementManager::stopSession() {
    std::shared_ptr<MeasurementSession> session;
    {
        std::lock_guard lock(mutex_);
        session = activeSession_;
    }
    if (session) {
        session->stop();
    }
}

std::shared_ptr<MeasurementSession> MeasurementManager::activeSession() const {
    std::lock_guard lock(mutex_);
    return activeSession_;
}

std::vector<std::shared_ptr<Measurement>> MeasurementManager::measurements() const {
    std::lock_guard lock(mutex_);
    return measurements_;
}

std::optional<std::string> MeasurementManager::lastProcessingError() const {
    std::lock_guard lock(mutex_);
    return lastProcessingError_;
}

void MeasurementManager::updateOnce() {
    std::shared_ptr<MeasurementSession> session;
    {
        std::lock_guard lock(mutex_);
        session = activeSession_;
    }
    if (session) {
        session->update(telemetry_);
        std::lock_guard lock(mutex_);
        lastProcessingError_.reset();
    }
}

void MeasurementManager::run(std::stop_token stopToken) {
    while (!stopToken.stop_requested()) {
        try {
            updateOnce();
        } catch (const std::exception& error) {
            std::lock_guard lock(mutex_);
            lastProcessingError_ = error.what();
        } catch (...) {
            std::lock_guard lock(mutex_);
            lastProcessingError_ = "Measurement processing failed with an unknown error";
        }
        std::this_thread::sleep_for(processingInterval_);
    }
}

} // namespace robotics::measurements
