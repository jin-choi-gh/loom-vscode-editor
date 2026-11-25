import type { CSSProperties } from "react"
import { Fragment, useEffect, useRef } from "react"
import { cut } from "./cut"
import type { Block, NoteRange, Passage } from "../types"

/** The text, passage by passage, every line and paragraph labelled with its id. The selected note's
 * words are marked, and scrolled into view if they are out of view; with no note selected, each
 * block is drawn as it is. */
export function Passages({
  passages,
  rangesOn,
  selectedNote,
}: {
  passages: Passage[]
  rangesOn: (indexInSubstrate: number) => NoteRange[]
  selectedNote: string | null
}) {
  // The selected note's ranges on a block: none on blocks it doesn't touch, or when nothing is selected
  const selectedRanges = (block: Block) =>
    rangesOn(block.indexInSubstrate).filter((range) => range.noteId === selectedNote)

  const passagesRef = useRef<HTMLDivElement>(null)

  // After a note is selected, bring its first marked words into view if they are out of view
  useEffect(() => {
    if (selectedNote === null) return
    const first = passagesRef.current?.querySelector("mark")
    if (!first) return // a whole-text note marks nothing
    const page = getComputedStyle(document.documentElement)
    const visibleTop = parseFloat(page.scrollPaddingTop) || 0
    const visibleBottom = window.innerHeight - (parseFloat(page.scrollPaddingBottom) || 0)
    const { top, bottom } = first.getBoundingClientRect()
    if (top >= visibleTop && bottom <= visibleBottom) return // already in view
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    first.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" })
  }, [selectedNote])

  // A block's short id, beside its first line
  const label = (block: Block) => (
    <span className="line-number" aria-hidden="true">
      {block.label}
    </span>
  )

  // A block's text, the selected note's words marked
  const words = (block: Block) =>
    cut(block.text, selectedRanges(block)).map((piece, i) =>
      piece.ranges.length > 0 ? (
        <mark key={i}>{piece.text}</mark>
      ) : (
        <Fragment key={i}>{piece.text}</Fragment>
      ),
    )

  // With several passages, notes must name theirs, so each is shown with its name
  const named = passages.length > 1

  return (
    <div className="passages" ref={passagesRef}>
      {passages.map((passage) => (
        <section className="passage" data-form={passage.form} key={passage.id}>
          {named && <p className="passage-name">{passage.id}</p>}
          {passage.form === "verse"
            ? passage.stanzas.map((stanza, j) => (
                <div className="stanza" key={j}>
                  {stanza.lines.map((line) => (
                    <div
                      key={line.id}
                      className="line"
                      data-line-id={line.id}
                      style={{ "--indent": line.indent } as CSSProperties}
                    >
                      {label(line)}
                      <span className="line-text">{words(line)}</span>
                    </div>
                  ))}
                </div>
              ))
            : passage.paragraphs.map((paragraph) => (
                <div key={paragraph.id} className="paragraph" data-line-id={paragraph.id}>
                  {label(paragraph)}
                  <span className="paragraph-text">{words(paragraph)}</span>
                </div>
              ))}
        </section>
      ))}
    </div>
  )
}
