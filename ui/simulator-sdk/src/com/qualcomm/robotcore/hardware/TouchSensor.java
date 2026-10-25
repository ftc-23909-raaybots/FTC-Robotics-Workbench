package com.qualcomm.robotcore.hardware;

import org.raaybots.sim.SimulatorRuntime;

public class TouchSensor {
    private final String name;

    public TouchSensor(String name) {
        this.name = name;
    }

    public boolean isPressed() {
        return SimulatorRuntime.digitalInput(name);
    }

    public String getDeviceName() {
        return name;
    }
}
