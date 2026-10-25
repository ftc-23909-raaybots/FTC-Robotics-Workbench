const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

function findJavaTools() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, "bin"));
  const which = spawnSync(process.platform === "win32" ? "where.exe" : "which", ["javac"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (which.status === 0) {
    candidates.push(...which.stdout.split(/\r?\n/).filter(Boolean).map(path.dirname));
  }
  for (const bin of candidates) {
    const javac = path.join(bin, process.platform === "win32" ? "javac.exe" : "javac");
    const java = path.join(bin, process.platform === "win32" ? "java.exe" : "java");
    if (fs.existsSync(javac) && fs.existsSync(java)) return { javac, java };
  }
  throw new Error("Java simulator tests require a JDK on JAVA_HOME or PATH.");
}

function runCommand(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) reject(new Error(`${path.basename(executable)} failed:\n${stderr || stdout}`));
      else resolve(stdout);
    });
  });
}

function runOpMode(java, classpath, state, settingsPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(java, [
      "-cp",
      classpath,
      "org.raaybots.sim.SimulatorRunner",
      "run",
      "org.firstinspires.ftc.teamcode.MecanumDriveTeleOp",
      settingsPath,
    ], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    let buffer = "";
    const events = [];
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill();
      finish(new Error("Mecanum OpMode runtime test timed out."));
    }, 8000);

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve(events);
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        try {
          events.push(JSON.parse(line));
        } catch {
          stderr += line;
        }
      }
      const hasExpectedDrive = (event) => {
        if (event.event !== "telemetry_update") return false;
        const motors = event.data?.simulator?.motors;
        const position = event.data?.simulator?.pose?.[state.pose];
        const actual = [
          motors?.frontLeft?.power,
          motors?.frontRight?.power,
          motors?.rearLeft?.power,
          motors?.rearRight?.power,
        ];
        return Number.isFinite(position) && Math.abs(position) > 0.0001 &&
          actual.every((power, index) =>
          Number.isFinite(power) && Math.abs(power - state.expected[index]) < 0.001,
        );
      };
      const telemetry = events.find((event) =>
        hasExpectedDrive(event),
      );
      const screen = events.find((event) =>
        event.event === "telemetry_screen" &&
        event.data?.items?.some((item) => item.value === "MECANUM OUTPUT"),
      );
      if (telemetry && screen) {
        child.stdin.write('{"type":"stop"}\n');
      }
    });
    child.once("close", (code) => {
      if (code !== 0) {
        finish(new Error(`Simulator exited with code ${code}: ${stderr}`));
      } else {
        finish();
      }
    });
    child.stdin.write(JSON.stringify({ type: "gamepad", gamepad: 1, state: state.input }) + "\n");
  });
}

