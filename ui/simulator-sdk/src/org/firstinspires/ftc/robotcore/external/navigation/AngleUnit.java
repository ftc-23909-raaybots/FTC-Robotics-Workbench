package org.firstinspires.ftc.robotcore.external.navigation;

public enum AngleUnit {
    DEGREES, RADIANS;

    public double fromRadians(double radians) {
        return this == DEGREES ? Math.toDegrees(radians) : radians;
    }

    public double toRadians(double angle) {
        return this == DEGREES ? Math.toRadians(angle) : angle;
    }
}
