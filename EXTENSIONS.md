# Extensions and deferred work

Things discussed for the editor but not built yet, because nothing needs them now. Each entry says
what it is, why it waits, and where it would go. When one is built, tick it off or delete it. The
milestones in the README say what comes next; this file holds what was set aside.

## The viewer

- [ ] **Errors as a banner.** When loom cannot compose the folder, the panel replaces the poem with
      loom's message. While you type, a calmer behaviour: keep the last poem that composed, and show
      the message in a banner above it, cleared on the next success. _Where:_ `webview/main.tsx`
      (keep the last `composed` message beside the last message of any kind).
- [ ] **The look in VS Code's themes.** loom-viewer's CSS is anthos-reader's, made for a white
      page: `.note` has `background: white` and dark borders, `--highlight` is a pale blue, and the
      text takes the page's default colour. In a dark theme the notes are bright boxes. Direction:
      follow the theme for background, text and borders (VS Code's `--vscode-…` variables), keep
      anthos-reader's typography. _Where:_ a stylesheet of the editor's own, loaded after
      `viewer.css`, so loom-viewer's copy stays as in anthos-reader.
- [ ] **Indents.** loom gives each line its indent (the `display` schema's line value), and
      `viewer.css` already indents by `--indent`, but `PoemBlock` never sets it (the line is
      commented out) and `Line` has no `indent` field. Fix in anthos-reader and in loom-viewer's
      copy alike: `toPoem` reads the value, `PoemBlock` sets `--indent`. An example poem with
      indents (Herbert's "Easter Wings") would show it.
- [ ] **A narrow panel.** The side-by-side layout needs about 40rem (the margin alone is at least
      16rem); in a narrow panel the poem's column gets thin. If it matters: put the notes below the
      poem when the panel is narrow, with a CSS container or media query, without anthos-reader's
      `useLayout`.
- [ ] **Which poem the panel shows.** The panel shows whatever was composed last, from any folder,
      and its title is always "Loom Viewer". Name the poem in the panel's title, and perhaps follow
      the active editor's folder only. _Where:_ `src/viewer.ts` (`panel.title`).
- [ ] **The selected note across saves.** Note ids are positions (`notes:7`), so after editing
      `notes.txt` the same id may be another note. Today the selection is kept while the folder
      stays the same; matching notes across compositions would need stable note ids from loom.
- [ ] **loom-viewer in its own repository**, shared with anthos-reader through an npm git
      dependency. Until then the two copies must be kept in step by hand (see
      `vscode/webview/loom-viewer/README.md`).

## The build

- [ ] **One Prettier version.** anthos-reader pins Prettier 3.9.10 and has `format` scripts; this
      repository has neither, and checks with another version format a line of `toPoem.ts`
      differently. Add `prettier@3.9.10` to `vscode/package.json`'s dev dependencies, with
      `format` and `format:check` scripts.
- [ ] **Watching both sides.** `npm run compile` is run by F5 before each launch, so no watch is
      needed. A watch would need two processes at once (`tsc --watch` for the extension, esbuild's
      `--watch` for the page).
- [ ] **A production build:** minified, with React's production build, and the extension itself
      bundled by esbuild so that the package needs no `node_modules`. Part of packaging.

## The server

- [ ] **Composing without blocking.** `compose` runs loom and waits (a fraction of a second);
      meanwhile other messages queue. Run loom asynchronously if it ever matters.
- [ ] **loom's errors as diagnostics** (milestone M1): squiggles and the Problems panel. Needs loom
      to report problems with their file, row and column (loom/EXTENSIONS.md).
- [ ] **A `loom.synthesis` setting**, machine-scoped, to use a loom checkout instead of the
      submodule or the bundled copy, for trying uncommitted loom changes.

## Packaging and safety

- [ ] **Workspace Trust.** Declare how the extension behaves in folders VS Code does not trust
      (`capabilities.untrustedWorkspaces` in `package.json`). Any setting that names a program to
      run must be machine-scoped, so a downloaded folder cannot set it.
