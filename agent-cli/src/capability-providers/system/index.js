/**
 * SYSTEM capability provider (V2 Stream 09 — OS control add-ons).
 *
 * Implements:
 *   LOCK             — lock the user session (gnome-screensaver-command -l
 *                      / rundll32.exe user32.dll,LockWorkStation
 *                      / pmset displaysleepnow on macOS)
 *   SUSPEND          — put the machine to sleep (per-OS systemctl /
 *                      rundll32 / pmset). Highly destructive; default
 *                      policy is DENY in capability-policy.constants.ts.
 *   NETWORK_INFO     — return IP, primary interface, DNS, hostname
 *   DISK_USAGE       — return per-mount usage stats
 *   TIMEZONE         — return OS timezone string
 *
 * All ops are IRREVERSIBLE — noUndoReason captured per call.
 *
 * Security: per the local-first-by-default rule, none of these ops
 * leak data off-device. LOCK and SUSPEND require approval via the
 * standard capability flow; the operator can hard-wire AUTO_APPROVE
 * for LOCK in an org policy but never for SUSPEND.
 */

import { exec } from 'node:child_process';
import { hostname, networkInterfaces } from 'node:os';
import { promisify } from 'node:util';

import { getPlatform } from '../../config/paths.js';
import { dep, osFamily, probeHealthy, whichBinary } from '../probe-helpers.js';

const execAsync = promisify(exec);
const SYSTEM_OP_TIMEOUT_MS = 10_000;

export const systemProvider = {
  async probe() {
    const family = osFamily();
    const lockBinary =
      family === 'macos'
        ? 'pmset'
        : family === 'windows'
          ? 'rundll32'
          : 'loginctl'; // Linux: prefer loginctl (systemd) over screensaver heuristics
    const lockInstalled = family === 'windows' ? true : await whichBinary(lockBinary);
    const dependencies = [
      dep({
        name: lockBinary,
        installed: lockInstalled,
        required: false,
        notes: 'Required for LOCK / SUSPEND operations',
        fix: lockInstalled
          ? null
          : family === 'linux'
            ? 'apt-get install systemd or x11-screensaver'
            : `Install ${lockBinary} for ${family}`,
      }),
    ];
    return {
      class: 'SYSTEM',
      healthy: probeHealthy(dependencies),
      dependencies,
      notes: `${family} system controls — LOCK/SUSPEND require approval`,
    };
  },
  async execute({ operation }) {
    switch (operation) {
      case 'LOCK':
        return lockOp();
      case 'SUSPEND':
        return suspendOp();
      case 'NETWORK_INFO':
        return networkInfoOp();
      case 'DISK_USAGE':
        return diskUsageOp();
      case 'TIMEZONE':
        return timezoneOp();
      default:
        throw new Error(`SYSTEM provider received unsupported operation: ${operation}`);
    }
  },
};

async function lockOp() {
  const family = osFamily();
  const cmd =
    family === 'macos'
      ? '/usr/bin/pmset displaysleepnow'
      : family === 'windows'
        ? 'rundll32.exe user32.dll,LockWorkStation'
        : 'loginctl lock-session';
  await execAsync(cmd, { timeout: SYSTEM_OP_TIMEOUT_MS });
  return {
    output: { locked: true, family },
    noUndoReason: 'lock_already_applied_user_must_unlock',
  };
}

async function suspendOp() {
  const family = osFamily();
  const cmd =
    family === 'macos'
      ? '/usr/bin/pmset sleepnow'
      : family === 'windows'
        ? 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0'
        : 'systemctl suspend';
  await execAsync(cmd, { timeout: SYSTEM_OP_TIMEOUT_MS });
  return {
    output: { suspended: true, family },
    noUndoReason: 'suspend_already_applied_user_must_wake',
  };
}

function networkInfoOp() {
  const ifs = networkInterfaces();
  const summary = {};
  for (const [name, addrs] of Object.entries(ifs)) {
    if (addrs === undefined) continue;
    summary[name] = addrs.map((a) => ({
      address: a.address,
      family: a.family,
      internal: a.internal,
      cidr: a.cidr,
      mac: a.mac,
    }));
  }
  return {
    output: { hostname: hostname(), interfaces: summary },
    noUndoReason: 'read_only_no_undo',
  };
}

async function diskUsageOp() {
  const family = osFamily();
  if (family === 'windows') {
    // wmic logicaldisk is deprecated; use PowerShell Get-PSDrive
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "Get-PSDrive -PSProvider FileSystem | Select Root,Used,Free | ConvertTo-Json"',
      { timeout: SYSTEM_OP_TIMEOUT_MS },
    );
    return {
      output: { drives: safeParseJson(stdout) },
      noUndoReason: 'read_only_no_undo',
    };
  }
  const { stdout } = await execAsync('df -P -k', { timeout: SYSTEM_OP_TIMEOUT_MS });
  return {
    output: { df: stdout.trim() },
    noUndoReason: 'read_only_no_undo',
  };
}

function timezoneOp() {
  // Intl.DateTimeFormat is OS-aware and avoids shelling out.
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    output: { timezone: tz },
    noUndoReason: 'read_only_no_undo',
  };
}

function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw: raw.slice(0, 4096) };
  }
}
