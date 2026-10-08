import { TourId } from '@/enums/tour-id.enum';
import type { TourDictionary } from '@/types/tour.types';

export const EN_TOURS_CONTENT: TourDictionary = {
  ui: {
    next: 'Next',
    back: 'Back',
    skip: 'Skip tour',
    done: 'Done',
    stepOf: 'Step {current} of {total}',
    dialogLabel: 'Product tour',
    launcherLabel: 'Tours and help',
    launcherTitle: 'Product tours',
    launcherHint: 'A short walk through what you see on this page.',
    launcherHere: 'On this page',
    launcherDone: 'Done',
    launcherStart: 'Start',
    launcherRestart: 'Replay',
    offerTitle: 'New here? Take a 1-minute tour',
    offerStart: 'Show me',
    offerLater: 'Not now',
    offerNever: "Don't show tours again",
    launcherNoneHere: 'No tour for this page yet.',
    launcherStopOffers: "Don't offer tours again",
    launcherResumeOffers: 'Offer tours again',
    launcherOffersStopped: 'Tour offers are off. You can still replay any tour of this page here.',
    missingTarget: 'This part is not on screen right now. Open it, then start the tour again.',
  },
  tours: {
    [TourId.ThreadsIntro]: {
      title: 'Meet Threads',
      description: 'Turn a chat into a researched, cited, public article.',
      steps: {
        welcome: {
          title: 'Threads in one minute',
          body: 'A Thread is a public article written from one of your chats: researched on the live web, written by several models, reviewed by a Judge and a Critic, and published only when you approve it.',
        },
        list: {
          title: 'Your Threads',
          body: 'Every Thread you start appears here with its status. Open one to follow it while it runs, review the draft, approve it, export it or share it.',
        },
        create: {
          title: 'Create a Thread',
          body: 'Choose a source chat, say what the article is about and pick the models. You can also start from any chat with “Turn into public Thread”.',
        },
        process: {
          title: 'What happens next',
          body: 'ClawAI researches the topic, three to five authors write independently, they agree on one draft, then the Judge and the Critic review it for up to three rounds.',
        },
        approve: {
          title: 'You decide',
          body: 'Nothing goes public until you read the draft and approve it. You can unpublish at any time, and a spend cap you set limits the cost.',
        },
      },
    },
    [TourId.ThreadCreate]: {
      title: 'Fill in the Thread form',
      description: 'What each field does before you start.',
      steps: {
        topic: {
          title: 'The topic',
          body: 'Say what the article should explain or answer. A clear question gives the authors and the research a clear target.',
        },
        kind: {
          title: 'Type and language',
          body: 'Choose an article, research article, guide or technical explanation, and the language the public page will be written in.',
        },
        cap: {
          title: 'Maximum spend',
          body: 'The most this Thread may cost. Every model call is checked against it first, and the job stops rather than go over.',
        },
        models: {
          title: 'Authors, Judge and Critic',
          body: 'Pick three to five authors, a Judge and a Critic from the same picker you use in chat. Different providers give more varied drafts and independent review.',
        },
        consent: {
          title: 'Your consent',
          body: 'Tick this to confirm you understand the finished article will be public and searchable. Starting is disabled until you do.',
        },
        start: {
          title: 'Start generation',
          body: 'ClawAI starts the job and opens the review page, where you can follow each stage and cancel at any time.',
        },
      },
    },
    [TourId.ThreadReview]: {
      title: 'Review a Thread',
      description: 'Follow it, read it, approve it, export it, share it.',
      steps: {
        status: {
          title: 'Live progress',
          body: 'While the job runs this line says what is happening: researching, authors writing, agreeing on one draft, the Judge and the Critic. Cancel stops it and returns unused credit.',
        },
        draft: {
          title: 'The draft and its sources',
          body: 'When the reviews pass, the draft appears with its numbered sources. Read it carefully: you can edit it, or ask for changes, before anything is public.',
        },
        approve: {
          title: 'Approve and publish',
          body: 'Only an approved draft becomes a public page. Unpublish removes it from the page, search, the sitemap and feeds.',
        },
        export: {
          title: 'Download it',
          body: "Tick one or several formats and download them together as one ZIP, or save a PDF through your browser's print dialog.",
        },
        share: {
          title: 'Share it',
          body: "Copy the link, use your device's share sheet, or post it to WhatsApp, Facebook, LinkedIn, X, Telegram, Reddit or email once it is published.",
        },
      },
    },
    [TourId.ChatIntro]: {
      title: 'Tour of the chat',
      description: 'Everything around the message box, in a minute.',
      steps: {
        input: {
          title: 'Write here',
          body: 'Type your message and press Enter to send. Shift+Enter adds a new line. You can paste images and files too.',
        },
        context: {
          title: 'Context',
          body: 'Add context packs, preview what the model will see and use your memory, so answers are grounded in your material.',
        },
        model: {
          title: 'Which model answers',
          body: 'Leave it on Auto and ClawAI picks a model for each message, or choose a specific one.',
        },
        attach: {
          title: 'Attach files',
          body: 'Upload documents, images, audio or video. The text is extracted so any model can read it.',
        },
        research: {
          title: 'Search the web',
          body: 'Turn on web research when the answer needs current facts and sources.',
        },
        prompts: {
          title: 'Prompt library',
          body: 'Reusable prompts for common jobs. Pick one to fill the message box.',
        },
        send: {
          title: 'Send',
          body: 'Sends your message. The answer streams in, and you can stop it at any time.',
        },
        rail: {
          title: 'Tools for this chat',
          body: 'Compare the same prompt across models, ask a Judge to referee, search this chat, share it, or open more actions.',
        },
      },
    },
    [TourId.ChatModels]: {
      title: 'How to choose a model',
      description: 'Auto routing, picking by hand and what the badges mean.',
      steps: {
        model: {
          title: 'Open the model picker',
          body: 'This button shows what answers your next message. Open it to see every model, grouped by provider, with a search box.',
        },
        auto: {
          title: 'Auto or a specific model',
          body: 'Auto routing chooses a model for each message from what your plan allows. Picking a model pins this chat to it.',
        },
        badges: {
          title: 'Credit badges',
          body: '“Uses credit” means the model draws on your connector credit or free requests. Included models never use credit.',
        },
        credit: {
          title: 'Your credit',
          body: 'This shows what you can spend. When credit or free requests run out, ClawAI moves to an included model and tells you.',
        },
      },
    },
    [TourId.ChatResearch]: {
      title: 'How to research',
      description: 'Get answers with live sources.',
      steps: {
        toggle: {
          title: 'Turn on web research',
          body: 'Switch research on before you send. ClawAI searches the web, reads the best pages and answers from what it found.',
        },
        provider: {
          title: 'Pick the search provider',
          body: 'Choose which search provider to use. Auto picks one that is available to you.',
        },
        sources: {
          title: 'Check the sources',
          body: 'Answers show their sources so you can open them and verify the claims. For a long investigation, use the Research page.',
        },
      },
    },
    [TourId.ChatContext]: {
      title: 'How to add context',
      description: 'Ground answers in your own material.',
      steps: {
        context: {
          title: 'The Context button',
          body: 'Open it to attach a context pack, see what is attached and turn memory on or off for this chat.',
        },
        preview: {
          title: 'Preview before you send',
          body: 'See exactly what the model will receive from your history, packs, memory and files, so nothing surprising goes along.',
        },
        packs: {
          title: 'Create your own packs',
          body: 'A context pack is reusable reference material. Create one on the Context page and attach it to any chat.',
        },
      },
    },
    [TourId.ChatToThread]: {
      title: 'Turn a chat into a Thread',
      description: 'Publish what you learned, with sources.',
      steps: {
        more: {
          title: 'Open More actions',
          body: 'The menu at the end of the toolbar holds Export, Turn into public Thread, Thread settings and Delete.',
        },
        create: {
          title: 'Choose Turn into public Thread',
          body: 'A form opens with this chat as the source. Review the topic, choose models, set a spend cap and give your consent.',
        },
        after: {
          title: 'Follow it and approve',
          body: 'You land on the review page. When the reviews pass, read the draft and approve it to publish.',
        },
      },
    },
    [TourId.CompareIntro]: {
      title: 'Tour of Compare',
      description: 'Send one prompt to several models.',
      steps: {
        prompt: {
          title: 'One prompt, many models',
          body: 'Write the prompt once. Compare sends it to every model you choose and shows the answers side by side.',
        },
        models: {
          title: 'Choose the models',
          body: 'Pick up to five models from the same picker as chat. Mix providers to see how they differ.',
        },
        judge: {
          title: 'Judge and Critic',
          body: 'Ask a Judge to rank the answers and a Critic to point out what is weak, both with their reasons.',
        },
      },
    },
    [TourId.ContextPacks]: {
      title: 'How to create context',
      description: 'Build reusable reference material.',
      steps: {
        create: {
          title: 'Create a pack',
          body: "Give it a name and add notes, text or files. A pack is yours and stays out of other people's chats.",
        },
        use: {
          title: 'Use it in any chat',
          body: 'Open the Context button in a chat and attach the pack. The model then answers with that material in view.',
        },
      },
    },
    [TourId.ChatList]: {
      title: 'Your chats',
      description: 'Find, start and organise your conversations.',
      steps: {
        new: {
          title: 'Start a chat',
          body: 'Begin a new conversation. On a phone, use the round button at the bottom.',
        },
        search: { title: 'Search your chats', body: 'Type to find a chat by its title.' },
        tabs: {
          title: 'All, Pinned, Archived',
          body: 'Pinned chats stay at the top. Archive a chat to tidy the list without deleting it.',
        },
        items: {
          title: 'Your conversations',
          body: 'Open one to continue it. Use the menu on a row to pin or archive it.',
        },
      },
    },
    [TourId.ChatMessages]: {
      title: 'Messages and answers',
      description: 'What every message and answer lets you do.',
      steps: {
        yours: {
          title: 'Your message',
          body: 'Hover or focus a message to copy it, edit it, or branch the chat from that point.',
        },
        meta: {
          title: 'Which model answered',
          body: 'Each answer shows the model that wrote it, how it was chosen and what it used, such as memory or files.',
        },
        actions: {
          title: 'Work with an answer',
          body: 'Copy it, rate it, regenerate it with the same or another model, read it aloud, save it to memory, export it or open it larger.',
        },
        more: {
          title: 'Behind the answer',
          body: 'Open Why this model to see the reasoning behind the pick, and the sources panel when the answer used research. Select any text in an answer to quote it in your next message.',
        },
      },
    },
    [TourId.ChatHeader]: {
      title: 'Chat header and tools',
      description: 'Search, quality, export and more.',
      steps: {
        more: {
          title: 'More actions',
          body: 'Search this chat, check its quality, compare models, share it, export it, turn it into a Thread, or open its settings.',
        },
        rail: {
          title: 'Quick actions',
          body: 'The most used ones sit here: compare models, check quality and search inside this chat.',
        },
        keep: {
          title: 'Keep a copy',
          body: 'Export saves this conversation as a file. A branched chat shows a bar that links back to the chat it came from.',
        },
      },
    },
    [TourId.ChatShare]: {
      title: 'Share a chat',
      description: 'Publish a read-only link, safely.',
      steps: {
        open: {
          title: 'Share a chat',
          body: 'Open More actions and choose Share to publish a read-only copy of this conversation at a public link.',
        },
        warning: {
          title: 'Read before you publish',
          body: 'Anyone with the link can read it without signing in. It holds the conversation as it is now; later messages stay private. Never share secrets or personal data.',
        },
        link: {
          title: 'The link and search engines',
          body: 'Copy the public link or open it in a new tab. Allow search engines to index it only if you want it found in search; otherwise only people with the link can find it.',
        },
        manage: {
          title: 'Update or stop',
          body: 'Update the shared version to publish newer messages, generate a new link if the old one leaked, or stop sharing to turn the link off at once.',
        },
      },
    },
    [TourId.ChatSettings]: {
      title: 'Thread settings',
      description: 'Tune one chat: model, prompt and context.',
      steps: {
        open: {
          title: 'Thread settings',
          body: 'Open More actions and choose Settings to change how this one chat behaves.',
        },
        model: {
          title: 'Model and instructions',
          body: 'Pick a preferred model for this chat and write a system prompt to set its role and tone.',
        },
        tuning: {
          title: 'Creativity and length',
          body: 'Temperature makes answers more predictable or more varied. Max tokens limits how long an answer can be.',
        },
        context: {
          title: 'Context for this chat',
          body: 'Attach context packs, and switch memory, chat context and other-chat context on or off for this conversation only.',
        },
      },
    },
    [TourId.CompareResults]: {
      title: 'Reading compare results',
      description: 'Cards, Judge and what you can do with answers.',
      steps: {
        results: {
          title: 'Side by side',
          body: 'Each model answers in its own card, so you can read them next to each other.',
        },
        judge: {
          title: 'Judge and Critic',
          body: 'Turn on the Judge to rank the answers and explain why. Add the Critic to challenge the Judge’s pick.',
        },
        actions: {
          title: 'Use an answer',
          body: 'On each card you can switch between formatted and raw text, copy it, export it as Markdown or open it larger.',
        },
      },
    },
    [TourId.LabsIntro]: {
      title: 'Orchestration labs',
      description: 'Run a prompt through several models in a set pattern.',
      steps: {
        what: {
          title: 'What the labs do',
          body: 'Each lab sends your prompt through several models in a fixed pattern: consensus, escalation, best of N, cost ensemble, decompose, pipeline, repair, role pack or verify.',
        },
        how: {
          title: 'How to use one',
          body: 'Choose the models, write your prompt and send it. Attach files, context packs and saved prompts as in a normal chat. The results appear below as cards.',
        },
      },
    },
    [TourId.DashboardIntro]: {
      title: 'Your dashboard',
      description: 'A quick look at your workspace.',
      steps: {
        header: {
          title: 'Dashboard',
          body: 'Your overview: how much you have, what is connected and whether everything is healthy.',
        },
        stats: {
          title: 'Key numbers',
          body: 'Total chats, active connectors and local models at a glance.',
        },
        actions: {
          title: 'Quick actions',
          body: 'Start a chat, add a connector or set up routing in one click.',
        },
      },
    },
    [TourId.PlanIntro]: {
      title: 'Your plan',
      description: 'What your subscription includes.',
      steps: {
        header: {
          title: 'My plan',
          body: 'Your current plan, its features and the models you can use.',
        },
        quota: { title: 'Daily token quota', body: 'Your allowance for each day.' },
        models: {
          title: 'Allowed models',
          body: 'The models your plan lets you use. Upgrade to unlock more.',
        },
      },
    },
    [TourId.BillingIntro]: {
      title: 'Billing',
      description: 'Plans, prices and payments.',
      steps: {
        header: {
          title: 'Billing',
          body: 'Manage your subscription and see what each plan costs.',
        },
        plans: {
          title: 'Choose a plan',
          body: 'Compare plans and switch between monthly and yearly billing.',
        },
      },
    },
    [TourId.UsageIntro]: {
      title: 'Usage',
      description: 'Track what you have used.',
      steps: {
        header: { title: 'Usage', body: 'Track your daily token use against your plan.' },
        card: {
          title: 'Daily token usage',
          body: 'The bar shows how much of today’s allowance you have used, and your connector credit if your plan has it.',
        },
      },
    },
    [TourId.FilesIntro]: {
      title: 'Your files',
      description: 'Upload files to give the AI context.',
      steps: {
        header: {
          title: 'Files',
          body: 'Everything you upload lives here, ready to use as context in chat.',
        },
        upload: {
          title: 'Upload a file',
          body: 'Drag a file here or click to choose one. Files are scanned before they are used.',
        },
      },
    },
    [TourId.SettingsIntro]: {
      title: 'Settings',
      description: 'Your account and preferences.',
      steps: {
        header: {
          title: 'Settings',
          body: 'Manage your profile, security, language and appearance.',
        },
        language: { title: 'Language', body: 'Choose the language of the whole app.' },
        appearance: { title: 'Appearance', body: 'Switch between light, dark and system themes.' },
        danger: {
          title: 'Delete account',
          body: 'Permanently deletes your account and signs out every session. This cannot be undone.',
        },
      },
    },
    [TourId.MemoryIntro]: {
      title: 'Memory',
      description: 'What the AI remembers about you.',
      steps: {
        header: {
          title: 'Memory',
          body: 'Memory records give the AI lasting context about you and your work.',
        },
        tabs: {
          title: 'Saved and suggested',
          body: 'Saved memories are used in your chats. Suggestions are new ones the AI proposes for you to review.',
        },
      },
    },
    [TourId.ConnectorsIntro]: {
      title: 'Connectors',
      description: 'Your AI provider connections.',
      steps: {
        header: {
          title: 'Connectors',
          body: 'A connector links ClawAI to an AI provider with your own key.',
        },
        actions: {
          title: 'Add a connector',
          body: 'Create one to use a provider’s models. You can test the connection and sync its models afterwards.',
        },
      },
    },
  },
};
