package org.firstinspires.ftc.robotcore.external.navigation;

public class Orientation {
    public final AngleUnit angleUnit;
    public final AxesReference axesReference;
    public final AxesOrder axesOrder;
    public final float firstAngle, secondAngle, thirdAngle;
    public Orientation(AngleUnit unit, AxesReference reference, AxesOrder order, float first, float second, float third, long time) {
        angleUnit = unit; axesReference = reference; axesOrder = order;
        firstAngle = first; secondAngle = second; thirdAngle = third;
    }
}
