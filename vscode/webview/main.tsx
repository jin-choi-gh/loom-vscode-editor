import { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  Margin,
  NotesBlock,
  PoemBlock,
  TagPills,
  TitleBlock,
  parseTextualComplex,
  toNotes,
  toPoem,
  visibleNotes,
  type NoteIndex,
  type Poem,
} from "./loom-viewer"
import "./loom-viewer/viewer.css"

// What the extension sends the page: the server's results, passed on unchanged.
type Message =
  | { kind: "composed"; folder: string; textualComplex: unknown }
  | { kind: "failed"; folder: string; error: string }

/** What the page shows of one composition: its poem and its notes, or why there are none. */
type View = { poem: Poem; noteIndex: NoteIndex } | { error: string }

const vscode = acquireVsCodeApi()

/** A message as the page shows it: loom's JSON checked and made into a poem and its notes. */
function viewOf(message: Message): View {
  if (message.kind === "failed") return { error: message.error }
  try {
    const textualComplex = parseTextualComplex(message.textualComplex, message.folder)
    return { poem: toPoem(textualComplex), noteIndex: toNotes(textualComplex) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

function Page() {
  const [view, setView] = useState<View | null>(null)
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const folder = useRef<string | null>(null)

  useEffect(() => {
    const receive = (event: MessageEvent<Message>) => {
      const message = event.data
      // Note ids and tags belong to one folder: notes:3 of another poem is another note
      if (message.folder !== folder.current) {
        setSelectedNote(null)
        setActiveTags([])
      }
      folder.current = message.folder
      setView(viewOf(message))
    }
    window.addEventListener("message", receive)
    // Tell the extension the page is listening, so nothing it sends is lost
    vscode.postMessage({ kind: "ready" })
    return () => window.removeEventListener("message", receive)
  }, [])

  // Clicking a note selects it; clicking the selected note again deselects it
  const toggleNote = (id: string) => setSelectedNote((current) => (current === id ? null : id))

  if (view === null) return <p>Save a loom file to see it here.</p>
  if ("error" in view) return <p className="error">{view.error}</p>

  const { noteIndex } = view
  // A save may have removed a tag from meta.toml while it was on
  const shownTags = activeTags.filter((tag) => noteIndex.tags.includes(tag))
  const notes = visibleNotes(noteIndex.notes, shownTags)
  // A note out of the margin is not selected, so nothing of it is marked in the poem
  const shownNote = notes.some((note) => note.id === selectedNote) ? selectedNote : null

  // A note hidden by the pills stays deselected if they bring it back
  const chooseTags = (tags: string[]) => {
    setActiveTags(tags)
    const stays = visibleNotes(noteIndex.notes, tags).some((note) => note.id === selectedNote)
    if (!stays) setSelectedNote(null)
  }

  return (
    <div className="reader" data-layout="spread">
      <article className="reader-text">
        <div className="text-block">
          <TitleBlock poem={view.poem} />
          <PoemBlock
            poem={view.poem}
            rangesOn={noteIndex.rangesOn}
            selectedNote={shownNote}
          />
        </div>
      </article>
      <Margin>
        <TagPills tags={noteIndex.tags} activeTags={shownTags} onChange={chooseTags} />
        <NotesBlock
          notes={notes}
          selectedNote={shownNote}
          onToggle={toggleNote}
          emptyMessage={shownTags.length > 0 ? "No notes with these tags." : undefined}
        />
      </Margin>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<Page />)
