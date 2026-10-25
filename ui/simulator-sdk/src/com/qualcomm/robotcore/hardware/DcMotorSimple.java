package com.qualcomm.robotcore.hardware;

public interface DcMotorSimple {
    enum Direction { FORWARD(1), REVERSE(-1); public final int sign; Direction(int sign) { this.sign = sign; } }
    void setPower(double power);
    double getPower();
    void setDirection(Direction direction);
    Direction getDirection();
}
