#include "TestSupport.hpp"

#include "robotics/network/CommandRouter.hpp"

#include <stdexcept>

void testCommandRouter() {
    robotics::network::CommandRouter router;
    router.registerCommand("reset_imu", [](const nlohmann::json& arguments) {
        return nlohmann::json{{"reset", true}, {"reason", arguments.value("reason", "manual")}};
    });

    const auto result = router.route({
        {"type", "command"}, {"command", "reset_imu"}, {"arguments", {{"reason", "test"}}}
    });
    require(result.at("ok") == true, "Registered commands should route successfully");
    require(result.at("result").at("reason") == "test", "Command arguments should reach handlers");

    const auto unknown = router.route({{"type", "command"}, {"command", "missing"}});
    require(unknown.at("ok") == false, "Unknown commands should return an explicit error");

    router.registerCommand("fail", [](const nlohmann::json&) -> nlohmann::json {
        throw std::runtime_error("failure");
    });
    const auto failed = router.route({{"type", "command"}, {"command", "fail"}});
    require(failed.at("ok") == false && failed.at("error") == "failure",
            "Handler failures should be returned to the caller");
}
