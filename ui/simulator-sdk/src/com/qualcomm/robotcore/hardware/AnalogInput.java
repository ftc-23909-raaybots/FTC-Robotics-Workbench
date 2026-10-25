package com.qualcomm.robotcore.hardware;
import org.raaybots.sim.SimulatorRuntime;
public class AnalogInput {
    private final String name;
    public AnalogInput(String name) { this.name = name; }
    public double getVoltage() { return Math.min(getMaxVoltage(), SimulatorRuntime.batteryVoltage() * getMaxVoltage() / 12.6); }
    public double getMaxVoltage() { return 5; }
    public String getDeviceName() { return name; }
}
