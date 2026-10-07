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
    launcherMore: 'More tours',
    launcherDone: 'Done',
    launcherStart: 'Start',
    launcherRestart: 'Replay',
    offerTitle: 'New here? Take a 1-minute tour',
    offerStart: 'Show me',
    offerLater: 'Not now',
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
  },
};
