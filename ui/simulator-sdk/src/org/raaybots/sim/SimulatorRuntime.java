package org.raaybots.sim;

import com.qualcomm.robotcore.hardware.*;
import java.util.*;
import org.firstinspires.ftc.robotcore.external.Telemetry;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;

public final class SimulatorRuntime {
    public static final HardwareMap hardwareMap = new HardwareMap();
    public static final Telemetry telemetry = new Telemetry();
    public static volatile SimulationSettings settings;
    public static volatile boolean started;
    public static volatile boolean stopRequested;
    public static volatile double heading;
    public static volatile double x;
    public static volatile double y;
    public static volatile double fieldWidthIn = 144;
    public static volatile double fieldLengthIn = 144;
    public static volatile double robotWidthCm = 40;
    public static volatile double robotLengthCm = 37;
    private SimulatorRuntime() {}

    public static synchronized void configure(SimulationSettings value) {
        settings = value;
        x = 0;
        y = 0;
        heading = 0;
        fieldWidthIn = value.fieldWidthIn;
        fieldLengthIn = value.fieldLengthIn;
        robotWidthCm = value.robotWidthCm;
        robotLengthCm = value.robotLengthCm;
        for (Map.Entry<String, SimulationSettings.SensorProfile> entry : value.sensors.entrySet()) {
            String name = entry.getKey();
            switch (entry.getValue().type) {
                case "distance": hardwareMap.get(DistanceSensor.class, name); break;
                case "color": hardwareMap.get(ColorSensor.class, name); break;
                case "analog": hardwareMap.get(AnalogInput.class, name); break;
                case "digital": hardwareMap.get(DigitalChannel.class, name); break;
                case "touch": hardwareMap.get(TouchSensor.class, name); break;
                case "voltage": hardwareMap.get(VoltageSensor.class, name); break;
                default: throw new IllegalArgumentException("Unsupported configured sensor: " + name);
            }
        }
    }

    public static SimulationSettings.MotorProfile motorProfile(String name) {
        SimulationSettings current = settings;
        return current == null ? SimulationSettingsDefaults.MOTOR : current.motor(name);
    }

    public static double outputRpm(DcMotor motor) {
        SimulationSettings.MotorProfile profile = motorProfile(motor.getDeviceName());
        return motor.getShaftRpm() / profile.gearRatio;
    }

    public static double batteryVoltage() {
        double load = 0;
        for (DcMotor motor : hardwareMap.getAll(DcMotor.class)) load += motor.getCurrentAmps();
        return Math.max(9.5, 12.6 - load * 0.035);
    }

    public static boolean digitalInput(String name) {
        SimulationSettings.SensorProfile profile = settings == null ? null : settings.sensors.get(name);
        String direction = profile == null ? "front" : profile.direction;
        return distanceMm(name) <= 12 && !"down".equals(direction);
    }

    public static synchronized void tick(double seconds) {
        List<DcMotor> motors = hardwareMap.getAll(DcMotor.class);
        DcMotor[] wheels = new DcMotor[4];
        double left = 0;
        double right = 0;
        int leftCount = 0;
        int rightCount = 0;
        List<DcMotor> unclassified = new ArrayList<>();
        for (DcMotor motor : motors) {
            motor.simulate(seconds, batteryVoltage() / 12.0);
            String name = motor.getDeviceName().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
            int wheel = wheelIndex(name);
            if (wheel >= 0 && wheels[wheel] == null) {
                wheels[wheel] = motor;
            } else if (name.contains("left")) {
                left += motor.getPower();
                leftCount++;
            } else if (name.contains("right")) {
                right += motor.getPower();
                rightCount++;
            } else {
                unclassified.add(motor);
            }
        }

        if (Arrays.stream(wheels).anyMatch(Objects::isNull) && motors.size() >= 4 && unclassified.size() == motors.size()) {
            for (int index = 0; index < 4; index++) wheels[index] = motors.get(index);
        }

        if (Arrays.stream(wheels).noneMatch(Objects::isNull)) {
            double frontLeft = wheelSpeedInchesPerSecond(wheels[0]);
            double frontRight = wheelSpeedInchesPerSecond(wheels[1]);
            double rearLeft = wheelSpeedInchesPerSecond(wheels[2]);
            double rearRight = wheelSpeedInchesPerSecond(wheels[3]);
            double forwardSpeed = (frontLeft + frontRight + rearLeft + rearRight) * 0.25;
            double strafeSpeed = (frontLeft - frontRight - rearLeft + rearRight) * 0.25 * 0.85;
            double turnLever = robotWidthInches() * 0.5 + robotLengthInches() * 0.5;
            double angularSpeed = (frontLeft - frontRight + rearLeft - rearRight) / (4.0 * turnLever);
            heading += angularSpeed * seconds;
            x += (Math.sin(heading) * forwardSpeed + Math.cos(heading) * strafeSpeed) * seconds;
            y += (Math.cos(heading) * forwardSpeed - Math.sin(heading) * strafeSpeed) * seconds;
            clampToField();
            return;
        }

        if (leftCount > 0 && rightCount > 0) {
            left /= leftCount;
            right /= rightCount;
        } else if (motors.size() >= 2) {
            left = motors.get(0).getPower();
            right = motors.get(1).getPower();
        } else {
            return;
        }
        double leftSpeed = 0;
        double rightSpeed = 0;
        for (DcMotor motor : motors) {
            String name = motor.getDeviceName().toLowerCase(Locale.ROOT);
            if (name.contains("left")) leftSpeed += wheelSpeedInchesPerSecond(motor);
            if (name.contains("right")) rightSpeed += wheelSpeedInchesPerSecond(motor);
        }
        if (leftCount == 0 || rightCount == 0) {
            leftSpeed = wheelSpeedInchesPerSecond(motors.get(0));
            rightSpeed = wheelSpeedInchesPerSecond(motors.get(1));
        } else {
            leftSpeed /= leftCount;
            rightSpeed /= rightCount;
        }
        double forward = (leftSpeed + rightSpeed) * 0.5;
        double angular = (rightSpeed - leftSpeed) / Math.max(1, robotWidthInches());
        heading += angular * seconds;
        x += Math.sin(heading) * forward * seconds;
        y += Math.cos(heading) * forward * seconds;
        clampToField();
    }

