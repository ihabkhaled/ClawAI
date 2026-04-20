import * as log from '../utils/logger.js';
import { runLogin } from './login.command.js';

export async function runRegister(flags) {
  log.warn('`claw-agent register` is deprecated. Use `claw-agent login` instead.');
  log.warn('Compatibility shim will be removed at the end of Phase A.');
  await runLogin(flags);
}
