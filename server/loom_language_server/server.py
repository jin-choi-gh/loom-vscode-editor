import json
import subprocess
import sys
import tempfile
from importlib.metadata import version
from pathlib import Path

from lsprotocol import types
from pygls import uris
from pygls.lsp.server import LanguageServer

server = LanguageServer("loom-language-server", version("loom-language-server"))

# loom's synthesis.py, as the editor names it in its initialization options.
synthesis: Path | None = None


@server.feature(types.INITIALIZE)
def initialize(ls: LanguageServer, params: types.InitializeParams) -> None:
    """Learn where loom is from the editor's initialization options."""
    global synthesis
    options = params.initialization_options or {}
    if "synthesis" in options:
        synthesis = Path(options["synthesis"])


@server.feature(types.INITIALIZED)
def initialized(ls: LanguageServer, params: types.InitializedParams) -> None:
    """The editor has connected: say so in its log."""
    log(ls, f"loom-language-server started, using {synthesis}")


@server.feature(types.TEXT_DOCUMENT_DID_SAVE)
def did_save(ls: LanguageServer, params: types.DidSaveTextDocumentParams) -> None:
    """A file was saved: compose its folder."""
    compose_and_send(ls, params.text_document.uri)


@server.feature("loom/compose")
def compose_now(ls: LanguageServer, params) -> None:
    """The editor asks for a file's folder to be composed now: the viewer has just opened."""
    compose_and_send(ls, params.uri)


def compose_and_send(ls: LanguageServer, uri: str) -> None:
    """Compose the folder of the file at uri, and send the editor the result."""
    path = uris.to_fs_path(uri)
    if path is None:
        return
    folder = Path(path).parent
    if synthesis is None:
        log(ls, "cannot compose: the editor did not say where loom is")
        return

    composed, error = compose(synthesis, folder)
    if composed is not None:
        log(ls, f"composed {folder.name}: {len(composed['lines'])} lines")
        ls.protocol.notify(
            "loom/composed", {"folder": str(folder), "textualComplex": composed}
        )
    else:
        log(ls, f"could not compose {folder.name}: {error}")
        ls.protocol.notify("loom/failed", {"folder": str(folder), "error": error})


def compose(synthesis: Path, folder: Path) -> tuple[dict | None, str]:
    """Run loom on a folder: its textual complex as JSON, or loom's error message."""
    with tempfile.TemporaryDirectory() as temporary:
        output = Path(temporary) / "composed.json"
        result = subprocess.run(
            [sys.executable, str(synthesis), str(folder), "--json", str(output)],
            capture_output=True,
            check=False,  # a failure is reported, not raised
            text=True,
            encoding="utf-8",
        )
        if result.returncode != 0:
            return None, result.stderr.strip().removeprefix("error: ")
        return json.loads(output.read_text(encoding="utf-8")), ""


def log(ls: LanguageServer, message: str) -> None:
    ls.window_log_message(
        types.LogMessageParams(type=types.MessageType.Info, message=message)
    )
