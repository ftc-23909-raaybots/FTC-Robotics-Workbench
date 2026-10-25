package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;

@TeleOp(name = "Tank Drive Example", group = "Examples")
public class TankDriveTeleOp extends OpMode {
    private DcMotor leftMotor;
    private DcMotor rightMotor;

    @Override
    public void init() {
        leftMotor = hardwareMap.get(DcMotor.class, "leftMotor");
        rightMotor = hardwareMap.get(DcMotor.class, "rightMotor");
        rightMotor.setDirection(DcMotor.Direction.REVERSE);
        telemetry.addData("status", "Initialized");
    }

    @Override
    public void loop() {
        double left = -gamepad1.left_stick_y;
        double right = -gamepad1.right_stick_y;
        leftMotor.setPower(left);
        rightMotor.setPower(right);
        telemetry.addData("left", left);
        telemetry.addData("right", right);
        telemetry.addData("runtime", time);
    }
}
