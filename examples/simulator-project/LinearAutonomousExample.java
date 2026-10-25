package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Short Drive Example", group = "Examples")
public class LinearAutonomousExample extends LinearOpMode {
    @Override
    public void runOpMode() throws InterruptedException {
        DcMotor left = hardwareMap.get(DcMotor.class, "leftMotor");
        DcMotor right = hardwareMap.get(DcMotor.class, "rightMotor");
        waitForStart();
        left.setPower(0.45);
        right.setPower(0.45);
        sleep(1200);
        left.setPower(0);
        right.setPower(0);
        telemetry.addData("result", "Finished short drive");
    }
}
