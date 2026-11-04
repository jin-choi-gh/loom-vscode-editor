#!/bin/sh
# From a fresh clone to a checked package, on macOS or Linux: fetch loom, make the Python
# environment, install the extension's libraries, then build dist/loom-editor-<version>.vsix.
#
#     sh build-dist-scripts/build_vsix.sh
#
# It is safe to run again, and from any folder. On Windows, use build_vsix.ps1.

set -eu
cd "$(dirname "$0")/.." # the repository's root, one folder above this file

fail() {
    echo "cannot build the package: $1" >&2
    exit 1
}

# The first Python that is 3.12 or newer. Apple's /usr/bin/python3 is never run: it is too old,
# and on a Mac without the developer tools, running it opens a dialog offering to install them.
find_python() {
    for candidate in python3.14 python3.13 python3.12 python3 \
        /opt/homebrew/bin/python3 /usr/local/bin/python3 \
        /Library/Frameworks/Python.framework/Versions/Current/bin/python3; do
        found=$(command -v "$candidate" 2>/dev/null) || continue
        if [ "$(uname)" = Darwin ] && [ "$found" = /usr/bin/python3 ]; then continue; fi
        if "$found" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' 2>/dev/null; then
            echo "$found"
            return 0
        fi
    done
    return 1
}

for program in git node npm; do
    command -v "$program" >/dev/null 2>&1 || fail "$program is not installed"
done
python=$(find_python) || fail "no Python 3.12 or newer: on macOS, install one from python.org or with \`brew install python@3.12\`; on Linux, with your package manager, for example \`sudo apt install python3.12\`"

echo "== loom"
# Updating would quietly move loom back to the recorded commit, and package that instead.
case "$(git submodule status loom)" in
+*) fail "loom/ is not at the commit this repository records. Commit the new pointer (git add loom, then git commit), or go back to the recorded commit (git submodule update)" ;;
esac
git submodule update --init

echo "== the Python environment"
if [ ! -x .venv/bin/python ]; then
    "$python" -m venv .venv
fi
.venv/bin/python -m pip install --quiet --disable-pip-version-check -e server

echo "== the extension's libraries"
(cd vscode && npm ci --no-audit --no-fund)

echo "== the package"
node scripts/package.mjs
