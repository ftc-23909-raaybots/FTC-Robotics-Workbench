#include "robotics/logging/StructuredLogger.hpp"

#include "robotics/core/TelemetryValue.hpp"

#include <algorithm>
#include <chrono>
#include <cstddef>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <sstream>

namespace robotics::logging {
namespace {

std::string formatTime(std::int64_t timestamp) {
    const auto time = std::chrono::system_clock::time_point{std::chrono::milliseconds{timestamp}};
    const auto raw = std::chrono::system_clock::to_time_t(time);
    std::tm local{};
#ifdef _WIN32
    localtime_s(&local, &raw);
#else
    localtime_r(&raw, &local);
#endif
    std::ostringstream result;
    result << std::put_time(&local, "%H:%M:%S");
    return result.str();
}

} // namespace

nlohmann::json LogRecord::toJson() const {
    return {{"sequence", sequence}, {"timestamp", timestamp},
            {"level", StructuredLogger::toString(level)}, {"message", message}};
}

StructuredLogger::StructuredLogger(std::size_t retainedRecords)
    : retainedRecords_(retainedRecords), worker_([this](std::stop_token stopToken) { run(stopToken); }) {}

StructuredLogger::~StructuredLogger() {
    worker_.request_stop();
    condition_.notify_all();
    if (worker_.joinable()) {
        worker_.join();
    }
}

void StructuredLogger::log(LogLevel level, std::string message) {
    {
        std::lock_guard lock(mutex_);
        pending_.push_back({nextSequence_++, core::unixTimestampMilliseconds(), level, std::move(message)});
    }
    condition_.notify_one();
}

std::vector<LogRecord> StructuredLogger::recent(std::size_t limit) const {
    std::lock_guard lock(mutex_);
    const auto count = std::min(limit, retained_.size());
    return {retained_.end() - static_cast<std::ptrdiff_t>(count), retained_.end()};
}

std::vector<LogRecord> StructuredLogger::after(std::uint64_t sequence) const {
    std::lock_guard lock(mutex_);
    std::vector<LogRecord> result;
    for (const auto& record : retained_) {
        if (record.sequence > sequence) {
            result.push_back(record);
        }
    }
    return result;
}

std::string StructuredLogger::toString(LogLevel level) {
    switch (level) {
        case LogLevel::Debug: return "DEBUG";
        case LogLevel::Info: return "INFO";
        case LogLevel::Warning: return "WARNING";
        case LogLevel::Error: return "ERROR";
    }
    return "UNKNOWN";
}

void StructuredLogger::run(std::stop_token stopToken) {
    while (true) {
        LogRecord record{};
        {
            std::unique_lock lock(mutex_);
            condition_.wait(lock, stopToken, [this] { return !pending_.empty(); });
            if (pending_.empty() && stopToken.stop_requested()) {
                return;
            }
            record = std::move(pending_.front());
            pending_.pop_front();
            if (retainedRecords_ > 0) {
                retained_.push_back(record);
                while (retained_.size() > retainedRecords_) {
                    retained_.pop_front();
                }
            }
        }
        std::cout << '[' << formatTime(record.timestamp) << "] "
                  << toString(record.level) << ' ' << record.message << '\n';
    }
}

} // namespace robotics::logging
