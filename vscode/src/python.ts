import { execFile, type ExecFileException } from "node:child_process"
import { existsSync } from "node:fs"
import * as path from "node:path"

// Finding a Python to run the server and loom: the one the user set (loom.python), or the first
// good one a search tailored to this system finds. Plain Node, without VS Code's API, so that
// scripts/find_python.mjs can run it on any machine.

/** The oldest Python loom runs on. */
export const MINIMUM: readonly [number, number] = [3, 12]

/** How long one candidate may take to answer. */
const PROBE_TIMEOUT_MS = 10_000

// What each candidate is asked: its version, and the full path of the program that answers.
const QUESTION = "import sys; print(sys.version_info[0], sys.version_info[1], sys.executable)"

// Apple's own python3: 3.9, too old, and on a Mac without the developer tools merely running it
// opens a dialog offering to install them. The search never runs it.
const APPLE_PYTHON = "/usr/bin/python3"

// Where Python 3 is installed on macOS when it is not on PATH: Homebrew on Apple chips, Homebrew
// on Intel chips (and python.org's links), python.org.
const MAC_PLACES = [
  "/opt/homebrew/bin/python3",
  "/usr/local/bin/python3",
  "/Library/Frameworks/Python.framework/Versions/Current/bin/python3",
]

/** A way to run a Python: a program, and the arguments that come before the script (`py -3`). */
export interface Candidate {
  label: string // how it was found, for the log: "py -3", "/opt/homebrew/bin/python3"
  command: string
  args: string[]
}

/** What one candidate turned out to be: a Python, with its version and full path, or why not. */
export type Probe =
  | { candidate: Candidate; version: [number, number]; executable: string }
  | { candidate: Candidate; problem: string }

/** The Python chosen to run the server. */
export interface Chosen {
  label: string
  version: [number, number]
  executable: string
}

/** The result of a search: the Python chosen, if any, and every candidate tried, in order. */
export interface Search {
  chosen: Chosen | undefined
  tried: Probe[]
}

/** The Python set in loom.python, if any; otherwise this system's candidates, tried in order until
 * one is recent enough. A Python that was set is never replaced by another: if it fails, the
 * search fails, so that a mistake in the setting is seen. */
export async function findPython(setting: string): Promise<Search> {
  const set = setting.trim()
  const list = set !== "" ? [{ label: "loom.python", command: set, args: [] }] : candidates()
  const tried: Probe[] = []
  for (const candidate of list) {
    const probed = await probe(candidate)
    tried.push(probed)
    if ("version" in probed && recentEnough(probed.version)) {
      return { chosen: { label: candidate.label, ...probed }, tried }
    }
  }
  return { chosen: undefined, tried }
}

/** The Pythons to try on this system, in order. */
export function candidates(): Candidate[] {
  if (process.platform === "win32") {
    // The py launcher picks the newest Python 3 installed. A python.exe that is only Windows'
    // alias for the Microsoft Store answers without a version, and is passed over.
    return [
      { label: "py -3", command: "py", args: ["-3"] },
      { label: "python", command: "python", args: [] },
      { label: "python3", command: "python3", args: [] },
    ]
  }
  const names = ["python3.14", "python3.13", "python3.12", "python3"]
  if (process.platform !== "darwin") names.push("python")
  const places = names.flatMap(onPath)
  if (process.platform === "darwin") places.push(...MAC_PLACES.filter((place) => existsSync(place)))
  return [...new Set(places)]
    .filter((place) => place !== APPLE_PYTHON)
    .map((place) => ({ label: place, command: place, args: [] }))
}

/** Every file of this name in the folders of PATH, in PATH's order. */
function onPath(name: string): string[] {
  return (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter((folder) => folder !== "")
    .map((folder) => path.join(folder, name))
    .filter((place) => existsSync(place))
}

/** Ask a candidate what it is. It is run directly, never through a shell, so that a path from the
 * setting is only ever a path; and isolated (-I -S), as the server is. */
export function probe(candidate: Candidate): Promise<Probe> {
  return new Promise((resolve) => {
    execFile(
      candidate.command,
      [...candidate.args, "-I", "-S", "-c", QUESTION],
      { timeout: PROBE_TIMEOUT_MS, windowsHide: true },
      (error, stdout) => {
        if (error !== null) {
          resolve({ candidate, problem: whyNot(error) })
          return
        }
        const answer = /^(\d+) (\d+) (.+)$/.exec(stdout.trim())
        if (answer === null) {
          resolve({ candidate, problem: `answered "${stdout.trim().slice(0, 60)}", not a version` })
          return
        }
        const version: [number, number] = [Number(answer[1]), Number(answer[2])]
        resolve({ candidate, version, executable: answer[3] })
      },
    )
  })
}

function whyNot(error: ExecFileException): string {
  if (error.code === "ENOENT") return "not found"
  if (error.killed === true) return `no answer within ${PROBE_TIMEOUT_MS / 1000} seconds`
  if (typeof error.code === "number")
    return `not a Python that answers (stopped with code ${error.code})`
  return `did not run (${error.code ?? error.message.split("\n")[0]})`
}

/** Whether a version is MINIMUM or newer. */
export function recentEnough([major, minor]: [number, number]): boolean {
  return major > MINIMUM[0] || (major === MINIMUM[0] && minor >= MINIMUM[1])
}

/** One line for the log: what a candidate turned out to be. */
export function describe(probed: Probe): string {
  const { label } = probed.candidate
  if ("problem" in probed) return `${label}: ${probed.problem}`
  const [major, minor] = probed.version
  const tooOld = recentEnough(probed.version)
    ? ""
    : ` (too old: loom needs ${MINIMUM[0]}.${MINIMUM[1]} or newer)`
  return `${label}: Python ${major}.${minor} at ${probed.executable}${tooOld}`
}
