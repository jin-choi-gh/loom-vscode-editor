// Build the extension's package, dist/loom-editor-<version>.vsix, and check it.
//
//     node scripts/package.mjs
//
// It holds loom's source, so it goes only to people chosen by hand: never into git, or anywhere
// public (see vscode/LICENSE.md). Each step must succeed before the next.

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const VSCODE = path.join(ROOT, "vscode")
const PYTHON = path.join(
  ROOT,
  ".venv",
  ...(process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"]),
)
const VSCE = path.join(VSCODE, "node_modules", "@vscode", "vsce", "vsce")

const { name, version } = JSON.parse(readFileSync(path.join(VSCODE, "package.json"), "utf8"))
const output = path.join(ROOT, "dist", `${name}-${version}.vsix`)

/** Run a program, showing its output, and stop here if it fails. */
function run(program, args, cwd = ROOT) {
  execFileSync(program, args, { cwd, stdio: "inherit" })
}

/** Run an npm script. npm is a command script on Windows, which needs a shell to start. */
function npm(script) {
  execFileSync(`npm run ${script}`, { cwd: VSCODE, stdio: "inherit", shell: true })
}

// What git does not bring: a fresh clone has none of these. Everything missing is said at once.
const missing = []
if (!existsSync(path.join(ROOT, "loom", "src", "synthesis.py"))) {
  missing.push("loom/ is empty: run `git submodule update --init`")
}
if (!existsSync(PYTHON)) {
  missing.push(`no ${path.relative(ROOT, PYTHON)}: see "The server" in the README`)
}
if (!existsSync(VSCE)) {
  missing.push("no vscode/node_modules: run `npm install` in vscode/")
}
if (missing.length > 0) {
  console.error(`cannot package yet:\n- ${missing.join("\n- ")}`)
  process.exit(1)
}

// Only committed loom ships: BUNDLE.txt names a commit, and that must say what is in the package.
const changed = execFileSync("git", [
  "-C",
  path.join(ROOT, "loom"),
  "status",
  "--porcelain",
  "--",
  "src",
])
if (changed.length > 0) {
  console.error("loom/src has uncommitted changes: commit them in loom, then move the submodule")
  process.exit(1)
}

run(PYTHON, ["scripts/bundle.py"])
npm("compile:production")
mkdirSync(path.dirname(output), { recursive: true })
run(
  process.execPath,
  [VSCE, "package", "--no-dependencies", "--allow-missing-repository", "--out", output],
  VSCODE,
)
run(PYTHON, ["scripts/check_bundle.py", output])
npm("compile") // back to the development build, for F5

console.log(`\npackaged: ${path.relative(ROOT, output)}`)
