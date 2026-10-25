package org.raaybots.sim;

import com.qualcomm.hardware.bosch.BNO055IMU;
import com.qualcomm.robotcore.eventloop.opmode.*;
import com.qualcomm.robotcore.hardware.*;
import java.io.*;
import java.lang.annotation.Annotation;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;
import org.firstinspires.ftc.robotcore.external.Telemetry;
import org.firstinspires.ftc.robotcore.external.navigation.YawPitchRollAngles;

public final class SimulatorRunner {
    private static final long TICK_MS = 20;
    private static final long OUTPUT_MS = 50;
    private static final Pattern CLASS_NAME = Pattern.compile("[A-Za-z_$][\\w$]*(\\.[A-Za-z_$][\\w$]*)*");
    private SimulatorRunner() {}

    public static void main(String[] args) throws Exception {
        if (args.length < 1) throw new IllegalArgumentException("Expected list or run and an OpMode class name.");
        Path classes = Paths.get(System.getProperty("java.class.path").split(Pattern.quote(File.pathSeparator))[1]);
        if ("list".equals(args[0])) {
            System.out.println("{\"opModes\":" + json(discover(classes)) + "}");
            return;
        }
        if (args.length < 2 || !"run".equals(args[0]) || !CLASS_NAME.matcher(args[1]).matches()) {
            throw new IllegalArgumentException("Invalid simulator command or OpMode class name.");
        }
        SimulationSettings settings = SimulationSettings.load(args.length > 2 ? Paths.get(args[2]) : null);
        SimulatorRuntime.configure(settings);
        run(args[1]);
    }

    private static List<Map<String, String>> discover(Path classes) throws Exception {
        List<Map<String, String>> result = new ArrayList<>();
        try (URLClassLoader loader = new URLClassLoader(new URL[] { classes.toUri().toURL() }, SimulatorRunner.class.getClassLoader())) {
            for (Path file : (Iterable<Path>) Files.walk(classes)::iterator) {
                if (!file.toString().endsWith(".class") || file.getFileName().toString().contains("$")) continue;
                String name = classes.relativize(file).toString().replace(File.separatorChar, '.').replaceAll("\\.class$", "");
                try {
                    Class<?> candidate = Class.forName(name, false, loader);
                    if (candidate == OpMode.class || candidate == LinearOpMode.class ||
                        candidate.isInterface() || java.lang.reflect.Modifier.isAbstract(candidate.getModifiers()) ||
                        !OpMode.class.isAssignableFrom(candidate) || candidate.isAnnotationPresent(Disabled.class)) continue;
                    String displayName = candidate.getSimpleName();
                    Annotation teleOp = candidate.getAnnotation(TeleOp.class);
                    Annotation autonomous = candidate.getAnnotation(Autonomous.class);
                    if (teleOp instanceof TeleOp && !((TeleOp) teleOp).name().isEmpty()) displayName = ((TeleOp) teleOp).name();
                    if (autonomous instanceof Autonomous && !((Autonomous) autonomous).name().isEmpty()) displayName = ((Autonomous) autonomous).name();
                    Map<String, String> item = new LinkedHashMap<>();
                    item.put("className", candidate.getName());
                    item.put("name", displayName);
                    item.put("kind", autonomous != null ? "Autonomous" : "TeleOp");
                    result.add(item);
                } catch (LinkageError | ClassNotFoundException ignored) {
                }
            }
        }
        result.sort(Comparator.comparing(item -> item.get("name").toLowerCase(Locale.ROOT)));
        return result;
    }

