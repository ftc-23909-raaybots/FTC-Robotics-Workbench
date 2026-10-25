package org.firstinspires.ftc.robotcore.external.navigation;

public enum DistanceUnit {
    MM, CM, METER, INCH;

    public double fromMm(double millimeters) {
        switch (this) {
            case CM: return millimeters / 10.0;
            case METER: return millimeters / 1000.0;
            case INCH: return millimeters / 25.4;
            default: return millimeters;
        }
    }

    public double toMm(double distance) {
        switch (this) {
            case CM: return distance * 10.0;
            case METER: return distance * 1000.0;
            case INCH: return distance * 25.4;
            default: return distance;
        }
    }
}
