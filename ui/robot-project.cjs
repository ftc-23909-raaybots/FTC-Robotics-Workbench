const fs = require("node:fs/promises");
const path = require("node:path");

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".gradle",
  ".idea",
  "build",
  "node_modules",
  "out",
  "target",
]);
const MAX_SOURCE_FILES = 250;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_SINGLE_FILE_BYTES = 1024 * 1024;

async function walkJavaFiles(root, directory = root, files = [], byteCount = { value: 0 }) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        await walkJavaFiles(root, fullPath, files, byteCount);
      }
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".java")) continue;

    const stat = await fs.stat(fullPath);
    const relativePath = path.relative(root, fullPath);
    if (stat.size > MAX_SINGLE_FILE_BYTES) {
      throw new Error(`${relativePath} exceeds the 1 MB Java file limit.`);
    }
    byteCount.value += stat.size;
    if (byteCount.value > MAX_SOURCE_BYTES) {
      throw new Error("Java source exceeds the 10 MB project limit.");
    }
    files.push({ fullPath, relativePath, size: stat.size });
    if (files.length > MAX_SOURCE_FILES) {
      throw new Error("Project contains more than 250 Java files.");
    }
  }
  return files;
}

async function readJavaProject(selectedRoot) {
  const rootPath = await fs.realpath(selectedRoot);
  const rootStat = await fs.stat(rootPath);
  if (!rootStat.isDirectory()) throw new Error("Select a Java project directory.");

  const sourceFiles = await walkJavaFiles(rootPath);
  if (sourceFiles.length === 0) {
    throw new Error("No .java files were found in the selected project folder.");
  }
  const files = await Promise.all(sourceFiles.map(async ({ fullPath, relativePath }) => ({
    relativePath: relativePath.split(path.sep).join("/"),
    source: await fs.readFile(fullPath, "utf8"),
  })));
  return {
    projectPath: rootPath,
    projectName: path.basename(rootPath),
    files,
  };
}

function safeRelativeJavaPath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length > 1024 ||
      !relativePath.toLowerCase().endsWith(".java")) {
    throw new Error("Choose a Java source file from the linked project.");
  }
  const segments = relativePath.replace(/\\/g, "/").split("/");
  if (segments.some((segment) =>
    !segment || segment === "." || segment === ".." || /[\u0000-\u001f]/.test(segment))) {
    throw new Error("The Java source path is invalid.");
  }
  return segments.join(path.sep);
}

async function saveJavaProjectSource(projectRoot, relativePath, source, expectedSource) {
  if (typeof source !== "string" || Buffer.byteLength(source, "utf8") > MAX_SINGLE_FILE_BYTES) {
    throw new Error("Java source must be text and no larger than 1 MB.");
  }
  if (expectedSource !== undefined && typeof expectedSource !== "string") {
    throw new Error("The expected Java source version is invalid.");
  }
  const rootPath = await fs.realpath(projectRoot);
  const relative = safeRelativeJavaPath(relativePath);
  const targetPath = path.resolve(rootPath, relative);
  const lexicalRelative = path.relative(rootPath, targetPath);
  if (!lexicalRelative || lexicalRelative.startsWith(`..${path.sep}`) ||
      lexicalRelative === ".." || path.isAbsolute(lexicalRelative)) {
    throw new Error("The Java source path must stay inside the linked project.");
  }

  const parentPath = await fs.realpath(path.dirname(targetPath));
  if (parentPath !== path.dirname(targetPath)) {
    throw new Error("Project source paths cannot pass through symbolic links.");
  }
  const targetStat = await fs.lstat(targetPath);
  if (!targetStat.isFile() || targetStat.isSymbolicLink()) {
    throw new Error("The selected project source is not a regular file.");
  }
  if (expectedSource !== undefined) {
    const diskSource = await fs.readFile(targetPath, "utf8");
    if (diskSource !== expectedSource) {
      return { saved: false, conflict: true, diskSource };
    }
  }
  await fs.writeFile(targetPath, source, { encoding: "utf8" });
  return { saved: true, conflict: false, relativePath: relativePath.replace(/\\/g, "/") };
}

module.exports = {
  readJavaProject,
  saveJavaProjectSource,
  safeRelativeJavaPath,
};
