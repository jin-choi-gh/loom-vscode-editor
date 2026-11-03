"""Gather everything the language server needs, except Python itself, into vscode/bundled/:
the folder that ships inside the extension's package.

    .venv/Scripts/python scripts/bundle.py      (Windows)
    .venv/bin/python scripts/bundle.py          (macOS / Linux)

Any Python 3.12 or newer with pip will do: the script only copies files and runs pip.
"""

import re
import shutil
import subprocess
import sys
from datetime import UTC, datetime
from importlib.metadata import PathDistribution
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUNDLED = ROOT / "vscode" / "bundled"
SERVER = ROOT / "server"
LOOM = ROOT / "loom"


def main() -> None:
    if not (LOOM / "src" / "synthesis.py").is_file():
        sys.exit(
            "loom/ is empty: fetch the submodule with `git submodule update --init`"
        )

    if BUNDLED.exists():
        shutil.rmtree(BUNDLED)  # nothing from an earlier bundle survives
    copy_python(
        SERVER / "loom_language_server", BUNDLED / "server" / "loom_language_server"
    )
    shutil.copyfile(SERVER / "start.py", BUNDLED / "start.py")
    copy_python(LOOM / "src", BUNDLED / "loom")
    install_libraries(BUNDLED / "libs")
    write_notices(BUNDLED / "libs", BUNDLED / "THIRD_PARTY_NOTICES.txt")
    write_record(BUNDLED / "BUNDLE.txt")
    print(f"bundled into {BUNDLED.relative_to(ROOT)}")


def copy_python(source: Path, target: Path) -> None:
    """A folder's Python files, in the same layout, and nothing else (no caches, no notes)."""
    for path in sorted(source.rglob("*.py")):
        destination = target / path.relative_to(source)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, destination)


def install_libraries(target: Path) -> None:
    """The server's libraries, at exactly the versions in server/requirements.txt. Only ready-made
    wheels are accepted, and each must be pure Python, so that one bundle runs on every system."""
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--quiet",
            "--disable-pip-version-check",
            "--target",
            str(target),
            "--no-deps",  # exactly the versions listed, nothing pulled in unseen
            "--only-binary=:all:",  # wheels only: never built from source on this machine
            "--no-compile",
            "--requirement",
            str(SERVER / "requirements.txt"),
        ],
        check=True,
    )
    for wheel in sorted(target.glob("*.dist-info/WHEEL")):
        tags = [
            line.removeprefix("Tag:").strip()
            for line in wheel.read_text(encoding="utf-8").splitlines()
            if line.startswith("Tag:")
        ]
        if not tags or not all(tag.endswith("-none-any") for tag in tags):
            sys.exit(f"{wheel.parent.name}: not pure Python ({', '.join(tags)})")


def write_notices(libs: Path, notices: Path) -> None:
    """Each bundled library's name, version and licence, with its licence text in full, as
    those licences require of software that includes them."""
    sections = []
    for info in sorted(libs.glob("*.dist-info")):
        metadata = PathDistribution(info).metadata
        licence = metadata.get("License-Expression") or metadata.get("License")
        texts = licence_texts(info)
        if not texts:
            sys.exit(f"{info.name}: no licence text found")
        heading = f"{metadata['Name']} {metadata['Version']}"
        stated = f"Licence: {licence}" if licence else "Licence: as in the text below"
        sections.append("\n\n".join([heading, stated, *texts]))
    notices.write_text(
        "The loom editor includes the following open-source software.\n\n"
        + ("\n\n" + "=" * 79 + "\n\n").join(sections)
        + "\n",
        encoding="utf-8",
    )


def licence_texts(info: Path) -> list[str]:
    """A library's licence files: in its dist-info's licenses/ folder, or beside its metadata."""
    files = [path for path in sorted((info / "licenses").rglob("*")) if path.is_file()]
    if not files:
        files = [
            path
            for path in sorted(info.iterdir())
            if path.name.upper().startswith(("LICEN", "COPYING", "NOTICE"))
        ]
    return [path.read_text(encoding="utf-8").strip() for path in files]


def write_record(record: Path) -> None:
    """What went into the bundle: loom's commit, the server's version, and the date."""
    commit = git("rev-parse", "HEAD")
    changed = git("status", "--porcelain", "--", "src")
    lines = [
        f"loom: commit {commit}" + (" with uncommitted changes" if changed else ""),
        f"loom-language-server: {server_version()}",
        f"bundled: {datetime.now(UTC).date().isoformat()} (UTC)",
    ]
    record.write_text("\n".join(lines) + "\n", encoding="utf-8")


def server_version() -> str:
    """The server's version, from the one place it is written: its package's __init__.py."""
    init = (SERVER / "loom_language_server" / "__init__.py").read_text(encoding="utf-8")
    found = re.search(r'^__version__ = "([^"]+)"$', init, re.MULTILINE)
    if found is None:
        sys.exit("server/loom_language_server/__init__.py: no __version__")
    return found.group(1)


def git(*args: str) -> str:
    """A git command's output, run in the loom submodule."""
    result = subprocess.run(
        ["git", "-C", str(LOOM), *args], capture_output=True, text=True, check=True
    )
    return result.stdout.strip()


if __name__ == "__main__":
    main()
