import { vi } from 'vitest';
import { ModelSizeController } from '../controllers/model-size.controller';
import { type RouterModelsService } from '../services/router-models.service';

describe('ModelSizeController', () => {
  it('returns what the service lists, without adding logic', async () => {
    const catalog = {
      data: [
        {
          provider: 'OPENAI',
          modelKey: 'gpt-5.4',
          contextWindowTokens: 400_000,
          parameterCountBillions: null,
          activeParameterCountBillions: null,
        },
      ],
    };
    const service = { listModelSizes: vi.fn().mockResolvedValue(catalog) };
    const controller = new ModelSizeController(service as unknown as RouterModelsService);

    await expect(controller.list()).resolves.toBe(catalog);
    expect(service.listModelSizes).toHaveBeenCalledTimes(1);
  });
});
