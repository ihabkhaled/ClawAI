/**
 * The published identity of the ClawAI Coding Agent VS Code extension.
 *
 * `apps/claw-coding-agent` is a git submodule, not an npm workspace of this
 * repository, so nothing here can be derived from its package.json at build
 * time. These values are transcribed from the published Marketplace listing and
 * verified against it — a broken install link on a marketing page is worse than
 * no install link.
 *
 * Verified against the Visual Studio Marketplace on 2026-08-27: publisher
 * `clawai` (verified), extension `clawai-coding-agent`, first published
 * 2026-07-27.
 */
export const CODING_AGENT_PUBLISHER = 'clawai';
export const CODING_AGENT_EXTENSION_NAME = 'clawai-coding-agent';
export const CODING_AGENT_EXTENSION_ID = `${CODING_AGENT_PUBLISHER}.${CODING_AGENT_EXTENSION_NAME}`;

/** The Marketplace listing. Safe to link from anywhere, including email. */
export const CODING_AGENT_MARKETPLACE_URL = `https://marketplace.visualstudio.com/items?itemName=${CODING_AGENT_EXTENSION_ID}`;

/**
 * The one-click handoff into an already-installed editor.
 *
 * `vscode:` is a protocol handler, so it does nothing in a browser with no
 * VS Code installed and cannot be feature-detected. It is therefore offered
 * *beside* the Marketplace link rather than instead of it — never as the only
 * route.
 */
export const CODING_AGENT_VSCODE_INSTALL_URL = `vscode:extension/${CODING_AGENT_EXTENSION_ID}`;

/** The command-line equivalent, for people who install extensions that way. */
export const CODING_AGENT_CLI_INSTALL_COMMAND = `code --install-extension ${CODING_AGENT_EXTENSION_ID}`;

/** Minimum editor version the extension declares in its manifest. */
export const CODING_AGENT_MINIMUM_VSCODE_VERSION = '1.98.0';

export const CODING_AGENT_REPOSITORY_URL = 'https://github.com/ihabkhaled/ClawAI-Coding-Agent';

/** Route paths, so the nav entry and the cross-links cannot drift apart. */
export const CODING_AGENT_PATH = '/coding-agent';
export const CODING_AGENT_INSTALL_PATH = '/coding-agent/install';
