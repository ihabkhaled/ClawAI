import { vi } from 'vitest';
// ADR-152: an attachment is read whatever the user typed. The owner attached
// two screenshots to a blind model and wrote "check it and tell me where to
// press"; the helper described both, yet the assistant said it could not view
// images. Nothing below keys on the user's words.

import { ContextAssemblyManager } from '../context-assembly.manager';
import {
  ATTACHMENT_POINTER_MARKER,
  EARLIER_ATTACHMENT_HEADER_SUFFIX,
  EARLIER_ATTACHMENT_TEXT_MAX_CHARS,
  EARLIER_ATTACHMENTS_MAX_FILES,
} from '../../constants/attachment-awareness.constants';
import { ATTACHMENT_ONLY_TURN_MARKER } from '../../constants/attachment-only-turn.constants';
import { FileDeliveryMode } from '../../../../common/enums/file-delivery-mode.enum';
import { type ChatMessage } from '../../../../generated/prisma';
import { type AttachmentDeliveryPlan } from '../../types/attachment-delivery.types';
import { type AssembledContext, type FileContentResponse } from '../../types/context.types';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn(() => ({ PUBLIC_SITE_URL: 'https://claw.test' })) },
}));

const image: FileContentResponse = {
  id: 'f-image',
  filename: 'postman.png',
  mimeType: 'image/png',
  content: 'iVBORw0KGgo=',
  extractedText: null,
  ingestionStatus: 'COMPLETED',
  extractionError: null,
};

const pdf: FileContentResponse = {
  id: 'f-pdf',
  filename: 'invoice.pdf',
  mimeType: 'application/pdf',
  content: 'JVBERi0=',
  extractedText: 'Invoice total 982 USD, due 15 November',
  ingestionStatus: 'COMPLETED',
  extractionError: null,
};

const row = (id: string, role: string, content: string, fileIds?: string[]): ChatMessage =>
  ({
    id,
    threadId: 't1',
    role,
    content,
    metadata: fileIds === undefined ? null : { fileIds },
  }) as ChatMessage;

const decision = (file: FileContentResponse, mode: FileDeliveryMode) => ({
  fileId: file.id,
  filename: file.filename,
  mimeType: file.mimeType,
  provider: 'OPENAI',
  model: 'o3-mini',
  mode,
  sendNative: mode === FileDeliveryMode.NATIVE_IMAGE,
});

const planOf = (
  ...decisions: ReturnType<typeof decision>[]
): AttachmentDeliveryPlan => ({ provider: 'OPENAI', model: 'o3-mini', decisions });

const contextWith = (
  messages: ChatMessage[],
  fileContents: FileContentResponse[],
  extra: Partial<AssembledContext> = {},
): AssembledContext =>
  ({
    userId: 'u1',
    systemPrompt: null,
    threadMessages: messages,
    memories: [],
    contextPackItems: [],
    fileContents,
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    tokenBudget: 100_000,
    modelBudget: {} as never,
    conversationManifest: {} as never,
    crossThread: { selections: [] } as never,
    ...extra,
  }) as AssembledContext;

const lastText = (messages: ReturnType<ContextAssemblyManager['buildChatMessages']>): string => {
  const last = messages.at(-1);
  if (last === undefined) return '';
  if (typeof last.content === 'string') return last.content;
  const part = last.content.find((candidate) => candidate.type === 'text');
  return part !== undefined && 'text' in part ? part.text : '';
};

const newManager = (): ContextAssemblyManager =>
  new ContextAssemblyManager(
    { select: vi.fn() } as never,
    { retrieve: vi.fn() } as never,
    { needsWeb: vi.fn() } as never,
    { hasResearchAccess: vi.fn() } as never,
  );

// Whatever the user typed, in any language, the files are named on the turn.
const WORDINGS: [string, string][] = [
  ['no instruction at all', 'hmm'],
  ['the owner wording', 'here is a screenshot for postman on mac, check it and tell me where to press'],
  ['a bare question', 'where do I press?'],
  ['a French question', 'où dois-je appuyer ?'],
  ['an Arabic question', 'أين أضغط؟'],
  ['a one-word request', 'summarise'],
];

