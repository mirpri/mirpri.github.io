// Vim motion helpers
const isWordChar = (ch: string) => /[A-Za-z0-9_]/.test(ch);

export const firstNonWhitespace = (s: string) => {
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== ' ' && c !== '\t') return i;
  }
  return 0;
};

export const nextWord = (lines: string[], row: number, col: number) => {
  let r = row;
  let c = col;
  const n = lines.length;
  if (r >= n) return { row: n - 1, col: (lines[n - 1] || '').length };
  let line = lines[r] || '';
  if (c >= line.length) { r++; c = 0; }
  while (r < n) {
    line = lines[r] || '';
    let p = c;
    while (p < line.length && isWordChar(line[p])) p++; // finish current word if in one
    while (p < line.length && !isWordChar(line[p])) p++; // skip separators
    if (p < line.length) return { row: r, col: p };
    r++; c = 0; // go to next line
  }
  return { row: n - 1, col: (lines[n - 1] || '').length };
};

export const prevWord = (lines: string[], row: number, col: number) => {
  let r = row;
  let c = col;
  if (r < 0) return { row: 0, col: 0 };
  if (r >= lines.length) r = lines.length - 1;
  // step back one column to avoid staying on current word start
  if (c > 0) c--; else { r--; if (r < 0) return { row: 0, col: 0 }; c = (lines[r] || '').length - 1; if (c < 0) c = 0; }
  while (r >= 0) {
    const line = lines[r] || '';
    let p = Math.min(c, Math.max(0, line.length - 1));
    while (p >= 0 && !isWordChar(line[p])) p--; // skip separators
    if (p >= 0) {
      while (p > 0 && isWordChar(line[p - 1])) p--; // to word start
      return { row: r, col: Math.max(0, p) };
    }
    r--; if (r < 0) break; c = (lines[r] || '').length - 1;
  }
  return { row: 0, col: 0 };
};

export const nextParagraph = (lines: string[], row: number) => {
  const n = lines.length;
  let r = Math.min(n, row + 1);
  while (r < n && (lines[r] || '').trim() !== '') r++; // find blank line
  while (r < n && (lines[r] || '').trim() === '') r++; // then next non-blank
  if (r >= n) return { row: n - 1, col: (lines[n - 1] || '').length };
  const line = lines[r] || '';
  return { row: r, col: Math.min(line.length, firstNonWhitespace(line)) };
};

export const prevParagraph = (lines: string[], row: number) => {
  let r = Math.max(0, row - 1);
  while (r >= 0 && (lines[r] || '').trim() === '') r--; // skip blanks above
  while (r >= 0 && (lines[r] || '').trim() !== '') r--; // go to blank before paragraph
  const target = Math.max(0, r + 1);
  const line = lines[target] || '';
  return { row: target, col: Math.min(line.length, firstNonWhitespace(line)) };
};

export const nextWordEnd = (lines: string[], row: number, col: number) => {
  let r = row;
  let c = col;
  const n = lines.length;
  if (r >= n) return { row: n - 1, col: (lines[n - 1] || '').length };
  let line = lines[r] || '';
  // move at least one position forward if possible
  if (c < line.length) c++; else { r++; c = 0; }
  while (r < n) {
    line = lines[r] || '';
    let p = c;
    // skip separators to start of next word
    while (p < line.length && !isWordChar(line[p])) p++;
    if (p < line.length) {
      // advance to end of this word
      while (p + 1 < line.length && isWordChar(line[p + 1])) p++;
      return { row: r, col: p };
    }
    r++; c = 0;
  }
  return { row: n - 1, col: (lines[n - 1] || '').length };
};

export const prevWordEnd = (lines: string[], row: number, col: number) => {
  let r = row;
  let c = col;
  if (r < 0) return { row: 0, col: 0 };
  if (r >= lines.length) r = lines.length - 1;
  // step back one column
  if (c > 0) c--; else { r--; if (r < 0) return { row: 0, col: 0 }; c = (lines[r] || '').length - 1; if (c < 0) c = 0; }
  while (r >= 0) {
    const line = lines[r] || '';
    let p = Math.min(c, Math.max(0, line.length - 1));
    // skip separators
    while (p >= 0 && !isWordChar(line[p])) p--;
    if (p >= 0) {
      // find start of this word
      let start = p;
      while (start > 0 && isWordChar(line[start - 1])) start--;
      // end is p (the last word char found)
      return { row: r, col: p };
    }
    r--; if (r < 0) break; c = (lines[r] || '').length - 1;
  }
  return { row: 0, col: 0 };
};

export const computeSelectionText = (
  content: string,
  start: { row: number; col: number },
  end: { row: number; col: number }
) => {
  const lines = content.split('\n');
  const [sRow, sCol] = (start.row < end.row || (start.row === end.row && start.col <= end.col))
    ? [start.row, start.col] : [end.row, end.col];
  const [eRow, eCol] = (start.row < end.row || (start.row === end.row && start.col <= end.col))
    ? [end.row, end.col] : [start.row, start.col];

  if (sRow === eRow) {
    return (lines[sRow] || '').slice(Math.max(0, sCol), Math.max(0, eCol));
  }

  const parts: string[] = [];
  parts.push((lines[sRow] || '').slice(Math.max(0, sCol)));
  for (let r = sRow + 1; r < eRow; r++) {
    parts.push(lines[r] || '');
  }
  parts.push((lines[eRow] || '').slice(0, Math.max(0, eCol)));
  return parts.join('\n');
};
