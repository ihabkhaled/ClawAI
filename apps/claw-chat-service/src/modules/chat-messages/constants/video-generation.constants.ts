import { z } from 'zod';

/** The longest prompt image-service accepts; a planner rewrite is cut to fit. */
export const VIDEO_GENERATION_PROMPT_MAX_CHARACTERS = 4_000;

/** The rewrite stays short: providers follow a focused shot description better than an essay. */
export const VIDEO_PLANNED_PROMPT_MAX_CHARACTERS = 1_200;
export const VIDEO_PLANNED_PROMPT_MIN_CHARACTERS = 12;

export const VIDEO_PLANNER_MAX_OUTPUT_TOKENS = 500;
export const VIDEO_PLANNER_HISTORY_MESSAGES = 6;
export const VIDEO_PLANNER_HISTORY_CHARS = 400;
export const VIDEO_PLANNER_EVIDENCE_ITEMS = 5;
export const VIDEO_PLANNER_EVIDENCE_SNIPPET_CHARS = 300;

/** The request mentions the app the user is in, so the planner is given what it is. */
export const VIDEO_ABOUT_THIS_APP_PATTERN =
  /\b(?:claw\s?ai|this\s+(?:app|web\s?app|site|website|platform|product)|our\s+(?:app|product|platform|site))\b/iu;

export const VIDEO_SERVICE_TIMEOUT_MS = 30_000;

export const VIDEO_PLAN_REFUSAL_TEXT =
  "Video generation isn't included in your current plan. Upgrade to generate videos; everything else keeps working.";

export const VIDEO_PLANNER_SYSTEM_PROMPT = [
  'You write the prompt for an AI video generator (Veo, Grok Imagine Video) from a chat request.',
  'Reply with ONE JSON object and nothing else: {"prompt": string}.',
  '',
  'Write ONE short, concrete, cinematic shot description of at most 900 characters, in English:',
  '- the subject and what it does (one clear action), the setting, the time of day and lighting,',
  '  the camera (angle and movement) and the visual style;',
  '- if the request implies sound, add it ("soft synth music", "waves crashing"); put any spoken',
  '  words in quotes;',
  '- use the background and page facts given below when the request is about a product or app,',
  '  and never invent facts, prices, logos, brand claims or text to appear on screen;',
  '- no real people, no celebrities, nothing violent, sexual or hateful.',
  'A request that is already a good shot description may be returned almost unchanged.',
].join('\n');

/**
 * The image-to-video variant. The image is the first frame and the provider sees
 * it, so the prompt describes ONLY what moves: re-describing the picture risks the
 * clip drifting away from it.
 */
export const VIDEO_IMAGE_PLANNER_SYSTEM_PROMPT = [
  'You write the prompt for an AI video generator (Veo, Grok Imagine Video) that animates an',
  'image the user attached. The image is the first frame and the generator sees it.',
  'Reply with ONE JSON object and nothing else: {"prompt": string}.',
  '',
  'Write a SHORT motion description of at most 300 characters, in English:',
  '- what moves and how (the subject, the wind, the water, the light), and the camera move',
  '  (slow push-in, pan, still), in one or two sentences;',
  '- never describe the image itself, never name its subject or style, never invent new',
  '  objects, people or text to appear;',
  '- if the user gave no motion, choose a gentle natural one that fits a photo;',
  '- add sound only if the user asked for it.',
].join('\n');

export const VIDEO_PLANNED_PROMPT_SCHEMA = z.object({
  prompt: z
    .string()
    .trim()
    .min(VIDEO_PLANNED_PROMPT_MIN_CHARACTERS)
    .max(VIDEO_PLANNED_PROMPT_MAX_CHARACTERS),
});
