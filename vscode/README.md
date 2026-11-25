# Loom Editor

Write loom's source files in VS Code, and see the text drawn beside them.

Open a folder holding loom's files (`display.txt`, `display.verse.txt`, `display.prose.txt`, `metre.txt`,
`notes.txt`, `meta.toml`), open one
of them, and click the preview icon at the top right of the editor (or run **Loom: Open Viewer**
from the Command Palette). A panel beside the file shows the title, the text with its line and paragraph ids, and
the notes in a margin. Click a note to mark its words in the text. Each time you save, the panel is
redrawn; if loom cannot compose the folder, the panel shows loom's message.

## Verse and prose

`display.verse.txt` holds one passage of verse: each row is a line, and blank rows divide stanzas.
`display.prose.txt` holds one of prose: blank rows divide paragraphs, and a single new line means
nothing. `display.txt` holds several passages, each under a heading with a name of its own:

    [ prose: before ]

    Blake's poem is often read as the ruin of a rose by a worm.

    [ verse: rose ]

    O Rose thou art sick.
    The invisible worm,

In `notes.txt`, a note on one passage of several says which: `rose.l2 worm ]`, `rose ]`. When the
text has only one, `l2 worm ]` will do.

## What you need

**Python 3.12 or newer.** Everything else comes with the extension.

- **Windows:** from [python.org](https://www.python.org/downloads/), or the Microsoft Store.
- **macOS:** from [python.org](https://www.python.org/downloads/), or with Homebrew:
  `brew install python@3.12`. The `python3` that comes with macOS is too old, and is not used.
- **Linux:** with your package manager, for example `sudo apt install python3.12`.

The extension finds Python by itself. What it found, and everything it tried, is in View › Output ›
**Loom**.

The extension does not run in folders that VS Code has not been told to trust.

## Settings

| setting             | what it does                                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loom.python`       | The Python to use, as a full path. Empty, the default: the extension searches for one. Only your user settings can set this, never a folder's own settings. |
| `loom.trace.server` | `off` (the default), `messages` or `verbose`: shows the messages between VS Code and the loom server in Output › Loom, for diagnosing problems.             |

## Licence

Proprietary: see `LICENSE.md`. Copyright © 2026 Univerbum Studios. All rights reserved. The open-source
components included are listed, with their licences, in `out/THIRD_PARTY_NOTICES.txt` and
`bundled/THIRD_PARTY_NOTICES.txt`.
