#pragma once

#include <nlohmann/json.hpp>

#include <condition_variable>
#include <cstdint>
#include <deque>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

namespace robotics::logging {

enum class LogLevel {
    Debug,
    Info,
    Warning,
    Error
};

struct LogRecord {
    std::uint64_t sequence;
    std::int64_t timestamp;
    LogLevel level;
    std::string message;

    [[nodiscard]] nlohmann::json toJson() const;
};

class StructuredLogger {
public:
    explicit StructuredLogger(std::size_t retainedRecords = 1000);
    ~StructuredLogger();

    StructuredLogger(const StructuredLogger&) = delete;
    StructuredLogger& operator=(const StructuredLogger&) = delete;

    void log(LogLevel level, std::string message);
    [[nodiscard]] std::vector<LogRecord> recent(std::size_t limit = 100) const;
    [[nodiscard]] std::vector<LogRecord> after(std::uint64_t sequence) const;
    [[nodiscard]] static std::string toString(LogLevel level);

private:
    void run(std::stop_token stopToken);

    const std::size_t retainedRecords_;
    mutable std::mutex mutex_;
    std::condition_variable_any condition_;
    std::deque<LogRecord> pending_;
    std::deque<LogRecord> retained_;
    std::uint64_t nextSequence_{1};
    std::jthread worker_;
};

} // namespace robotics::logging
