import { describe, expect, it } from 'vitest';

import { STREAM_STAGE_LABEL_KEYS } from '@/constants/stream.constants';
import { AiStreamStage } from '@/enums';

describe('STREAM_STAGE_LABEL_KEYS', () => {
  it('has a label key for every AiStreamStage value', () => {
    for (const stage of Object.values(AiStreamStage)) {
      expect(STREAM_STAGE_LABEL_KEYS[stage]).toBeDefined();
      expect(STREAM_STAGE_LABEL_KEYS[stage].startsWith('chat.stream.stage.')).toBe(true);
    }
  });

  it('maps the 5 research lifecycle stages to dedicated chat.stream.stage.research* keys', () => {
    expect(STREAM_STAGE_LABEL_KEYS[AiStreamStage.RESEARCH_STARTED]).toBe(
      'chat.stream.stage.researchStarted',
    );
    expect(STREAM_STAGE_LABEL_KEYS[AiStreamStage.RESEARCH_SOURCES_FOUND]).toBe(
      'chat.stream.stage.researchSourcesFound',
    );
    expect(STREAM_STAGE_LABEL_KEYS[AiStreamStage.RESEARCH_FETCHING]).toBe(
      'chat.stream.stage.researchFetching',
    );
    expect(STREAM_STAGE_LABEL_KEYS[AiStreamStage.RESEARCH_COMPLETED]).toBe(
      'chat.stream.stage.researchCompleted',
    );
    expect(STREAM_STAGE_LABEL_KEYS[AiStreamStage.RESEARCH_FAILED]).toBe(
      'chat.stream.stage.researchFailed',
    );
  });

  it('matches the full snapshot', () => {
    expect(STREAM_STAGE_LABEL_KEYS).toMatchSnapshot();
  });
});
