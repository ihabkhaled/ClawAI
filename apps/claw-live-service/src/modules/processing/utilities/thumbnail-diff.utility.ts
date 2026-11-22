/** Mean absolute difference (0..255) of two equal-size grayscale thumbnails; 255 when not comparable. */
export function meanAbsoluteDifference(left: Buffer, right: Buffer): number {
  if (left.length === 0 || left.length !== right.length) return 255;
  let total = 0;
  for (const [index, value] of left.entries()) total += Math.abs(value - right.readUInt8(index));
  return total / left.length;
}
