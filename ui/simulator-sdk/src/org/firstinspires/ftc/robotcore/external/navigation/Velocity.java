package org.firstinspires.ftc.robotcore.external.navigation;

public class Velocity {
    public final double xVeloc;
    public final double yVeloc;
    public final double zVeloc;
    public final AngleUnit unit;
    public Velocity(AngleUnit unit, double x, double y, double z) {
        this.unit = unit; this.xVeloc = x; this.yVeloc = y; this.zVeloc = z;
    }
}
