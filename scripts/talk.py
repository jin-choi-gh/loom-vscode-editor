"""Talk to the language server as an editor would, and show every message.

.venv/Scripts/python scripts/talk.py      (Windows)
.venv/bin/python scripts/talk.py          (macOS / Linux)
"""

import json
import subprocess
import sys

server = subprocess.Popen(
    [sys.executable, "-m", "loom_language_server"],
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
    send({"id": 1, "method": "initialize", "params": {"capabilities": {}}})
    receive()
    send({"method": "initialized", "params": {}})
    receive()  # our handler's log message
    send({"id": 2, "method": "shutdown"})
    receive()
    send({"method": "exit"})
    print("server exited with code", server.wait(timeout=5))
finally:
    server.kill()  # never leave the server running, even if this script fails
