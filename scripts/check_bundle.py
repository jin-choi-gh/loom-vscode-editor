"""Check the bundled server as the extension starts it, from a folder that tries to trick it.

    .venv/Scripts/python scripts/check_bundle.py      (Windows)
    .venv/bin/python scripts/check_bundle.py          (macOS / Linux)

Run scripts/bundle.py first. The check starts vscode/bundled/start.py the way the extension
does (python -I -S), from a folder holding a json.py and a models.py that stop the program if
they are ever imported, and asks it to compose examples/the-sick-rose. It passes if the poem
comes back composed and the server wrote nothing to its error output.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUNDLED = ROOT / "vscode" / "bundled"
EXAMPLE = ROOT / "examples" / "the-sick-rose" / "display.txt"
EXPECTED_LINES = 8

# Names that the server (json) and loom (models) import: a copy in the open folder must never
# be imported in their place.
TRAPS = ["json.py", "models.py"]


def main() -> None:
    if not (BUNDLED / "start.py").is_file():
        sys.exit("no bundle in vscode/bundled: run scripts/bundle.py first")

    with tempfile.TemporaryDirectory() as folder:
        for name in TRAPS:
            (Path(folder) / name).write_text(
                f'raise SystemExit("{name} in the open folder was imported")\n',
                encoding="utf-8",
            )
        server = subprocess.Popen(
            [sys.executable, "-I", "-S", str(BUNDLED / "start.py")],
            cwd=folder,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        try:
            composed = converse(server)
        except ServerGone:
            composed = None
        finally:
            server.kill()
            server.wait()
            errors = server.stderr.read().decode("utf-8", "replace").strip()

    problems = []
    if composed is None:
        problems.append("the server did not answer")
    elif composed.get("method") != "loom/composed":
        problems.append(f"expected loom/composed, got {composed.get('method')}")
    else:
        lines = len(composed["params"]["textualComplex"]["lines"])
        if lines != EXPECTED_LINES:
            problems.append(f"expected {EXPECTED_LINES} lines, got {lines}")
    if errors:
        problems.append(f"the server wrote errors:\n{errors}")
    if problems:
        sys.exit("check failed: " + "\n".join(problems))
    print(f"check passed: composed {EXAMPLE.parent.name} from a folder holding {TRAPS}")


def converse(server: subprocess.Popen) -> dict:
    """Start the server, ask it to compose the example, and return what it sends back."""
    synthesis = BUNDLED / "loom" / "synthesis.py"
    send(
        server,
        {
            "id": 1,
            "method": "initialize",
            "params": {
                "capabilities": {},
                "initializationOptions": {"synthesis": str(synthesis)},
            },
        },
    )
    receive(server)
    send(server, {"method": "initialized", "params": {}})
    receive(server)  # the server's start-up log message
    send(server, {"method": "loom/compose", "params": {"uri": EXAMPLE.as_uri()}})
    receive(server)  # its log message: composed, or could not compose
    return receive(server)


class ServerGone(Exception):
    """The server's output ended: it has stopped."""


def send(server: subprocess.Popen, message: dict) -> None:
    body = json.dumps({"jsonrpc": "2.0", **message}).encode("utf-8")
    server.stdin.write(f"Content-Length: {len(body)}\r\n\r\n".encode("ascii") + body)
    server.stdin.flush()


def receive(server: subprocess.Popen) -> dict:
    headers = {}
    while line := server.stdout.readline():
        if not line.strip():
            break
        name, value = line.decode("ascii").split(":", 1)
        headers[name.lower()] = value.strip()
    if "content-length" not in headers:
        raise ServerGone
    return json.loads(server.stdout.read(int(headers["content-length"])))


if __name__ == "__main__":
    main()
