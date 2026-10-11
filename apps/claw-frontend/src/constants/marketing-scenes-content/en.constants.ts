import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const EN_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: 'See it in the app',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: 'A ClawAI chat with a question, the written answer, a badge naming the model that replied and the routing details under the reply.',
      caption: 'Every answer shows which model wrote it and why.',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: 'The ClawAI message box with the model picker open, listing the models you can choose from.',
      caption: 'Pick a model yourself, or let AUTO choose.',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: 'The message box with web research switched on and the chooser for the search provider showing.',
      caption: 'Turn on web research and choose how it searches.',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: 'The message box with the Context menu open, offering your memory and your context packs.',
      caption: 'Bring your memory and context packs into any chat.',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: 'The Share this chat dialog open over a conversation, with the choices for how to share it.',
      caption: 'Share a chat with a link, on your terms.',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: 'The Compare page with three models selected and a prompt typed in, ready to send.',
      caption: 'Ask one question and see three models answer side by side.',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: 'The Consensus page, where several models answer the same question and work towards one agreed result.',
      caption: 'Let several models answer, then reach one agreed answer.',
    },
    [MarketingSceneId.FILES]: {
      alt: 'The Files page listing the files you uploaded and the files ClawAI made for you.',
      caption: 'Your uploads and generated files, in one place.',
    },
    [MarketingSceneId.MEMORY]: {
      alt: 'The Memory page showing what ClawAI remembers about you, which you can review and edit.',
      caption: 'See and control what ClawAI remembers.',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: 'The Context page listing reusable context packs that you can attach to chats.',
      caption: 'Reusable context packs for the work you repeat.',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: 'The Connectors page listing the services you can link to your workspace.',
      caption: 'Connect your tools so the AI can work with them.',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: 'The Billing page showing the available plans and which one is current.',
      caption: 'Clear plans, and you always see which one you are on.',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: 'The Plan page showing what your plan includes and how much of it you have used.',
      caption: 'See exactly what your plan includes.',
    },
    [MarketingSceneId.USAGE]: {
      alt: 'The Usage page with charts of how many tokens you have used over time.',
      caption: 'Track your usage as it happens.',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: 'The Settings page scrolled down to the notifications card, with its switches.',
      caption: 'Choose which notifications you get.',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'The Threads page listing your Threads, each with its status.',
      caption: 'All your Threads, and where each one stands.',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: 'A Thread draft open on the review page, before it is published.',
      caption: 'Review a draft before anything goes public.',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: 'The notifications panel opened from the bell, with a few recent notifications.',
      caption: 'Know the moment something is ready.',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: 'A short product tour card open on the chat page, pointing at a feature.',
      caption: 'A short tour shows you around.',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: 'The ClawAI dashboard with an overview of your recent activity and usage.',
      caption: 'Your workspace at a glance.',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: 'The administrator Observability view on the Consumption tab, with charts of how much the models were used.',
      caption: 'Administrators see consumption in charts.',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: 'A ClawAI chat conversation on a phone screen.',
      caption: 'The same chat, on your phone.',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: 'The ClawAI dashboard on a phone screen.',
      caption: 'Your dashboard fits a small screen too.',
    },
  },
};
