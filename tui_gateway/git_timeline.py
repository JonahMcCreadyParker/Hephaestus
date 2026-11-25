"""Read-only commit graph and ref metadata for the desktop Git Timeline."""

from __future__ import annotations

import os
import re
from concurrent.futures import ThreadPoolExecutor

from hermes_cli._subprocess_compat import bounded_git_probe


def _git(path: str, *args: str) -> str:
    unc = re.fullmatch(r"//(?:wsl\.localhost|wsl\$)/([^/]+)(/.*)", path.replace("\\", "/"), re.IGNORECASE)
    if os.name == "nt" and unc:
        distro, linux_path = unc.groups()
        command = ["wsl.exe", "--distribution", distro, "--exec", "env", "GIT_NO_LAZY_FETCH=1",
                   "GIT_TERMINAL_PROMPT=0", "git", "-C", linux_path]
    else:
        command = ["git", "-C", path]
    return bounded_git_probe([*command, "--no-pager", *args], timeout=15 if unc else 5)


def _repo(path: str) -> str:
    return _git(path, "rev-parse", "--show-toplevel") if os.path.isabs(path) else ""


def repositories(paths: list[str]) -> list[str]:
    # Keep the supplied checkout path, including Windows' view of WSL paths.
    candidates = list(dict.fromkeys(path for path in paths if path.strip()))[:150]
    with ThreadPoolExecutor(max_workers=8) as executor:
        return [path for path, root in zip(candidates, executor.map(_repo, candidates)) if root]


def history(path: str, limit: int) -> dict:
    if not _repo(path):
        raise ValueError("This repository is unavailable on the Hermes host.")

    if not _git(path, "rev-parse", "--verify", "HEAD"):
        return {"commits": [], "refs": [], "main_ref": None, "truncated": False}

    refs = []
    refs_output = _git(path, "for-each-ref", "--format=%(refname)%09%(objectname)%09%(symref)", "refs/heads", "refs/remotes")
    for row in refs_output.splitlines():
        fields = row.split("\t")
        if len(fields) >= 2 and not (len(fields) > 2 and fields[2]):
            refs.append({"name": fields[0], "hash": fields[1]})

    names = {ref["name"] for ref in refs}
    preferred = ("refs/heads/main", "refs/heads/master", _git(path, "symbolic-ref", "-q", "refs/remotes/origin/HEAD"),
                 "refs/remotes/origin/main", "refs/remotes/origin/master", _git(path, "symbolic-ref", "-q", "HEAD"))
    main_ref = next((name for name in preferred if name in names), None)

    limit = max(1, min(limit, 1000))
    # Unrelated remote tracking branches can exhaust the display limit before
    # the local branch base appears. Include remote ref labels on visible commits.
    revisions = ["HEAD", "--branches", *([main_ref] if main_ref else [])]
    output = _git(path, "log", "--date-order", *revisions, f"--max-count={limit + 1}",
                  "--no-show-signature", "--no-notes", "--no-decorate", "-z", "--format=%H%x00%P%x00%an%x00%aI%x00%s%x00%b")
    if not output:
        raise ValueError("Git could not read this repository's history.")
    fields = output.split("\0")
    commits = [
        {"hash": sha, "parents": parents.split(), "author": author[:256], "date": date,
         "subject": subject[:512], "message": body[:2048]}
        for sha, parents, author, date, subject, body in zip(*(fields[index::6] for index in range(6)))
    ]
    return {"commits": commits[:limit], "refs": refs, "main_ref": main_ref, "truncated": len(commits) > limit}
