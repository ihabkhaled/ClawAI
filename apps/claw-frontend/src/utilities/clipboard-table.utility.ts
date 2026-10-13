/**
 * Turn clipboard HTML that is a table (Excel, Sheets, Word, a web page) into a
 * GitHub-flavoured markdown table, so a pasted table stays a table.
 *
 * Returns null unless the clipboard is essentially ONE table: any text outside
 * the table means the plain-text paste is the faithful one, so we leave it alone.
 */
export function htmlTableToMarkdown(html: string): string | null {
  if (!html.includes('<table') && !html.includes('<TABLE')) {
    return null;
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  if (tables.length !== 1) {
    return null;
  }
  const table = tables[0];
  if (table === undefined) {
    return null;
  }
  table.remove();
  // Excel wraps clipboard HTML in <style> and comments; only visible text counts.
  for (const node of doc.querySelectorAll('style, script')) {
    node.remove();
  }
  if ((doc.body.textContent ?? '').trim().length > 0) {
    return null;
  }

  const rows = Array.from(table.querySelectorAll('tr')).map((row) =>
    Array.from(row.querySelectorAll('th, td')).map(cellText),
  );
  const width = Math.max(0, ...rows.map((row) => row.length));
  if (rows.length === 0 || width === 0) {
    return null;
  }

  const lines = rows.map((row) => toLine(row, width));
  const separator = toLine(
    Array.from({ length: width }, () => '---'),
    width,
  );
  // A single-row paste is a header with no body — still a valid table.
  return [lines[0], separator, ...lines.slice(1)].join('\n');
}

function cellText(cell: Element): string {
  return (cell.textContent ?? '').replaceAll(/\s+/g, ' ').trim().replaceAll('|', '\\|');
}

function toLine(cells: string[], width: number): string {
  const padded = [...cells, ...Array.from({ length: width - cells.length }, () => '')];
  return `| ${padded.join(' | ')} |`;
}
