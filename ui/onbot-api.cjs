const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const ONBOT_PATHS = new Set([
  "/java/file/tree",
  "/java/file/upload",
  "/java/build/start",
  "/java/build/wait",
  "/java/build/log",
]);

function parseBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string") {
    throw new Error("Enter the Robot Controller Program & Manage address.");
  }

  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("Enter a valid Robot Controller address.");
  }

  if (!["http:", "https:"].includes(parsed.protocol) ||
      parsed.username || parsed.password || parsed.search || parsed.hash ||
      (parsed.pathname !== "/" && parsed.pathname !== "")) {
    throw new Error("Enter an HTTP or HTTPS origin, such as http://192.168.43.1:8080.");
  }
  return parsed.origin;
}

async function readLimitedBody(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("OnBotJava response exceeds the 2 MB limit.");
    }
    chunks.push(Buffer.from(result.value));
  }
  return Buffer.concat(chunks, total).toString("utf8");
}

async function requestOnBot(baseUrl, endpoint, options = {}) {
  if (!ONBOT_PATHS.has(endpoint)) {
    throw new Error("Unsupported OnBotJava endpoint.");
  }

  const url = new URL(endpoint, parseBaseUrl(baseUrl));
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);
  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });
    const body = await readLimitedBody(response);
    if (!response.ok) {
      const detail = body.trim();
      throw new Error(
        `Robot Controller returned HTTP ${response.status}${detail ? `: ${detail}` : "."}`,
      );
    }
    return { body, contentType: response.headers.get("content-type") ?? "" };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The Robot Controller request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkOnBotJava(baseUrl) {
  const { body } = await requestOnBot(baseUrl, "/java/file/tree");
  let tree;
  try {
    tree = JSON.parse(body);
  } catch {
    throw new Error("The Robot Controller did not return an OnBotJava file tree.");
  }
  if (!tree || !Array.isArray(tree.src)) {
    throw new Error("The Robot Controller response is not a supported OnBotJava file tree.");
  }
  return {
    connected: true,
    sourceFiles: tree.src.length,
    sourcePaths: tree.src.every((entry) => typeof entry === "string") ? tree.src : null,
    allowExternalLibraries: tree.allowExternalLibraries === true,
  };
}

async function uploadJavaSource(baseUrl, filename, source) {
  if (typeof filename !== "string" || filename.length <= 5 || filename.length > 255 ||
      !filename.toLowerCase().endsWith(".java") ||
      filename.includes("/") || filename.includes("\\") ||
      /[\u0000-\u001f]/.test(filename)) {
    throw new Error("Choose a Java source file with a valid filename.");
  }
  if (typeof source !== "string" || Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES) {
    throw new Error("Java source must be text and no larger than 1 MB.");
  }

  const form = new FormData();
  form.append("file", new Blob([source], { type: "text/plain; charset=utf-8" }), filename);
  form.append("force", "true");
  const { body } = await requestOnBot(baseUrl, "/java/file/upload", {
    method: "POST",
    query: { force: "true" },
    body: form,
    timeoutMs: 20000,
  });
  return { uploaded: true, filename, response: body.trim() };
}

async function buildOnBotJava(baseUrl) {
  await requestOnBot(baseUrl, "/java/build/start", { timeoutMs: 15000 });
  const { body } = await requestOnBot(baseUrl, "/java/build/wait", {
    timeoutMs: 120000,
  });
  const outcome = classifyBuildLog(body);
  return { completed: true, outcome, log: body };
}

function classifyBuildLog(log) {
  if (/\bBUILD\s+(?:FAILED|FAILURE)\b|\b(?:COMPILATION|COMPILE)\s+FAILED\b|\bBUILD\s+ERROR\b/i.test(log)) {
    return "failure";
  }
  if (/\bBUILD\s+(?:SUCCESSFUL|SUCCESS|SUCCEEDED)\b|\bBUILD\s+COMPLETED\s+SUCCESSFULLY\b/i.test(log)) {
    return "success";
  }
  return "unknown";
}

module.exports = {
  checkOnBotJava,
  uploadJavaSource,
  buildOnBotJava,
};
