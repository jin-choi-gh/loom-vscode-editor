# loom-viewer

Draws a poem from the JSON loom writes for one textual complex (`synthesis.py --json`): its title,
its stanzas and lines, and its notes in a margin beside it, with a note's words marked in the poem
when the note is selected.

**This folder is a temporary copy.** loom-viewer is meant to be shared by anthos-reader and this
editor, in a repository of its own. Until it moves there, the same code lives in two places: a fix
made here must also be made in anthos-reader, and the other way round.

## Where it came from

Copied on 2026-11-03 from anthos-reader, commit `2229515` ("Complete version to textual complex
rename"). Every file is unchanged, except:

| here                                               | in anthos-reader        | change                                                                                                                                                                                                                 |
| -------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loom/types.ts`, `textualComplex.ts`, `display.ts` | `src/loom/`             | none                                                                                                                                                                                                                   |
| `loom/toPoem.ts`                                   | `src/loom/`             | imports `../types`, not `../reader/types`; reads each line's `indent` from its unit's value                                                                                                                            |
| `loom/toNotes.ts`                                  | `src/loom/`             | imports `../types`, not `../reader/types`                                                                                                                                                                              |
| `loom/parse.ts`                                    | `src/loom/load.ts`      | only `parseTextualComplex` and `isObject`: loading files from `text-data/` (through Vite) stays in anthos-reader                                                                                                       |
| `types.ts`                                         | `src/reader/types.ts`   | moved up a level; `Line` has an `indent`                                                                                                                                                                               |
| `components/cut.ts`, `Margin.tsx`                  | `src/reader/`           | none                                                                                                                                                                                                                   |
| `components/TitleBlock.tsx`, `NotesBlock.tsx`      | `src/reader/`           | import `../types`, not `./types`                                                                                                                                                                                       |
| `components/PoemBlock.tsx`                         | `src/reader/`           | imports `../types`, not `./types`; **every** line is labelled, as `l1`, `l2`, … (in anthos-reader, every fifth line is numbered), since an editor needs the lines' ids for writing notes; sets `--indent` on each line |
| `viewer.css`                                       | `src/reader/reader.css` | without the narrow "page" layout and the bottom sheet (`[data-layout="page"]`, `.bottom-sheet`, and the `--sheet-` variables); the indent is on `.line-text`, not `.line`, so that the labels stay in one column       |
| `index.ts`, `README.md`                            | (none)                  | new                                                                                                                                                                                                                    |

What anthos-reader keeps for itself: `Reader.tsx` (loading a file and holding the selected note),
`useLayout.ts` (choosing the layout by width), `BottomSheet.tsx`, and the CSS for the narrow layout.
So loom-viewer offers the side-by-side layout (`<div className="reader" data-layout="spread">`, poem
and margin); anthos-reader adds the narrow-screen alternative and the choice between them.

## Rules

- **Import nothing from outside this folder except React.** The page uses loom-viewer through
  `index.ts` only.
- **Change nothing but what must change** while two copies exist: the fewer differences, the easier
  they are to bring back together.
