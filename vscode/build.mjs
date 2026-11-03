// Build the extension and the viewer's page into out/, each as one file that needs no node_modules.
//
//     node build.mjs                 for development: readable, with source maps (F5 uses this)
//     node build.mjs --production    for shipping: minified, with React's production build, and
//                                    without source maps, which would carry the original source
//
// esbuild only strips the types; checking them is tsc's job (npm run check).

import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { build } from "esbuild"

process.chdir(import.meta.dirname)

const OUT = "out"
const production = process.argv.includes("--production")
const options = {
  bundle: true,
  metafile: true,
  minify: production,
  sourcemap: !production,
  logLevel: "warning",
}

rmSync(OUT, { recursive: true, force: true }) // nothing from an earlier build survives

const extension = await build({
  ...options,
  // python.ts also stands alone, for scripts/find_python.mjs
  entryPoints: ["src/extension.ts", "src/python.ts"],
  outdir: OUT,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vscode"], // VS Code supplies this one at run time
})

const page = await build({
  ...options,
  entryPoints: ["webview/main.tsx"],
  outfile: `${OUT}/webview.js`,
  tsconfig: "webview/tsconfig.json",
  define: { "process.env.NODE_ENV": production ? '"production"' : '"development"' },
})

writeNotices([extension.metafile, page.metafile], `${OUT}/THIRD_PARTY_NOTICES.txt`)

/** Each package bundled into out/, with its licence text in full, as those licences require of
 * software that includes them. The packages are the ones esbuild reports having used, so the
 * notices always match what ships. */
function writeNotices(metafiles, notices) {
  const folders = new Set()
  for (const metafile of metafiles) {
    for (const input of Object.keys(metafile.inputs)) {
      const folder = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(input)?.[1]
      if (folder !== undefined) folders.add(folder)
    }
  }
  const sections = [...folders].sort().map(section)
  writeFileSync(
    notices,
    "The loom editor includes the following open-source software.\n\n" +
      sections.join(`\n\n${"=".repeat(79)}\n\n`) +
      "\n",
  )
  console.log(
    `built into ${OUT}${production ? " for production" : ""}: ${sections.length} packages`,
  )
}

/** One package's name, version, licence and licence text. */
function section(folder) {
  const { name, version, license } = JSON.parse(readFileSync(path.join(folder, "package.json")))
  const files = readdirSync(folder).filter((file) => /^(licen[cs]e|copying|notice)/i.test(file))
  if (files.length === 0) {
    console.error(`${name}: no licence text found`)
    process.exit(1)
  }
  const texts = files.map((file) => readFileSync(path.join(folder, file), "utf8").trim())
  return [`${name} ${version}`, `Licence: ${license}`, ...texts].join("\n\n")
}
