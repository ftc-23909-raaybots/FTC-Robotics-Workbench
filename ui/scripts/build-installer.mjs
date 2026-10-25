import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const uiDirectory = path.resolve(scriptDirectory, "..");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(command),
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? "unknown"}`);
  }
}

if (!process.env.npm_execpath) {
  throw new Error("Run this script through npm so the npm CLI can be located.");
}
run(process.execPath, [process.env.npm_execpath, "run", "build"], uiDirectory);
run(process.execPath, [path.join(scriptDirectory, "generate-icon.mjs")], uiDirectory);
run(process.execPath, [
  path.join(uiDirectory, "node_modules", "electron-builder", "cli.js"),
  "--win", "nsis",
], uiDirectory);
