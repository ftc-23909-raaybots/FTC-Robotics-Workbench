const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  readJavaProject,
  saveJavaProjectSource,
  safeRelativeJavaPath,
} = require("./robot-project.cjs");

async function makeProject() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "field-robot-project-"));
  const sourceDirectory = path.join(root, "TeamCode", "src", "main", "java", "org", "firstinspires", "ftc", "teamcode");
  await fs.mkdir(sourceDirectory, { recursive: true });
  await fs.writeFile(path.join(sourceDirectory, "DriveMode.java"), "package org.firstinspires.ftc.teamcode;\nclass DriveMode {}\n");
  await fs.mkdir(path.join(root, "build"), { recursive: true });
  await fs.writeFile(path.join(root, "build", "Generated.java"), "class Generated {}\n");
  return { root, sourceDirectory };
}

test("Java project import preserves folder structure and links only the root path", async (context) => {
  const project = await makeProject();
  context.after(() => fs.rm(project.root, { recursive: true, force: true }));

  const result = await readJavaProject(project.root);
  assert.equal(result.projectName, path.basename(project.root));
  assert.equal(result.files.length, 1);
  assert.match(result.files[0].relativePath, /TeamCode\/src\/main\/java\/org\/firstinspires\/ftc\/teamcode\/DriveMode\.java$/);
  assert.match(result.files[0].source, /package org\.firstinspires\.ftc\.teamcode;/);
});

test("saving a Java project source writes only the selected linked file", async (context) => {
  const project = await makeProject();
  context.after(() => fs.rm(project.root, { recursive: true, force: true }));
  const relativePath = path.join("TeamCode", "src", "main", "java", "org", "firstinspires", "ftc", "teamcode", "DriveMode.java");
  const result = await saveJavaProjectSource(project.root, relativePath, "class UpdatedDriveMode {}\n");

  assert.equal(result.saved, true);
  assert.match(
    await fs.readFile(path.join(project.root, relativePath), "utf8"),
    /UpdatedDriveMode/,
  );
  assert.equal(
    await fs.readFile(path.join(project.root, "build", "Generated.java"), "utf8"),
    "class Generated {}\n",
  );
});

test("saving a Java project source detects external edits before writing", async (context) => {
  const project = await makeProject();
  context.after(() => fs.rm(project.root, { recursive: true, force: true }));
  const relativePath = path.join("TeamCode", "src", "main", "java", "org", "firstinspires", "ftc", "teamcode", "DriveMode.java");
  const originalSource = "package org.firstinspires.ftc.teamcode;\nclass DriveMode {}\n";
  const externalSource = "package org.firstinspires.ftc.teamcode;\nclass DriveMode { /* external edit */ }\n";
  await fs.writeFile(path.join(project.root, relativePath), externalSource);

  const conflict = await saveJavaProjectSource(
    project.root,
    relativePath,
    "class LocalEdit {}\n",
    originalSource,
  );
  assert.equal(conflict.saved, false);
  assert.equal(conflict.conflict, true);
  assert.equal(conflict.diskSource, externalSource);
  assert.equal(await fs.readFile(path.join(project.root, relativePath), "utf8"), externalSource);

  const saved = await saveJavaProjectSource(
    project.root,
    relativePath,
    "class ConfirmedOverwrite {}\n",
    conflict.diskSource,
  );
  assert.equal(saved.saved, true);
  assert.equal(saved.conflict, false);
  assert.match(await fs.readFile(path.join(project.root, relativePath), "utf8"), /ConfirmedOverwrite/);
});

test("Java project paths reject traversal and non-Java files", () => {
  assert.throws(() => safeRelativeJavaPath("../outside.java"), /invalid/);
  assert.throws(() => safeRelativeJavaPath("TeamCode/../../outside.java"), /invalid/);
  assert.throws(() => safeRelativeJavaPath("settings.gradle"), /Java source/);
});
