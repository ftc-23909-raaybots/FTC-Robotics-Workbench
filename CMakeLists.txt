cmake_minimum_required(VERSION 3.20)
project(robotics_telemetry VERSION 0.1.0 LANGUAGES CXX)

include(FetchContent)
include(CTest)

if(POLICY CMP0169)
    cmake_policy(SET CMP0169 OLD)
endif()

option(ROBOTICS_FETCH_DEPENDENCIES "Fetch nlohmann/json and websocketpp when unavailable" ON)

find_package(Threads REQUIRED)
find_package(nlohmann_json 3.11 QUIET)
find_path(WEBSOCKETPP_INCLUDE_DIR websocketpp/server.hpp)
find_path(ASIO_INCLUDE_DIR asio.hpp)

if(ROBOTICS_FETCH_DEPENDENCIES AND NOT nlohmann_json_FOUND)
    FetchContent_Declare(
        nlohmann_json
        URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
        DOWNLOAD_EXTRACT_TIMESTAMP TRUE
    )
    FetchContent_MakeAvailable(nlohmann_json)
endif()

if(ROBOTICS_FETCH_DEPENDENCIES AND (NOT WEBSOCKETPP_INCLUDE_DIR OR NOT ASIO_INCLUDE_DIR))
    FetchContent_Declare(
        websocketpp
        GIT_REPOSITORY https://github.com/zaphoyd/websocketpp.git
        GIT_TAG 0.8.2
        GIT_SHALLOW TRUE
    )
    FetchContent_Declare(
        standalone_asio
        GIT_REPOSITORY https://github.com/chriskohlhoff/asio.git
        GIT_TAG asio-1-30-2
        GIT_SHALLOW TRUE
    )
    FetchContent_GetProperties(websocketpp)
    if(NOT websocketpp_POPULATED)
        FetchContent_Populate(websocketpp)
    endif()
    FetchContent_GetProperties(standalone_asio)
    if(NOT standalone_asio_POPULATED)
        FetchContent_Populate(standalone_asio)
    endif()
    set(WEBSOCKETPP_INCLUDE_DIR "${websocketpp_SOURCE_DIR}")
    set(ASIO_INCLUDE_DIR "${standalone_asio_SOURCE_DIR}/asio/include")
endif()

if(NOT nlohmann_json_FOUND AND NOT TARGET nlohmann_json::nlohmann_json)
    message(FATAL_ERROR "nlohmann/json is required. Install it or enable ROBOTICS_FETCH_DEPENDENCIES.")
endif()
if(NOT WEBSOCKETPP_INCLUDE_DIR OR NOT ASIO_INCLUDE_DIR)
    message(FATAL_ERROR "websocketpp and standalone Asio are required. Install them or enable ROBOTICS_FETCH_DEPENDENCIES.")
endif()

add_library(robotics_telemetry
    src/core/TelemetryValue.cpp
    src/telemetry/TelemetryRegistry.cpp
    src/telemetry/ExampleRobotTelemetrySource.cpp
    src/measurements/Measurement.cpp
    src/measurements/MeasurementManager.cpp
    src/measurements/BuiltinMeasurements.cpp
    src/storage/MeasurementStorage.cpp
    src/logging/StructuredLogger.cpp
    src/network/CommandRouter.cpp
    src/network/WebSocketServer.cpp
    src/dashboard/DashboardRegistry.cpp
    src/config/AppConfig.cpp
    src/plugins/PluginSystem.cpp
)

target_compile_features(robotics_telemetry PUBLIC cxx_std_20)
target_include_directories(robotics_telemetry
    PUBLIC "${PROJECT_SOURCE_DIR}/include"
)
target_include_directories(robotics_telemetry SYSTEM PUBLIC
    "${WEBSOCKETPP_INCLUDE_DIR}" "${ASIO_INCLUDE_DIR}"
)
target_link_libraries(robotics_telemetry
    PUBLIC nlohmann_json::nlohmann_json Threads::Threads
)
target_compile_definitions(robotics_telemetry PUBLIC ASIO_STANDALONE _WEBSOCKETPP_CPP11_THREAD_)

if(WIN32)
    target_link_libraries(robotics_telemetry PUBLIC ws2_32 mswsock)
endif()

if(MSVC)
    target_compile_options(robotics_telemetry PRIVATE /W4 /permissive-)
else()
    target_compile_options(robotics_telemetry PRIVATE -Wall -Wextra -Wpedantic)
endif()

add_executable(robotics_telemetry_server src/main.cpp)
target_link_libraries(robotics_telemetry_server PRIVATE robotics_telemetry)
if(MINGW)
    target_link_options(robotics_telemetry_server PRIVATE -static -static-libgcc -static-libstdc++)
endif()

if(BUILD_TESTING)
    add_executable(robotics_telemetry_tests
        tests/TestMain.cpp
        tests/TelemetryRegistryTests.cpp
        tests/ConfigTests.cpp
        tests/MeasurementManagerTests.cpp
        tests/JsonSerializationTests.cpp
        tests/CommandRouterTests.cpp
    )
    target_link_libraries(robotics_telemetry_tests PRIVATE robotics_telemetry)
    add_test(NAME robotics_telemetry_tests COMMAND robotics_telemetry_tests)
endif()
