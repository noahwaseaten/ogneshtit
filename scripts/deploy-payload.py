"""Builds the `files` array for a Vercel API deployment from the git-tracked sources.

Usage: python3 scripts/deploy-payload.py > payload.json
Every tracked file needed for the build is inlined, so the payload never depends on what
an earlier deployment happened to contain.
"""
import json
import subprocess
import sys

SKIP = {
    "package-lock.json", "AGENTS.md", "README.md", ".gitignore", "eslint.config.mjs",
    "scripts/bulgaria.mjs", "scripts/test-fwi.ts", "scripts/deploy-payload.py",
}

files = [f for f in subprocess.check_output(["git", "ls-files"]).decode().split("\n") if f and f not in SKIP]
json.dump([{"file": f, "data": open(f, encoding="utf-8").read()} for f in files], sys.stdout, ensure_ascii=False)
