# Hephaestus development handoff

Updated 25 November 2026. Continue from `main`. This custom Hermes Agent checkout retains the Hermes desktop name and gateway architecture.

## Development workflow

1. Read the root and nearest area `AGENTS.md`. Verify the branch and working tree with `git status --short --branch`.
2. Make feature work on a branch based on `main`. Stage the intended changes and verify the pushed ref.
3. Run relevant Vitest and ESLint checks for desktop changes and focused Python tests and Ruff for gateway changes. Regenerate contracts with `python scripts/gen_gateway_contracts.py` when RPC shapes change.
4. Use Node 26+ and `pnpm --dir apps/desktop run pack` for a Windows rebuild. Close Hermes before replacing the package. Check that compilation succeeded before packaging, otherwise an older renderer can be reused. When RPC behavior changes, restart the canonical gateway and verify its status.

## Source map

| Area | Location and behavior |
| --- | --- |
| Git Timeline | `apps/desktop/src/app/git-timeline/` registers the page and lays out the graph. `tui_gateway/git_timeline.py` reads metadata on the gateway host, including WSL checkouts on Windows. The picker uses established project paths. |
| Project sidebar | `apps/desktop/src/app/chat/sidebar/projects/` handles inline disclosure and linked folder switches. `hermes_cli/projects_db.py` persists folder associations. Project grouping is the desktop default. |
| Prompt templates | `apps/desktop/src/app/prompt-templates/` shows collapsible genres with tiles. The starter-library migration preserves edits, favorites and deletions. |
| Chat timeline | `apps/desktop/src/components/ui/proximity-sidebar.*` owns zoom, end spacing and the gutter. `apps/desktop/src/components/assistant-ui/thread/timeline-rail.tsx` persists per-chat bookmarks on the desktop. |
| Themes | `apps/desktop/src/themes/serafim.ts` defines eight solid-backdrop themes. The picker and Appearance settings support holding a live preview without saving it. |
| InferSSD | `scripts/start-inferssd.ps1` and `scripts/register-inferssd-provider.ps1` launch and register local models. See `website/docs/user-guide/local-models.md`. Provider settings and model binaries live outside Git. |

## Git Timeline verification

- Open **Git Timeline**, choose a repository, and hover or focus commits to inspect metadata. **Show latest fork or merge** jumps to the newest visible main-lane junction.
- The graph uses commit parent links. A Fork badge identifies a main-lane commit with an off-main child. A Merge badge identifies where an off-main parent rejoins it. A ref name alone records no branch creation event. Fast-forward and squash merges have no separate join edge to draw.
- The initial window shows up to 250 commits with expansion to 1,000. History follows local branches and includes the primary ref. Remote-tracking labels can appear on visible commits. Forks outside the loaded range need a wider history window.
- Use `pnpm --dir apps/desktop exec vitest run src/app/git-timeline` and the Python suites `tests/tui_gateway/test_git_timeline.py` and `tests/tui_gateway/test_projects_rpc.py`. Compare a repo with real joins against a linear WSL checkout.

## Memory

The [vault guide](hephaestus-memory-layer/README.md) explains Obsidian and MDVault. The continuation note lives locally at `hephaestus-memory-layer/inbox/Hermes development handoff.md`. Keep credentials, machine settings, private transcripts and generated task notes in their local locations. This document carries the shareable development context.
