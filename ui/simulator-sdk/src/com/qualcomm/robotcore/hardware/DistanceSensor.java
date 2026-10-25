package com.qualcomm.robotcore.hardware;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;
import org.raaybots.sim.SimulatorRuntime;
public class DistanceSensor {
    private final String name;
    public DistanceSensor(String name) { this.name = name; }
    public double getDistance(DistanceUnit unit) { return unit.fromMm(SimulatorRuntime.distanceMm(name)); }
    public String getDeviceName() { return name; }
}
