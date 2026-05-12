import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { EmailSignatureRepository } from '../repositories/email-signature.repository';
import type { CreateEmailSignatureDto, UpdateEmailSignatureDto } from '../dto/email-signature.dto';
import type { UserEmailSignature } from '../../../generated/prisma';

@Injectable()
export class EmailSignatureService {
  private readonly logger = new Logger(EmailSignatureService.name);

  constructor(private readonly repo: EmailSignatureRepository) {}

  async list(userId: string): Promise<UserEmailSignature[]> {
    this.logger.debug(`list: userId=${userId}`);
    return this.repo.listForUser(userId);
  }

  async getOwn(userId: string, id: string): Promise<UserEmailSignature> {
    const row = await this.repo.findById(id);
    if (row === null || row.userId !== userId) {
      throw new NotFoundException({ messageKey: 'SIGNATURE_NOT_FOUND' });
    }
    return row;
  }

  async getDefault(userId: string): Promise<UserEmailSignature | null> {
    return this.repo.findDefaultForUser(userId);
  }

  async create(userId: string, dto: CreateEmailSignatureDto): Promise<UserEmailSignature> {
    const existing = await this.repo.findByName(userId, dto.name);
    if (existing !== null) {
      throw new ConflictException({ messageKey: 'SIGNATURE_NAME_TAKEN' });
    }
    const created = await this.repo.create({
      userId,
      name: dto.name,
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
    dto: UpdateEmailSignatureDto,
  ): Promise<UserEmailSignature> {
    await this.getOwn(userId, id); // 404 if not theirs
    if (dto.name !== undefined) {
      const clash = await this.repo.findByName(userId, dto.name);
      if (clash !== null && clash.id !== id) {
        throw new ConflictException({ messageKey: 'SIGNATURE_NAME_TAKEN' });
      }
    }
    const updated = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
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
