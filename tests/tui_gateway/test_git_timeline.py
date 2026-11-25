import subprocess

from tui_gateway.git_timeline import history, repositories


def test_reads_local_merge_history_and_preserves_commit_metadata(tmp_path):
    repo = tmp_path / "Thesis repo"
    repo.mkdir()

    def git(*args):
        return subprocess.check_output(
            ["git", "-C", str(repo), "-c", "user.name=Timeline Author", "-c", "user.email=timeline@example.org",
             "-c", "commit.gpgSign=false", *args], text=True, encoding="utf-8",
        ).strip()

    git("init", "-b", "main")
    git("commit", "--allow-empty", "-m", "Root")
    git("switch", "-c", "topic")
    git("commit", "--allow-empty", "-m", "Topic commit", "-m", "A multi-line body\nwith details.")
    topic = git("rev-parse", "HEAD")
    git("switch", "main")
    git("commit", "--allow-empty", "-m", "Main commit")
    main = git("rev-parse", "HEAD")
    git("merge", "--no-ff", "-m", "Merge topic", "topic")

    assert repositories([str(tmp_path), str(repo)]) == [str(repo)]
    result = history(str(repo), 4)
    assert result["main_ref"] == "refs/heads/main"
    assert result["truncated"] is False
    assert result["commits"][0]["parents"] == [main, topic]
    assert result["commits"][0]["author"] == "Timeline Author"
    assert next(row for row in result["commits"] if row["hash"] == topic)["message"].strip() == "A multi-line body\nwith details."
    assert {ref["name"] for ref in result["refs"]} == {"refs/heads/main", "refs/heads/topic"}
    assert history(str(repo), 2)["truncated"] is True
