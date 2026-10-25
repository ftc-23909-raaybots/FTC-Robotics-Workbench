package com.qualcomm.robotcore.eventloop.opmode;

import org.raaybots.sim.SimulatorRuntime;

public abstract class LinearOpMode extends OpMode {
    public abstract void runOpMode() throws InterruptedException;
    @Override public final void loop() {}
    public void waitForStart() throws InterruptedException {
        while (!SimulatorRuntime.started && !isStopRequested()) Thread.sleep(10);
    }
    public boolean opModeIsActive() { return SimulatorRuntime.started && !isStopRequested(); }
    public void idle() throws InterruptedException { Thread.sleep(1); }
    public void sleep(long milliseconds) throws InterruptedException {
        long end = System.currentTimeMillis() + milliseconds;
        while (opModeIsActive() && System.currentTimeMillis() < end) Thread.sleep(Math.min(10, Math.max(1, end - System.currentTimeMillis())));
    }
}
