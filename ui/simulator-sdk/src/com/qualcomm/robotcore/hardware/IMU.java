package com.qualcomm.robotcore.hardware;

import org.firstinspires.ftc.robotcore.external.navigation.*;
import com.qualcomm.hardware.rev.RevHubOrientationOnRobot;
import org.raaybots.sim.SimulatorRuntime;

public class IMU {
    private final String name;
    public IMU(String name) { this.name = name; }
    public boolean initialize(Parameters parameters) { return true; }
    public YawPitchRollAngles getRobotYawPitchRollAngles() {
        return new YawPitchRollAngles(AngleUnit.RADIANS, SimulatorRuntime.heading, 0, 0, System.nanoTime());
    }
    public void resetYaw() { SimulatorRuntime.heading = 0; }
    public String getDeviceName() { return name; }
    public static class Parameters {
        public Parameters(RevHubOrientationOnRobot orientation) {}
    }
}
