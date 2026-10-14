import { lookup } from 'node:dns/promises';
import { Injectable } from '@nestjs/common';

import { EgressErrorCode } from '../../../common/enums/egress-error-code.enum';
import { EGRESS_DNS_TIMEOUT_MS } from '../constants/egress.constants';
import { EgressError } from '../errors/egress.error';
import { HostResolver } from './host-resolver';

/** The system resolver, asked for every address (not just the first) and bounded in time. */
@Injectable()
export class DnsHostResolver extends HostResolver {
  async resolveAll(host: string): Promise<string[]> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new EgressError(EgressErrorCode.DNS_FAILURE, 'dns timeout'));
      }, EGRESS_DNS_TIMEOUT_MS);
    });
    try {
      const answers = await Promise.race([lookup(host, { all: true, verbatim: true }), timeout]);
      return answers.map((answer) => answer.address);
    } catch (error) {
      if (error instanceof EgressError) throw error;
      throw new EgressError(EgressErrorCode.DNS_FAILURE, 'dns lookup failed');
    } finally {
      clearTimeout(timer);
    }
  }
}