test("mecanum inputs drive all wheels and publish the FTC telemetry screen", {
  timeout: 30000,
}, async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "raaybots-simulator-java-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const javaTools = findJavaTools();
  const sdkOutput = path.join(root, "sdk classes");
  const projectOutput = path.join(root, "project classes");
  fs.mkdirSync(sdkOutput);
  fs.mkdirSync(projectOutput);

  const workspaceRoot = path.resolve(__dirname, "..");
  const sdkRoot = path.join(__dirname, "simulator-sdk", "src");
  const sampleRoot = path.join(workspaceRoot, "examples", "simulator-project");
  const sdkFiles = [];
  const sampleFiles = [];
  const collectJavaFiles = (directory, target) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const source = path.join(directory, entry.name);
      if (entry.isDirectory()) collectJavaFiles(source, target);
      else if (entry.isFile() && entry.name.endsWith(".java")) target.push(source);
    }
  };
  collectJavaFiles(sdkRoot, sdkFiles);
  collectJavaFiles(sampleRoot, sampleFiles);

  await runCommand(javaTools.javac, [
    "--release", "8", "-Xlint:-options", "-encoding", "UTF-8", "-d", sdkOutput, ...sdkFiles,
  ]);
  await runCommand(javaTools.javac, [
    "--release", "8", "-Xlint:-options", "-encoding", "UTF-8",
    "-classpath", sdkOutput, "-d", projectOutput, ...sampleFiles,
  ]);
  const classpath = `${sdkOutput}${path.delimiter}${projectOutput}`;
  const list = JSON.parse(await runCommand(javaTools.java, [
    "-cp", classpath, "org.raaybots.sim.SimulatorRunner", "list",
  ]));
  assert.ok(list.opModes.some((mode) =>
    mode.className === "org.firstinspires.ftc.teamcode.MecanumDriveTeleOp",
  ));

  const settingsPath = path.join(root, "hardware-settings.properties");
  fs.writeFileSync(settingsPath, [
    "field.widthIn=144",
    "field.lengthIn=144",
    "robot.widthCm=40",
    "robot.lengthCm=37",
    "motor.default.maxRpm=6000",
    "motor.default.gearRatio=19.2",
    "motor.default.wheelDiameterCm=9.6",
    "motor.default.ticksPerRev=28",
    "motor.count=1",
    "motor.0.name=frontLeft",
    "motor.0.maxRpm=5000",
    "motor.0.gearRatio=10",
    "motor.0.wheelDiameterCm=10",
    "motor.0.ticksPerRev=28",
    "sensor.count=5",
    "sensor.0.name=frontRange",
    "sensor.0.type=distance",
    "sensor.0.direction=front",
    "sensor.1.name=floorColor",
    "sensor.1.type=color",
    "sensor.1.direction=down",
    "sensor.2.name=battery",
    "sensor.2.type=voltage",
    "sensor.2.direction=front",
    "sensor.3.name=wallTouch",
    "sensor.3.type=digital",
    "sensor.3.direction=front",
    "sensor.4.name=touchPad",
    "sensor.4.type=touch",
    "sensor.4.direction=front",
  ].join("\n") + "\n");

  const movements = [
    {
      name: "forward",
      input: { leftStickY: -0.5, leftStickX: 0, rightStickX: 0 },
      expected: [0.5, 0.5, 0.5, 0.5],
      pose: "y",
    },
    {
      name: "strafe",
      input: { leftStickY: 0, leftStickX: 0.75, rightStickX: 0 },
      expected: [0.75, -0.75, -0.75, 0.75],
      pose: "x",
    },
    {
      name: "rotate",
      input: { leftStickY: 0, leftStickX: 0, rightStickX: 0.4 },
      expected: [0.4, -0.4, 0.4, -0.4],
      pose: "heading",
    },
  ];

  for (const movement of movements) {
    const events = await runOpMode(javaTools.java, classpath, movement, settingsPath);
    const frame = events.find((event) =>
      event.event === "telemetry_update" &&
      Number.isFinite(event.data?.simulator?.pose?.[movement.pose]) &&
      Math.abs(event.data.simulator.pose[movement.pose]) > 0.0001 &&
      [
        event.data?.simulator?.motors?.frontLeft?.power,
        event.data?.simulator?.motors?.frontRight?.power,
        event.data?.simulator?.motors?.rearLeft?.power,
        event.data?.simulator?.motors?.rearRight?.power,
      ].every((power, index) =>
        Number.isFinite(power) && Math.abs(power - movement.expected[index]) < 0.001,
      ),
    );
    assert.ok(frame, `${movement.name} should produce the expected four-wheel mecanum mix`);
    assert.notEqual(frame.data.simulator.pose[movement.pose], 0, `${movement.name} should move the simulated robot`);
    assert.equal(frame.data.simulator.field.widthIn, 144);
    assert.equal(frame.data.simulator.field.lengthIn, 144);
    assert.equal(frame.data.simulator.field.robotWidthCm, 40);
    assert.equal(frame.data.simulator.field.robotLengthCm, 37);
    assert.equal(frame.data.simulator.motors.frontLeft.maxRpm, 5000);
    assert.equal(frame.data.simulator.motors.frontLeft.gearRatio, 10);
    assert.equal(frame.data.simulator.motors.frontLeft.wheelDiameterCm, 10);
    assert.ok(Math.abs(
      frame.data.simulator.motors.frontLeft.outputRpm -
      frame.data.simulator.motors.frontLeft.velocity / 28 * 60 / 10,
    ) < 0.001, "motor output speed should apply its configured gear reduction");
    assert.ok(frame.data.simulator.sensors.frontRange.distanceMm > 1300);
    assert.equal(frame.data.simulator.sensors.floorColor.type, "COLOR");
    assert.equal(frame.data.simulator.sensors.floorColor.alpha, 255);
    assert.ok(frame.data.simulator.sensors.battery.voltage <= 12.6);
    assert.equal(typeof frame.data.simulator.sensors.wallTouch.state, "boolean");
    assert.equal(typeof frame.data.simulator.sensors.touchPad.pressed, "boolean");

    const screenEvent = events.find((event) =>
      event.event === "telemetry_screen" &&
      event.data?.items?.some((item) => item.value === "MECANUM OUTPUT"),
    );
    assert.ok(screenEvent, "telemetry.update() should publish a driver-station display frame");
    const captions = screenEvent.data.items.map((item) => item.caption);
    assert.ok(captions.includes("Forward"));
    assert.ok(captions.includes("Strafe"));
    assert.ok(captions.includes("Rotate"));
    assert.ok(captions.includes("Front range"));
    assert.ok(captions.includes("Floor RGB"));
  }
});
