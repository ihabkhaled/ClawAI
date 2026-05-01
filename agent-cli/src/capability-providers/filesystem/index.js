/**
 * FILESYSTEM capability provider (Stream 11).
 *
 * Implements 8 operations against the local filesystem:
 *   READ, WRITE, APPEND, MOVE, COPY, DELETE, LIST, STAT
 *
 * Returns `{ output, undoPlan?, noUndoReason? }` per the
 * capability framework contract. The backend assesses risk + matches
 * policy BEFORE this provider runs — by the time we get here, the
 * invocation is APPROVED or AUTO_APPROVED.
 *
 * Safety rails enforced here (defense-in-depth, separate from policy):
 *   - All paths must be absolute (rejects relative + `..` traversal).
 *   - Path string ≤ 4096 chars.
 *   - READ bytes ≤ 32 MB (FS_READ_MAX_BYTES).
 *   - WRITE/APPEND content ≤ FS_WRITE_MAX_BYTES.
 *   - DELETE and WRITE on top of an existing file capture the original
 *     bytes into the undoPlan (base64) so backend rollback can restore.
 *
 * UndoPlan shape — each step is a CapabilityDescriptor the CLI is
 * permitted to execute without a fresh approval (rollback context):
 *   { steps: [{ capabilityClass, capabilityOperation, targetDescriptor, payload }] }
 */

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import {
  access,
  appendFile,
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, normalize } from 'node:path';

const FS_READ_MAX_BYTES = 32 * 1024 * 1024; // 32 MB
const FS_WRITE_MAX_BYTES = 32 * 1024 * 1024;
const FS_PATH_MAX_LENGTH = 4096;
const FS_LIST_MAX_ENTRIES = 5_000;
const FS_UNDO_CAPTURE_MAX_BYTES = 5 * 1024 * 1024; // never inline >5MB into undoPlan

export const filesystemProvider = {
  async execute({ operation, target, payload }) {
    const path = validatePath(target?.path);
    switch (operation) {
      case 'READ':
        return readOp(path);
      case 'WRITE':
        return writeOp(path, payload);
      case 'APPEND':
        return appendOp(path, payload);
      case 'DELETE':
        return deleteOp(path);
      case 'MOVE':
        return moveOp(path, target);
      case 'COPY':
        return copyOp(path, target);
      case 'LIST':
        return listOp(path);
      case 'STAT':
        return statOp(path);
      default:
        throw new Error(`FILESYSTEM provider received unsupported operation: ${operation}`);
    }
  },
};

function validatePath(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('FILESYSTEM: target.path is required (string)');
  }
  if (raw.length > FS_PATH_MAX_LENGTH) {
    throw new Error('FILESYSTEM: target.path exceeds max length');
  }
  if (!isAbsolute(raw)) {
    throw new Error('FILESYSTEM: target.path must be absolute');
  }
  // Reject any `..` segment in the *raw* input so callers can't sneak
  // intent past policy by relying on path.normalize collapsing them.
  // Splits on both `/` and `\` to cover Windows callers.
  if (raw.split(/[/\\]/).some((seg) => seg === '..')) {
    throw new Error('FILESYSTEM: target.path traversal segments rejected');
  }
  return normalize(raw);
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readOp(path) {
  const st = await stat(path);
  if (!st.isFile()) {
    throw new Error('FILESYSTEM.READ: target is not a regular file');
  }
  if (st.size > FS_READ_MAX_BYTES) {
    throw new Error(`FILESYSTEM.READ: file exceeds ${String(FS_READ_MAX_BYTES)} bytes`);
  }
  const buf = await readFile(path);
  const sha256 = createHash('sha256').update(buf).digest('hex');
  return {
    output: {
      contentBase64: buf.toString('base64'),
      sha256,
      size: st.size,
      mtimeMs: st.mtimeMs,
    },
    noUndoReason: 'read_only_no_state_change',
  };
}

async function writeOp(path, payload) {
  const buf = decodePayloadBytes(payload);
  if (buf.length > FS_WRITE_MAX_BYTES) {
    throw new Error('FILESYSTEM.WRITE: payload exceeds max size');
  }
  const existed = await pathExists(path);
  let originalSnapshot;
  if (existed) {
    originalSnapshot = await captureOriginal(path);
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buf);
  const undoPlan = buildWriteUndoPlan(path, existed, originalSnapshot);
  if (undoPlan === null) {
    return {
      output: { bytesWritten: buf.length, replacedExisting: existed },
      noUndoReason: 'pre_existing_file_too_large_for_inline_undo',
    };
  }
  return {
    output: { bytesWritten: buf.length, replacedExisting: existed },
    undoPlan,
  };
}

async function appendOp(path, payload) {
  const buf = decodePayloadBytes(payload);
  if (buf.length > FS_WRITE_MAX_BYTES) {
    throw new Error('FILESYSTEM.APPEND: payload exceeds max size');
  }
  const originalSize = (await pathExists(path)) ? (await stat(path)).size : 0;
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, buf);
  return {
    output: { bytesAppended: buf.length, newSize: originalSize + buf.length },
    undoPlan: {
      steps: [
        {
          capabilityClass: 'FILESYSTEM',
          capabilityOperation: 'TRUNCATE',
          targetDescriptor: { path },
          payload: { toSize: originalSize },
        },
      ],
    },
  };
}

