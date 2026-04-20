#!/usr/bin/env node
import { runLogin } from '../commands/login.command.js';
import { runLogout } from '../commands/logout.command.js';
import { runWhoami } from '../commands/whoami.command.js';
import { runDoctor } from '../commands/doctor.command.js';
import { runStatus } from '../commands/status.command.js';
import { runDevices } from '../commands/devices.command.js';
import { runConfig } from '../commands/config.command.js';
import { runRegister } from '../commands/register.command.js';
import { runStart } from '../commands/start.command.js';
import * as log from '../utils/logger.js';

const VERSION = '2.1.0-phase-b';

function parseArgs(argv) {
  const [, , command, ...rest] = argv;
  const flags = {};
  const positional = [];
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        flags[arg.slice(0, eq)] = arg.slice(eq + 1);
      } else if (rest[i + 1] !== undefined && !rest[i + 1].startsWith('--')) {
        flags[arg] = rest[i + 1];
        i += 1;
      } else {
        flags[arg] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { command, flags, positional };
}

function printHelp() {
  console.log(`claw-agent ${VERSION}

Usage:
  claw-agent <command> [flags]

Commands:
  login           Pair this device via browser (magic-link flow)
                    --device-code    Force headless device-code flow
                    --no-open        Do not open browser automatically
                    --device-name X  Assign a friendly name to this device
                    --json           Machine-readable output
  logout          Revoke this device and clear local credentials
  whoami          Show the currently paired device
  doctor          Run connectivity/auth checks
  status          Show login status
  start           Attach a session and run the command + file-watch loop
                    --no-watch       Disable the filesystem watcher
  devices         List devices for your account
                    --revoke <id>    Revoke a device
                    --rename <id>    Rename a device (followed by new name)
  config get [k]  Read config (no secrets)
  config set k v  Update a whitelisted config key (apiUrl, logLevel)
  register        [deprecated] Use \`login\` instead

Environment:
  CLAW_API_URL    Override the configured API URL

Version: ${VERSION}
`);
}

async function main() {
  const { command, flags, positional } = parseArgs(process.argv);
  if (flags['--version'] === true || command === '--version') {
    console.log(VERSION);
    return;
  }
  if (flags['--help'] === true || command === '--help' || command === undefined) {
    printHelp();
    return;
  }
  switch (command) {
    case 'login':
      await runLogin(flags);
      break;
    case 'logout':
      await runLogout(flags);
      break;
    case 'whoami':
      await runWhoami(flags);
      break;
    case 'doctor':
      await runDoctor(flags);
      break;
    case 'status':
      runStatus(flags);
      break;
    case 'start':
      await runStart(flags);
      break;
    case 'devices':
      await runDevices(flags, positional);
      break;
    case 'config':
      runConfig(flags, positional);
      break;
    case 'register':
      await runRegister(flags);
      break;
    case 'help':
      printHelp();
      break;
    default:
      log.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

main().catch((err) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
