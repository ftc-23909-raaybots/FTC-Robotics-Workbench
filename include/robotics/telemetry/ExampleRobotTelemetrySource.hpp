#pragma once

#include "robotics/telemetry/TelemetryRegistry.hpp"

namespace robotics::telemetry {

class ExampleRobotTelemetrySource {
public:
    explicit ExampleRobotTelemetrySource(TelemetryRegistry& registry);
    void update(double elapsedSeconds);

private:
    TelemetryRegistry& registry_;
};

} // namespace robotics::telemetry
