package com.qualcomm.hardware.bosch;

import org.firstinspires.ftc.robotcore.external.navigation.*;
import org.raaybots.sim.SimulatorRuntime;

public class BNO055IMU {
    public enum AngleUnit { DEGREES, RADIANS }
    public enum AccelUnit { METERS_PERSEC_PERSEC, MILLIGALS }
    private final String name;
    public BNO055IMU(String name) { this.name = name; }
    public boolean initialize(Parameters parameters) { return true; }
    public Orientation getAngularOrientation() {
        return new Orientation(org.firstinspires.ftc.robotcore.external.navigation.AngleUnit.DEGREES, AxesReference.INTRINSIC, AxesOrder.ZYX,
            (float)Math.toDegrees(SimulatorRuntime.heading), 0, 0, System.nanoTime());
    }
    public String getDeviceName() { return name; }
    public static class Parameters {
        public Object angleUnit;
        public Object accelUnit;
        public boolean loggingEnabled;
        public String calibrationDataFile;
    }
}
