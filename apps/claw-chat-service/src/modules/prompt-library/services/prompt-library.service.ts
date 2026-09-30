import { HttpStatus, Injectable } from '@nestjs/common';

import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import {
  PROMPT_TEMPLATE_ENTITY as ENTITY,
  MAX_TEMPLATES_PER_USER,
} from '../constants/prompt-library.constants';
import {
  type CreatePromptTemplateDto,
  type ListPromptTemplatesQueryDto,
  type UpdatePromptTemplateDto,
} from '../dto/prompt-library.dto';
import { PromptLibraryErrorCode } from '../enums/prompt-library-error-code.enum';
import { PromptLibraryRepository } from '../repositories/prompt-library.repository';
import {
  type PromptTemplateListResult,
  type PromptTemplateView,
} from '../types/prompt-library.types';
import { decodeCursor, encodeCursor, toView } from '../utilities/prompt-template-view.utility';
import { assertValidTemplate } from '../utilities/template-variables.utility';

/**
 * A user's own saved prompts. Titles and bodies are user content and are never
 * logged.
 */
@Injectable()
export class PromptLibraryService {
  constructor(private readonly repository: PromptLibraryRepository) {}

  async list(
    userId: string,
    query: ListPromptTemplatesQueryDto,
  ): Promise<PromptTemplateListResult> {
    const offset = decodeCursor(query.cursor);
    const rows = await this.repository.list({
      userId,
      q: query.q,
      tag: query.tag,
      favorite: query.favorite,
      offset,
      limit: query.limit,
    });
    return {
      items: rows.slice(0, query.limit).map(toView),
      nextCursor: rows.length > query.limit ? encodeCursor(offset + query.limit) : null,
    };
  }

  async create(userId: string, dto: CreatePromptTemplateDto): Promise<PromptTemplateView> {
    assertValidTemplate(dto.body);
    const count = await this.repository.countForUser(userId);
    if (count >= MAX_TEMPLATES_PER_USER) {
      throw new BusinessException(
        `You can save at most ${MAX_TEMPLATES_PER_USER} prompts`,
        PromptLibraryErrorCode.PROMPT_LIBRARY_FULL,
        HttpStatus.CONFLICT,
      );
    }
    return toView(await this.repository.create({ userId, ...dto }));
  }

  async get(userId: string, id: string): Promise<PromptTemplateView> {
    const found = await this.repository.findOwned(id, userId);
    if (!found) {
      throw new EntityNotFoundException(ENTITY, id);
    }
    return toView(found);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePromptTemplateDto,
  ): Promise<PromptTemplateView> {
    if (dto.body !== undefined) {
      assertValidTemplate(dto.body);
    }
    const updated = await this.repository.update(id, userId, dto);
    if (!updated) {
      throw new EntityNotFoundException(ENTITY, id);
    }
    return toView(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const removed = await this.repository.delete(id, userId);
    if (!removed) {
      throw new EntityNotFoundException(ENTITY, id);
    }
  }

  async use(userId: string, id: string): Promise<PromptTemplateView> {
    const used = await this.repository.recordUse(id, userId);
    if (!used) {
      throw new EntityNotFoundException(ENTITY, id);
    }
    return toView(used);
  }
}
