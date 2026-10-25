package com.qualcomm.robotcore.util;
public class ElapsedTime {
    private long start = System.nanoTime();
    public void reset() { start = System.nanoTime(); }
    public double seconds() { return (System.nanoTime() - start) / 1_000_000_000.0; }
    public double milliseconds() { return seconds() * 1000.0; }
    @Override public String toString() { return String.format("%.3f", seconds()); }
}
