import { SUCCESS_RATE_CEILING, SUCCESS_RATE_FLOOR } from '../constants/learning-loop.constants';

export function boundedAdjust(current: number, delta: number): number {
  const next = current + delta;
  if (next < SUCCESS_RATE_FLOOR) return SUCCESS_RATE_FLOOR;
  if (next > SUCCESS_RATE_CEILING) return SUCCESS_RATE_CEILING;
  return Number(next.toFixed(4));
}
