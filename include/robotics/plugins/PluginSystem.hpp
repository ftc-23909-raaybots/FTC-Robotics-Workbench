#pragma once

#include "robotics/logging/StructuredLogger.hpp"
#include "robotics/measurements/MeasurementManager.hpp"
#include "robotics/network/CommandRouter.hpp"
#include "robotics/telemetry/TelemetryRegistry.hpp"

#include <memory>
#include <string>
#include <vector>

namespace robotics::plugins {

struct PluginContext {
    telemetry::TelemetryRegistry& telemetry;
    network::CommandRouter& commands;
    measurements::MeasurementManager& measurements;
    logging::StructuredLogger& logger;
};

class Plugin {
public:
    virtual ~Plugin() = default;
    [[nodiscard]] virtual std::string name() const = 0;
    virtual void registerComponents(PluginContext& context) = 0;
};

class PluginSystem {
public:
    explicit PluginSystem(PluginContext context);
    void registerPlugin(std::unique_ptr<Plugin> plugin);
    void initialize();
    [[nodiscard]] std::vector<std::string> pluginNames() const;

private:
    PluginContext context_;
    std::vector<std::unique_ptr<Plugin>> plugins_;
    bool initialized_{false};
};

} // namespace robotics::plugins
