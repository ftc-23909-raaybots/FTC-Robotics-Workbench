#include "TestSupport.hpp"

#include "robotics/config/AppConfig.hpp"

#include <stdexcept>

void testAppConfig() {
    robotics::config::AppConfig config;
    config.validate();
    require(config.port != config.discoveryPort,
            "The default WebSocket and discovery ports should be different");

    config.discoveryPort = config.port;
    bool conflictingPortThrown = false;
    try {
        config.validate();
    } catch (const std::invalid_argument&) {
        conflictingPortThrown = true;
    }
    require(conflictingPortThrown, "The discovery and WebSocket ports must not conflict");

    config.discoveryPort = 0;
    bool zeroPortThrown = false;
    try {
        config.validate();
    } catch (const std::invalid_argument&) {
        zeroPortThrown = true;
    }
    require(zeroPortThrown, "The discovery port must be a valid non-zero port");
}
