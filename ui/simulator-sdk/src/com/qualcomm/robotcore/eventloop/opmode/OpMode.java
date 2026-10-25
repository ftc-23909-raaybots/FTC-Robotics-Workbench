package com.qualcomm.robotcore.eventloop.opmode;

import com.qualcomm.robotcore.hardware.Gamepad;
import com.qualcomm.robotcore.hardware.HardwareMap;
import org.firstinspires.ftc.robotcore.external.Telemetry;
import org.raaybots.sim.SimulatorRuntime;

public abstract class OpMode {
    public final Gamepad gamepad1 = new Gamepad();
    public final Gamepad gamepad2 = new Gamepad();
    public final HardwareMap hardwareMap = SimulatorRuntime.hardwareMap;
    public final Telemetry telemetry = SimulatorRuntime.telemetry;
    public double time;

    public void init() {}
    public void init_loop() {}
    public void start() {}
    public abstract void loop();
    public void stop() {}
    public final boolean isStopRequested() { return SimulatorRuntime.stopRequested; }
}
