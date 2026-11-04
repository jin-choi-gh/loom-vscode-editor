# From a fresh clone to a checked package, on Windows: fetch loom, make the Python environment,
# install the extension's libraries, then build dist/loom-editor-<version>.vsix.
#
#     powershell -ExecutionPolicy Bypass -File build-dist-scripts\build_vsix.ps1
#
# It is safe to run again, and from any folder. On macOS and Linux, use build_vsix.sh.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot) # the repository's root, one folder above this file

function Fail($message) {
    Write-Host "cannot build the package: $message" -ForegroundColor Red
    exit 1
}

# Run a program, and stop here if it fails.
function Run($program) {
    & $program @args
    if ($LASTEXITCODE -ne 0) { Fail "$program $args failed" }
}

# The first Python that is 3.12 or newer, as a program and its arguments.
function Find-Python {
    $question = "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)"
    foreach ($candidate in @(@("py", "-3"), @("python"), @("python3"))) {
        if (-not (Get-Command $candidate[0] -ErrorAction SilentlyContinue)) { continue }
        $rest = @($candidate | Select-Object -Skip 1)
        $ErrorActionPreference = "Continue"
        & $candidate[0] @rest -c $question 2>$null
        $good = $LASTEXITCODE -eq 0
        $ErrorActionPreference = "Stop"
        if ($good) { return , $candidate }
    }
    return $null
}

foreach ($program in @("git", "node", "npm")) {
    if (-not (Get-Command $program -ErrorAction SilentlyContinue)) {
        Fail "$program is not installed"
    }
}
$python = Find-Python
if ($null -eq $python) {
    Fail "no Python 3.12 or newer: install one from python.org or the Microsoft Store"
}

Write-Host "== loom"
# Updating would quietly move loom back to the recorded commit, and package that instead.
if ((git submodule status loom) -like "+*") {
    Fail "loom/ is not at the commit this repository records. Commit the new pointer (git add loom, then git commit), or go back to the recorded commit (git submodule update)"
}
Run git submodule update --init

Write-Host "== the Python environment"
$venv = ".venv\Scripts\python.exe"
if (-not (Test-Path $venv)) {
    $rest = @($python | Select-Object -Skip 1)
    Run $python[0] @rest -m venv .venv
}
Run $venv -m pip install --quiet --disable-pip-version-check -e server

Write-Host "== the extension's libraries"
Push-Location vscode
# npm.cmd, not npm: npm.ps1 reads its arguments from the calling line's text, which Run hides.
Run npm.cmd ci --no-audit --no-fund
Pop-Location

Write-Host "== the package"
Run node scripts/package.mjs
