# Loom Editor

A VS Code extension for writing [loom](../loom)'s source files (`display.txt`, `metre.txt`,
`notes.txt`, `meta.toml`). It is meant to:

- show loom's errors in the files, where you type;
- offer completions as you write each representation (line ids and quotes in `notes.txt`, a line's
  words in `metre.txt`);
- show the text being built, in a panel beside the editor (loom-viewer).

It has two parts:

- **the loom language server** (`server/`, Python): composes a folder with loom and tells the
  editor what it finds. It speaks the Language Server Protocol (LSP), so it can work in any editor
  that does. It never imports loom: it runs loom's command line on a folder and reads what comes
  back, so loom's code stays untouched.
- **the extension** (`vscode/`, TypeScript): starts the server and connects VS Code to it, and
  holds the viewer panel (loom-viewer).

**Status:** early. The server starts, answers an editor's opening messages and logs that it has
started (try `scripts/talk.py`). In VS Code, F5 runs the extension, which starts the server
(milestone M0, see "Running the extension"). On every save, the server composes the saved file's
folder with loom, and the viewer beside the editor draws the result with loom-viewer: the poem as
anthos-reader draws it, with its notes in a margin (milestone M2). The extension carries its own
server, loom and their libraries, and finds a Python by itself on Windows, macOS and Linux; making
it into a file that others can install is next.

## Installing

For someone given the extension as a file (`loom-editor-<version>.vsix`):

