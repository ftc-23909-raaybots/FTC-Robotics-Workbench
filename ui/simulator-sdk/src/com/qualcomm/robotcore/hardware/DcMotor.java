package com.qualcomm.robotcore.hardware;

import org.raaybots.sim.SimulatorRuntime;
import org.raaybots.sim.SimulationSettings;

public class DcMotor implements DcMotorSimple {
    public enum RunMode { RUN_WITHOUT_ENCODER, RUN_USING_ENCODER, RUN_TO_POSITION, STOP_AND_RESET_ENCODER }
    public enum ZeroPowerBehavior { BRAKE, FLOAT }
    private final String name;
    private volatile double power;
    private volatile double position;
    private volatile Direction direction = Direction.FORWARD;
    private volatile RunMode mode = RunMode.RUN_WITHOUT_ENCODER;
    private volatile ZeroPowerBehavior zeroPowerBehavior = ZeroPowerBehavior.FLOAT;
    private volatile int targetPosition;
    private final SimulationSettings.MotorProfile profile;
    private volatile double shaftRpm;

    public DcMotor(String name) { this.name = name; profile = SimulatorRuntime.motorProfile(name); }
    public String getDeviceName() { return name; }
    @Override public void setPower(double value) { power = Math.max(-1.0, Math.min(1.0, value)); }
    @Override public double getPower() { return power; }
    @Override public void setDirection(Direction value) { direction = value; }
    @Override public Direction getDirection() { return direction; }
    public void setMode(RunMode value) {
        mode = value;
        if (value == RunMode.STOP_AND_RESET_ENCODER) { position = 0; targetPosition = 0; power = 0; shaftRpm = 0; }
    }
    public RunMode getMode() { return mode; }
    public void setZeroPowerBehavior(ZeroPowerBehavior value) { zeroPowerBehavior = value; }
    public ZeroPowerBehavior getZeroPowerBehavior() { return zeroPowerBehavior; }
    public int getCurrentPosition() { return (int) Math.round(position); }
    public void setTargetPosition(int value) { targetPosition = value; }
    public int getTargetPosition() { return targetPosition; }
    public boolean isBusy() { return mode == RunMode.RUN_TO_POSITION && Math.abs(targetPosition - position) > 5; }
    public double getVelocity() { return shaftRpm / 60.0 * profile.ticksPerRev; }
    public void setVelocity(double ticksPerSecond) { setPower(ticksPerSecond * 60.0 / profile.ticksPerRev / profile.maxRpm); }
    public double getMaxRpm() { return profile.maxRpm; }
    public double getGearRatio() { return profile.gearRatio; }
    public double getWheelDiameterCm() { return profile.wheelDiameterCm; }
    public double getShaftRpm() { return shaftRpm; }
    public double getCurrentAmps() {
        if (power == 0) return 0;
        double speedRatio = Math.min(1, Math.abs(shaftRpm) / profile.maxRpm);
        return Math.abs(power) * (0.5 + 2.3 * (1 - speedRatio));
    }
    public void setPowerFloat() { setZeroPowerBehavior(ZeroPowerBehavior.FLOAT); setPower(0); }
    public boolean getPowerFloat() { return power == 0 && zeroPowerBehavior == ZeroPowerBehavior.FLOAT; }

    public void simulate(double seconds, double batteryScale) {
        if (mode == RunMode.STOP_AND_RESET_ENCODER) return;
        double effectivePower = power;
        if (mode == RunMode.RUN_TO_POSITION) {
            double remaining = targetPosition - position;
            if (Math.abs(remaining) < 2) { position = targetPosition; return; }
            effectivePower = Math.copySign(Math.abs(power), remaining);
        }
        double commandedRpm = effectivePower * profile.maxRpm * Math.max(0.75, Math.min(1.05, batteryScale));
        shaftRpm += (commandedRpm - shaftRpm) * Math.min(1.0, seconds / 0.18);
        position += shaftRpm / 60.0 * profile.ticksPerRev * seconds;
        if (mode == RunMode.RUN_TO_POSITION &&
            Math.signum(targetPosition - position) != Math.signum(effectivePower)) {
            position = targetPosition;
            shaftRpm = 0;
        }
    }
}
