package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorEx;
import com.qualcomm.robotcore.hardware.DistanceSensor;
import com.qualcomm.robotcore.hardware.ColorSensor;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;

@TeleOp(name = "Mecanum Drive Example", group = "Examples")
public class MecanumDriveTeleOp extends LinearOpMode {
    @Override
    public void runOpMode() throws InterruptedException {
        DcMotorEx frontLeft = hardwareMap.get(DcMotorEx.class, "frontLeft");
        DcMotorEx frontRight = hardwareMap.get(DcMotorEx.class, "frontRight");
        DcMotorEx rearLeft = hardwareMap.get(DcMotorEx.class, "rearLeft");
        DcMotorEx rearRight = hardwareMap.get(DcMotorEx.class, "rearRight");
        DistanceSensor frontRange = hardwareMap.tryGet(DistanceSensor.class, "frontRange");
        ColorSensor floorColor = hardwareMap.tryGet(ColorSensor.class, "floorColor");

        frontLeft.setDirection(DcMotor.Direction.REVERSE);
        rearLeft.setDirection(DcMotor.Direction.REVERSE);

        telemetry.addLine("MECANUM DRIVE READY");
        telemetry.addData("Controls", "Left stick: translate / Right stick X: rotate");
        telemetry.update();
        waitForStart();

        while (opModeIsActive()) {
            double forward = -gamepad1.left_stick_y;
            double strafe = gamepad1.left_stick_x;
            double rotate = gamepad1.right_stick_x;

            double fl = forward + strafe + rotate;
            double fr = forward - strafe - rotate;
            double rl = forward - strafe + rotate;
            double rr = forward + strafe - rotate;
            double max = Math.max(1.0, Math.max(
                Math.max(Math.abs(fl), Math.abs(fr)),
                Math.max(Math.abs(rl), Math.abs(rr))
            ));

            frontLeft.setPower(fl / max);
            frontRight.setPower(fr / max);
            rearLeft.setPower(rl / max);
            rearRight.setPower(rr / max);

            telemetry.addLine("MECANUM OUTPUT");
            telemetry.addData("Forward", "%.2f", forward);
            telemetry.addData("Strafe", "%.2f", strafe);
            telemetry.addData("Rotate", "%.2f", rotate);
            telemetry.addData("FL / FR", "%.2f / %.2f", fl / max, fr / max);
            telemetry.addData("RL / RR", "%.2f / %.2f", rl / max, rr / max);
            if (frontRange != null) {
                telemetry.addData("Front range", "%.1f cm", frontRange.getDistance(DistanceUnit.CM));
            }
            if (floorColor != null) {
                telemetry.addData("Floor RGB", "%d / %d / %d", floorColor.red(), floorColor.green(), floorColor.blue());
            }
            telemetry.update();
            idle();
        }
    }
}
