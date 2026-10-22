/** Minimal RFC 4180-style CSV parsing and column profiling for Data Studio. */

export type Row = Record<string, string | number | null>;
export type ColumnType = 'number' | 'date' | 'text';

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  missing: number;
  unique: number;
  // numeric columns only
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  sum?: number;
}

export interface Dataset {
  name: string;
  columns: string[];
  rows: Row[];
  profiles: ColumnProfile[];
}

function splitCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) out.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) out.push(row);
  return out;
}

const DATE_RE = /^\d{4}-\d{2}(-\d{2})?([T ][\d:.]+Z?)?$/;

export function parseCsv(text: string, name: string, maxRows = 20000): Dataset {
  const grid = splitCsv(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text); // strip BOM
  if (grid.length < 2) throw new Error('The file needs a header row and at least one data row.');
  const columns = grid[0].map((h, i) => h.trim() || `column_${i + 1}`);
  const body = grid.slice(1, maxRows + 1);

  const types: ColumnType[] = columns.map((_, ci) => {
    const vals = body.map((r) => (r[ci] ?? '').trim()).filter((v) => v !== '');
    if (vals.length === 0) return 'text';
    if (vals.every((v) => v !== '' && !Number.isNaN(Number(v.replace(/[$,%]/g, ''))))) return 'number';
    if (vals.every((v) => DATE_RE.test(v))) return 'date';
    return 'text';
  });

  const rows: Row[] = body.map((r) => {
    const obj: Row = {};
    columns.forEach((col, ci) => {
      const raw = (r[ci] ?? '').trim();
      if (raw === '') obj[col] = null;
      else obj[col] = types[ci] === 'number' ? Number(raw.replace(/[$,%]/g, '')) : raw;
    });
    return obj;
  });

  return { name, columns, rows, profiles: columns.map((c, i) => profile(c, types[i], rows)) };
}

function profile(name: string, type: ColumnType, rows: Row[]): ColumnProfile {
  const values = rows.map((r) => r[name]);
  const present = values.filter((v) => v !== null);
  const p: ColumnProfile = {
    name,
    type,
    missing: values.length - present.length,
    unique: new Set(present).size,
  };
  if (type === 'number') {
    const nums = (present as number[]).slice().sort((a, b) => a - b);
    const total = nums.reduce((s, v) => s + v, 0);
    const mean = total / nums.length;
    const mid = Math.floor(nums.length / 2);
    p.min = nums[0];
    p.max = nums[nums.length - 1];
    p.sum = total;
    p.mean = mean;
    p.median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
    p.std = Math.sqrt(nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length);
  }
  return p;
}

export type Aggregation = 'sum' | 'avg' | 'count';

/** Group rows by `x`, aggregating each measure. Result is ordered by x for date/number, by first measure for text. */
export function aggregate(ds: Dataset, x: string, measures: string[], agg: Aggregation) {
  const groups = new Map<string, { n: number; sums: number[] }>();
  for (const row of ds.rows) {
    const key = row[x] === null ? '(blank)' : String(row[x]);
    let g = groups.get(key);
    if (!g) {
      g = { n: 0, sums: measures.map(() => 0) };
      groups.set(key, g);
    }
    g.n++;
    measures.forEach((m, i) => {
      const v = row[m];
      if (typeof v === 'number') g!.sums[i] += v;
    });
  }
  const out = Array.from(groups, ([key, g]) => {
    const rec: Record<string, string | number> = { [x]: key };
    measures.forEach((m, i) => {
      rec[m] = agg === 'count' ? g.n : agg === 'avg' ? g.sums[i] / g.n : g.sums[i];
    });
    return rec;
  });
  const xType = ds.profiles.find((p) => p.name === x)?.type;
  if (xType === 'text' && measures[0]) {
    out.sort((a, b) => Number(b[measures[0]]) - Number(a[measures[0]]));
  } else {
    out.sort((a, b) => String(a[x]).localeCompare(String(b[x]), undefined, { numeric: true }));
  }
  return out;
}

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}
