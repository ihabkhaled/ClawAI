import { stringify } from 'csv-stringify/sync';

export const convertToCsv = (content: string): Buffer => {
  // If content looks like CSV already (has commas and newlines), pass through
  if (content.includes(',') && content.includes('\n')) {
    return Buffer.from(content, 'utf-8');
  }

  // Otherwise, try to parse as lines and create a single-column CSV
  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  const records = lines.map((line) => [line]);
  const output = stringify(records);
  return Buffer.from(output, 'utf-8');
};