describe('the attachment pointer on the final user turn', () => {
  it.each(WORDINGS)('names the files and keeps the typed text first (%s)', (_label, typed) => {
    const messages = newManager().buildChatMessages(
      contextWith([row('m1', 'USER', typed)], [image, pdf]),
    );

    const text = lastText(messages);
    expect(text.startsWith(typed)).toBe(true);
    expect(text).toContain(ATTACHMENT_POINTER_MARKER);
    expect(text).toContain('"postman.png" (image)');
    expect(text).toContain('"invoice.pdf" (document)');
    expect(text).not.toContain(ATTACHMENT_ONLY_TURN_MARKER);
  });

  it('is the same pointer for the single-string prompt', () => {
    const prompt = newManager().buildPromptString(
      contextWith([row('m1', 'USER', 'where do I press?')], [image]),
    );

    expect(prompt).toContain(ATTACHMENT_POINTER_MARKER);
    expect(prompt).toContain('"postman.png" (image)');
  });

  it('adds nothing when no file is involved', () => {
    const messages = newManager().buildChatMessages(
      contextWith([row('m1', 'USER', 'where do I press?')], []),
    );

    expect(lastText(messages)).toBe('where do I press?');
  });

  it('leaves a typed-nothing turn to the attachment-only instruction', () => {
    const messages = newManager().buildChatMessages(contextWith([row('m1', 'USER', '.')], [image]));

    const text = lastText(messages);
    expect(text).toContain(ATTACHMENT_ONLY_TURN_MARKER);
    expect(text).not.toContain(ATTACHMENT_POINTER_MARKER);
  });

  it('tells a blind lane to answer from the vision assistant description, never "I cannot view it"', () => {
    const lane = contextWith([row('m1', 'USER', 'where do I press to send?')], [image], {
      attachmentDelivery: planOf(decision(image, FileDeliveryMode.DERIVED_IMAGE_TEXT)),
    });

    const text = lastText(newManager().buildChatMessages(lane));

    expect(text).toContain('The user attached 1 image(s).');
    expect(text).toContain('a vision assistant described them');
    expect(text).toContain('Answer the user from that description');
    expect(text).toContain('Never tell the user you cannot view images');
  });

  it('says plainly why when the helper could not describe the image', () => {
    const lane = contextWith([row('m1', 'USER', 'where do I press to send?')], [image], {
      attachmentDelivery: planOf(decision(image, FileDeliveryMode.OMITTED_NO_VISION)),
    });

    const text = lastText(newManager().buildChatMessages(lane));

    expect(text).toContain('could not be viewed or described this turn');
    expect(text).toContain('Do not guess what it shows');
    expect(text).not.toContain('a vision assistant described them');
  });

  it('tells the user when an attached file could not be opened at all', () => {
    const lane = contextWith([row('m1', 'USER', 'what does it say?')], [], {
      requestedAttachmentCount: 2,
    });

    const text = lastText(newManager().buildChatMessages(lane));

    expect(text).toContain('2 attached file(s) could not be opened this turn');
    expect(text).toContain('Tell the user so plainly');
  });

  it('does not point a vision lane at a description it never received', () => {
    const lane = contextWith([row('m1', 'USER', 'where do I press?')], [image], {
      attachmentDelivery: planOf(decision(image, FileDeliveryMode.NATIVE_IMAGE)),
    });

    const text = lastText(newManager().buildChatMessages(lane));

    expect(text).toContain('"postman.png" (image)');
    expect(text).not.toContain('vision assistant described');
    expect(text).not.toContain('could not be viewed');
  });

  it('never decorates a tool result that rides back as a user turn', () => {
    const toolResult = {
      ...row('m2', 'TOOL', '{"status":"succeeded"}'),
      metadata: { runtimeV2: { kind: 'tool-result' } },
    } as ChatMessage;

    const text = lastText(
      newManager().buildChatMessages(
        contextWith([row('m1', 'USER', 'check the page'), toolResult], [image]),
      ),
    );

    expect(text).not.toContain(ATTACHMENT_POINTER_MARKER);
  });
});

describe('earlier attachments on a follow-up', () => {
  it('labels the file block and the pointer, and does not treat it as just sent', () => {
    const lane = contextWith(
      [
        row('m1', 'USER', 'here is the invoice', ['f-pdf']),
        row('m2', 'ASSISTANT', 'It is 982 USD.'),
        row('m3', 'USER', 'and which vendor is it from?'),
      ],
      [pdf],
      { earlierFileIds: ['f-pdf'] },
    );

    const messages = newManager().buildChatMessages(lane);
    const system = String(messages[0]?.content);
    const text = lastText(messages);

    expect(system).toContain(`"invoice.pdf"${EARLIER_ATTACHMENT_HEADER_SUFFIX}`);
    expect(system).toContain('Invoice total 982 USD');
    expect(text).toContain('Files attached earlier in this conversation are also provided');
    expect(text).not.toContain('attached the file(s) below to this message');
  });

  it('a "." follow-up with only earlier files is not an attachment-only turn', () => {
    const lane = contextWith([row('m1', 'USER', '.')], [pdf], { earlierFileIds: ['f-pdf'] });

    const text = lastText(newManager().buildChatMessages(lane));

    expect(text).not.toContain(ATTACHMENT_ONLY_TURN_MARKER);
  });
});

