/** The anonymous playback token Twitch issues to its own web player. */
export interface TwitchPlaybackToken {
  value: string;
  signature: string;
}
