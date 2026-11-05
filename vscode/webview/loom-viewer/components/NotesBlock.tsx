import { Fragment } from "react"
import type { Note } from "../types"

/** The notes, one block each, in order: the lemma, then the paragraphs. Clicking a block selects its
 * note, and clicking the selected note again deselects it. A click that ends a text selection inside
 * the block is not a choice, so it changes nothing. */
export function NotesBlock({
  notes,
  selectedNote,
  onToggle,
  emptyMessage = "No notes on this text.",
}: {
  notes: Note[]
  selectedNote: string | null
  onToggle: (id: string) => void
  emptyMessage?: string
}) {
  if (notes.length === 0) {
    return <p className="margin-empty">{emptyMessage}</p>
  }
  return (
    <div className="notes">
      {notes.map((note) => {
        const selected = note.id === selectedNote
        return (
          <article
            key={note.id}
            className="note"
            data-selected={selected}
            onClick={(event) => {
              const selection = window.getSelection()
              const selecting =
                selection !== null &&
                !selection.isCollapsed &&
                event.currentTarget.contains(selection.anchorNode)
              if (!selecting) onToggle(note.id)
            }}
          >
            <button type="button" className="note-lemma" aria-pressed={selected}>
              {note.lemma.map((part, i) => (
                <Fragment key={i}>
                  {i > 0 && " · "}
                  {part.kind === "quote" ? <q>{part.text}</q> : part.text}
                </Fragment>
              ))}
            </button>
            {note.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </article>
        )
      })}
    </div>
  )
}
