// Show which Python the extension would choose on this machine, and every candidate it tried.
//
//     node scripts/find_python.mjs            the search, as when loom.python is empty
//     node scripts/find_python.mjs <python>   as when loom.python is set to <python>
//
// It runs the extension's own search (vscode/src/python.ts), so compile the extension first:
// `npm run compile` in vscode/. It needs only Node, so it can be run on any machine.

import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const compiled = fileURLToPath(new URL("../vscode/out/python.js", import.meta.url))
if (!existsSync(compiled)) {
  console.error("vscode/out/python.js is missing: run `npm run compile` in vscode/ first")
  process.exit(1)
}
const { findPython, describe } = createRequire(import.meta.url)(compiled)

const search = await findPython(process.argv[2] ?? "")
for (const probed of search.tried) console.log(describe(probed))
const { chosen } = search
console.log(
  chosen === undefined
    ? "chosen: none"
    : `chosen: Python ${chosen.version.join(".")} at ${chosen.executable} (found as ${chosen.label})`,
)
process.exitCode = chosen === undefined ? 1 : 0
