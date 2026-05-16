import { FigmaDesignAnalyzerHelper } from '../figma-design-analyzer.helper';
import type { FigmaFileTreeResponse } from '../../types/figma-api.types';

const helper = new FigmaDesignAnalyzerHelper();

const baseTree = (overrides: Partial<FigmaFileTreeResponse> = {}): FigmaFileTreeResponse => ({
  name: 'Onboarding flow',
  lastModified: '2026-05-14T00:00:00Z',
  version: '42',
  document: {
    id: '0:0',
    name: 'Document',
    type: 'DOCUMENT',
    children: [
      {
        id: '1:0',
        name: 'Page 1',
        type: 'CANVAS',
        children: [
          {
            id: '2:0',
            name: 'Login Screen',
            type: 'FRAME',
            children: [
              { id: '3:0', name: 'title', type: 'TEXT', characters: 'Welcome back' },
              {
                id: '3:1',
                name: 'group',
                type: 'GROUP',
                children: [
                  { id: '4:0', name: 'cta', type: 'TEXT', characters: 'Sign in' },
                  { id: '4:1', name: 'dup', type: 'TEXT', characters: 'Sign in' },
                ],
              },
              { id: '3:2', name: 'rect', type: 'RECTANGLE' },
            ],
          },
          {
            id: '2:1',
            name: 'Empty Frame',
            type: 'FRAME',
            children: [],
          },
          // A non-frame top-level node should be ignored.
          { id: '2:2', name: 'stray', type: 'RECTANGLE' },
        ],
      },
    ],
  },
  components: {
    'c1': { name: 'PrimaryButton', description: 'Main CTA' },
    'c2': { name: 'TextField' },
  },
  ...overrides,
});

describe('FigmaDesignAnalyzerHelper', () => {
  it('flattens the document tree into pages / frames / text / components', () => {
    const result = helper.analyze('file-abc', baseTree());

    expect(result.fileKey).toBe('file-abc');
    expect(result.fileName).toBe('Onboarding flow');
    expect(result.version).toBe('42');
    expect(result.pageCount).toBe(1);
    expect(result.frameCount).toBe(2); // Login Screen + Empty Frame, NOT the stray rect
    expect(result.componentCount).toBe(2);
    expect(result.componentNames).toEqual(['PrimaryButton', 'TextField']);
    expect(result.truncated).toBe(false);
  });

  it('collects distinct text snippets per frame (de-dupes "Sign in")', () => {
    const result = helper.analyze('file-abc', baseTree());
    const loginFrame = result.frames.find((f) => f.frameName === 'Login Screen');
    expect(loginFrame).toBeDefined();
    expect(loginFrame?.textSnippets.sort()).toEqual(['Sign in', 'Welcome back']);
    // Empty frame yields an empty snippet list, not an error.
    const emptyFrame = result.frames.find((f) => f.frameName === 'Empty Frame');
    expect(emptyFrame?.textSnippets).toEqual([]);
  });

  it('ignores non-frame top-level nodes (RECTANGLE etc.)', () => {
    const result = helper.analyze('file-abc', baseTree());
    expect(result.frames.map((f) => f.frameName)).not.toContain('stray');
  });

  it('treats COMPONENT and SECTION top-level nodes as frames', () => {
    const tree = baseTree();
    tree.document.children![0]!.children!.push(
      { id: '5:0', name: 'Button/Primary', type: 'COMPONENT', children: [] },
      { id: '5:1', name: 'Hero Section', type: 'SECTION', children: [] },
    );
    const result = helper.analyze('file-abc', tree);
    const names = result.frames.map((f) => f.frameName);
    expect(names).toContain('Button/Primary');
    expect(names).toContain('Hero Section');
  });

  it('sets truncated=true when more than 60 frames exist', () => {
    const tree = baseTree();
    const manyFrames = Array.from({ length: 70 }, (_, i) => ({
      id: `f:${String(i)}`,
      name: `Frame ${String(i)}`,
      type: 'FRAME',
      children: [],
    }));
    tree.document.children![0]!.children = manyFrames;
    const result = helper.analyze('file-abc', tree);
    expect(result.frameCount).toBe(60);
    expect(result.truncated).toBe(true);
  });

  it('handles a document with no pages gracefully', () => {
    const tree = baseTree();
    tree.document.children = [];
    const result = helper.analyze('file-abc', tree);
    expect(result.pageCount).toBe(0);
    expect(result.frameCount).toBe(0);
    expect(result.frames).toEqual([]);
  });

  it('handles a file with no components', () => {
    const tree = baseTree({ components: undefined });
    const result = helper.analyze('file-abc', tree);
    expect(result.componentCount).toBe(0);
    expect(result.componentNames).toEqual([]);
  });
});