    private static void run(String className) throws Exception {
        Class<?> type = Class.forName(className);
        if (!OpMode.class.isAssignableFrom(type) || type.isAnnotationPresent(Disabled.class)) {
            throw new IllegalArgumentException("Selected class is not an enabled OpMode: " + className);
        }
        OpMode opMode = (OpMode) type.getDeclaredConstructor().newInstance();
        SimulatorRuntimeGamepad = opMode;
        long start = System.nanoTime();
        try {
            opMode.init();
            opMode.start();
            SimulatorRuntime.started = true;
            emit("{\"event\":\"status\",\"state\":\"running\",\"opMode\":" + quote(className) + "}");
            Thread linearThread = null;
            if (opMode instanceof LinearOpMode) {
                linearThread = new Thread(() -> {
                    try {
                        ((LinearOpMode) opMode).runOpMode();
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                    } catch (Throwable error) {
                        emitError(error);
                        SimulatorRuntime.stopRequested = true;
                    } finally {
                        SimulatorRuntime.stopRequested = true;
                    }
                }, "ftc-linear-opmode");
                linearThread.setDaemon(true);
                linearThread.start();
            }
            Thread input = new Thread(SimulatorRunner::readCommands, "simulator-input");
            input.setDaemon(true);
            input.start();
            long lastTick = System.nanoTime();
            long lastOutput = 0;
            while (!SimulatorRuntime.stopRequested) {
                long now = System.nanoTime();
                double elapsed = Math.min(0.1, Math.max(0.001, (now - lastTick) / 1_000_000_000.0));
                lastTick = now;
                opMode.time = (now - start) / 1_000_000_000.0;
                if (!(opMode instanceof LinearOpMode)) opMode.loop();
                SimulatorRuntime.tick(elapsed);
                if (now - lastOutput >= OUTPUT_MS * 1_000_000L) {
                    emitTelemetry(className, opMode.time);
                    lastOutput = now;
                }
                Thread.sleep(TICK_MS);
            }
            if (linearThread != null) linearThread.interrupt();
        } catch (Throwable error) {
            emitError(error);
        } finally {
            SimulatorRuntime.stopRequested = true;
            try { opMode.stop(); } catch (Throwable error) { emitError(error); }
            emit("{\"event\":\"stopped\"}");
        }
    }

