import { LiveMarketingPlatformGroup } from '@/enums/live-marketing-platform-group.enum';
import type {
  LiveIntelligenceMarketingDictionary,
  LiveIntelligenceMarketingSeo,
} from '@/types/live-intelligence-marketing-content.types';

/**
 * The English source of truth for the public Live & Video Intelligence pages.
 *
 * Every claim comes from the owner's decisions of 2026-11-24 and ADR-221: a link to a live stream
 * or a recorded video from 50+ platforms is read on ClawAI's servers (any device, phones
 * included); live analysis with captions about 7 to 12 seconds behind the speech, or a one-click
 * summary of a recorded video up to 3 hours long; captions, summaries and highlights in any of the
 * 13 app languages; Audio, Audio + Vision and Smart Auto; one optional web search for context;
 * free minutes every month on every plan, then paid minutes only after the user approves. Never
 * write a price or a number of free minutes here: those are admin policy. Only public videos and
 * streams can be read; Discord is not supported.
 */
export const EN_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'New in ClawAI: Live & Video Intelligence',
  title: 'Any live stream or video, understood in your language',
  intro:
    'Paste a link to a live stream or a recorded video from more than 50 platforms. ClawAI follows it with live captions, a running feed of summaries and highlights, or turns the whole video into one clear report with a single click. It runs on ClawAI’s servers, so it works on any device, your phone included.',
  openCta: 'Paste a link now',
  signUpCta: 'Create a free account',
  howItWorksCta: 'See how it works',
  videosTitle: 'See it work',
  videosIntro:
    'Two short clips from the real product. Tap play: they are silent by default and loop, so you can watch them anywhere.',
  videos: [
    {
      title: 'The AI Analysis panel beside a gameplay stream',
      body: 'A gaming stream plays while the AI Analysis panel keeps a running feed of what happens on screen and what is said.',
    },
    {
      title: 'A live Arabic news stream, captioned in English on a phone',
      body: 'A phone recording of a live YouTube news broadcast: the presenter speaks Arabic, the caption reads in English and the Smart Feed sums up the story so far.',
    },
  ],
  stepsTitle: 'How it works, in four steps',
  stepsIntro: 'From a pasted link to notes you can keep. There is nothing to install.',
  steps: [
    {
      title: 'Paste a link',
      body: 'Paste the address of a live stream or a recorded video: a reel, a post, a short or a past stream. ClawAI checks that it can read the source before anything starts.',
    },
    {
      title: 'Choose your language and a mode',
      body: 'Pick the language you want to read in, from the 13 languages of the app, and an analysis mode: Audio, Audio + Vision or Smart Auto.',
    },
    {
      title: 'Watch live, or click Summarize video',
      body: 'Follow along with captions and a smart feed of summaries, highlights and visual notes. For a recorded video you can instead click Summarize video and get the whole report at once.',
    },
    {
      title: 'Export and share',
      body: 'Everything is saved in your history. Export it as PDF, Markdown or TXT and share it with whoever needs it.',
    },
  ],
  screenshotsTitle: 'What it looks like on a phone',
  screenshotsIntro: 'Real screens from the app, captured on a phone in the dark theme.',
  screenshots: [
    {
      title: 'Pasting a link to a live stream or a video',
      body: 'One box takes a link from any supported platform. Choose the language and the mode, then start.',
    },
    {
      title: 'The live feed with captions, summaries and highlights',
      body: 'Captions run a few seconds behind the speaker while the smart feed keeps summaries, highlights and visual notes up to date.',
    },
    {
      title: 'A one-click video summary',
      body: 'The finished report: an overall summary, key moments with timestamps, highlights and the full transcript.',
    },
  ],
  outcomesTitle: 'What it does for you',
  outcomes: [
    {
      title: 'Catch up on a two-hour stream in minutes',
      body: 'Read the summary and the key moments instead of scrubbing through the whole recording. Each moment has a timestamp, so you can jump to the part that matters.',
    },
    {
      title: 'Follow a foreign-language broadcast in your language',
      body: 'A press conference in Japanese, a match commentary in Spanish, the news in Arabic: read the captions and the summaries in the language you choose.',
    },
    {
      title: 'Never miss the key moment',
      body: 'Highlights are picked out as the stream goes, so you can look away and still know what just happened.',
    },
    {
      title: 'Notes for meetings, lectures, news and gaming',
      body: 'Turn a public webinar, a recorded lecture, a breaking news stream or a tournament into notes you can search, keep and export.',
    },
    {
      title: 'Works on any device',
      body: 'ClawAI reads the stream on its own servers. There is nothing to share from your screen, so it works the same on a phone, a tablet or a computer.',
    },
    {
      title: 'Your history, your exports',
      body: 'What you watched and every summary you made stay in your history, ready to export as PDF, Markdown or TXT.',
    },
  ],
  waysTitle: 'Two ways to use it',
  waysIntro:
    'Follow a stream as it happens, or hand ClawAI a recorded video and get the report in one go.',
  ways: [
    {
      title: 'Live analysis: play along',
      body: 'Captions arrive about 7 to 12 seconds after the speech, and a running smart feed adds summaries, highlights and visual notes. Platforms that have a live chat get a chat tab. For a recorded video, ClawAI plays it from the start at normal speed and the analysis follows along.',
    },
    {
      title: 'Summarize video: one click',
      body: 'For a recorded video, ClawAI processes the whole video at once and returns a full report: an overall summary, key moments with timestamps, highlights and the full transcript. It is saved in your history and exports as PDF, Markdown or TXT.',
    },
  ],
  waysTableCaption: 'Live analysis and one-click summary, side by side',
  waysTableAspect: 'What you get',
  waysTableLive: 'Live analysis',
  waysTableSummary: 'Summarize video',
  waysRows: [
    {
      label: 'Works with',
      live: 'Live streams and recorded videos',
      summary: 'Recorded videos up to 3 hours',
    },
    {
      label: 'Timing',
      live: 'Follows the video in real time, captions about 7 to 12 seconds behind',
      summary: 'The whole video is processed at once',
    },
    {
      label: 'Result',
      live: 'Captions, a smart feed of summaries, highlights and visual notes',
      summary: 'Overall summary, key moments with timestamps, highlights and full transcript',
    },
    {
      label: 'Live chat',
      live: 'A chat tab on platforms that have one',
      summary: 'Not needed',
    },
    {
      label: 'Keep it',
      live: 'Saved in your history, export as PDF, Markdown or TXT',
      summary: 'Saved in your history, export as PDF, Markdown or TXT',
    },
  ],
  modesTitle: 'Three analysis modes',
  modesIntro: 'The mode decides what ClawAI pays attention to. You choose it before you start.',
  modes: [
    {
      title: 'Audio',
      body: 'Captions, summaries and highlights from what is said. Best for talks, interviews, podcasts, lectures and the news.',
    },
    {
      title: 'Audio + Vision',
      body: 'Adds what is shown on screen, such as slides, charts, scoreboards or gameplay, so the notes describe what you see as well as what you hear.',
    },
    {
      title: 'Smart Auto',
      body: 'Starts from the audio and looks at the picture when it is likely to matter, for example when the speaker goes quiet or the scene changes.',
    },
  ],
  researchNote:
    'Research: a summary may run one web search to add context, such as who a speaker is or what an event refers to.',
  languagesTitle: 'Read it in your language',
  languagesParagraphs: [
    'Choose any of the 13 languages of the app: English, Arabic, German, Spanish, Persian, French, Hindi, Italian, Japanese, Portuguese, Russian, Thai or Chinese. The speaker can talk in any language.',
    'When the speaker already talks in your language, you read their exact words. When they do not, the captions, summaries and highlights are translated, and the translation appears instead of the original.',
  ],
  platformsTitle: 'More than 50 platforms',
  platformsBody:
    'YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili, Niconico and many more. Live streams and recorded videos both work.',
  platformsCta: 'See every platform',
  limitsTitle: 'Good to know',
  limits: [
    {
      title: 'Public videos and streams only',
      body: 'ClawAI can read only public videos and streams. Some platforms, or individual videos, may refuse access from a server; when that happens, ClawAI tells you plainly instead of pretending.',
    },
    {
      title: 'Recorded videos up to 3 hours',
      body: 'A recorded video can be up to 3 hours long, for live analysis and for a one-click summary.',
    },
    {
      title: 'Captions are a few seconds behind',
      body: 'Speech is transcribed in short pieces, so captions arrive about 7 to 12 seconds after it is spoken. This is not instant captioning.',
    },
    {
      title: 'Free minutes every month, paid minutes only with your approval',
      body: 'Every plan includes free minutes every month. After that, minutes are paid only once you approve. A one-click summary counts the length of the video in minutes.',
    },
  ],
  faqTitle: 'Questions people ask',
  faq: [
    {
      question: 'Does it work on my phone?',
      answer:
        'Yes. ClawAI reads the stream or video on its own servers, so there is nothing to share from your screen. It works on phones, tablets and computers alike.',
    },
    {
      question: 'Which languages can I read the captions in?',
      answer:
        'Any of the 13 app languages: English, Arabic, German, Spanish, Persian, French, Hindi, Italian, Japanese, Portuguese, Russian, Thai and Chinese. The speaker can talk in any language. If they already speak your language you see their exact words; otherwise the translation appears instead of the original.',
    },
    {
      question: 'Does it work with recorded videos, or only live streams?',
      answer:
        'Both. Paste a live stream, or a recorded video such as a reel, a post, a short or a past stream. With a recorded video you can play along from the start at normal speed, or click Summarize video to get the whole report at once.',
    },
    {
      question: 'How long can a video be?',
      answer: 'A recorded video can be up to 3 hours long.',
    },
    {
      question: 'What does a one-click summary contain?',
      answer:
        'An overall summary, the key moments with timestamps, highlights and the full transcript. It is saved in your history and can be exported as PDF, Markdown or TXT.',
    },
    {
      question: 'How is it billed?',
      answer:
        'Every plan includes free minutes every month. After that you pay per minute, and only after you approve it. A one-click summary counts the length of the video in minutes.',
    },
    {
      question: 'Are the captions real time?',
      answer:
        'Almost. Captions arrive about 7 to 12 seconds after the speech, because the audio is transcribed in short pieces. Summaries and highlights follow the captions.',
    },
    {
      question: 'Which platforms are supported?',
      answer:
        'More than 50, including YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili and Niconico. The platforms page lists them all. Only public videos and streams can be read, and Discord is not supported because it has no public links.',
    },
    {
      question: 'Does ClawAI post or chat on my behalf?',
      answer:
        'No. ClawAI only reads the stream. It never posts, comments or chats on any platform for you. What the stream says, and what its chat says, is treated as untrusted data to summarize, never as instructions to ClawAI.',
    },
    {
      question: 'Who can see what I watched?',
      answer:
        'Your history is yours. The analysis you watched and the summaries you made stay in your account until you delete them, and you decide what to export or share.',
    },
  ],
  closingTitle: 'Paste your first link',
  closingBody:
    'A live match, a press conference, a lecture or a two-hour stream you missed: paste the link, choose your language and let ClawAI take the notes. Free minutes are included every month on every plan.',
  platformsPage: {
    eyebrow: 'New in ClawAI: Live & Video Intelligence',
    title: 'Every platform Live & Video Intelligence can read',
    intro:
      'Paste a link from any of these platforms, live or recorded. ClawAI reads it on its own servers, so it works on any device, phones included.',
    openCta: 'Paste a link now',
    backCta: 'Back to Live & Video Intelligence',
    groupsTitle: 'Platforms by kind',
    groupsIntro:
      'Platform names are trademarks of their owners. ClawAI is not affiliated with or endorsed by them.',
    groups: {
      [LiveMarketingPlatformGroup.GLOBAL_VIDEO]: {
        title: 'Global video',
        body: 'The large video sites people share every day, from long talks and lectures to short clips and audio shows.',
      },
      [LiveMarketingPlatformGroup.GAMING_STREAMING]: {
        title: 'Gaming and streaming',
        body: 'Live gaming, esports and creator streams, where a live chat tab sits next to the analysis.',
      },
      [LiveMarketingPlatformGroup.SOCIAL]: {
        title: 'Social',
        body: 'Reels, posts, shorts and live broadcasts from social networks and messaging channels.',
      },
      [LiveMarketingPlatformGroup.ASIA]: {
        title: 'Asia',
        body: 'Video and live platforms from China, Japan, Korea and across Asia, read in any of the 13 app languages.',
      },
    },
    liveTag: 'Live',
    videoTag: 'Videos',
    supportTitle: 'What works on every platform',
    supportIntro: 'The same three things work wherever ClawAI can read the source.',
    support: [
      {
        title: 'Live streams',
        body: 'Captions about 7 to 12 seconds behind the speech, a smart feed of summaries, highlights and visual notes, and a live chat tab where the platform has one.',
      },
      {
        title: 'Recorded videos',
        body: 'Reels, posts, shorts and past streams up to 3 hours long. ClawAI plays the video from the start at normal speed and the analysis follows along.',
      },
      {
        title: 'One-click summary',
        body: 'For a recorded video, click Summarize video and get an overall summary, key moments with timestamps, highlights and the full transcript.',
      },
    ],
    limitsTitle: 'The honest limits',
    limits: [
      {
        title: 'Public only',
        body: 'Only public videos and streams can be read. Private or members-only content cannot be read.',
      },
      {
        title: 'A platform can say no',
        body: 'Some platforms, or individual videos, may refuse access from a server. When that happens, ClawAI tells you plainly instead of showing a fake result.',
      },
      {
        title: 'Discord is not supported',
        body: 'Discord streams have no public links, so there is nothing for a server to open.',
      },
    ],
    faqTitle: 'Questions about platforms',
    faq: [
      {
        question: 'Is my platform supported?',
        answer:
          'If it is on this page, paste the link and ClawAI checks it before anything starts. If the platform or the video refuses server access, you see that straight away.',
      },
      {
        question: 'Do live streams and recorded videos both work?',
        answer:
          'Yes, on every platform listed. A recorded video can also be summarized in one click, up to 3 hours long.',
      },
      {
        question: 'Why can a video fail when its platform is listed?',
        answer:
          'A platform can block a single video from being read by a server, even a public one. When it does, ClawAI tells you straight away. Private videos and streams can never be read.',
      },
      {
        question: 'Why is Discord missing?',
        answer:
          'Discord streams have no public link that a server could open, so ClawAI cannot read them.',
      },
    ],
    closingTitle: 'Found your platform?',
    closingBody:
      'Paste the link, choose your language and start. Free minutes are included every month on every plan.',
  },
};

/** English SEO copy for both pages. */
export const EN_LIVE_INTELLIGENCE_MARKETING_SEO: LiveIntelligenceMarketingSeo = {
  overview: {
    title: 'Live & Video Intelligence: live captions and one-click video summaries',
    description:
      'Paste a live stream or video link from YouTube, Twitch, TikTok and 50+ platforms. Get live captions in your language, a smart feed of summaries and highlights, or a one-click video summary with timestamps. Works on any device.',
    keywords: [
      'live stream captions',
      'AI video summary',
      'summarize YouTube video',
      'translated live captions',
      'live stream highlights',
    ],
  },
  platforms: {
    title: 'Supported platforms for Live & Video Intelligence',
    description:
      'Every platform ClawAI can read for live captions and video summaries: YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X, Bilibili, Niconico and more, grouped by kind.',
    keywords: [
      'supported video platforms',
      'live stream platforms',
      'video summary platforms',
      'Twitch captions',
    ],
  },
};
