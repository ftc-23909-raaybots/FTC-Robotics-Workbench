package com.qualcomm.robotcore.hardware;
import org.raaybots.sim.SimulatorRuntime;
public class VoltageSensor {
    private final String name;
    public VoltageSensor() { this("voltage"); }
    public VoltageSensor(String name) { this.name = name; }
    public double getVoltage() { return SimulatorRuntime.batteryVoltage(); }
    public String getDeviceName() { return name; }
}
