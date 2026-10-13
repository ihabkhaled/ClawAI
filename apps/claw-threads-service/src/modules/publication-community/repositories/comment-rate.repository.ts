import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class CommentRateRepository {
  constructor(private readonly prisma: PrismaService) {}

  countSince(authorId: string, since: Date): Promise<number> {
    return this.prisma.threadPublicationComment.count({
      where: { authorId, createdAt: { gte: since } },
    });
  }
}
