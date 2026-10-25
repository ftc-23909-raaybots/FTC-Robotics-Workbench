#include "TestSupport.hpp"

#include <exception>
#include <iostream>
#include <utility>
#include <vector>

void require(bool condition, const std::string& message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}

int main() {
    const std::vector<std::pair<std::string, void (*)()>> tests{
        {"TelemetryRegistry", testTelemetryRegistry},
        {"DynamicTelemetryIngestion", testDynamicTelemetryIngestion},
        {"AppConfig", testAppConfig},
        {"MeasurementManager", testMeasurementManager},
        {"JsonSerialization", testJsonSerialization},
        {"CommandRouter", testCommandRouter}
    };
    std::size_t failures = 0;
    for (const auto& [name, test] : tests) {
        try {
            test();
            std::cout << "[PASS] " << name << '\n';
        } catch (const std::exception& error) {
            ++failures;
            std::cerr << "[FAIL] " << name << ": " << error.what() << '\n';
        }
    }
    return failures == 0 ? 0 : 1;
}
