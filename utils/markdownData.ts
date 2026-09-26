import fs from 'fs';
import path from 'path';

/** Parse every GitHub-style table in a Markdown string into arrays of row objects. */
export function parseTables(markdown: string): Record<string, string>[][] {
  const tables: Record<string, string>[][] = [];
  const lines = markdown.split(/\r?\n/);
  const cells = (line: string) =>
    line
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());

  for (let i = 0; i < lines.length - 1; i++) {
    const isHeader = lines[i].trim().startsWith('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1]);
    if (!isHeader) continue;
    const headers = cells(lines[i]);
    const rows: Record<string, string>[] = [];
    let j = i + 2;
    for (; j < lines.length && lines[j].trim().startsWith('|'); j++) {
      const values = cells(lines[j]);
      rows.push(Object.fromEntries(headers.map((h, k) => [h, values[k] ?? ''])));
    }
    tables.push(rows);
    i = j - 1;
  }
  return tables;
}

/** Lines under a Setext heading ("Title\n-----") until the next heading or end of file. */
export function parseList(markdown: string, heading: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex(
    (l, i) => l.trim() === heading && /^-{3,}\s*$/.test(lines[i + 1] ?? ''),
  );
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start + 2; i < lines.length; i++) {
    if (/^-{3,}\s*$/.test(lines[i + 1] ?? '') || lines[i].startsWith('#')) break;
    if (lines[i].trim()) out.push(lines[i].trim());
  }
  return out;
}

/** "[Blank]" → "", "`   `" → "   " (keeps the spaces inside backticks). */
export function cellValue(raw: string): string {
  if (/^\[blank\]$/i.test(raw)) return '';
  const code = raw.match(/^`(.*)`$/);
  return code ? code[1] : raw;
}

export function readMarkdown(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}
