import { Injectable } from '@nestjs/common';

import { AdapterFailureKind } from '../../../common/enums/adapter-failure-kind.enum';
import { DEFAULT_TIME_ZONE } from '../constants/time.constants';
import { RESULT_SIGNIFICANT_DIGITS } from '../constants/math.constants';
import { AdapterError } from '../errors/adapter.error';
import {
  type AdapterContext,
  type AdapterResult,
  type PluginAdapter,
} from '../types/plugin-adapter.types';
import { type ZonedClock } from '../types/time.types';
import { evaluateExpression } from '../utilities/evaluate-expression.utility';
import { clockIn, instantFromLocal } from '../utilities/zoned-time.utility';

/** A clock, a time-zone converter and a calculator. No network, no files, no environment. */
@Injectable()
export class DatetimeMathAdapter implements PluginAdapter {
  // async so a thrown AdapterError becomes a rejection, like every other adapter.
  async execute(
    _context: AdapterContext,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<AdapterResult> {
    return { content: this.run(toolName, args), truncated: false };
  }

  private run(toolName: string, args: Record<string, unknown>): string {
    switch (toolName) {
      case 'current_time':
        return this.describe(clockIn(new Date(), this.text(args['timezone']) ?? DEFAULT_TIME_ZONE));
      case 'convert_time':
        return this.convert(args);
      case 'calculate':
        return this.calculate(this.text(args['expression']));
      default:
        throw new AdapterError(AdapterFailureKind.BAD_INPUT, 'Unknown tool');
    }
  }

  private convert(args: Record<string, unknown>): string {
    const time = this.text(args['time']);
    const from = this.text(args['from_timezone']);
    const to = this.text(args['to_timezone']);
    if (time === undefined || from === undefined || to === undefined) {
      throw new AdapterError(
        AdapterFailureKind.BAD_INPUT,
        'time, from_timezone and to_timezone are required',
      );
    }
    const instant = instantFromLocal(time, from);
    return `${this.describe(clockIn(instant, from))}\n=>\n${this.describe(clockIn(instant, to))}`;
  }

  private calculate(expression: string | undefined): string {
    if (expression === undefined) {
      throw new AdapterError(AdapterFailureKind.BAD_INPUT, 'expression is required');
    }
    const value = evaluateExpression(expression);
    return `${expression} = ${String(Number(value.toPrecision(RESULT_SIGNIFICANT_DIGITS)))}`;
  }

  private describe(clock: ZonedClock): string {
    return [
      `${clock.date} ${clock.time} ${clock.weekday}`,
      `time zone: ${clock.timeZone} (UTC${clock.offset})`,
      `UTC: ${clock.utc}`,
    ].join('\n');
  }

  private text(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
  }
}
