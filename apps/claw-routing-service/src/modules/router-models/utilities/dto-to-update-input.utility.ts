import { type Prisma } from '../../../generated/prisma';
import { REGISTRY_UPDATE_FIELDS } from '../constants/router-models.constants';
import { type CreateRouterModelDto } from '../dto/create-router-model.dto';
import { type UpdateRouterModelDto } from '../dto/update-router-model.dto';

/// The size columns of a new registry row (ADR-234): NULL when the admin gave none.
export function dtoToParameterCountColumns(dto: CreateRouterModelDto): {
  parameterCountBillions: number | null;
  activeParameterCountBillions: number | null;
} {
  return {
    parameterCountBillions: dto.parameterCountBillions ?? null,
    activeParameterCountBillions: dto.activeParameterCountBillions ?? null,
  };
}

export function dtoToUpdateInput(dto: UpdateRouterModelDto): Prisma.RouterModelRegistryUpdateInput {
  const fields = new Set<string>(REGISTRY_UPDATE_FIELDS);
  const out = Object.fromEntries(
    Object.entries(dto).filter(([field, value]) => fields.has(field) && value !== undefined),
  );
  return out as Prisma.RouterModelRegistryUpdateInput;
}
