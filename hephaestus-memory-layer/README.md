# Hephaestus Memory Layer

Open this folder as a vault in Obsidian. Use it for project decisions, research, and reference notes. Put new notes in `inbox/` and link related notes with Obsidian wikilinks.

## Connect Hermes

From the Hephaestus repository root in PowerShell:

```powershell
$vault = (Resolve-Path -LiteralPath '.\hephaestus-memory-layer').Path
hermes plugins install mdvault
hermes memory setup mdvault
hermes config set OBSIDIAN_VAULT_PATH $vault
hermes mdvault status
```

In the mdvault setup, select the resolved vault path, enable automatic recall, set the write folder to `inbox`, and enable built-in memory mirroring if you want Hermes memory updates copied into the vault. Use the Obsidian skill for direct note editing and mdvault for per-turn recall.

Hephaestus is public. Review notes and mirrored memory before staging them. The mdvault plugin and its machine-specific configuration live in the local Hermes profile.
