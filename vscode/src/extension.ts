import { existsSync } from "node:fs"
import * as path from "node:path"
import * as vscode from "vscode"
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
} from "vscode-languageclient/node"
import { MINIMUM, describe, findPython } from "./python"
import { openViewer, showInViewer } from "./viewer"

let client: LanguageClient | undefined

/** Called by VS Code when an activation event in package.json happens. */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // One place for what the extension and its server report: Output › Loom.
  const output = vscode.window.createOutputChannel("Loom", { log: true })
  context.subscriptions.push(output)

  // A new loom.python is used from the next start: the server is already running.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("loom.python")) void offerReload()
    }),
  )

  // The server, loom and their libraries, gathered by scripts/bundle.py (F5 runs it first).
  const bundled = path.join(context.extensionPath, "bundled")
  if (!existsSync(path.join(bundled, "start.py"))) {
    void vscode.window.showErrorMessage(
      `Loom: no server bundle at ${bundled}. Make it with scripts/bundle.py (see the README).`,
    )
    return
  }
  const synthesis = path.join(bundled, "loom", "synthesis.py")

  // The Python to run them with: the one set in loom.python, or the first good one found.
  const setting = vscode.workspace.getConfiguration("loom").get<string>("python", "")
  const search = await findPython(setting)
  for (const probed of search.tried) output.info(describe(probed))
  if (search.chosen === undefined) {
    output.warn("no usable Python: the server is not started")
    void reportNoPython(setting, search.tried.map(describe))
    return
  }
  const python = search.chosen
  output.info(
    `using Python ${python.version.join(".")} at ${python.executable} (found as ${python.label})`,
  )

  // -I -S: Python imports only its standard library and what start.py adds from the bundle,
  // never files from the folder open in the editor (see server/start.py). The working folder is
  // the extension's own rather than the bundle's: Windows cannot delete a running program's
  // working folder, and each F5 makes the bundle afresh.
  const serverOptions: ServerOptions = {
    command: python.executable,
    args: ["-I", "-S", path.join(bundled, "start.py")],
    options: { cwd: context.extensionPath },
  }

  // Which files the server hears about: loom's sources, plain or qualified
  // (booth.notes.txt), and meta.toml.
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", pattern: "**/{display,metre,notes}.txt" },
      { scheme: "file", pattern: "**/*.{display,metre,notes}.txt" },
      { scheme: "file", pattern: "**/meta.toml" },
    ],
    // What the server is told when it starts: where loom is.
    initializationOptions: { synthesis },
    outputChannel: output,
  }

  client = new LanguageClient("loom", "Loom", serverOptions, clientOptions)

  // What the server composes goes to the viewer, marked with its kind for the page.
  client.onNotification("loom/composed", (params) => showInViewer({ kind: "composed", ...params }))
  client.onNotification("loom/failed", (params) => showInViewer({ kind: "failed", ...params }))
  context.subscriptions.push(
    vscode.commands.registerCommand("loom.openViewer", () =>
      openViewer(context.extensionUri, composeActiveFile),
    ),
  )

  await client.start()
}

/** Say that no usable Python was found, and how to get one: install it, or name it in
 * loom.python. What was tried is in Output › Loom. */
async function reportNoPython(setting: string, tried: string[]): Promise<void> {
  const needed = `${MINIMUM[0]}.${MINIMUM[1]}`
  const message =
    setting.trim() !== ""
      ? `Loom: the Python in loom.python is not usable (${tried.join("; ")}). Loom needs ` +
        `Python ${needed} or newer.`
      : `Loom needs Python ${needed} or newer, and found none (see Output › Loom). ` +
        installAdvice(needed)
  const install = "How to install"
  const set = "Set loom.python"
  const choice = await vscode.window.showErrorMessage(message, install, set)
  if (choice === install) {
    void vscode.env.openExternal(vscode.Uri.parse("https://www.python.org/downloads/"))
  } else if (choice === set) {
    void vscode.commands.executeCommand("workbench.action.openSettings", "loom.python")
  }
}

/** How to install Python on this system. */
function installAdvice(needed: string): string {
  switch (process.platform) {
    case "win32":
      return "Install it from python.org or the Microsoft Store."
    case "darwin":
      return `Install it from python.org, or with Homebrew: brew install python@${needed}.`
    default:
      return `Install it with your package manager, for example: sudo apt install python${needed}.`
  }
}

/** Offer to reload the window, so that a new loom.python is used. */
async function offerReload(): Promise<void> {
  const reload = "Reload Window"
  const choice = await vscode.window.showInformationMessage(
    "Loom: reload the window to use the new loom.python.",
    reload,
  )
  if (choice === reload) void vscode.commands.executeCommand("workbench.action.reloadWindow")
}

/** Ask the server to compose the folder of the file in the active editor, if any. */
function composeActiveFile(): void {
  const document = vscode.window.activeTextEditor?.document
  if (document !== undefined) {
    void client?.sendNotification("loom/compose", { uri: document.uri.toString() })
  }
}

/** Called by VS Code when the extension stops: stop the server with it. */
export async function deactivate(): Promise<void> {
  await client?.stop()
}
