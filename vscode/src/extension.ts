import { existsSync } from "node:fs"
import * as path from "node:path"
import * as vscode from "vscode"
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
} from "vscode-languageclient/node"

let client: LanguageClient | undefined

/** Called by VS Code when an activation event in package.json happens. */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Finding the server beside this folder works only in a checkout of the repository, run with
  // F5. Installed copies have no such neighbour, so refuse rather than guess.
  if (context.extensionMode !== vscode.ExtensionMode.Development) {
    void vscode.window.showErrorMessage(
      "Loom: this extension can only be run from its repository for now (with F5).",
    )
    return
  }

  // The repository's root is the folder above this extension's; the server's
  // environment, .venv, is there (see the README's development setup).
  const root = path.resolve(context.extensionPath, "..")
  const python =
    process.platform === "win32"
      ? path.join(root, ".venv", "Scripts", "python.exe")
      : path.join(root, ".venv", "bin", "python")

  if (!existsSync(python)) {
    void vscode.window.showErrorMessage(
      `Loom: no Python at ${python}. Create the environment as the README's development setup says.`,
    )
    return
  }

  const serverOptions: ServerOptions = {
    command: python,
    args: ["-m", "loom_language_server"],
  }

  // Which files the server hears about: loom's sources, plain or qualified
  // (booth.notes.txt), and meta.toml.
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", pattern: "**/{display,metre,notes}.txt" },
      { scheme: "file", pattern: "**/*.{display,metre,notes}.txt" },
      { scheme: "file", pattern: "**/meta.toml" },
    ],
  }

  client = new LanguageClient("loom", "Loom", serverOptions, clientOptions)
  await client.start()
}

/** Called by VS Code when the extension stops: stop the server with it. */
export async function deactivate(): Promise<void> {
  await client?.stop()
}
