import type { Note } from "../types"

/** The notes to show: every note when no tag is on, otherwise each note with any tag that is on. */
export function visibleNotes(notes: Note[], activeTags: string[]): Note[] {
  if (activeTags.length === 0) return notes
  return notes.filter((note) => note.tags.some((tag) => activeTags.includes(tag)))
}

/** The tags that are on after one is clicked: on if it was off, off if it was on */
export function toggleTag(activeTags: string[], tag: string): string[] {
  return activeTags.includes(tag)
    ? activeTags.filter((active) => active !== tag)
    : [...activeTags, tag]
}
