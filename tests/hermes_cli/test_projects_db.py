"""Tests for the per-profile Projects store (hermes_cli/projects_db)."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from hermes_cli import projects_db as pdb


@pytest.fixture
def conn(tmp_path):
    c = pdb.connect(db_path=tmp_path / "projects.db")
    try:
        yield c
    finally:
        c.close()






def test_discovery_policy_change_clears_only_discovered_rows(conn):
    project_id = pdb.create_project(conn, name="Explicit", folders=["/www/explicit"])
    pdb.record_discovered_repos(
        conn, [("/www/scanned", "scanned")], policy_key="policy-a"
    )

    assert pdb.reconcile_discovered_repos_policy(conn, "policy-b") is True
    assert pdb.list_discovered_repos(conn) == []
    assert pdb.get_project(conn, project_id) is not None
    assert pdb.get_discovery_policy_key(conn) == "policy-b"






def test_suspend_and_restore_folder_association(conn, tmp_path):
    first, second = str(tmp_path / "first"), str(tmp_path / "second")
    pid = pdb.create_project(conn, name="Thesis", folders=[first, second])

    pdb.set_folder_enabled(conn, pid, first, enabled=False)
    project = pdb.get_project(conn, pid)
    assert project.primary_path == second
    assert not next(folder for folder in project.folders if folder.path == first).enabled
    assert pdb.project_for_path(conn, first) is None

    pdb.set_folder_enabled(conn, pid, second, enabled=False)
    assert pdb.get_project(conn, pid).primary_path is None

    pdb.set_folder_enabled(conn, pid, first, enabled=True)
    assert pdb.get_project(conn, pid).primary_path == first
    assert pdb.project_for_path(conn, first).id == pid


def test_create_get_list(conn):
    pid = pdb.create_project(conn, name="Hermes Agent", folders=["/tmp/hermes"])
    proj = pdb.get_project(conn, pid)

    assert proj is not None
    assert proj.slug == "hermes-agent"
    assert proj.name == "Hermes Agent"
    # First folder becomes primary.
    assert proj.primary_path == os.path.abspath("/tmp/hermes")
    assert [f.path for f in proj.folders] == [os.path.abspath("/tmp/hermes")]
    assert proj.folders[0].is_primary is True

    # Lookup by slug too.
    assert pdb.get_project(conn, "hermes-agent").id == pid
    assert len(pdb.list_projects(conn)) == 1


def test_managed_workspace_failure_does_not_save_project(conn):
    root = pdb.get_hermes_home() / "project-workspaces"
    root.write_text("blocked by a file", encoding="utf-8")

    with pytest.raises(OSError):
        pdb.create_project(conn, name="Research", managed_workspace=True)

    assert pdb.list_projects(conn) == []


def test_managed_workspace_keeps_files_when_project_is_deleted(conn):
    pid = pdb.create_project(conn, name="Research", managed_workspace=True)
    project = pdb.get_project(conn, pid)
    folder = Path(project.primary_path)
    notes = folder / "notes.md"
    notes.write_text("Research notes", encoding="utf-8")

    pdb.update_project(conn, pid, name="Renamed")
    assert pdb.get_project(conn, pid).primary_path == str(folder)
    pdb.delete_project(conn, pid)

    assert notes.read_text(encoding="utf-8") == "Research notes"


def test_managed_workspace_rejects_existing_folders(conn, tmp_path):
    with pytest.raises(ValueError, match="cannot be combined"):
        pdb.create_project(conn, name="Research", managed_workspace=True, folders=[str(tmp_path)])
    assert pdb.list_projects(conn) == []












def test_project_for_path_skips_archived(conn):
    pid = pdb.create_project(conn, name="P", folders=["/www/app"])
    pdb.archive_project(conn, pid)

    assert pdb.project_for_path(conn, "/www/app/src") is None
    # Archived hidden from the default list but visible with include_archived.
    assert pdb.list_projects(conn) == []
    assert len(pdb.list_projects(conn, include_archived=True)) == 1

    pdb.restore_project(conn, pid)
    assert pdb.project_for_path(conn, "/www/app/src").id == pid


def test_create_dedups_by_primary_path(conn):
    pid = pdb.create_project(conn, name="GeoTrace", folders=["/www/geotrace"])

    # Same folder again (any name): refused, existing project named in error.
    with pytest.raises(ValueError, match="already belongs to project 'geotrace'"):
        pdb.create_project(conn, name="GeoTrace", folders=["/www/geotrace"])
    with pytest.raises(ValueError, match="already belongs"):
        pdb.create_project(conn, name="Other Name", primary_path="/www/geotrace")

    # Trailing-separator spelling of the same folder is still a duplicate.
    with pytest.raises(ValueError, match="already belongs"):
        pdb.create_project(conn, name="GeoTrace", primary_path="/www/geotrace/")

    # Deliberate duplicates stay possible.
    dup = pdb.create_project(
        conn, name="GeoTrace", folders=["/www/geotrace"], allow_duplicate_path=True
    )
    assert dup != pid
    assert len(pdb.list_projects(conn)) == 2


def test_create_dedup_ignores_archived_and_other_paths(conn):
    pid = pdb.create_project(conn, name="App", folders=["/www/app"])
    pdb.archive_project(conn, pid)

    # Archived project no longer blocks the path.
    fresh = pdb.create_project(conn, name="App", folders=["/www/app"])
    assert fresh != pid

    # Different folder is never a collision; folder-less projects don't match.
    pdb.create_project(conn, name="Elsewhere", folders=["/www/other"])
    pdb.create_project(conn, name="No Folder")


def test_find_by_primary_path(conn):
    pid = pdb.create_project(conn, name="App", folders=["/www/app"])

    assert pdb.find_by_primary_path(conn, "/www/app").id == pid
    assert pdb.find_by_primary_path(conn, "/www/app/").id == pid
    assert pdb.find_by_primary_path(conn, "/www/nope") is None
    assert pdb.find_by_primary_path(conn, "") is None






def test_per_profile_isolation(tmp_path):
    # Two distinct DB paths stand in for two profiles' HERMES_HOME.
    a = pdb.connect(db_path=tmp_path / "a" / "projects.db")
    b = pdb.connect(db_path=tmp_path / "b" / "projects.db")
    try:
        pdb.create_project(a, name="Only In A", folders=["/a"])
        pdb.record_discovered_repos(a, [("/a/scanned", "scanned")])

        assert [p.slug for p in pdb.list_projects(a)] == ["only-in-a"]
        assert pdb.list_projects(b) == []
        assert [row["root"] for row in pdb.list_discovered_repos(a)] == [
            os.path.abspath("/a/scanned")
        ]
        assert pdb.list_discovered_repos(b) == []
    finally:
        a.close()
        b.close()


