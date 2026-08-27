import type { CodingAgentDictionary } from '@/types/coding-agent-content.types';

/**
 * The English source of truth for the two Coding Agent pages.
 *
 * Every claim here is drawn from the extension's own README and manifest in
 * `apps/claw-coding-agent`, not from marketing wishes. The extension is a thin
 * client — authentication, entitlements, quotas, history, provider credentials,
 * routing and inference stay on the platform — and the copy says so, because a
 * developer who installs it expecting an offline coding model will uninstall it
 * within a minute.
 */
export const EN_CODING_AGENT_CONTENT: CodingAgentDictionary = {
  overview: {
    eyebrow: 'ClawAI in your editor',
    title: 'The ClawAI Coding Agent for VS Code',
    intro:
      'Every model on your ClawAI subscription, inside the editor you already use. The extension is a thin client: your account, your quotas, your provider credentials and your conversation history stay on the platform, so the same thread you started in the browser continues in VS Code.',
    installCta: 'Install from the Marketplace',
    marketplaceCta: 'View on the Marketplace',
    capabilitiesTitle: 'What it does',
    capabilities: [
      {
        title: 'Every model, one subscription',
        body: 'Nine frontier families and your local open-weight models, reachable from the editor with no API keys to paste. Routing happens on the platform, so the editor never holds a provider credential.',
      },
      {
        title: 'Automatic or manual routing',
        body: 'Let the router pick the model for each message, or pin a conversation to a specific one. The choice is the same one the web app makes, because it is made in the same place.',
      },
      {
        title: 'Compare and judge, in the editor',
        body: 'Send one prompt to several models at once and read the answers side by side, with an optional judge pass — the same comparison workflow as the web app, against the code you have open.',
      },
      {
        title: 'Preview before apply',
        body: 'Edits arrive as a reviewable diff, not as a surprise write. Nothing touches your working tree until you accept it.',
      },
      {
        title: 'Context you can inspect',
        body: 'Every answer carries a receipt: which files were read, which model answered, and what it cost against your allowance. When an answer is wrong, you can see what it was looking at.',
      },
      {
        title: 'Concurrent conversations',
        body: 'Several titled chat tabs at once, two running concurrently against different models, with backend history restored in place.',
      },
    ],
    requirementsTitle: 'What you need',
    requirementsBody:
      'VS Code 1.98 or later, and a ClawAI account. The extension connects to ClawAI’s hosted platform or to your own self-hosted deployment — you choose which at sign-in.',
    faqTitle: 'Questions people ask',
    faq: [
      {
        question: 'Do I need a separate subscription for the extension?',
        answer:
          'No. The extension uses the ClawAI account you already have, and draws on the same allowance as the web app. There is nothing extra to buy.',
      },
      {
        question: 'Does my code get sent to a model provider?',
        answer:
          'Only what a request needs, and only to the model that answers it — the receipt on each answer names that model. Pin a conversation to a local open-weight model, or point the extension at a self-hosted deployment, and nothing reaches an external provider.',
      },
      {
        question: 'Does it work with a self-hosted ClawAI?',
        answer:
          'Yes. The extension asks for the backend URL at sign-in, so it works against ClawAI’s hosted platform or an instance running entirely on your own infrastructure.',
      },
      {
        question: 'Can I keep using the web app as well?',
        answer:
          'Yes, and the same conversations appear in both. History lives on the platform, so a thread started in the browser continues in the editor and back again.',
      },
    ],
  },
  install: {
    eyebrow: 'Install',
    title: 'Install the ClawAI Coding Agent',
    intro:
      'Three steps, about a minute. The extension is published on the Visual Studio Marketplace under the verified publisher ClawAI.',
    stepsTitle: 'From inside VS Code',
    steps: [
      {
        title: 'Open the Extensions view',
        body: 'Press Ctrl+Shift+X on Windows and Linux, or Cmd+Shift+X on macOS. You can also open it from the Activity Bar on the left.',
      },
      {
        title: 'Search for ClawAI Coding Agent',
        body: 'Type “ClawAI” in the search box. Look for the entry published by ClawAI — the publisher name carries a verified badge.',
      },
      {
        title: 'Install and sign in',
        body: 'Click Install, then open the ClawAI panel and sign in. You will be asked for your backend URL — leave the default to use ClawAI’s hosted platform, or enter your own if you self-host.',
      },
    ],
    cliTitle: 'From the command line',
    cliBody:
      'If you install extensions from a terminal or a setup script, one command does it. It works anywhere the `code` command is on your PATH.',
    signInTitle: 'Signing in',
    signInBody:
      'Sign-in happens in your browser and hands a scoped token back to the editor. The extension never stores your password, and never holds a model provider’s API key — those stay on the platform.',
    troubleshootingTitle: 'If something goes wrong',
    troubleshooting: [
      {
        question: 'The extension does not appear in search',
        answer:
          'Check your VS Code version — the extension requires 1.98 or later. On older builds the Marketplace hides it rather than offering an incompatible install.',
      },
      {
        question: 'The install link does nothing',
        answer:
          'The one-click link uses the `vscode:` protocol, which only works if VS Code is installed on the machine you are browsing from. Use the Marketplace page or the command line instead.',
      },
      {
        question: 'Sign-in succeeds but no models are listed',
        answer:
          'Model access follows your plan. Check the Models page in the web app; if a model is missing there too, it is not exposed to your account rather than missing from the extension.',
      },
      {
        question: 'It cannot reach my self-hosted deployment',
        answer:
          'The backend URL must be reachable from your machine and must present a certificate your editor trusts. A self-signed certificate that the browser accepted after a warning will still be refused here.',
      },
    ],
    marketplaceCta: 'Open the Marketplace listing',
    openInEditorCta: 'Open in VS Code',
  },
};
