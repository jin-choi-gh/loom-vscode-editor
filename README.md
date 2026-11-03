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
- **the extension** (`vscode/`, TypeScript): starts the server and connects VS Code to it, and will
  hold the loom-viewer panel.

**Status:** early. The server starts, answers an editor's opening messages and logs that it has
started (try `scripts/talk.py`). In VS Code, F5 runs the extension, which starts the server
(milestone M0, see "Running the extension"). On every save, the server composes the saved file's
folder with loom and sends the result to the extension; the viewer that will draw it is next.

## Layout

    loom/                      loom itself, as a git submodule: loom's repository at a fixed commit
    server/                    the language server (Python, pygls)
      pyproject.toml           the package and what it needs
      loom_language_server/
        server.py              the server: its name, version, and the messages it handles
        __main__.py            starts it: `python -m loom_language_server`
    scripts/
      talk.py                  plays the editor, to see the server's messages by hand
    vscode/                    the VS Code extension (TypeScript)
      package.json             its manifest: when it starts, which file it runs, what it needs
      package-lock.json        the exact versions installed (committed)
      tsconfig.json            how TypeScript compiles the extension (src/*.ts) into out/
      tsconfig.webview.json    how TypeScript checks the viewer's page (src/webview/, src/loom-viewer/)
      .prettierrc.json         code style, as in anthos-reader
      src/extension.ts         starts the server and connects VS Code to it
      src/viewer.ts            the viewer panel beside the editor; its page loads out/webview.js
      src/webview/main.tsx     the viewer's page (React), bundled with esbuild into out/webview.js
      out/                     the compiled JavaScript VS Code runs (made by the build, not committed)
    examples/                  small loom texts to try the extension on
      the-sick-rose/           Blake, "The Sick Rose" (display.txt, meta.toml)
    .vscode/                   VS Code's settings for working on this repository
      launch.json              F5: run the extension in a second window, on examples/
      tasks.json               compiles the extension before each run

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
are not seen here.

### The server

Run these commands from this repository's root. They create a private Python environment in
`.venv/` and install the server into it, in editable mode, so changes to its code take effect
without reinstalling. Each machine makes its own `.venv/`; it is not committed.

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

- **the extension itself**, which runs in VS Code's Node: `src/*.ts`, compiled by `tsc` with
  `tsconfig.json` (`npm run compile:extension`);
- **the viewer's page**, which runs in the panel's browser: `src/webview/` and `src/loom-viewer/`,
  type-checked by `tsc` with `tsconfig.webview.json`, then bundled with React by esbuild into
  `out/webview.js` (`npm run compile:webview`).

A successful compile prints only esbuild's summary of the bundle.

## Running the extension

1. Open this repository's folder in VS Code (File › Open Folder), as a folder of its own: VS Code
   reads `.vscode/launch.json` only from the folder it has open.
2. Press F5. The extension is compiled, then a second window opens, titled
   **[Extension Development Host]**, with our extension loaded and `examples/` open.
3. In that window, open View › Output and choose **Loom** in the panel's dropdown. It should say
   `loom-language-server started, using …/loom/src/synthesis.py`.
4. Open `the-sick-rose/display.txt`, then open the viewer: the preview icon at the editor's top
   right, or Ctrl+Shift+P › **Loom: Open Viewer**. A panel beside the file shows the poem, and the
   log adds `composed the-sick-rose: 8 lines`.
5. Change the file and save it (Ctrl+S): the panel shows the change. If loom cannot compose the
   folder, the panel shows loom's message instead, and the log says `could not compose …`.
   (VS Code does not save a file with no changes, so an unchanged file sends nothing.)
6. Close that window to stop; the server stops with it. After changing the server's code, press F5
   again: each run starts a fresh server.

If it does not work:

| what you see | likely cause |
| --- | --- |
| no "Loom" in the Output dropdown | the extension did not start: the open folder must contain a `display.txt` |
| a notification "no Python at …" | `.venv/` is missing: see the development setup |
| "Loom" is there but empty | the server did not start: try `scripts/talk.py` |
| F5 asks which debugger to use | the folder open in VS Code is not this repository's |
| `could not compose …: … can't open file '…synthesis.py'` | the submodule is empty: run `git submodule update --init` |

## Running the server

An editor starts the server itself, so you rarely run it by hand. If you do:

    .venv\Scripts\python -m loom_language_server     # Windows
    .venv/bin/python -m loom_language_server         # macOS / Linux

it prints nothing and seems to hang: it is waiting for an editor to send it messages on its
standard input. Stop it with Ctrl+C.

Its standard output is the channel for those messages, so the server's code must never `print()`:
a stray line corrupts the conversation. To log, send the editor a log message
(`ls.window_log_message`) or write to standard error.

## Talking to the server by hand

`scripts/talk.py` plays the editor: it starts the server, sends the opening messages, and prints
every message both ways. Use it to see what the server says without involving VS Code, or to tell
whether a problem lies in the server or in the extension.

    .venv\Scripts\python scripts\talk.py     # Windows
    .venv/bin/python scripts/talk.py         # macOS / Linux

A working server gives:

    editor -> initialize
    server -> {"id": 1, ..., "result": {"capabilities": {...}, "serverInfo": {"name": "loom-language-server", ...}}}
    editor -> initialized
    server -> {"params": {"type": 3, "message": "loom-language-server started"}, "method": "window/logMessage", ...}
    editor -> shutdown
    server -> {"id": 2, ..., "result": null}
    editor -> exit
    server exited with code 0

The `capabilities` are what the server asks of the editor (for example `"save": false`: it is not
yet told about saves). They grow as features are added.

## Milestones

| | what you see |
| --- | --- |
| **M0** | VS Code starts the server; "loom-language-server started" appears in its Output panel |
| **M1** | on saving a file, loom's errors appear as squiggles and in the Problems panel |
| **M2** | loom-viewer: a panel beside the editor shows the composed text, redrawn on each save |
| **M3** | completions and hovers for each representation (line ids and quotes in `notes.txt`, …) |
| **M4** | all of the above as you type, before saving |
