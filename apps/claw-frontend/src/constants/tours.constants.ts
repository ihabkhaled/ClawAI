import { TourId } from '@/enums/tour-id.enum';
import type { TourDefinition } from '@/types/tour.types';

/** The labs share the chat composer but are not a chat thread, so chat-thread tours skip them. */
const CHAT_LAB_ROUTES: readonly string[] = [
  '/chat/compare',
  '/chat/consensus',
  '/chat/escalation',
  '/chat/best-of-n',
  '/chat/cost-ensemble',
  '/chat/decompose',
  '/chat/pipeline',
  '/chat/repair',
  '/chat/role-pack',
  '/chat/verify',
];

/**
 * Every product tour. The text for a step lives in `tours-content/<locale>` under the same ids;
 * the element is any element carrying `data-tour="<target>"`. A step whose element is not on
 * screen shows as a centered card, so a tour never breaks on a small screen or a missing control.
 */
export const TOUR_DEFINITIONS: readonly TourDefinition[] = [
  {
    id: TourId.ThreadsIntro,
    routes: ['/threads'],
    excludedRoutes: [],
    autoOffer: true,
    steps: [
      { id: 'welcome', target: null },
      { id: 'list', target: 'threads-list' },
      { id: 'create', target: 'threads-create' },
      { id: 'process', target: null },
      { id: 'approve', target: null },
    ],
  },
  {
    id: TourId.ThreadCreate,
    routes: ['/threads', '/chat/*'],
    excludedRoutes: CHAT_LAB_ROUTES,
    autoOffer: false,
    steps: [
      { id: 'topic', target: 'thread-create-topic' },
      { id: 'kind', target: 'thread-create-kind' },
      { id: 'cap', target: 'thread-create-cap' },
      { id: 'models', target: 'thread-create-models' },
      { id: 'consent', target: 'thread-create-consent' },
      { id: 'start', target: 'thread-create-start' },
    ],
  },
  {
    id: TourId.ThreadReview,
    routes: ['/threads/review/*'],
    excludedRoutes: [],
    autoOffer: true,
    steps: [
      { id: 'status', target: 'thread-review-status' },
      { id: 'draft', target: 'thread-review-draft' },
      { id: 'approve', target: 'thread-review-approve' },
      { id: 'export', target: 'thread-review-export' },
      { id: 'share', target: 'thread-review-share' },
    ],
  },
  {
    id: TourId.ChatIntro,
    routes: ['/chat/*'],
    excludedRoutes: CHAT_LAB_ROUTES,
    autoOffer: true,
    steps: [
      { id: 'input', target: 'composer-input' },
      { id: 'context', target: 'composer-context' },
      { id: 'model', target: 'composer-model' },
      { id: 'attach', target: 'composer-attach' },
      { id: 'research', target: 'composer-research' },
      { id: 'prompts', target: 'composer-prompts' },
      { id: 'send', target: 'composer-send' },
      { id: 'rail', target: 'chat-rail' },
    ],
  },
  {
    id: TourId.ChatModels,
    routes: ['/chat/*'],
    excludedRoutes: [],
    autoOffer: false,
    steps: [
      { id: 'model', target: 'composer-model' },
      { id: 'auto', target: 'composer-model' },
      { id: 'badges', target: null },
      { id: 'credit', target: 'composer-credit' },
    ],
  },
  {
    id: TourId.ChatResearch,
    routes: ['/chat/*'],
    excludedRoutes: [],
    autoOffer: false,
    steps: [
      { id: 'toggle', target: 'composer-research' },
      { id: 'provider', target: 'composer-research-provider' },
      { id: 'sources', target: null },
    ],
  },
  {
    id: TourId.ChatContext,
    routes: ['/chat/*'],
    excludedRoutes: [],
    autoOffer: false,
    steps: [
      { id: 'context', target: 'composer-context' },
      { id: 'preview', target: 'composer-preview-context' },
      { id: 'packs', target: null },
    ],
  },
  {
    id: TourId.ChatToThread,
    routes: ['/chat/*'],
    excludedRoutes: CHAT_LAB_ROUTES,
    autoOffer: false,
    steps: [
      { id: 'more', target: 'chat-more' },
      { id: 'create', target: null },
      { id: 'after', target: null },
    ],
  },
  {
    id: TourId.CompareIntro,
    routes: ['/chat/compare'],
    excludedRoutes: [],
    autoOffer: true,
    steps: [
      { id: 'prompt', target: 'compare-prompt' },
      { id: 'models', target: 'compare-models' },
      { id: 'judge', target: 'compare-judge' },
    ],
  },
  {
    id: TourId.ContextPacks,
    routes: ['/context'],
    excludedRoutes: [],
    autoOffer: false,
    steps: [
      { id: 'create', target: 'context-create' },
      { id: 'use', target: null },
    ],
  },
];
