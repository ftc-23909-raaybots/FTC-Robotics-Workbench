package com.qualcomm.robotcore.hardware;

public class Gamepad {
    public volatile float left_stick_x, left_stick_y, right_stick_x, right_stick_y;
    public volatile float left_trigger, right_trigger;
    public volatile boolean a, b, x, y, guide, start, back;
    public volatile boolean dpad_up, dpad_down, dpad_left, dpad_right;
    public volatile boolean left_bumper, right_bumper, left_stick_button, right_stick_button;

    public void reset() {
        left_stick_x = left_stick_y = right_stick_x = right_stick_y = 0;
        left_trigger = right_trigger = 0;
        a = b = x = y = guide = start = back = false;
        dpad_up = dpad_down = dpad_left = dpad_right = false;
        left_bumper = right_bumper = left_stick_button = right_stick_button = false;
    }
}
