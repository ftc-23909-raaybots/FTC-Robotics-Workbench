package com.qualcomm.robotcore.hardware;
import org.raaybots.sim.SimulatorRuntime;
public class ColorSensor {
    private final String name;
    public ColorSensor(String name) { this.name = name; }
    public int red() { return SimulatorRuntime.colorValues()[0]; }
    public int green() { return SimulatorRuntime.colorValues()[1]; }
    public int blue() { return SimulatorRuntime.colorValues()[2]; }
    public int alpha() { return SimulatorRuntime.colorValues()[3]; }
    public int argb() { return alpha() << 24 | red() << 16 | green() << 8 | blue(); }
    public String getDeviceName() { return name; }
}
