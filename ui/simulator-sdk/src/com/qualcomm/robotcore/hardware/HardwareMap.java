package com.qualcomm.robotcore.hardware;

import com.qualcomm.hardware.bosch.BNO055IMU;
import com.qualcomm.robotcore.hardware.IMU;
import java.util.*;

public class HardwareMap {
    private final Map<String, Object> devices = new LinkedHashMap<>();
    public synchronized <T> T get(Class<? extends T> type, String name) {
        Object existing = devices.get(name);
        if (existing == null) {
            existing = create(type, name);
            devices.put(name, existing);
        }
        if (!type.isInstance(existing)) throw new IllegalArgumentException("Device '" + name + "' is already configured as " + existing.getClass().getSimpleName());
        return type.cast(existing);
    }
    public synchronized <T> T tryGet(Class<? extends T> type, String name) {
        Object existing = devices.get(name);
        return existing == null ? null : type.isInstance(existing) ? type.cast(existing) : null;
    }
    public synchronized <T> List<T> getAll(Class<? extends T> type) {
        List<T> result = new ArrayList<>();
        for (Object value : devices.values()) if (type.isInstance(value)) result.add(type.cast(value));
        return result;
    }
    public synchronized Set<String> getNamesOf(Object device) {
        Set<String> names = new LinkedHashSet<>();
        for (Map.Entry<String, Object> entry : devices.entrySet()) if (entry.getValue() == device) names.add(entry.getKey());
        return names;
    }
    private Object create(Class<?> type, String name) {
        if (type == DcMotorEx.class) return new DcMotorEx(name);
        if (type == DcMotor.class) return new DcMotor(name);
        if (type == Servo.class) return new Servo(name);
        if (type == CRServo.class) return new CRServo(name);
        if (type == IMU.class) return new IMU(name);
        if (type == BNO055IMU.class) return new BNO055IMU(name);
        if (type == AnalogInput.class) return new AnalogInput(name);
        if (type == DigitalChannel.class) return new DigitalChannel(name);
        if (type == TouchSensor.class) return new TouchSensor(name);
        if (type == DistanceSensor.class) return new DistanceSensor(name);
        if (type == ColorSensor.class) return new ColorSensor(name);
        if (type == VoltageSensor.class) return new VoltageSensor(name);
        throw new IllegalArgumentException("Unsupported simulated hardware device: " + type.getName());
    }
    public synchronized Collection<Object> devices() { return new ArrayList<>(devices.values()); }
}
