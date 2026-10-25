package com.qualcomm.robotcore.hardware;
public class Servo {
    public enum Direction { FORWARD, REVERSE }
    private final String name;
    private volatile double position;
    private volatile Direction direction = Direction.FORWARD;
    public Servo(String name) { this.name = name; }
    public String getDeviceName() { return name; }
    public void setPosition(double value) { position = Math.max(0, Math.min(1, value)); }
    public double getPosition() { return position; }
    public void setDirection(Direction value) { direction = value; }
    public Direction getDirection() { return direction; }
}
