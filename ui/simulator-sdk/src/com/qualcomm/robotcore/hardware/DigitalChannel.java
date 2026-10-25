package com.qualcomm.robotcore.hardware;
import org.raaybots.sim.SimulatorRuntime;
public class DigitalChannel {
    public enum Mode { INPUT, OUTPUT }
    private final String name;
    private volatile boolean state;
    private volatile Mode mode = Mode.INPUT;
    public DigitalChannel(String name) { this.name = name; }
    public void setMode(Mode value) { mode = value; }
    public Mode getMode() { return mode; }
    public void setState(boolean value) { state = value; }
    public boolean getState() { return mode == Mode.INPUT ? SimulatorRuntime.digitalInput(name) : state; }
    public String getDeviceName() { return name; }
}
