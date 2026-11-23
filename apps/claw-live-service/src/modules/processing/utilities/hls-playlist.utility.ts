import type { ParsedPlaylist, PlaylistSegment, PlaylistVariant } from '../types/processing.types';

function attribute(line: string, name: string): string | null {
  const start = line.indexOf(`${name}=`);
  if (start === -1) return null;
  const rest = line.slice(start + name.length + 1);
  if (rest.startsWith('"')) {
    const end = rest.indexOf('"', 1);
    return end === -1 ? null : rest.slice(1, end);
  }
  const comma = rest.indexOf(',');
  return comma === -1 ? rest : rest.slice(0, comma);
}

/**
 * Parses the parts of an HLS playlist the worker needs: media segments (sequence,
 * duration, EXT-X-PROGRAM-DATE-TIME carried forward), variants of a master playlist,
 * EXT-X-ENDLIST and the EXT-X-MAP init segment. URIs are returned as written.
 */
export function parsePlaylist(text: string): ParsedPlaylist {
  const result: ParsedPlaylist = { segments: [], variants: [], endList: false, mapUri: null };
  let sequence = 0;
  let duration = 0;
  let programDate: number | null = null;
  let pendingVariant: Omit<PlaylistVariant, 'uri'> | null = null;
  for (const raw of text.split(/\r?\n/u)) {
    const line = raw.trim();
    if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:'))
      sequence = Number.parseInt(line.slice(22), 10) || 0;
    else if (line.startsWith('#EXTINF:')) duration = Number.parseFloat(line.slice(8)) || 0;
    else if (line.startsWith('#EXT-X-PROGRAM-DATE-TIME:')) {
      const parsed = Date.parse(line.slice(25));
      programDate = Number.isNaN(parsed) ? null : parsed;
    } else if (line.startsWith('#EXT-X-ENDLIST')) result.endList = true;
    else if (line.startsWith('#EXT-X-MAP:')) result.mapUri = attribute(line, 'URI');
    else if (line.startsWith('#EXT-X-STREAM-INF:')) {
      pendingVariant = {
        bandwidth: Number.parseInt(attribute(line, 'BANDWIDTH') ?? '0', 10) || 0,
        hasVideo: attribute(line, 'RESOLUTION') !== null,
      };
    } else if (line !== '' && !line.startsWith('#')) {
      if (pendingVariant === null) {
        const segment: PlaylistSegment = {
          uri: line,
          sequence,
          durationMs: Math.round(duration * 1000),
          programDateMs: programDate,
        };
        result.segments.push(segment);
        sequence += 1;
        programDate = programDate === null ? null : programDate + segment.durationMs;
      } else {
        result.variants.push({ uri: line, ...pendingVariant });
        pendingVariant = null;
      }
    }
  }
  return result;
}

/**
 * The variant the worker reads: the lightest one, since audio is what matters. When vision is on,
 * the lightest one WITH video (an audio-only rendition has no frames to look at).
 */
export function pickPlaylistVariant(
  variants: readonly PlaylistVariant[],
  wantsVideo: boolean,
): PlaylistVariant | null {
  const withVideo = variants.filter((variant) => variant.hasVideo);
  const pool = wantsVideo && withVideo.length > 0 ? withVideo : variants;
  return [...pool].sort((a, b) => a.bandwidth - b.bandwidth)[0] ?? null;
}
