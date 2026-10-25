#include "robotics/config/AppConfig.hpp"
#include "robotics/dashboard/DashboardRegistry.hpp"
#include "robotics/logging/StructuredLogger.hpp"
#include "robotics/measurements/BuiltinMeasurements.hpp"
#include "robotics/measurements/MeasurementManager.hpp"
#include "robotics/network/CommandRouter.hpp"
#include "robotics/network/WebSocketServer.hpp"
#include "robotics/storage/MeasurementStorage.hpp"

#include <chrono>
#include <iostream>
#include <thread>

int main(int argc, char** argv) {
    try {
        const auto configPath = argc > 1 ? std::filesystem::path(argv[1])
                                         : std::filesystem::path("resources/config.json");
        const auto config = robotics::config::AppConfig::load(configPath);
        robotics::logging::StructuredLogger logger;
        robotics::telemetry::TelemetryRegistry telemetry(config.historySize);

        robotics::measurements::MeasurementManager measurementManager(
            telemetry, std::chrono::milliseconds{50});
        measurementManager.registerMeasurement(
            std::make_shared<robotics::measurements::DriveDistanceMeasurement>("drive.fl.encoder"));
        measurementManager.registerMeasurement(
            std::make_shared<robotics::measurements::TurnAccuracyMeasurement>("imu.heading", 90.0));
        measurementManager.registerMeasurement(
            std::make_shared<robotics::measurements::VoltageDropMeasurement>("battery.voltage"));
        measurementManager.registerMeasurement(
            std::make_shared<robotics::measurements::WheelSynchronizationMeasurement>(
                "drive.fl.encoder", "drive.fr.encoder"));

        robotics::storage::MeasurementStorage storage(config.measurementDirectory);
        robotics::dashboard::DashboardRegistry dashboards;
        dashboards.loadDirectory(config.dashboardDirectory);

        robotics::network::CommandRouter commands;
        commands.registerCommand("start_measurement", [&measurementManager](const nlohmann::json& arguments) {
            const auto id = arguments.value("id", std::string("measurement-") +
                                                     std::to_string(robotics::core::unixTimestampMilliseconds()));
            return measurementManager.startSession(id)->toJson();
        });
        commands.registerCommand("stop_measurement", [&measurementManager, &storage](const nlohmann::json& arguments) {
            measurementManager.stopSession();
            const auto session = measurementManager.activeSession();
            if (!session) {
                throw std::logic_error("There is no measurement session to stop");
            }
            const auto result = session->toJson();
            if (arguments.contains("filename")) {
                storage.exportMeasurement(arguments.at("filename").get<std::string>(), result);
            }
            return result;
        });
        commands.registerCommand("list_dashboards", [&dashboards](const nlohmann::json&) {
            return nlohmann::json(dashboards.names());
        });
        commands.registerCommand("get_dashboard", [&dashboards](const nlohmann::json& arguments) {
            return dashboards.get(arguments.at("name").get<std::string>());
        });
        commands.registerCommand("import_measurement", [&storage](const nlohmann::json& arguments) {
            return storage.importMeasurement(arguments.at("filename").get<std::string>());
        });
        commands.registerCommand("get_telemetry", [&telemetry](const nlohmann::json&) {
            return telemetry.snapshot();
        });

        robotics::network::WebSocketServer server(
            telemetry, logger, dashboards, commands, config.bindAddress, config.port,
            config.discoveryPort,
            std::chrono::milliseconds{1000 / config.streamRateHz});
        server.start();
        logger.log(robotics::logging::LogLevel::Info,
                   "Telemetry backend is ready; waiting for robot telemetry. Press Enter to shut down");

        std::string input;
        std::getline(std::cin, input);
        server.stop();
        logger.log(robotics::logging::LogLevel::Info, "Telemetry backend stopped");
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "Fatal: " << error.what() << '\n';
        return 1;
    }
}
