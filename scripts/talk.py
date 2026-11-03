"""Talk to the language server as an editor would, and show every message.

.venv/Scripts/python scripts/talk.py      (Windows)
.venv/bin/python scripts/talk.py          (macOS / Linux)

It talks to the bundled server, started as the extension starts it: run scripts/bundle.py
first.
"""

import json
import subprocess
import sys
from pathlib import Path

START = Path(__file__).resolve().parent.parent / "vscode" / "bundled" / "start.py"
if not START.is_file():
    sys.exit("no bundle in vscode/bundled: run scripts/bundle.py first")

server = subprocess.Popen(
    [sys.executable, "-I", "-S", str(START)],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
)


def send(message: dict) -> None:
    """Write one message: a header giving its length in bytes, a blank line, the JSON."""
    body = json.dumps({"jsonrpc": "2.0", **message}).encode("utf-8")
    server.stdin.write(f"Content-Length: {len(body)}\r\n\r\n".encode("ascii") + body)
    server.stdin.flush()
    print("editor ->", message["method"])


def receive() -> dict:
    """Read one message: header lines up to a blank line, then the JSON."""
    headers = {}
    while line := server.stdout.readline().strip():
        name, value = line.decode("ascii").split(":", 1)
        headers[name.lower()] = value.strip()
    message = json.loads(server.stdout.read(int(headers["content-length"])))
    print("server ->", json.dumps(message))
    return message


# A request has an id and gets a reply with the same id.
# A notification has no id and gets no reply.
try:
    # As the extension does, tell the server where the bundled loom is
    synthesis = START.parent / "loom" / "synthesis.py"
    options = {"synthesis": str(synthesis)}
    send(
        {
            "id": 1,
            "method": "initialize",
            "params": {"capabilities": {}, "initializationOptions": options},
        }
    )
    receive()
    send({"method": "initialized", "params": {}})
    receive()  # our handler's log message
    send({"id": 2, "method": "shutdown"})
    receive()
    send({"method": "exit"})
    print("server exited with code", server.wait(timeout=5))
finally:
    server.kill()  # never leave the server running, even if this script fails
