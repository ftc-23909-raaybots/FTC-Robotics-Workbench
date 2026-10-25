package org.firstinspires.ftc.robotcore.external.navigation;

public class YawPitchRollAngles {
    private final double yaw;
    private final double pitch;
    private final double roll;
    private final long acquisitionTime;

    public YawPitchRollAngles(AngleUnit unit, double yaw, double pitch, double roll, long acquisitionTime) {
        this.yaw = unit.toRadians(yaw);
        this.pitch = unit.toRadians(pitch);
        this.roll = unit.toRadians(roll);
        this.acquisitionTime = acquisitionTime;
    }

    public double getYaw(AngleUnit unit) { return unit.fromRadians(yaw); }
    public double getPitch(AngleUnit unit) { return unit.fromRadians(pitch); }
    public double getRoll(AngleUnit unit) { return unit.fromRadians(roll); }
    public long getAcquisitionTime() { return acquisitionTime; }
}
