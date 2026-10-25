const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const {
  checkOnBotJava,
  uploadJavaSource,
  buildOnBotJava,
} = require("./onbot-api.cjs");

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test("OnBotJava check validates the live source tree endpoint", async () => {
  await withServer((request, response) => {
    assert.equal(request.url, "/java/file/tree");
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ src: ["Team/Drive.java"], allowExternalLibraries: true }));
  }, async (baseUrl) => {
    assert.deepEqual(await checkOnBotJava(baseUrl), {
      connected: true,
      sourceFiles: 1,
      sourcePaths: ["Team/Drive.java"],
      allowExternalLibraries: true,
    });
  });
});

test("OnBotJava check leaves remote paths unavailable for an unsupported tree shape", async () => {
  await withServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ src: [{ name: "Drive.java" }] }));
  }, async (baseUrl) => {
    const result = await checkOnBotJava(baseUrl);
    assert.equal(result.connected, true);
    assert.equal(result.sourceFiles, 1);
    assert.equal(result.sourcePaths, null);
  });
});

test("OnBotJava upload sends the source as a forced multipart file", async () => {
  await withServer(async (request, response) => {
    assert.equal(request.method, "POST");
    assert.equal(request.url, "/java/file/upload?force=true");
    assert.match(request.headers["content-type"], /^multipart\/form-data; boundary=/);
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8");
    assert.match(body, /name="file"; filename="DriveTeleOp\.java"/);
    assert.match(body, /package org\.firstinspires\.ftc\.teamcode;/);
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("DriveTeleOp.java");
  }, async (baseUrl) => {
    const result = await uploadJavaSource(
      baseUrl,
      "DriveTeleOp.java",
      "package org.firstinspires.ftc.teamcode;\nclass DriveTeleOp {}\n",
    );
    assert.equal(result.uploaded, true);
    assert.equal(result.response, "DriveTeleOp.java");
  });
});

test("OnBotJava build launches and waits for the build log", async () => {
  const requests = [];
  await withServer((request, response) => {
    requests.push(request.url);
    response.writeHead(200, { "content-type": "text/plain" });
    response.end(request.url.endsWith("/build/wait") ? "Build finished" : "1");
  }, async (baseUrl) => {
    assert.deepEqual(await buildOnBotJava(baseUrl), {
      completed: true,
      outcome: "unknown",
      log: "Build finished",
    });
    assert.deepEqual(requests, ["/java/build/start", "/java/build/wait"]);
  });
});

test("OnBotJava build outcome is classified only from explicit result markers", async () => {
  const buildLogs = [
    "BUILD SUCCESSFUL in 4s",
    "BUILD FAILED\nCompilation error",
    "Build finished",
  ];
  let buildIndex = 0;
  await withServer((request, response) => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end(request.url.endsWith("/build/wait")
      ? buildLogs[buildIndex++]
      : "1");
  }, async (baseUrl) => {
    const successful = await buildOnBotJava(baseUrl);
    const failed = await buildOnBotJava(baseUrl);
    const unknown = await buildOnBotJava(baseUrl);
    assert.equal(successful.outcome, "success");
    assert.equal(failed.outcome, "failure");
    assert.equal(unknown.outcome, "unknown");
  });
});

test("OnBotJava requests reject paths and non-HTTP origins", async () => {
  await assert.rejects(
    checkOnBotJava("http://127.0.0.1:8080/unexpected-path"),
    /HTTP or HTTPS origin/,
  );
  await assert.rejects(
    uploadJavaSource("http://127.0.0.1:8080", "../Drive.java", "class Drive {}"),
    /valid filename/,
  );
});
