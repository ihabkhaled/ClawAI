import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { EmailTemplateRepository } from '../repositories/email-template.repository';
import type { CreateEmailTemplateDto, UpdateEmailTemplateDto } from '../dto/email-template.dto';
import type { UserEmailTemplate } from '../../../generated/prisma';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(private readonly repo: EmailTemplateRepository) {}

  async list(userId: string): Promise<UserEmailTemplate[]> {
    this.logger.debug(`list: userId=${userId}`);
    return this.repo.listForUser(userId);
  }

  async getOwn(userId: string, id: string): Promise<UserEmailTemplate> {
    const row = await this.repo.findById(id);
    if (row?.userId !== userId) {
      throw new NotFoundException({ messageKey: 'TEMPLATE_NOT_FOUND' });
    }
    return row;
  }

  async getDefault(userId: string): Promise<UserEmailTemplate | null> {
    return this.repo.findDefaultForUser(userId);
  }

  async create(userId: string, dto: CreateEmailTemplateDto): Promise<UserEmailTemplate> {
    const existing = await this.repo.findByName(userId, dto.name);
    if (existing !== null) {
      throw new ConflictException({ messageKey: 'TEMPLATE_NAME_TAKEN' });
    }
    const created = await this.repo.create({
      userId,
      name: dto.name,
      subject: dto.subject,
      body: dto.body,
      isDefault: dto.isDefault ?? false,
    });
    if (created.isDefault) {
      await this.repo.clearDefaultsForUser(userId, created.id);
    }
    return created;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateEmailTemplateDto,
  ): Promise<UserEmailTemplate> {
    await this.getOwn(userId, id); // 404 if not theirs
    if (dto.name !== undefined) {
      const clash = await this.repo.findByName(userId, dto.name);
      if (clash !== null && clash.id !== id) {
        throw new ConflictException({ messageKey: 'TEMPLATE_NAME_TAKEN' });
      }
    }
    const updated = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
      ...(dto.body !== undefined ? { body: dto.body } : {}),
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
    });
    if (dto.isDefault === true) {
      await this.repo.clearDefaultsForUser(userId, id);
    }
    return updated;
  }

  async deleteById(userId: string, id: string): Promise<void> {
    await this.getOwn(userId, id);
    await this.repo.deleteById(id);
  }
}
