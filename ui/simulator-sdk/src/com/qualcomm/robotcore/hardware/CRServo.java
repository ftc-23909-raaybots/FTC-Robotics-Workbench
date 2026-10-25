package com.qualcomm.robotcore.hardware;
public class CRServo implements DcMotorSimple {
    private final String name;
    private volatile double power;
    private volatile Direction direction = Direction.FORWARD;
    public CRServo(String name) { this.name = name; }
    public String getDeviceName() { return name; }
    @Override public void setPower(double value) { power = Math.max(-1, Math.min(1, value)); }
    @Override public double getPower() { return power; }
    @Override public void setDirection(Direction value) { direction = value; }
    @Override public Direction getDirection() { return direction; }
}
