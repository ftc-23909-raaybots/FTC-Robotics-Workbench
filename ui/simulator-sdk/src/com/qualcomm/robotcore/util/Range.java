package com.qualcomm.robotcore.util;
public final class Range {
    private Range() {}
    public static double clip(double value, double min, double max) { return Math.max(min, Math.min(max, value)); }
    public static float clip(float value, float min, float max) { return Math.max(min, Math.min(max, value)); }
    public static double scale(double value, double min, double max, double outMin, double outMax) {
        return outMin + (value - min) * (outMax - outMin) / (max - min);
    }
}
