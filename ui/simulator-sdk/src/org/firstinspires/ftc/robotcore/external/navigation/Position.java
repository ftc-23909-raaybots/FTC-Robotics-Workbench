package org.firstinspires.ftc.robotcore.external.navigation;

public class Position {
    public final DistanceUnit unit;
    public final double x, y, z;
    public final long acquisitionTime;
    public Position(DistanceUnit unit, double x, double y, double z, long acquisitionTime) {
        this.unit = unit; this.x = x; this.y = y; this.z = z; this.acquisitionTime = acquisitionTime;
    }
}