    public static double distanceMm(String name) {
        SimulationSettings current = requireSettings();
        SimulationSettings.SensorProfile sensor = current.sensors.get(name);
        String direction = sensor == null ? "front" : sensor.direction;
        double angle = heading;
        if ("back".equals(direction)) angle += Math.PI;
        else if ("left".equals(direction)) angle -= Math.PI / 2;
        else if ("right".equals(direction)) angle += Math.PI / 2;
        else if ("down".equals(direction)) return 1000;
        double dx = Math.sin(angle);
        double dy = Math.cos(angle);
        double distance = Double.POSITIVE_INFINITY;
        if (dx > 1e-9) distance = Math.min(distance, (current.fieldWidthIn * 0.5 - x) / dx);
        else if (dx < -1e-9) distance = Math.min(distance, (-current.fieldWidthIn * 0.5 - x) / dx);
        if (dy > 1e-9) distance = Math.min(distance, (current.fieldLengthIn * 0.5 - y) / dy);
        else if (dy < -1e-9) distance = Math.min(distance, (-current.fieldLengthIn * 0.5 - y) / dy);
        double frontX = Math.sin(heading), frontY = Math.cos(heading);
        double sideX = Math.cos(heading), sideY = -Math.sin(heading);
        double robotEdge = Math.abs(dx * sideX + dy * sideY) * robotWidthInches() * 0.5 +
            Math.abs(dx * frontX + dy * frontY) * robotLengthInches() * 0.5;
        return Math.max(0, (distance - robotEdge) * 25.4);
    }

    public static int[] colorValues() {
        int tileX = (int)Math.floor((x + fieldWidthInches() * 0.5) / 24.0);
        int tileY = (int)Math.floor((y + fieldLengthInches() * 0.5) / 24.0);
        if ((tileX + tileY) % 2 == 0) return new int[] { 210, 210, 210, 255 };
        return tileX < fieldWidthInches() / 48.0
            ? new int[] { 40, 90, 230, 255 }
            : new int[] { 230, 55, 45, 255 };
    }

    public static double fieldWidthInches() {
        return fieldWidthIn;
    }

    public static double fieldLengthInches() {
        return fieldLengthIn;
    }

    public static double robotWidthInches() {
        return robotWidthCm / 2.54;
    }

    public static double robotLengthInches() {
        return robotLengthCm / 2.54;
    }

    private static double wheelSpeedInchesPerSecond(DcMotor motor) {
        SimulationSettings.MotorProfile profile = motorProfile(motor.getDeviceName());
        double circumferenceInches = Math.PI * profile.wheelDiameterCm / 2.54;
        return outputRpm(motor) * circumferenceInches / 60.0;
    }

    private static void clampToField() {
        double sideExtent = Math.abs(Math.cos(heading)) * robotWidthInches() * 0.5 +
            Math.abs(Math.sin(heading)) * robotLengthInches() * 0.5;
        double forwardExtent = Math.abs(Math.sin(heading)) * robotWidthInches() * 0.5 +
            Math.abs(Math.cos(heading)) * robotLengthInches() * 0.5;
        x = Math.max(-fieldWidthInches() * 0.5 + sideExtent,
            Math.min(fieldWidthInches() * 0.5 - sideExtent, x));
        y = Math.max(-fieldLengthInches() * 0.5 + forwardExtent,
            Math.min(fieldLengthInches() * 0.5 - forwardExtent, y));
    }

    private static SimulationSettings requireSettings() {
        if (settings == null) {
            try {
                settings = SimulationSettings.load(null);
            } catch (java.io.IOException error) {
                throw new IllegalStateException("Unable to load default simulation settings.", error);
            }
        }
        return settings;
    }

    private static final class SimulationSettingsDefaults {
        private static final SimulationSettings.MotorProfile MOTOR = defaultMotorProfile();

        private static SimulationSettings.MotorProfile defaultMotorProfile() {
            try {
                return SimulationSettings.load(null).defaultMotor;
            } catch (java.io.IOException error) {
                throw new ExceptionInInitializerError(error);
            }
        }
    }

    private static int wheelIndex(String name) {
        if (name.contains("frontleft") || name.contains("leftfront") || name.equals("fl") || name.startsWith("flmotor")) return 0;
        if (name.contains("frontright") || name.contains("rightfront") || name.equals("fr") || name.startsWith("frmotor")) return 1;
        if (name.contains("rearleft") || name.contains("backleft") || name.contains("leftrear") || name.contains("leftback") ||
            name.equals("rl") || name.equals("bl") || name.startsWith("rlmotor") || name.startsWith("blmotor")) return 2;
        if (name.contains("rearright") || name.contains("backright") || name.contains("rightrear") || name.contains("rightback") ||
            name.equals("rr") || name.equals("br") || name.startsWith("rrmotor") || name.startsWith("brmotor")) return 3;
        return -1;
    }
}
