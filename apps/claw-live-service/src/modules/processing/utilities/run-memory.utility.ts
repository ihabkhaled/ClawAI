import type { RunMemory } from '../types/processing.types';

/** Fresh short-term memory for a worker that starts (or resumes) at the Live Edge. */
export function createRunMemory(now: number): RunMemory {
  return {
    workingSummary: '',
    openCard: null,
    recent: [],
    pendingTranscriptMs: 0,
    pendingFirst: null,
    lastSpeechEndAt: null,
    lastMediaAt: null,
    lastSummaryWallAt: now,
    lastSnapshotWallAt: now,
    highlights: [],
    visualNotes: [],
    processedMs: 0,
    vision: { lastSampleWallAt: 0, lastKeptWallAt: 0, lastThumb: null },
    spokenLanguage: null,
    webNotes: [],
    research: { lastWallAt: 0, count: 0, queries: [], lyricSearches: 0 },
  };
}
