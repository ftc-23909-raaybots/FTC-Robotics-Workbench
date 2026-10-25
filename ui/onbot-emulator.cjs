const http = require("node:http");
const path = require("node:path");

const MAX_REQUEST_BYTES = 1024 * 1024 + 64 * 1024;

function json(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

function text(response, status, value) {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(value);
}

function packagePathFor(source, filename) {
  const match = source.match(/^\s*package\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*;/m);
  return match ? `${match[1].replaceAll(".", "/")}/${filename}` : filename;
}

async function readUpload(request) {
  const contentType = request.headers["content-type"] ?? "";
  const boundaryMatch = contentType.match(/^multipart\/form-data;\s*boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error("Expected a multipart Java source upload.");
  const boundary = boundaryMatch[1] ?? boundaryMatch[2];
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_REQUEST_BYTES) throw new Error("The emulator upload exceeds the 1 MB source limit.");
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  const filePart = body.split(`--${boundary}`).find((part) =>
    /content-disposition:\s*form-data;\s*name="file";\s*filename="/i.test(part));
  if (!filePart) throw new Error("The upload did not contain a Java source file.");
  const filenameMatch = filePart.match(/content-disposition:\s*form-data;\s*name="file";\s*filename="([^"]+)"/i);
  const separator = filePart.indexOf("\r\n\r\n");
  const end = filePart.lastIndexOf("\r\n");
  if (!filenameMatch || separator < 0 || end < separator + 4) {
    throw new Error("The multipart Java source file is malformed.");
  }
  const filename = filenameMatch[1];
  if (!filename.toLowerCase().endsWith(".java") ||
      filename.includes("/") || filename.includes("\\") ||
      /[\u0000-\u001f]/.test(filename)) {
    throw new Error("The upload filename is not a valid Java filename.");
  }
  return { filename: path.basename(filename), source: filePart.slice(separator + 4, end) };
}

function createOnBotJavaEmulator() {
  let server = null;
  let origin = null;
  let buildStarted = false;
  const files = new Map();

  const handleRequest = async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/java/file/tree") {
      return json(response, 200, {
        src: [...files.keys()].sort(),
        allowExternalLibraries: false,
      });
    }
    if (request.method === "POST" && url.pathname === "/java/file/upload") {
      if (url.searchParams.get("force") !== "true") {
        return text(response, 400, "The emulator requires the explicit force upload flag.");
      }
      try {
        const { filename, source } = await readUpload(request);
        const destination = packagePathFor(source, filename);
        files.set(destination, source);
        return text(response, 200, destination);
      } catch (error) {
        return text(response, 400, error instanceof Error ? error.message : String(error));
      }
    }
    if (request.method === "GET" && url.pathname === "/java/build/start") {
      buildStarted = true;
      return text(response, 200, "1");
    }
    if (request.method === "GET" && url.pathname === "/java/build/wait") {
      if (!buildStarted) return text(response, 409, "No simulated build was started.");
      buildStarted = false;
      return text(response, 200,
        "BUILD SUCCESSFUL (SIMULATED ONLY; no Java compiler or FTC SDK was run)");
    }
    return text(response, 404, "The local OnBotJava emulator does not implement this endpoint.");
  };

  return {
    async start() {
      if (server && origin) return { running: true, origin };
      const nextServer = http.createServer((request, response) => {
        void handleRequest(request, response).catch((error) => {
          if (!response.headersSent) text(response, 500, "The local emulator request failed.");
          else response.destroy(error);
        });
      });
      await new Promise((resolve, reject) => {
        nextServer.once("error", reject);
        nextServer.listen(0, "127.0.0.1", () => {
          nextServer.removeListener("error", reject);
          resolve();
        });
      });
      const address = nextServer.address();
      if (!address || typeof address === "string") {
        await new Promise((resolve) => nextServer.close(resolve));
        throw new Error("The local OnBotJava emulator did not open a TCP port.");
      }
      server = nextServer;
      origin = `http://127.0.0.1:${address.port}`;
      return { running: true, origin };
    },
    async stop() {
      if (!server) return { running: false };
      const currentServer = server;
      server = null;
      origin = null;
      files.clear();
      buildStarted = false;
      await new Promise((resolve, reject) => {
        currentServer.close((error) => error ? reject(error) : resolve());
      });
      return { running: false };
    },
    getState() {
      return { running: Boolean(server), origin };
    },
  };
}

module.exports = { createOnBotJavaEmulator };
