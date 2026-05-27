import { describe, expect, it } from '@jest/globals';
import { ComfyUIModelType } from '../../../../common/enums';
import {
  getComfyUIDownloadDescriptor,
  isComfyUIEntryDownloadable,
  listComfyUIDownloadKeys,
} from '../comfyui-downloads.constants';
import { CATALOG_ENTRIES } from '../catalog-entries.constants';

describe('comfyui-downloads registry', () => {
  it('exposes a descriptor for every IMAGE_GENERATION COMFYUI catalog entry', () => {
    const imageEntries = CATALOG_ENTRIES.filter(
      (entry) => entry.runtime === 'COMFYUI' && entry.category === 'IMAGE_GENERATION',
    );
    expect(imageEntries.length).toBeGreaterThanOrEqual(5);
    for (const entry of imageEntries) {
      expect(isComfyUIEntryDownloadable(entry.name, entry.tag)).toBe(true);
    }
  });

  it('returns undefined for an unknown catalog key', () => {
    expect(getComfyUIDownloadDescriptor('nope', 'nope')).toBeUndefined();
  });

  it('uses huggingface.co resolve URLs that include the filename', () => {
    for (const key of listComfyUIDownloadKeys()) {
      const [name, ...tagParts] = key.split(':');
      const tag = tagParts.join(':') || 'latest';
      const descriptor = getComfyUIDownloadDescriptor(name as string, tag);
      expect(descriptor).toBeDefined();
      if (descriptor === undefined) {
        return;
      }
      expect(descriptor.url).toMatch(/^https:\/\/huggingface\.co\//);
      expect(descriptor.url.endsWith(descriptor.filename)).toBe(true);
      expect(Object.values(ComfyUIModelType)).toContain(descriptor.modelType);
    }
  });
});
