const assert = require("node:assert/strict");
const test = require("node:test");
const {
  checkOnBotJava,
  uploadJavaSource,
  buildOnBotJava,
} = require("./onbot-api.cjs");
const { createOnBotJavaEmulator } = require("./onbot-emulator.cjs");

test("local OnBotJava mock supports the desktop connection, upload, and build flow", async () => {
  const emulator = createOnBotJavaEmulator();
  try {
    const started = await emulator.start();
    assert.equal(started.running, true);
    assert.equal(new URL(started.origin).hostname, "127.0.0.1");
    assert.deepEqual(await emulator.start(), started);

    assert.deepEqual(await checkOnBotJava(started.origin), {
      connected: true,
      sourceFiles: 0,
      sourcePaths: [],
      allowExternalLibraries: false,
    });

    const source = "package org.firstinspires.ftc.teamcode;\nclass DriveTeleOp {}\n";
    const upload = await uploadJavaSource(started.origin, "DriveTeleOp.java", source);
    assert.equal(upload.uploaded, true);
    assert.equal(upload.response, "org/firstinspires/ftc/teamcode/DriveTeleOp.java");
    assert.deepEqual(await checkOnBotJava(started.origin), {
      connected: true,
      sourceFiles: 1,
      sourcePaths: ["org/firstinspires/ftc/teamcode/DriveTeleOp.java"],
      allowExternalLibraries: false,
    });

    const result = await buildOnBotJava(started.origin);
    assert.equal(result.completed, true);
    assert.equal(result.outcome, "success");
    assert.match(result.log, /SIMULATED ONLY/);
    assert.match(result.log, /no Java compiler or FTC SDK was run/);

    const missingForce = await fetch(`${started.origin}/java/file/upload`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "not an upload",
    });
    assert.equal(missingForce.status, 400);

    const unsupported = await fetch(`${started.origin}/java/unsupported`);
    assert.equal(unsupported.status, 404);
  } finally {
    assert.deepEqual(await emulator.stop(), { running: false });
  }
  assert.deepEqual(emulator.getState(), { running: false, origin: null });
});

test("local OnBotJava mock does not claim to compile Java or survive shutdown", async () => {
  const emulator = createOnBotJavaEmulator();
  const { origin } = await emulator.start();
  await emulator.stop();
  await assert.rejects(checkOnBotJava(origin), /fetch failed/);
});
