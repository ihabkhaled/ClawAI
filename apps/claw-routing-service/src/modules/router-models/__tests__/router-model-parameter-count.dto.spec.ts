import { createRouterModelSchema } from '../dto/create-router-model.dto';
import { updateRouterModelSchema } from '../dto/update-router-model.dto';
import {
  OVERRIDE_MANAGED_FIELDS,
  REGISTRY_UPDATE_FIELDS,
} from '../constants/router-models.constants';
import { dtoToUpdateInput } from '../utilities/dto-to-update-input.utility';

const base = { provider: 'OPENROUTER', modelKey: 'openai/gpt-oss-120b', displayName: 'gpt-oss' };

describe('parameter counts on the registry DTOs (ADR-234)', () => {
  it('accepts a count and an active share in billions', () => {
    const parsed = createRouterModelSchema.parse({
      ...base,
      parameterCountBillions: 117,
      activeParameterCountBillions: 5.1,
    });
    expect(parsed.parameterCountBillions).toBe(117);
    expect(parsed.activeParameterCountBillions).toBe(5.1);
  });

  it('treats both as optional: a closed model carries none', () => {
    const parsed = createRouterModelSchema.parse(base);
    expect(parsed.parameterCountBillions).toBeUndefined();
  });

  it.each([0, -1, 100_001])('rejects %s billion', (value) => {
    expect(
      createRouterModelSchema.safeParse({ ...base, parameterCountBillions: value }).success,
    ).toBe(false);
  });

  it('lets an admin clear a count with null, and the update carries it through', () => {
    const dto = updateRouterModelSchema.parse({ parameterCountBillions: null });
    expect(dtoToUpdateInput(dto)).toMatchObject({ parameterCountBillions: null });
  });

  it('pins an admin edit against the sync, and writes it on update', () => {
    for (const field of ['parameterCountBillions', 'activeParameterCountBillions']) {
      expect(OVERRIDE_MANAGED_FIELDS).toContain(field);
      expect(REGISTRY_UPDATE_FIELDS).toContain(field);
    }
  });
});
