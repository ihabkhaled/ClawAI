import { z } from 'zod';
import { DeviceStatus } from '../../../common/enums/device-status.enum';

export const listDevicesQuerySchema = z.object({
  status: z.nativeEnum(DeviceStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListDevicesQueryDto = z.infer<typeof listDevicesQuerySchema>;
