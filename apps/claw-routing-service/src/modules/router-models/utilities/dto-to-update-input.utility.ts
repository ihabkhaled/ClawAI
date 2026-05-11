import { type Prisma } from '../../../generated/prisma';
import { REGISTRY_UPDATE_FIELDS } from '../constants/router-models.constants';
import { type UpdateRouterModelDto } from '../dto/update-router-model.dto';

export function dtoToUpdateInput(dto: UpdateRouterModelDto): Prisma.RouterModelRegistryUpdateInput {
  const dtoMap = dto as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const field of REGISTRY_UPDATE_FIELDS) {
    const value = dtoMap[field];
    if (value !== undefined) {
      out[field] = value;
    }
  }
  return out as Prisma.RouterModelRegistryUpdateInput;
}
