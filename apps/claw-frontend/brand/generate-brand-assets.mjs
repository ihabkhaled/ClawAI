#!/usr/bin/env node
/**
 * Regenerates every brand raster from one source artwork.
 *
 * Run after replacing `brand/claw-mark-source.png`:
 *
 *   node brand/generate-brand-assets.mjs
 *
 * Written as a script rather than done by hand because there are six output
 * sizes across three directories. Hand-cropping them means the next person who
 * needs a new size guesses at the crop, and the set drifts.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'brand/claw-mark-source.png');

/**
 * The rounded-square badge inside the source, measured from the artwork.
 *
 * The source is 1024x1024 with the badge floating in a black field. Cropping
 * to the badge is what makes the mark read at 32px — otherwise a third of the
 * pixels are empty background and the cat shrinks to nothing.
 */
const BADGE = { left: 126, top: 104, size: 776 };

/**
 * A tighter crop on the hat and face for the browser tab.
 *
 * At 16px and 32px the full badge is a dark smudge: the laptop, the coat, the
 * circuit traces and the feather all collapse into noise. The head alone still
 * reads — blue hat, gold eyes — which is the whole job of a favicon.
 */
const FACE = { left: 226, top: 150, size: 560 };

/**
 * Safe-zone inset for the maskable PWA icon.
 *
 * Android and friends crop a maskable icon to a circle or squircle of their
 * choosing. The spec reserves the outer ~20% for that crop, so the badge is
 * scaled down inside a padded canvas — without this the hat brim and the
 * feather get sliced off on exactly the platforms that use this icon.
 */
const MASKABLE_SAFE_ZONE = 0.8;

// Sampled from the artwork's own background, so padded canvases and the PWA
// splash blend into the mark instead of framing it.
const BACKDROP = { r: 6, g: 10, b: 26, alpha: 1 };

function badge() {
  return sharp(SOURCE).extract({
    left: BADGE.left,
    top: BADGE.top,
    width: BADGE.size,
    height: BADGE.size,
  });
}

function face() {
  return sharp(SOURCE).extract({
    left: FACE.left,
    top: FACE.top,
    width: FACE.size,
    height: FACE.size,
  });
}

async function writePng(pipeline, size, outPath) {
  const target = resolve(ROOT, outPath);
  await mkdir(dirname(target), { recursive: true });
  // compressionLevel 9 + palette where it helps: these ship on every page load,
  // and the 1.5 MB source would be an absurd favicon.
  const buffer = await pipeline
    .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
  await writeFile(target, buffer);
  return { outPath, size, bytes: buffer.length };
}

/**
 * Builds a multi-resolution .ico containing PNG-encoded frames.
 *
 * sharp cannot write ICO, and the format is simple enough to assemble
 * directly: a 6-byte header, one 16-byte directory entry per frame, then the
 * frames themselves. PNG-compressed frames inside an ICO are understood by
 * every browser in use.
 */
async function writeIco(sizes, outPath) {
  const frames = await Promise.all(
    sizes.map(async (size) => ({
      size,
      data: await face()
        .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer(),
    })),
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(frames.length, 4);

  const DIRECTORY_ENTRY_BYTES = 16;
  let offset = header.length + frames.length * DIRECTORY_ENTRY_BYTES;

  const entries = frames.map((frame) => {
    const entry = Buffer.alloc(DIRECTORY_ENTRY_BYTES);
    // 256px is encoded as 0 in this field — it is a single byte.
    entry.writeUInt8(frame.size >= 256 ? 0 : frame.size, 0);
    entry.writeUInt8(frame.size >= 256 ? 0 : frame.size, 1);
    entry.writeUInt8(0, 2); // palette size (0 = truecolour)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(frame.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += frame.data.length;
    return entry;
  });

  const ico = Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]);
  const target = resolve(ROOT, outPath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, ico);
  return { outPath, size: sizes.join('+'), bytes: ico.length };
}

async function writeMaskable(size, outPath) {
  const inner = Math.round(size * MASKABLE_SAFE_ZONE);
  const pad = Math.round((size - inner) / 2);
  const resized = await badge()
    .resize(inner, inner, { fit: 'cover', kernel: 'lanczos3' })
    .toBuffer();

  const buffer = await sharp({
    create: { width: size, height: size, channels: 4, background: BACKDROP },
  })
    .composite([{ input: resized, top: pad, left: pad }])
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  const target = resolve(ROOT, outPath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return { outPath, size, bytes: buffer.length };
}

const results = [];

// Browser tab. Face crop, three resolutions in one file.
results.push(await writeIco([16, 32, 48], 'src/app/favicon.ico'));

// Modern browsers and the PWA "any" purpose icon.
results.push(await writePng(badge(), 192, 'src/app/icon.png'));

// iOS home screen. Apple does not scale gracefully, so this is exact.
results.push(await writePng(badge(), 180, 'src/app/apple-icon.png'));

// Android adaptive icon, inset for the OS mask.
results.push(await writeMaskable(512, 'public/icon-maskable.png'));

// Marketing header (32px) and footer (28px). 128 gives 4x for retina.
results.push(await writePng(badge(), 128, 'public/claw-logo.png'));

// Home hero. Rendered at 250px, so 500 covers 2x displays.
results.push(await writePng(badge(), 500, 'public/claw-hero.png'));

for (const { outPath, size, bytes } of results) {
  console.log(`${outPath.padEnd(30)} ${String(size).padEnd(8)} ${(bytes / 1024).toFixed(1)} KB`);
}