async function deleteOp(path) {
  const original = await captureOriginal(path);
  const isDir = original.isDirectory;
  if (isDir) {
    await rm(path, { recursive: true, force: false });
  } else {
    await rm(path, { force: false });
  }
  if (original.contentBase64 === null) {
    return {
      output: { deleted: path, isDirectory: isDir },
      noUndoReason: isDir
        ? 'directory_delete_no_inline_undo'
        : 'file_too_large_for_inline_undo',
    };
  }
  return {
    output: { deleted: path, isDirectory: isDir },
    undoPlan: {
      steps: [
        {
          capabilityClass: 'FILESYSTEM',
          capabilityOperation: 'WRITE',
          targetDescriptor: { path },
          payload: { contentBase64: original.contentBase64 },
        },
      ],
    },
  };
}

async function moveOp(fromPath, target) {
  const toPath = validatePath(target?.toPath);
  if (await pathExists(toPath)) {
    throw new Error('FILESYSTEM.MOVE: destination already exists; refusing to overwrite');
  }
  await mkdir(dirname(toPath), { recursive: true });
  await rename(fromPath, toPath);
  return {
    output: { from: fromPath, to: toPath },
    undoPlan: {
      steps: [
        {
          capabilityClass: 'FILESYSTEM',
          capabilityOperation: 'MOVE',
          targetDescriptor: { path: toPath, toPath: fromPath },
          payload: {},
        },
      ],
    },
  };
}

async function copyOp(fromPath, target) {
  const toPath = validatePath(target?.toPath);
  const destExisted = await pathExists(toPath);
  if (destExisted) {
    throw new Error('FILESYSTEM.COPY: destination already exists; refusing to overwrite');
  }
  await mkdir(dirname(toPath), { recursive: true });
  await copyFile(fromPath, toPath);
  return {
    output: { from: fromPath, to: toPath },
    undoPlan: {
      steps: [
        {
          capabilityClass: 'FILESYSTEM',
          capabilityOperation: 'DELETE',
          targetDescriptor: { path: toPath },
          payload: {},
        },
      ],
    },
  };
}

async function listOp(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const truncated = entries.length > FS_LIST_MAX_ENTRIES;
  const sliced = truncated ? entries.slice(0, FS_LIST_MAX_ENTRIES) : entries;
  return {
    output: {
      path,
      entries: sliced.map((e) => ({
        name: e.name,
        kind: e.isDirectory() ? 'DIRECTORY' : e.isFile() ? 'FILE' : 'OTHER',
      })),
      truncated,
      count: sliced.length,
    },
    noUndoReason: 'read_only_no_state_change',
  };
}

async function statOp(path) {
  const st = await stat(path);
  return {
    output: {
      path,
      size: st.size,
      isFile: st.isFile(),
      isDirectory: st.isDirectory(),
      mtimeMs: st.mtimeMs,
      ctimeMs: st.ctimeMs,
    },
    noUndoReason: 'read_only_no_state_change',
  };
}

function decodePayloadBytes(payload) {
  if (payload?.contentBase64 !== undefined) {
    if (typeof payload.contentBase64 !== 'string') {
      throw new Error('FILESYSTEM: payload.contentBase64 must be a string');
    }
    return Buffer.from(payload.contentBase64, 'base64');
  }
  if (payload?.content !== undefined) {
    if (typeof payload.content !== 'string') {
      throw new Error('FILESYSTEM: payload.content must be a string');
    }
    return Buffer.from(payload.content, 'utf8');
  }
  throw new Error('FILESYSTEM: payload.content or payload.contentBase64 is required');
}

async function captureOriginal(path) {
  if (!(await pathExists(path))) {
    return { contentBase64: null, isDirectory: false, size: 0 };
  }
  const st = await stat(path);
  if (st.isDirectory()) {
    return { contentBase64: null, isDirectory: true, size: 0 };
  }
  if (st.size > FS_UNDO_CAPTURE_MAX_BYTES) {
    return { contentBase64: null, isDirectory: false, size: st.size };
  }
  const buf = await readFile(path);
  return { contentBase64: buf.toString('base64'), isDirectory: false, size: st.size };
}

function buildWriteUndoPlan(path, existed, originalSnapshot) {
  if (!existed) {
    return {
      steps: [
        {
          capabilityClass: 'FILESYSTEM',
          capabilityOperation: 'DELETE',
          targetDescriptor: { path },
          payload: {},
        },
      ],
    };
  }
  if (originalSnapshot?.contentBase64 === null || originalSnapshot?.contentBase64 === undefined) {
    return null;
  }
  return {
    steps: [
      {
        capabilityClass: 'FILESYSTEM',
        capabilityOperation: 'WRITE',
        targetDescriptor: { path },
        payload: { contentBase64: originalSnapshot.contentBase64 },
      },
    ],
  };
}
