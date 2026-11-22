import type { LiveIntelligenceMarketingDictionary } from '@/types/live-intelligence-marketing-content.types';

/**
 * The English source of truth for the public Live Intelligence page.
 *
 * Every claim is drawn from docs/02-business-product/live-intelligence-spec.md and ADR-221: AI
 * analysis runs on HLS streams the user has the rights to analyze, never on YouTube; captions
 * trail the speech by roughly 7 to 12 seconds; paid minutes always need a confirmation.
 */
export const EN_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'New in ClawAI',
  title: 'Live Intelligence: captions, summaries and highlights for a live stream',
  intro:
    'Paste the link to a live stream and watch it inside ClawAI. While it plays, ClawAI turns the speech into captions in the language you choose, keeps short summary cards up to date as the topic changes, and marks the moments that matter on a timeline. Close the window and what you watched stays in your history, ready to enhance and export.',
  openCta: 'Open Live Intelligence',
  pricingCta: 'See plans and pricing',
  howItWorksCta: 'See how it works',
  whatTitle: 'What Live Intelligence is',
  whatParagraphs: [
    'A live stream is hard to follow when it is long, fast or in a language you do not speak. Live Intelligence sits beside the video and does the note-taking: captions translated into your language, a running summary and a list of highlights, so you can look away and still know what you missed.',
    'It works in a modal inside ClawAI, so the stream and the analysis are on one screen. You choose the caption language and an analysis mode before you start, and you can pause, resume and seek wherever the stream allows it. When you pause, the feed freezes and billing stops.',
    'Many people can watch the same stream at once without paying for the same work many times. ClawAI processes a given stream once and shares that analysis with everyone watching it. The analysis you actually watched is saved to your own history, and you keep it until you delete it.',
  ],
  stepsTitle: 'How it works, in five steps',
  stepsIntro:
    'From a pasted link to an exported summary. Each step is one thing you do or one thing ClawAI does for you.',
  steps: [
    {
      title: 'Paste the link',
      body: 'Open Live Intelligence and paste the address of a live stream. ClawAI checks that the source is supported before anything is analyzed or billed, and tells you plainly if it is not.',
    },
    {
      title: 'Pick a language and a mode',
      body: 'Choose the language for your captions and summaries, and one of three analysis modes: Audio, Audio + Vision or Smart Auto. For a stream you are not allowed to analyze, you confirm you have the rights before it starts.',
    },
    {
      title: 'Watch with captions, cards and highlights',
      body: 'Captions appear a few seconds after the speech, roughly 7 to 12 seconds behind. Summary cards update as topics change, and detected highlights are placed on a timeline you can click.',
    },
    {
      title: 'Pause, resume and seek',
      body: 'Pause to freeze the feed and stop the meter. Resume from where you stopped or jump to the live edge, with the gap shown clearly. Seeking works wherever the stream itself allows it.',
    },
    {
      title: 'Close, come back, enhance, export',
      body: 'Closing the window keeps what you watched in your history. Later you can enhance any card with a model you choose, and export the history as PDF, Markdown or TXT.',
    },
  ],
  featuresTitle: 'What you get',
  features: [
    {
      title: 'Live captions in your language',
      body: 'Speech is transcribed and translated into the language you picked. Captions arrive a few seconds behind the speaker; this is not instant and the interface says so.',
    },
    {
      title: 'Summary cards that keep up',
      body: 'Short cards summarize the stream and are refreshed when the topic changes, so the latest card tells you where the stream is now.',
    },
    {
      title: 'Automatic highlights on a timeline',
      body: 'Moments worth revisiting are detected and marked on a timeline. Click one to jump to it where the stream allows seeking.',
    },
    {
      title: 'Pause, resume and seek',
      body: 'Control playback like a recording where the source supports it. While paused, the feed is frozen and nothing is billed.',
    },
    {
      title: 'History you control',
      body: 'The analysis you watched is kept in a paginated history until you delete it. Deleting it removes it.',
    },
    {
      title: 'Enhance a card with a model you choose',
      body: 'Pick any available model to rewrite or deepen a summary card. Enhancements are charged at the actual cost of the model you pick.',
    },
    {
      title: 'Export as PDF, Markdown or TXT',
      body: 'Take your history out of ClawAI in the format that suits where it is going next.',
    },
    {
      title: 'Shared processing',
      body: 'Many viewers, one analysis. The same stream is processed once and shared, which keeps the work and the cost from multiplying with the audience.',
    },
  ],
  modesTitle: 'Three analysis modes',
  modesIntro:
    'The mode decides what ClawAI looks at. You choose it before you start, and the cost follows the choice.',
  modes: [
    {
      title: 'Audio',
      body: 'Captions, summaries and highlights from what is said. The simplest mode, and the right one for talks, briefings, lectures and interviews.',
    },
    {
      title: 'Audio + Vision',
      body: 'Adds what is shown on screen, such as slides, charts or a demo. ClawAI samples frames from the stream and keeps the ones that changed. Vision is billed at the actual cost of the model used.',
    },
    {
      title: 'Smart Auto',
      body: 'Starts from the audio and adds vision only when the stream goes quiet or the picture changes, so you pay for vision when it is likely to matter.',
    },
  ],
  sourcesTitle: 'What it can and cannot analyze',
  sourcesIntro: 'We would rather tell you the limits now than have you find them mid-stream.',
  sources: [
    {
      title: 'AI analysis works on HLS live streams',
      body: 'Live Intelligence analyzes HLS live streams that you have the rights to analyze. When you start one, you confirm that you do.',
    },
    {
      title: 'YouTube links play, but are not analyzed',
      body: 'You can paste a YouTube link and watch it inside ClawAI, but there is no AI analysis for YouTube streams. YouTube’s terms do not permit capturing their audio or captions, so ClawAI does not do it, and the window says so.',
    },
    {
      title: 'Captions run a few seconds behind',
      body: 'Speech is transcribed in short chunks, so captions arrive about 7 to 12 seconds after it is spoken. This is not real-time captioning.',
    },
    {
      title: 'Honest states, never a fake success',
      body: 'The window shows when it is connecting, delayed, recovering, out of free minutes, waiting for your approval, at capacity or when the stream has ended.',
    },
  ],
  plansTitle: 'Free minutes and pricing',
  plansIntro:
    'Every plan includes free analysis minutes each month. These are the seeded defaults and can be adjusted.',
  planMinutesUnit: 'free minutes a month',
  planProAndAbove: 'Pro and above',
  plansBody:
    'After your free minutes, analysis costs {price} per minute, and only after you confirm it. You can set a spending cap. When your credit runs out you get a single 60-second grace period so you can finish what you are watching. Vision is billed at the actual cost of the model used, and pausing stops the meter.',
  faqTitle: 'Questions people ask',
  faq: [
    {
      question: 'Does Live Intelligence work on YouTube live streams?',
      answer:
        'You can watch a YouTube link inside ClawAI, but there is no AI analysis for it. YouTube’s terms do not permit capturing their audio or captions, so there are no captions, summaries or highlights for YouTube streams.',
    },
    {
      question: 'Which streams can it analyze?',
      answer:
        'HLS live streams that you have the rights to analyze. You confirm that when you start the analysis. A stream the service cannot read is reported as unsupported rather than failing silently.',
    },
    {
      question: 'Are the captions real time?',
      answer:
        'No. Captions arrive roughly 7 to 12 seconds after the speech, because audio is transcribed in short chunks. Summaries and highlights follow the captions.',
    },
    {
      question: 'How much does it cost?',
      answer:
        'Each plan includes free minutes every month: 30 on Free, 120 on Starter, 300 on Plus and 600 on Pro and above. After that it is $0.02 per minute, charged only after you confirm, with an optional spending cap. Vision is billed at the actual model cost.',
    },
    {
      question: 'What happens when my credit runs out mid-stream?',
      answer: 'You get one 60-second grace period, then analysis stops until you add credit.',
    },
    {
      question: 'Does pausing cost anything?',
      answer:
        'No. When you pause, the feed freezes and billing stops. Resume from where you stopped or jump back to the live edge.',
    },
    {
      question: 'What happens to my history?',
      answer:
        'The analysis you actually watched is kept until you delete it. You can browse it, enhance a card with a model you choose and export it as PDF, Markdown or TXT.',
    },
    {
      question: 'Can I ask the stream questions?',
      answer:
        'Not in this first release. Live Intelligence gives you captions, summary cards and highlights; asking questions about a stream is not included yet.',
    },
  ],
  closingTitle: 'Follow the next live stream without watching every minute',
  closingBody:
    'Paste an HLS link you have the rights to analyze, choose your language and start. Your free minutes are waiting.',
};
