# Importing a plugin: what works

You can import a plugin from **Plugins > Import**, from a GitHub address or from a `.zip` / `.tgz` file (up to 5 MB). ClawAI reads the plugin, shows you everything in it, and saves it only after you confirm. Nothing in an imported plugin is ever run.

## Where it can come from

| Source                   | Example                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| A repository             | `owner/repo`                                                              |
| A folder in a repository | `owner/repo/plugins/my-plugin`                                            |
| A branch or tag          | `owner/repo@v1.2`                                                         |
| A GitHub link            | `https://github.com/owner/repo/tree/main/plugins/my-plugin`               |
| A marketplace file       | the repository of a `marketplace.json`; you pick one plugin from the list |
| An upload                | a `.zip` or `.tgz` of the plugin folder                                   |

Only public repositories work. The review shows the exact commit that was read, so you always see what you are installing.

## Layouts ClawAI understands

- **Claude Code**: `.claude-plugin/plugin.json`, with `skills/<name>/SKILL.md`, `commands/*.md`, `agents/*.md`, `hooks/hooks.json` and `.mcp.json`.
- **ClawAI**: `clawai-plugin.json` with the same folders.
- **A plain folder**: a folder with only `skills/`, `commands/` or `agents/` is accepted; its name comes from where it was found.
- **Marketplaces**: `.claude-plugin/marketplace.json`, `clawai-marketplace.json` or `marketplace.json`. Entries in the same repository can be picked; entries in another repository say where to import them from.

## What each part does today

| Part                                         | On the web today                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| MCP server with an `https` address           | **Works.** Add it from My servers; the usual address checks and consent apply.        |
| Skills (`SKILL.md`)                          | Stored as a document. ClawAI has no skills library yet, so chats cannot use it.       |
| Commands, agents, output styles              | Stored as documents. Chats cannot use them yet.                                       |
| Hooks                                        | **Not supported on the web.** They run commands on a computer and are never run here. |
| MCP server that starts a program (`command`) | **Not supported on the web.** Never run here.                                         |
| MCP server using the older SSE format        | Not supported.                                                                        |
| Scripts, binaries and other files            | Not stored. The review counts them.                                                   |

The risk label on the review is **High** when the plugin has hooks or programs to start, **Medium** when it has a remote server, and **Low** otherwise.

## Why an import can be refused

An archive with unsafe file paths, links, encrypted or duplicate files, files that are not valid text, too many or too large files, or a manifest that is invalid, too large or too deeply nested is refused, with a message saying which. You can have up to 20 imported plugins and 20 MB of imported text.
