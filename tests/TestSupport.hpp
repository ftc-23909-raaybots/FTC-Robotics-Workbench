#pragma once

#include <stdexcept>
#include <string>

void require(bool condition, const std::string& message);
void testTelemetryRegistry();
void testDynamicTelemetryIngestion();
void testAppConfig();
void testMeasurementManager();
void testJsonSerialization();
void testCommandRouter();
