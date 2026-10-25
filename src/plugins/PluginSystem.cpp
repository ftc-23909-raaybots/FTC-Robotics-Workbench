#include "robotics/plugins/PluginSystem.hpp"

#include <stdexcept>
#include <utility>

namespace robotics::plugins {

PluginSystem::PluginSystem(PluginContext context) : context_(context) {}

void PluginSystem::registerPlugin(std::unique_ptr<Plugin> plugin) {
    if (initialized_) {
        throw std::logic_error("Plugins cannot be registered after initialization");
    }
    if (!plugin || plugin->name().empty()) {
        throw std::invalid_argument("A plugin with a non-empty name is required");
    }
    for (const auto& existing : plugins_) {
        if (existing->name() == plugin->name()) {
            throw std::invalid_argument("Plugin is already registered: " + plugin->name());
        }
    }
    plugins_.push_back(std::move(plugin));
}

void PluginSystem::initialize() {
    if (initialized_) {
        throw std::logic_error("Plugin system is already initialized");
    }
    for (const auto& plugin : plugins_) {
        plugin->registerComponents(context_);
    }
    initialized_ = true;
}

std::vector<std::string> PluginSystem::pluginNames() const {
    std::vector<std::string> result;
    result.reserve(plugins_.size());
    for (const auto& plugin : plugins_) {
        result.push_back(plugin->name());
    }
    return result;
}

} // namespace robotics::plugins
