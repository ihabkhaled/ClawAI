# Skill: New Feature Scaffolding

> Use this skill when adding a new feature (backend + frontend) within existing services. Follow the exact order to avoid forward-reference errors.

---

## Backend Feature Order

Always follow this exact sequence — skipping steps causes import errors and test failures.

### 1. Prisma Schema (if DB change)

```prisma
// apps/claw-<service>/prisma/schema.prisma
model NewEntity {
  id        String   @id @default(cuid())
  userId    String
  name      String
  status    NewStatus
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("new_entities")
}
```

Then migrate:

```bash
cd apps/claw-<service> && npx prisma migrate dev --name add_new_entity
```

### 2. Enums

```typescript
// apps/claw-<service>/src/common/enums/new-status.enum.ts
export enum NewStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
```

If cross-service, also add to `packages/shared-types/src/enums.ts`.

### 3. Types

```typescript
// apps/claw-<service>/src/modules/<domain>/types/<domain>.types.ts
import type { NewEntity } from '../../generated/prisma';

export type NewEntityWithRelations = NewEntity & {
  relatedItems: RelatedItem[];
};

export type CreateNewEntityResult = {
  id: string;
  name: string;
  status: NewStatus;
};
```

### 4. Constants

```typescript
// apps/claw-<service>/src/modules/<domain>/constants/<domain>.constants.ts
export const NEW_ENTITY_MAX_NAME_LENGTH = 200;
export const NEW_ENTITY_PAGE_SIZE = 20;
```

### 5. DTOs (Zod)

```typescript
// apps/claw-<service>/src/modules/<domain>/dto/create-new-entity.dto.ts
import { z } from 'zod';
import { NewStatus } from '../../../common/enums/new-status.enum';
import { NEW_ENTITY_MAX_NAME_LENGTH } from '../constants/<domain>.constants';

export const CreateNewEntitySchema = z.object({
  name: z.string().min(1).max(NEW_ENTITY_MAX_NAME_LENGTH),
  status: z.nativeEnum(NewStatus).default(NewStatus.PENDING),
});

export type CreateNewEntityDto = z.infer<typeof CreateNewEntitySchema>;
```

### 6. Repository

```typescript
// apps/claw-<service>/src/modules/<domain>/repositories/<domain>.repository.ts
import { Injectable } from '@nestjs/common';
import type { NewEntity } from '../../../generated/prisma';
import { PrismaService } from '../../../common/utilities/prisma.utility';
import type { CreateNewEntityDto } from '../dto/create-new-entity.dto';

@Injectable()
export class NewEntityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateNewEntityDto): Promise<NewEntity> {
    return this.prisma.newEntity.create({
      data: { userId, ...dto },
    });
  }

  async findById(id: string, userId: string): Promise<NewEntity | null> {
    return this.prisma.newEntity.findFirst({ where: { id, userId } });
  }

  async findAllByUserId(userId: string): Promise<NewEntity[]> {
    return this.prisma.newEntity.findMany({ where: { userId } });
  }
}
```

### 7. Service

```typescript
// apps/claw-<service>/src/modules/<domain>/services/<domain>.service.ts
import { Injectable, Logger } from '@nestjs/common';
import type { CreateNewEntityDto } from '../dto/create-new-entity.dto';
import type { NewEntityWithRelations } from '../types/<domain>.types';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';

@Injectable()
export class NewEntityService {
  private readonly logger = new Logger(NewEntityService.name);

  constructor(private readonly repository: NewEntityRepository) {}

  async create(userId: string, dto: CreateNewEntityDto): Promise<NewEntity> {
    this.logger.log(`create: userId=${userId}`);
    return this.repository.create(userId, dto);
  }

  async getById(id: string, userId: string): Promise<NewEntity> {
    const entity = await this.repository.findById(id, userId);
    if (entity === null) {
      throw new EntityNotFoundException('NewEntity', id);
    }
    return entity;
  }
}
```

### 8. Controller

```typescript
// apps/claw-<service>/src/modules/<domain>/controllers/<domain>.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../app/types/auth.types';
import type { CreateNewEntityDto } from '../dto/create-new-entity.dto';
import { validateDto } from '../../../common/utilities/validation.utility';
import { CreateNewEntitySchema } from '../dto/create-new-entity.dto';

@Controller('new-entities')
export class NewEntityController {
  constructor(private readonly service: NewEntityService) {}

  @Post()
  async create(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const dto = validateDto(CreateNewEntitySchema, body);
    return this.service.create(user.id, dto);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getById(id, user.id);
  }
}
```

