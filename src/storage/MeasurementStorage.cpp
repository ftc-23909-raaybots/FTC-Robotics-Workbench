#include "robotics/storage/MeasurementStorage.hpp"

#include <fstream>
#include <atomic>
#include <stdexcept>
#include <system_error>

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#endif

namespace robotics::storage {
namespace {

std::filesystem::path temporaryPathFor(const std::filesystem::path& target) {
    static std::atomic_uint64_t sequence{0};
    return target.string() + ".tmp." + std::to_string(sequence.fetch_add(1));
}

void replaceFile(const std::filesystem::path& temporary,
                 const std::filesystem::path& target) {
#ifdef _WIN32
    if (!MoveFileExW(temporary.c_str(), target.c_str(),
                     MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH)) {
        throw std::system_error(static_cast<int>(GetLastError()), std::system_category(),
                                "Unable to publish measurement file");
    }
#else
    std::error_code error;
    std::filesystem::rename(temporary, target, error);
    if (error) {
        throw std::filesystem::filesystem_error("Unable to publish measurement file", temporary,
                                                target, error);
    }
#endif
}

} // namespace

MeasurementStorage::MeasurementStorage(std::filesystem::path directory)
    : directory_(std::move(directory)) {
    std::filesystem::create_directories(directory_);
}

void MeasurementStorage::exportMeasurement(const std::string& filename,
                                           const nlohmann::json& measurement) const {
    const auto target = resolveFilename(filename);
    const auto temporary = temporaryPathFor(target);
    try {
        {
            std::ofstream output(temporary, std::ios::binary | std::ios::trunc);
            if (!output) {
                throw std::runtime_error("Unable to open measurement file for writing: " +
                                         temporary.string());
            }
            output << measurement.dump(2) << '\n';
            output.flush();
            if (!output) {
                throw std::runtime_error("Failed while writing measurement file: " + temporary.string());
            }
        }
        replaceFile(temporary, target);
    } catch (...) {
        std::error_code ignored;
        std::filesystem::remove(temporary, ignored);
        throw;
    }
}

nlohmann::json MeasurementStorage::importMeasurement(const std::string& filename) const {
    const auto path = resolveFilename(filename);
    std::ifstream input(path, std::ios::binary);
    if (!input) {
        throw std::runtime_error("Unable to open measurement file: " + path.string());
    }
    auto measurement = nlohmann::json::parse(input);
    if (!measurement.is_object()) {
        throw std::invalid_argument("Measurement file must contain a JSON object: " + path.string());
    }
    return measurement;
}

const std::filesystem::path& MeasurementStorage::directory() const noexcept {
    return directory_;
}

std::filesystem::path MeasurementStorage::resolveFilename(const std::string& filename) const {
    const std::filesystem::path name(filename);
    if (name.empty() || name.has_parent_path() || name.filename() != name || name.extension() != ".json") {
        throw std::invalid_argument("Measurement filename must be a simple .json filename");
    }
    return directory_ / name;
}

} // namespace robotics::storage
