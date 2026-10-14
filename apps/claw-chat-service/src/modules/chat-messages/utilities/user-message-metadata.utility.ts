import type { CreateMessageDto } from '../dto/create-message.dto';
import type { MessageQuote } from '../types/message-quote.types';
import type { ResearchRunResponse } from '../types/research.types';
import type { UserMessageMetadata } from '../types/user-message-metadata.types';

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function quoteAndIntentFields(
  dto: CreateMessageDto,
  quotes: MessageQuote[] | undefined,
): UserMessageMetadata {
  return {
    ...(quotes !== undefined && quotes.length > 0 ? { quotes } : {}),
    ...(nonEmptyString(dto.clientIntent) ? { clientIntent: dto.clientIntent } : {}),
  };
}

function attachmentFields(dto: CreateMessageDto): UserMessageMetadata {
  const { fileIds, maskFileId } = dto;
  const withFiles = fileIds !== undefined && fileIds.length > 0 ? { fileIds } : {};
  // A mask only means something next to the file it was drawn on.
  const withMask = maskFileId !== undefined && 'fileIds' in withFiles ? { maskFileId } : {};
  return { ...withFiles, ...withMask };
}

function presentationFields(dto: CreateMessageDto): UserMessageMetadata {
  return {
    ...(nonEmptyString(dto.modelDisplayName) ? { modelDisplayName: dto.modelDisplayName } : {}),
    ...(dto.contextSaveMode === undefined ? {} : { contextSaveMode: dto.contextSaveMode }),
    ...(dto.pluginRefs !== undefined && dto.pluginRefs.length > 0
      ? { pluginRefs: dto.pluginRefs }
      : {}),
  };
}

function researchField(researchRun: ResearchRunResponse | null): UserMessageMetadata {
  return researchRun === null
    ? {}
    : {
        research: {
          runId: researchRun.id,
          mode: researchRun.workflow,
          bundle: researchRun.bundle,
        },
      };
}

/**
 * The `metadata` stored on a USER message: quotes, intent, attachments, display
 * name, save mode, plugin mentions and the research run. Undefined when none of
 * them is present, so an ordinary message stores no metadata at all.
 */
export function buildUserMessageMetadata(
  dto: CreateMessageDto,
  researchRun: ResearchRunResponse | null,
  quotes?: MessageQuote[],
): UserMessageMetadata | undefined {
  const metadata: UserMessageMetadata = {
    ...quoteAndIntentFields(dto, quotes),
    ...attachmentFields(dto),
    ...presentationFields(dto),
    ...researchField(researchRun),
  };
  return Object.keys(metadata).length === 0 ? undefined : metadata;
}
