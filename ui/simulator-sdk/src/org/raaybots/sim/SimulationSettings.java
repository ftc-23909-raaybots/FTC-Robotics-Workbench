package org.raaybots.sim;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

public final class SimulationSettings {
    public final double fieldWidthIn;
    public final double fieldLengthIn;
    public final double robotWidthCm;
    public final double robotLengthCm;
    public final MotorProfile defaultMotor;
    public final Map<String, MotorProfile> motors;
    public final Map<String, SensorProfile> sensors;

    private SimulationSettings(Properties properties) {
        fieldWidthIn = number(properties, "field.widthIn", 144, 12, 1000);
        fieldLengthIn = number(properties, "field.lengthIn", 144, 12, 1000);
        robotWidthCm = number(properties, "robot.widthCm", 40, 5, 200);
        robotLengthCm = number(properties, "robot.lengthCm", 37, 5, 200);
        defaultMotor = motor(properties, "motor.default.");
        motors = new LinkedHashMap<>();
        sensors = new LinkedHashMap<>();

        int motorCount = count(properties, "motor.count");
        for (int index = 0; index < motorCount; index++) {
            String prefix = "motor." + index + ".";
            String name = required(properties, prefix + "name");
            motors.put(name, motor(properties, prefix));
        }

        int sensorCount = count(properties, "sensor.count");
        for (int index = 0; index < sensorCount; index++) {
            String prefix = "sensor." + index + ".";
            String name = required(properties, prefix + "name");
            String type = required(properties, prefix + "type");
            String direction = properties.getProperty(prefix + "direction", "front");
            if (!("distance".equals(type) || "color".equals(type) || "analog".equals(type) ||
                "digital".equals(type) || "touch".equals(type) || "voltage".equals(type))) {
                throw new IllegalArgumentException("Unsupported configured sensor type: " + type);
            }
            if (!("front".equals(direction) || "back".equals(direction) || "left".equals(direction) ||
                "right".equals(direction) || "down".equals(direction))) {
                throw new IllegalArgumentException("Unsupported configured sensor direction: " + direction);
            }
            sensors.put(name, new SensorProfile(type, direction));
        }
    }

    public static SimulationSettings load(Path path) throws IOException {
        Properties properties = new Properties();
        if (path != null && Files.exists(path)) {
            try (InputStream input = Files.newInputStream(path)) {
                properties.load(input);
            }
        }
        return new SimulationSettings(properties);
    }

    public MotorProfile motor(String name) {
        return motors.getOrDefault(name, defaultMotor);
    }

    private static MotorProfile motor(Properties properties, String prefix) {
        return new MotorProfile(
            number(properties, prefix + "maxRpm", 6000, 100, 20000),
            number(properties, prefix + "gearRatio", 19.2, 0.1, 200),
            number(properties, prefix + "wheelDiameterCm", 9.6, 1, 30),
            number(properties, prefix + "ticksPerRev", 28, 1, 10000)
        );
    }

    private static double number(Properties properties, String key, double fallback, double min, double max) {
        String value = properties.getProperty(key);
        if (value == null) return fallback;
        try {
            double parsed = Double.parseDouble(value);
            if (!Double.isFinite(parsed) || parsed < min || parsed > max) {
                throw new IllegalArgumentException("Simulation setting is out of range: " + key);
            }
            return parsed;
        } catch (NumberFormatException error) {
            throw new IllegalArgumentException("Simulation setting is not numeric: " + key, error);
        }
    }

    private static int count(Properties properties, String key) {
        String value = properties.getProperty(key, "0");
        try {
            int parsed = Integer.parseInt(value);
            if (parsed < 0 || parsed > 32) throw new IllegalArgumentException("Invalid setting count: " + key);
            return parsed;
        } catch (NumberFormatException error) {
            throw new IllegalArgumentException("Invalid setting count: " + key, error);
        }
    }

    private static String required(Properties properties, String key) {
        String value = properties.getProperty(key);
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing simulation setting: " + key);
        }
        return value.trim();
    }

    public static final class MotorProfile {
        public final double maxRpm;
        public final double gearRatio;
        public final double wheelDiameterCm;
        public final double ticksPerRev;

        private MotorProfile(double maxRpm, double gearRatio, double wheelDiameterCm, double ticksPerRev) {
            this.maxRpm = maxRpm;
            this.gearRatio = gearRatio;
            this.wheelDiameterCm = wheelDiameterCm;
            this.ticksPerRev = ticksPerRev;
        }
    }

    public static final class SensorProfile {
        public final String type;
        public final String direction;

        private SensorProfile(String type, String direction) {
            this.type = type;
            this.direction = direction;
        }
    }
}
