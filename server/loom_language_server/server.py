from importlib.metadata import version

from lsprotocol import types
from pygls.lsp.server import LanguageServer

server = LanguageServer("loom-language-server", version("loom-language-server"))


@server.feature(types.INITIALIZED)
def initialized(ls: LanguageServer, params: types.InitializedParams) -> None:
    """The editor has connected: say so in its log."""
    ls.window_log_message(
        types.LogMessageParams(
            type=types.MessageType.Info, message="loom-language-server started"
        )
    )
