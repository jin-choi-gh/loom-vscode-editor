"""Start the loom language server from the extension's bundle, where scripts/bundle.py copies
this file (vscode/bundled/start.py).

The extension runs it as `python -I -S start.py`: Python then looks only at its standard
library, and this file adds the bundle's two folders below. Nothing else can be imported in
their place: not the folder open in the editor, not PYTHON… environment variables, not any
installed packages.
"""

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(HERE / "server"), str(HERE / "libs")]

# Imported only now: it is found through the path set above.
from loom_language_server.server import server

server.start_io()
