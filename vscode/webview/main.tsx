import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

// What the extension sends the page: the server's results, passed on unchanged.
type Message =
  | { kind: "composed"; folder: string; textualComplex: TextualComplex }
  | { kind: "failed"; folder: string; error: string }

// Only the parts of loom's JSON this page uses for now; loom-viewer will bring the full types.
interface TextualComplex {
  name: string | null
  metadata: { title: string | null; author: string | null }
  lines: { id: string; text: string }[]
}

const vscode = acquireVsCodeApi()

function Page() {
  const [message, setMessage] = useState<Message | null>(null)

  useEffect(() => {
    const receive = (event: MessageEvent<Message>) => setMessage(event.data)
    window.addEventListener("message", receive)
    // Tell the extension the page is listening, so nothing it sends is lost.
    vscode.postMessage({ kind: "ready" })
    return () => window.removeEventListener("message", receive)
  }, [])

  if (message === null) return <p>Save a loom file to see it here.</p>
  if (message.kind === "failed") return <p className="error">{message.error}</p>

  const complex = message.textualComplex
  return (
    <>
      <h1>{complex.metadata.title ?? complex.name ?? "Untitled"}</h1>
      {complex.lines.map((line) => (
        <p key={line.id}>{line.text}</p>
      ))}
    </>
  )
}

createRoot(document.getElementById("root")!).render(<Page />)