describe('assemble() carries earlier attachments', () => {
  type Internals = {
    fetchMemories: () => Promise<unknown[]>;
    fetchContextPackItems: () => Promise<unknown[]>;
    fetchWorkspaceContext: () => Promise<unknown[]>;
    fetchResearchEvidence: () => Promise<null>;
    fetchFileContents: (ids: string[], userId: string) => Promise<FileContentResponse[]>;
  };

  function managerWith(files: Record<string, FileContentResponse>): {
    manager: ContextAssemblyManager;
    fetched: string[][];
  } {
    const manager = new ContextAssemblyManager(
      { select: (messages: ChatMessage[]) => ({ included: messages, manifest: {} }) } as never,
      { retrieve: async () => ({ estimatedTokens: 0, selections: [] }) } as never,
      { needsWeb: vi.fn() } as never,
      { hasResearchAccess: vi.fn() } as never,
    );
    const fetched: string[][] = [];
    const internals = manager as unknown as Internals;
    internals.fetchMemories = async () => [];
    internals.fetchContextPackItems = async () => [];
    internals.fetchWorkspaceContext = async () => [];
    internals.fetchResearchEvidence = async () => null;
    internals.fetchFileContents = async (ids) => {
      fetched.push(ids);
      return ids.flatMap((id) => (files[id] === undefined ? [] : [files[id]]));
    };
    return { manager, fetched };
  }

  it('fetches earlier files separately, newest first, bounded, and marks them', async () => {
    const files: Record<string, FileContentResponse> = {
      'f-1': { ...pdf, id: 'f-1', filename: 'one.pdf' },
      'f-2': { ...pdf, id: 'f-2', filename: 'two.pdf' },
      'f-3': { ...pdf, id: 'f-3', filename: 'three.pdf' },
      'f-4': { ...pdf, id: 'f-4', filename: 'four.pdf' },
      'f-now': { ...pdf, id: 'f-now', filename: 'now.pdf' },
    };
    const { manager, fetched } = managerWith(files);
    const messages = [
      row('m1', 'USER', 'a', ['f-1', 'f-2']),
      row('m2', 'ASSISTANT', 'ok'),
      row('m3', 'USER', 'b', ['f-3', 'f-4']),
      row('m4', 'ASSISTANT', 'ok'),
      row('m5', 'USER', 'and the new one?', ['f-now']),
    ];

    const context = await manager.assemble('u1', messages, undefined, undefined, ['f-now']);

    expect(fetched).toEqual([['f-now'], ['f-3', 'f-4', 'f-1']]);
    expect(fetched[1]).toHaveLength(EARLIER_ATTACHMENTS_MAX_FILES);
    expect(context.fileContents.map((file) => file.id)).toEqual(['f-now', 'f-3', 'f-4', 'f-1']);
    expect(context.earlierFileIds).toEqual(['f-3', 'f-4', 'f-1']);
    expect(context.requestedAttachmentCount).toBe(1);
  });

  it('keeps earlier text bounded and never carries an earlier video', async () => {
    const long = 'x'.repeat(EARLIER_ATTACHMENT_TEXT_MAX_CHARS * 3);
    const { manager } = managerWith({
      'f-long': { ...pdf, id: 'f-long', extractedText: long },
      'f-vid': { ...pdf, id: 'f-vid', mimeType: 'video/mp4', filename: 'clip.mp4' },
    });
    const messages = [
      row('m1', 'USER', 'a', ['f-long', 'f-vid']),
      row('m2', 'ASSISTANT', 'ok'),
      row('m3', 'USER', 'and then?'),
    ];

    const context = await manager.assemble('u1', messages);

    expect(context.fileContents.map((file) => file.id)).toEqual(['f-long']);
    expect(context.fileContents[0]?.extractedText?.length).toBeLessThan(long.length);
    expect(context.requestedAttachmentCount).toBeUndefined();
  });

  it('a failing earlier file never costs the turn its own files', async () => {
    const { manager } = managerWith({ 'f-now': { ...pdf, id: 'f-now' } });
    const messages = [
      row('m1', 'USER', 'a', ['f-gone']),
      row('m2', 'ASSISTANT', 'ok'),
      row('m3', 'USER', 'b', ['f-now']),
    ];

    const context = await manager.assemble('u1', messages, undefined, undefined, ['f-now']);

    expect(context.fileContents.map((file) => file.id)).toEqual(['f-now']);
    expect(context.earlierFileIds).toBeUndefined();
  });
});