### 9. Module Registration

```typescript
// apps/claw-<service>/src/modules/<domain>/<domain>.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [NewEntityController],
  providers: [NewEntityService, NewEntityRepository],
  exports: [NewEntityService],
})
export class NewEntityModule {}
```

Then import in `AppModule`:

```typescript
imports: [..., NewEntityModule]
```

---

## Frontend Feature Order

### 1. Types

```typescript
// apps/claw-frontend/src/types/<domain>.types.ts
export type NewEntity = {
  id: string;
  name: string;
  status: NewEntityStatus;
  createdAt: string;
};
```

Also export from `src/types/index.ts`.

### 2. Enums

```typescript
// apps/claw-frontend/src/enums/new-entity-status.enum.ts
export enum NewEntityStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
```

Also export from `src/enums/index.ts`.

### 3. Constants

```typescript
// apps/claw-frontend/src/constants/<domain>.constants.ts
export const NEW_ENTITY_ROUTES = {
  LIST: '/new-entities',
  DETAIL: (id: string) => `/new-entities/${id}`,
} as const;
```

Also export from `src/constants/index.ts`.

### 4. Repository

```typescript
// apps/claw-frontend/src/repositories/<domain>/<domain>.repository.ts
import { apiClient } from '@/repositories/shared/api-client';
import type { NewEntity } from '@/types/<domain>.types';
import type { CreateNewEntityDto } from '@/lib/validation/<domain>.schema';

export const newEntityRepository = {
  create: (dto: CreateNewEntityDto): Promise<NewEntity> => apiClient.post('/new-entities', dto),
  getById: (id: string): Promise<NewEntity> => apiClient.get(`/new-entities/${id}`),
  list: (): Promise<NewEntity[]> => apiClient.get('/new-entities'),
};
```

### 5. Query Keys

```typescript
// apps/claw-frontend/src/repositories/shared/query-keys.ts
export const newEntityKeys = {
  all: ['new-entities'] as const,
  lists: () => [...newEntityKeys.all, 'list'] as const,
  details: () => [...newEntityKeys.all, 'detail'] as const,
  detail: (id: string) => [...newEntityKeys.details(), id] as const,
};
```

### 6. Hooks (one responsibility each)

```typescript
// apps/claw-frontend/src/hooks/<domain>/use-new-entities.ts
export const useNewEntities = () => {
  return useQuery({
    queryKey: newEntityKeys.lists(),
    queryFn: newEntityRepository.list,
  });
};

// apps/claw-frontend/src/hooks/<domain>/use-create-new-entity.ts
export const useCreateNewEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: newEntityRepository.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: newEntityKeys.lists() }),
  });
};
```

### 7. Components (pure render)

```typescript
// apps/claw-frontend/src/components/<domain>/new-entity-card.tsx
export function NewEntityCard({ entity }: NewEntityCardProps): React.ReactElement {
  return (
    <div className="rounded-lg border p-4">
      <h3>{entity.name}</h3>
      <StatusBadge status={entity.status} />
    </div>
  );
}
```

### 8. Page

```typescript
// apps/claw-frontend/src/app/(portal)/new-entities/page.tsx
export default function NewEntitiesPage(): React.ReactElement {
  const { entities, isLoading, isError, handleCreate } = useNewEntitiesPage();

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState />;

  return (
    <div>
      {entities.length === 0 ? (
        <EmptyState message={t('newEntities.empty')} />
      ) : (
        entities.map((e) => <NewEntityCard key={e.id} entity={e} />)
      )}
    </div>
  );
}
```

### 9. i18n Keys

Add to ALL 13 locale files:

```typescript
// en.ts
newEntities: {
  empty: 'No items yet',
  create: 'Create',
  title: 'New Entities',
}
```

---

## After Feature Implementation

Run the full quality suite:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Then run the QA script:

```bash
bash qa/test-<domain>.sh
```

Verify DB writes:

```bash
docker exec claw-db-<service> psql -U claw_user -d claw_<service> \
  -tAc 'SELECT COUNT(*) FROM "new_entities";'
```
