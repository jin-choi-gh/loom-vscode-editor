import { randomBytes } from "node:crypto"
import * as vscode from "vscode"

// The viewer panel beside the editor. There is at most one; the extension sends it what the
// server composes, and the panel's page draws it.
let panel: vscode.WebviewPanel | undefined

/** Open the viewer beside the active editor, or bring it back if it is already open. Once its
 * page is ready for messages, onReady is called: the extension then asks for a compose. */
export function openViewer(extensionUri: vscode.Uri, onReady: () => void): void {
  if (panel !== undefined) {
    panel.reveal(vscode.ViewColumn.Beside, true)
    onReady()
    return
  }
  // The page may load files from out/ only: its bundled script.
  const out = vscode.Uri.joinPath(extensionUri, "out")
  panel = vscode.window.createWebviewPanel(
    "loom.viewer",
    "Loom Viewer",
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    { enableScripts: true, localResourceRoots: [out] },
  )
  panel.webview.html = page(panel.webview, vscode.Uri.joinPath(out, "webview.js"))
  panel.webview.onDidReceiveMessage((message: { kind?: string }) => {
    if (message.kind === "ready") onReady()
  })
  panel.onDidDispose(() => {
    panel = undefined
  })
}

/** Send the viewer's page a message, if the viewer is open. */
export function showInViewer(message: unknown): void {
  void panel?.webview.postMessage(message)
}

/** The panel's page: an empty root for the bundled script (src/webview/main.tsx) to draw in. */
function page(webview: vscode.Webview, script: vscode.Uri): string {
  // A token allowing only our own script and style to run: the page refuses anything else.
  const nonce = randomBytes(16).toString("base64")
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style nonce="${nonce}">
      body { font-family: var(--vscode-editor-font-family); }
      .error { color: var(--vscode-errorForeground); white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${webview.asWebviewUri(script)}"></script>
  </body>
</html>`
}
