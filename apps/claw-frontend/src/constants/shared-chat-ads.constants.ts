/**
 * Reserved height (px) for a shared-chat ad slot.
 *
 * Space is held before the ad arrives so the transcript does not jump when it
 * loads. 280px matches a responsive leaderboard/rectangle at mobile width; a
 * smaller reservation would still shift the page, and a larger one leaves an
 * obvious gap when the unit is absent.
 */
export const SHARED_CHAT_AD_RESERVED_HEIGHT = 280;

export const MARKETING_AD_RESERVED_HEIGHT = 280;
