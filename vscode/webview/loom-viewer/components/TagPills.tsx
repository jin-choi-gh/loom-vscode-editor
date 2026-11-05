import { toggleTag } from "./noteFilter"

/** A row of pills choosing which notes the margin shows: "all", then each declared tag. Tags can be
 * on together, and "all" is on when no tag is. A text with no declared tags has no row. */
export function TagPills({
  tags,
  activeTags,
  onChange,
}: {
  tags: string[]
  activeTags: string[]
  onChange: (activeTags: string[]) => void
}) {
  if (tags.length === 0) return null
  return (
    <div className="tag-pills" role="group" aria-label="Show notes by tag">
      <button
        type="button"
        className="tag-pill"
        aria-pressed={activeTags.length === 0}
        onClick={() => onChange([])}
      >
        all
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className="tag-pill"
          aria-pressed={activeTags.includes(tag)}
          onClick={() => onChange(toggleTag(activeTags, tag))}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}