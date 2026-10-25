package com.qualcomm.robotcore.hardware;

public class DcMotorEx extends DcMotor {
    public DcMotorEx(String name) { super(name); }
    public void setVelocity(double angularRate, Object unit) { setVelocity(angularRate); }
    public double getCurrent(org.firstinspires.ftc.robotcore.external.navigation.CurrentUnit unit) {
        double amps = getCurrentAmps();
        return unit == org.firstinspires.ftc.robotcore.external.navigation.CurrentUnit.MILLIAMPS ? amps * 1000 : amps;
    }
}