1. **Install Python 3.12 or newer**, if it is not there already. The extension needs it to run
   loom; everything else comes inside the file.
   - Windows: from [python.org](https://www.python.org/downloads/), or the Microsoft Store.
   - macOS: from [python.org](https://www.python.org/downloads/), or with Homebrew:
     `brew install python@3.12`. (The `python3` that comes with macOS is 3.9, too old; the
     extension never uses it.)
   - Linux: with the package manager, for example `sudo apt install python3.12`.
2. **Install the extension**: in VS Code, open Extensions, then "…" at the top of the panel ›
   Install from VSIX…, and choose the file.
3. **Open a folder** that holds loom's files, open a `display.txt`, and click the preview icon at
   the editor's top right: the poem appears beside it, and is redrawn each time the file is saved.

The extension finds Python by itself (see "Settings"). What it found, and everything it tried, is in
View › Output › **Loom**. If it finds none, or not the one you want, name it in `loom.python`.

## Settings

| setting             | what it does                                                                                                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loom.python`       | The Python that runs loom, as a full path (`C:\Python312\python.exe`, `/opt/homebrew/bin/python3`). Empty, the default: the extension searches. A Python named here is used or reported, never replaced by another. Only your user settings can set it, never a folder's own settings. |
| `loom.trace.server` | `off` (the default), `messages` or `verbose`: shows the messages between VS Code and the server in Output › Loom, for diagnosing problems.                                                                                                                                             |

When `loom.python` is empty, the extension tries these in order, and uses the first that is 3.12
or newer:

| system  | tried in order                                                                                                                                                                                                                   |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows | `py -3` (the launcher's newest Python 3), `python`, `python3`                                                                                                                                                                    |
| macOS   | `python3.14`, `python3.13`, `python3.12` and `python3` on the `PATH`; then `/opt/homebrew/bin/python3`, `/usr/local/bin/python3`, `/Library/Frameworks/Python.framework/Versions/Current/bin/python3`. Never `/usr/bin/python3`. |
| Linux   | `python3.14`, `python3.13`, `python3.12`, `python3` and `python` on the `PATH`                                                                                                                                                   |

Each is run directly (never through a shell) and isolated (`-I -S`), and asked only its version
and full path. Apple's `/usr/bin/python3` is skipped because it is too old and, on a Mac without
the developer tools, running it opens a dialog offering to install them. With the repository, the
same search can be run without VS Code: `node scripts/find_python.mjs` (after `npm run compile`),
or `node scripts/find_python.mjs <path>` to try a Python as if it were set in `loom.python`.

## Layout

    loom/                      loom itself, as a git submodule: loom's repository at a fixed commit
    server/                    the language server (Python, pygls)
      pyproject.toml           the package and what it accepts (pygls 2.x)
      requirements.txt         the exact library versions the bundle contains
      start.py                 starts the server from the bundle (copied to vscode/bundled/)
      loom_language_server/
        __init__.py            the server's version, written only here
        server.py              the server: its name, version, and the messages it handles
        __main__.py            starts it inside .venv: `python -m loom_language_server`
    scripts/
      talk.py                  plays the editor, to see the server's messages by hand
      bundle.py                gathers what the server needs into vscode/bundled/
      find_python.mjs          shows which Python the extension would choose, and what it tried
      check_bundle.py          checks the bundled server, started from a folder that tries to trick it
    vscode/                    the VS Code extension (TypeScript)
      package.json             its manifest: when it starts, which file it runs, what it needs
      package-lock.json        the exact versions installed (committed)
      tsconfig.json            how TypeScript compiles the extension (src/) into out/
      .prettierrc.json         code style, as in anthos-reader
      src/                     the extension, which runs in VS Code's Node
        extension.ts           starts the server and connects VS Code to it
        viewer.ts              the viewer panel beside the editor; its page loads out/webview.js
        python.ts              finds a Python to run the server: loom.python, or a search
      webview/                 the viewer's page, which runs in the panel's browser
        tsconfig.json          how TypeScript checks it (browser, React)
        css.d.ts               tells TypeScript that CSS files can be imported (esbuild bundles them)
        main.tsx               the page (React): receives what the server composed and draws it
                               with loom-viewer; bundled by esbuild into out/webview.js and
                               out/webview.css
        loom-viewer/           draws a poem and its notes from loom's JSON: a temporary copy of
                               anthos-reader's, to become its own repository (see its README)
      out/                     the compiled JavaScript VS Code runs (made by the build, not committed)
      bundled/                 what ships for the server: our server, loom, its libraries and their
                               licences (made by scripts/bundle.py, not committed)
    examples/                  small loom texts to try the extension on
      the-sick-rose/           Blake, "The Sick Rose" (display.txt, meta.toml), with a few notes
                               of our own (notes.txt) to fill the viewer's margin
    .vscode/                   VS Code's settings for working on this repository
      launch.json              F5: run the extension in a second window, on examples/
      tasks.json               before each run: bundles the server, then compiles the extension
    ruff.toml                  how ruff checks the Python (as loom's: Python 3.12, its default rules)

## Development setup

You need:

- **Python 3.12 or newer**, the version loom is written for. On macOS the built-in `python3` is
  too old: install 3.12 from python.org or with Homebrew (`brew install python@3.12`).
- **Node.js**, for building the VS Code extension.

### loom

loom is included as a git submodule in `loom/`: this repository records only which commit of
[loom](https://github.com/jin-choi-gh/loom) it uses, not loom's files. After cloning, fetch it:

    git submodule update --init

(or clone with `git clone --recurse-submodules …` to do both at once). To move to a newer loom,
update the submodule and commit the new pointer:

    cd loom
    git pull
    cd ..
    git add loom
    git commit -m "Use loom at <commit>"

Only committed loom reaches the submodule: changes still uncommitted in a loom checkout elsewhere
are not seen here. And since the extension always runs the bundle, made from the submodule, a change
to loom reaches the editor once it is committed in loom and the submodule has been moved to it.

### The server

Run these commands from this repository's root. They create a private Python environment in
`.venv/` and install the server into it, in editable mode, so changes to its code take effect
without reinstalling. Each machine makes its own `.venv/`; it is not committed. It is for this
repository's scripts (the bundle needs its pip); the extension itself does not use it, but runs the
bundle with the Python it finds, as an installed copy does.

On Windows (PowerShell):

    py -3.12 -m venv .venv
    .venv\Scripts\python -m pip install -e server

On macOS / Linux:

    python3.12 -m venv .venv
    .venv/bin/python -m pip install -e server

To check, list what is installed:

    .venv\Scripts\python -m pip list        # Windows
    .venv/bin/python -m pip list            # macOS / Linux

The list should include `loom-language-server` and `pygls` (2.x).

Always call the environment's own Python, as above, rather than a bare `python` or `pip`, which
may install into your system's Python instead.

`.venv/` remembers where this folder was when it was made. If you move or rename the folder, delete
`.venv/` and make it again with the commands above: otherwise the server cannot start (and
`scripts/talk.py` fails with `KeyError: 'content-length'`, because no reply ever comes).

### The extension

From `vscode/`, download its libraries (into `node_modules/`, at the versions in
`package-lock.json`) and compile it into `out/`:

    npm install
    npm run compile

The extension has two sides, compiled separately (`npm run compile` does both, and F5 runs it
before each launch):

- **the extension itself**, which runs in VS Code's Node: `src/`, compiled by `tsc` with
  `tsconfig.json` (`npm run compile:extension`);
- **the viewer's page**, which runs in the panel's browser: `webview/`, type-checked by `tsc` with
  `webview/tsconfig.json`, then bundled with React by esbuild into `out/webview.js`
  (`npm run compile:webview`).

Each side has its own file named `tsconfig.json` above its code, so the editor, `tsc` and esbuild
all check a file with the same settings. (VS Code looks only for files named exactly
`tsconfig.json`.)

A successful compile prints only esbuild's summary of the bundle.

### The bundle

The packaged extension carries everything the server needs except Python itself, in
`vscode/bundled/`. `scripts/bundle.py` makes that folder afresh, from this repository's root:

    .venv\Scripts\python scripts\bundle.py      # Windows
    .venv/bin/python scripts/bundle.py          # macOS / Linux

It puts in:

- **our server**: the Python files of `server/loom_language_server/`, and `server/start.py`,
  which starts it (below);
- **loom**: the Python files of the submodule's `src/`, so only committed loom is bundled;
- **the server's libraries** (`libs/`): pygls and what it needs, at exactly the versions in
  `server/requirements.txt`. Only pure-Python packages are accepted, so one bundle runs on
  Windows, macOS and Linux alike;
- **`THIRD_PARTY_NOTICES.txt`**: each library's licence, in full, as those licences require;
- **`BUNDLE.txt`**: loom's commit, the server's version, and the date, to say which loom a
  package holds.

To bundle newer libraries, change their versions in `server/requirements.txt` and run the
script again. F5 runs the script before each launch, so the extension always runs a fresh bundle.

The extension starts the server as `python -I -S bundled/start.py`, and the server runs loom as
`python -E -s -S bundled/loom/synthesis.py …`:

| flag | what Python then leaves out                                                         |
| ---- | ----------------------------------------------------------------------------------- |
| `-E` | `PYTHON…` environment variables, such as `PYTHONPATH`                               |
| `-s` | the user's own installed packages                                                   |
| `-S` | all installed packages: only the standard library, and what the program adds itself |
| `-I` | as `-E` and `-s`, and also the program's own folder and the current folder          |

So the server can import only the standard library and the two folders `start.py` adds
(`bundled/server`, `bundled/libs`); loom, only the standard library and its own folder in the
bundle. A file in the folder open in the editor (a `json.py`, say) is never imported in their
place. loom is not run with `-I`, because it finds its own modules beside `synthesis.py`.

`scripts/check_bundle.py` checks this: it starts the bundled server from a folder holding a
`json.py` and a `models.py` that stop the program if imported, and asks it to compose
`examples/the-sick-rose`.

    .venv\Scripts\python scripts\check_bundle.py      # Windows
    .venv/bin/python scripts/check_bundle.py          # macOS / Linux

## Running the extension

1. Open this repository's folder in VS Code (File › Open Folder), as a folder of its own: VS Code
   reads `.vscode/launch.json` only from the folder it has open.
2. Press F5. The server is bundled and the extension compiled, then a second window opens, titled
   **[Extension Development Host]**, with our extension loaded and `examples/` open.
3. In that window, open View › Output and choose **Loom** in the panel's dropdown. It lists the
   Pythons tried, then the one used, then the server's start:

       py -3: Python 3.14 at C:\…\python.exe
       using Python 3.14 at C:\…\python.exe (found as py -3)
       loom-language-server started, using …\vscode\bundled\loom\synthesis.py

   (To run with a particular Python, set `loom.python` in your user settings.)

4. Open `the-sick-rose/display.txt`, then open the viewer: the preview icon at the editor's top
   right, or Ctrl+Shift+P › **Loom: Open Viewer**. A panel beside the file shows the title and the
   poem (every fifth line numbered), with the notes in a margin on the right; the log adds
   `composed the-sick-rose: 8 lines`.
5. Click a note: its words are marked in the poem, in the colour of the note's box. Click it again
   to clear the mark.
6. Change the file and save it (Ctrl+S): the panel shows the change, and a selected note stays
   selected. If loom cannot compose the folder, the panel shows loom's message instead, and the log
   says `could not compose …`. (VS Code does not save a file with no changes, so an unchanged file
   sends nothing.)
7. Close that window to stop; the server stops with it. After changing the server's code, press F5
   again: each run bundles afresh and starts a fresh server.

If it does not work:

| what you see                                          | likely cause                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| no "Loom" in the Output dropdown                      | the extension did not start: the open folder must contain a `display.txt`                       |
| "Loom needs Python 3.12 or newer, and found none"     | install one (see "Installing"), or name it in `loom.python`; Output › Loom lists what was tried |
| "the Python in loom.python is not usable"             | the setting names no Python, or one older than 3.12: correct or clear it                        |
| "Loom" is there but empty                             | the server did not start: try `scripts/talk.py`                                                 |
| F5 asks which debugger to use                         | the folder open in VS Code is not this repository's                                             |
| F5 stops with `loom/ is empty: fetch the submodule …` | the submodule is empty: run `git submodule update --init`                                       |
| a notification "no server bundle at …"                | the bundle is missing: run `scripts/bundle.py` (F5 does)                                        |

## Running the server

An editor starts the server itself, so you rarely run it by hand. If you do, start the bundle as
the extension does:

    .venv\Scripts\python -I -S vscode\bundled\start.py     # Windows
    .venv/bin/python -I -S vscode/bundled/start.py         # macOS / Linux

It prints nothing and seems to hang: it is waiting for an editor to send it messages on its
standard input. Stop it with Ctrl+C. (`python -m loom_language_server` also works inside `.venv`,
but imports from the folder you are in, which is not how it ships.)

Its standard output is the channel for those messages, so the server's code must never `print()`:
a stray line corrupts the conversation. To log, send the editor a log message
(`ls.window_log_message`) or write to standard error.

## Talking to the server by hand

`scripts/talk.py` plays the editor: it starts the bundled server as the extension does, sends the
opening messages, and prints every message both ways. Use it to see what the server says without
involving VS Code, or to tell whether a problem lies in the server or in the extension.

    .venv\Scripts\python scripts\talk.py     # Windows
    .venv/bin/python scripts/talk.py         # macOS / Linux

A working server gives:

    editor -> initialize
    server -> {"id": 1, ..., "result": {"capabilities": {...}, "serverInfo": {"name": "loom-language-server", ...}}}
    editor -> initialized
    server -> {"params": {"type": 3, "message": "loom-language-server started, using …/vscode/bundled/loom/synthesis.py"}, ...}
    editor -> shutdown
    server -> {"id": 2, ..., "result": null}
    editor -> exit
    server exited with code 0

The `capabilities` are what the server asks of the editor (for example `"save": true`: to be told
about saves, which is when it composes). They grow as features are added.

## Milestones

What has been discussed and deliberately set aside is listed in [EXTENSIONS.md](EXTENSIONS.md).

|        | what you see                                                                           |
| ------ | -------------------------------------------------------------------------------------- |
| **M0** | VS Code starts the server; "loom-language-server started" appears in its Output panel  |
| **M1** | on saving a file, loom's errors appear as squiggles and in the Problems panel          |
| **M2** | loom-viewer: a panel beside the editor shows the composed text, redrawn on each save   |
| **M3** | completions and hovers for each representation (line ids and quotes in `notes.txt`, …) |
| **M4** | all of the above as you type, before saving                                            |