    private static void readCommands() {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.contains("\"type\":\"stop\"")) { SimulatorRuntime.stopRequested = true; continue; }
                int gamepadIndex = number(line, "gamepad", 1);
                Gamepad pad = gamepadIndex == 2 ? currentGamepad2 : currentGamepad1;
                updateGamepad(line, pad);
            }
        } catch (IOException error) {
            emitError(error);
        }
    }

    private static final Gamepad currentGamepad1 = new Gamepad();
    private static final Gamepad currentGamepad2 = new Gamepad();
    private static void updateGamepad(String json, Gamepad pad) {
        pad.left_stick_x = (float)decimal(json, "leftStickX", pad.left_stick_x);
        pad.left_stick_y = (float)decimal(json, "leftStickY", pad.left_stick_y);
        pad.right_stick_x = (float)decimal(json, "rightStickX", pad.right_stick_x);
        pad.right_stick_y = (float)decimal(json, "rightStickY", pad.right_stick_y);
        pad.left_trigger = (float)decimal(json, "leftTrigger", pad.left_trigger);
        pad.right_trigger = (float)decimal(json, "rightTrigger", pad.right_trigger);
        pad.a = bool(json, "a", pad.a); pad.b = bool(json, "b", pad.b);
        pad.x = bool(json, "x", pad.x); pad.y = bool(json, "y", pad.y);
        pad.left_bumper = bool(json, "leftBumper", pad.left_bumper);
        pad.right_bumper = bool(json, "rightBumper", pad.right_bumper);
        pad.dpad_up = bool(json, "dpadUp", pad.dpad_up);
        pad.dpad_down = bool(json, "dpadDown", pad.dpad_down);
        pad.dpad_left = bool(json, "dpadLeft", pad.dpad_left);
        pad.dpad_right = bool(json, "dpadRight", pad.dpad_right);
        pad.start = bool(json, "start", pad.start); pad.back = bool(json, "back", pad.back);
        copy(pad, gamepadIndex(pad));
    }
    private static Gamepad gamepadIndex(Gamepad pad) { return pad == currentGamepad2 ? currentGamepad2 : currentGamepad1; }
    private static void copy(Gamepad source, Gamepad ignored) {
        copyFields(source, SimulatorRuntimeGamepad, source == currentGamepad2 ? 2 : 1);
    }
    private static void copyFields(Gamepad source, OpMode opMode, int index) {
        if (opMode == null) return;
        Gamepad target = index == 2 ? opMode.gamepad2 : opMode.gamepad1;
        target.left_stick_x = source.left_stick_x; target.left_stick_y = source.left_stick_y;
        target.right_stick_x = source.right_stick_x; target.right_stick_y = source.right_stick_y;
        target.left_trigger = source.left_trigger; target.right_trigger = source.right_trigger;
        target.a = source.a; target.b = source.b; target.x = source.x; target.y = source.y;
        target.left_bumper = source.left_bumper; target.right_bumper = source.right_bumper;
        target.dpad_up = source.dpad_up; target.dpad_down = source.dpad_down;
        target.dpad_left = source.dpad_left; target.dpad_right = source.dpad_right;
        target.start = source.start; target.back = source.back;
    }
    private static volatile OpMode SimulatorRuntimeGamepad;

    private static double decimal(String json, String key, double fallback) {
        Matcher matcher = Pattern.compile("\"" + key + "\"\\s*:\\s*(-?[0-9]+(?:\\.[0-9]+)?)").matcher(json);
        return matcher.find() ? Double.parseDouble(matcher.group(1)) : fallback;
    }
    private static int number(String json, String key, int fallback) { return (int)decimal(json, key, fallback); }
    private static boolean bool(String json, String key, boolean fallback) {
        Matcher matcher = Pattern.compile("\"" + key + "\"\\s*:\\s*(true|false)").matcher(json);
        return matcher.find() ? Boolean.parseBoolean(matcher.group(1)) : fallback;
    }

    private static void emitTelemetry(String className, double time) {
        StringBuilder data = new StringBuilder();
        data.append("{\"simulator\":{\"opmode\":").append(quote(className))
            .append(",\"time\":").append(time)
            .append(",\"pose\":{\"x\":").append(SimulatorRuntime.x)
            .append(",\"y\":").append(SimulatorRuntime.y)
            .append(",\"heading\":").append(Math.toDegrees(SimulatorRuntime.heading)).append("},\"field\":{\"widthIn\":")
            .append(SimulatorRuntime.fieldWidthInches()).append(",\"lengthIn\":").append(SimulatorRuntime.fieldLengthInches())
            .append(",\"robotWidthCm\":").append(SimulatorRuntime.robotWidthCm)
            .append(",\"robotLengthCm\":").append(SimulatorRuntime.robotLengthCm).append("},\"motors\":{");
        boolean first = true;
        for (Object item : SimulatorRuntime.hardwareMap.devices()) {
            if (item instanceof DcMotor) {
                DcMotor motor = (DcMotor)item;
                if (!first) data.append(',');
                first = false;
                data.append(quote(motor.getDeviceName())).append(":{\"power\":").append(motor.getPower())
                    .append(",\"position\":").append(motor.getCurrentPosition()).append(",\"velocity\":").append(motor.getVelocity())
                    .append(",\"maxRpm\":").append(motor.getMaxRpm())
                    .append(",\"gearRatio\":").append(motor.getGearRatio())
                    .append(",\"outputRpm\":").append(SimulatorRuntime.outputRpm(motor))
                    .append(",\"wheelDiameterCm\":").append(motor.getWheelDiameterCm()).append('}');
            }
        }
        data.append("},\"servos\":{");
        first = true;
        for (Object item : SimulatorRuntime.hardwareMap.devices()) {
            if (item instanceof Servo) {
                Servo servo = (Servo)item;
                if (!first) data.append(',');
                first = false;
                data.append(quote(servo.getDeviceName())).append(':').append(servo.getPosition());
            }
        }
        data.append("},\"sensors\":{");
        first = true;
        for (Object item : SimulatorRuntime.hardwareMap.devices()) {
            Map<String, Object> sensor = sensorSnapshot(item);
            if (sensor == null) continue;
            if (!first) data.append(',');
            first = false;
            data.append(quote(deviceName(item))).append(':').append(json(sensor));
        }
        data.append("},\"telemetry\":").append(json(SimulatorRuntime.telemetry.snapshot())).append("}}");
        emit("{\"event\":\"telemetry_update\",\"data\":" + data + "}");
        emit("{\"event\":\"telemetry_screen\",\"data\":{\"opmode\":" + quote(className)
            + ",\"time\":" + time
            + ",\"items\":" + json(SimulatorRuntime.telemetry.displaySnapshot())
            + ",\"log\":" + json(SimulatorRuntime.telemetry.log().snapshot()) + "}}");
    }

    private static String deviceName(Object item) {
        if (item instanceof VoltageSensor) return ((VoltageSensor)item).getDeviceName();
        if (item instanceof DistanceSensor) return ((DistanceSensor)item).getDeviceName();
        if (item instanceof ColorSensor) return ((ColorSensor)item).getDeviceName();
        if (item instanceof AnalogInput) return ((AnalogInput)item).getDeviceName();
        if (item instanceof DigitalChannel) return ((DigitalChannel)item).getDeviceName();
        if (item instanceof TouchSensor) return ((TouchSensor)item).getDeviceName();
        if (item instanceof IMU) return ((IMU)item).getDeviceName();
        if (item instanceof BNO055IMU) return ((BNO055IMU)item).getDeviceName();
        return "sensor";
    }

    private static Map<String, Object> sensorSnapshot(Object item) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (item instanceof DistanceSensor) {
            result.put("type", "DISTANCE");
            result.put("distanceMm", ((DistanceSensor)item).getDistance(org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit.MM));
        } else if (item instanceof ColorSensor) {
            ColorSensor color = (ColorSensor)item;
            result.put("type", "COLOR");
            result.put("red", color.red());
            result.put("green", color.green());
            result.put("blue", color.blue());
            result.put("alpha", color.alpha());
        } else if (item instanceof AnalogInput) {
            result.put("type", "ANALOG");
            result.put("voltage", ((AnalogInput)item).getVoltage());
        } else if (item instanceof DigitalChannel) {
            result.put("type", "DIGITAL");
            result.put("state", ((DigitalChannel)item).getState());
        } else if (item instanceof TouchSensor) {
            result.put("type", "TOUCH");
            result.put("pressed", ((TouchSensor)item).isPressed());
        } else if (item instanceof VoltageSensor) {
            result.put("type", "VOLTAGE");
            result.put("voltage", ((VoltageSensor)item).getVoltage());
        } else if (item instanceof IMU || item instanceof BNO055IMU) {
            result.put("type", "IMU");
            result.put("headingDeg", Math.toDegrees(SimulatorRuntime.heading));
        } else {
            return null;
        }
        return result;
    }

    private static void emitError(Throwable error) {
        emit("{\"event\":\"error\",\"message\":" + quote(error.toString()) + "}");
    }
    private static void emit(String line) { System.out.println(line); System.out.flush(); }
    private static String json(Object value) {
        if (value == null) return "null";
        if (value instanceof Number || value instanceof Boolean) return value.toString();
        if (value instanceof Map) {
            StringBuilder output = new StringBuilder("{");
            boolean first = true;
            for (Object entryObject : ((Map<?, ?>)value).entrySet()) {
                Map.Entry<?, ?> entry = (Map.Entry<?, ?>)entryObject;
                if (!first) output.append(',');
                first = false;
                output.append(quote(String.valueOf(entry.getKey()))).append(':').append(json(entry.getValue()));
            }
            return output.append('}').toString();
        }
        if (value instanceof Iterable) {
            StringBuilder output = new StringBuilder("[");
            boolean first = true;
            for (Object item : (Iterable<?>)value) {
                if (!first) output.append(',');
                first = false;
                output.append(json(item));
            }
            return output.append(']').toString();
        }
        return quote(String.valueOf(value));
    }
    private static String quote(String value) {
        StringBuilder result = new StringBuilder("\"");
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"': result.append("\\\""); break;
                case '\\': result.append("\\\\"); break;
                case '\n': result.append("\\n"); break;
                case '\r': result.append("\\r"); break;
                case '\t': result.append("\\t"); break;
                default: if (c < 32) result.append(String.format("\\u%04x", (int)c)); else result.append(c);
            }
        }
        return result.append('"').toString();
    }
}
