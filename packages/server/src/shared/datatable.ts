/**
 * datatable.ts — shared helpers for the DataTables server-side protocol.
 *
 * Request:  draw, start, length, search[value], order[0][column], order[0][dir]
 *           + module filters; every filter accepts several values as CSV
 *           (`status=A,B`) or repeated/array form (`status[]=A&status[]=B`).
 * Response: { draw, recordsTotal, recordsFiltered, data, statusStats, ...extra }
 */

export type SortDir = 'asc' | 'desc';

export interface DTParams {
  draw: number;
  start: number;
  length: number;
  search: string;
  /** Index into the module's SORTABLE_COLUMNS; -1 when absent/invalid. */
  orderCol: number;
  orderDir: SortDir;
}

export interface DTStat { status: string; count: number }

export interface DTResponse<Row> {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: Row[];
  statusStats: DTStat[];
}

export const DT_MAX_LENGTH = 500;

type Query = Record<string, unknown>;

function toInt(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
}

export function parseDTParams(
  query: Query,
  opts: { defaultLength?: number; defaultDir?: SortDir } = {},
): DTParams {
  const defaultLength = opts.defaultLength ?? 100;
  const rawLength = toInt(query.length);
  const rawStart = toInt(query.start);
  const rawCol = toInt(query['order[0][column]']);
  const rawDir = query['order[0][dir]'];
  const search = query['search[value]'];

  return {
    draw: toInt(query.draw) ?? 1,
    start: Math.max(rawStart ?? 0, 0),
    length: Math.min(Math.max(rawLength || defaultLength, 1), DT_MAX_LENGTH),
    search: typeof search === 'string' ? search.trim() : '',
    orderCol: rawCol !== undefined && rawCol >= 0 ? rawCol : -1,
    orderDir: rawDir === 'asc' || rawDir === 'desc' ? rawDir : (opts.defaultDir ?? 'asc'),
  };
}

/** Column name for an order index, or undefined when the index is unknown. */
export function sortColumn<C extends string>(columns: readonly C[], orderCol: number): C | undefined {
  return orderCol >= 0 && orderCol < columns.length ? columns[orderCol] : undefined;
}

/** "A,B" | ["A","B"] | "A" | undefined → string[] | undefined (empty → undefined). */
export function parseMulti(value: unknown): string[] | undefined {
  const raw = Array.isArray(value) ? value : [value];
  const out: string[] = [];
  for (const item of raw) {
    if (Array.isArray(item)) {
      out.push(...(parseMulti(item) ?? []));
    } else if (typeof item === 'string' || typeof item === 'number') {
      for (const part of String(item).split(',')) {
        const v = part.trim();
        if (v && !out.includes(v)) out.push(v);
      }
    }
  }
  return out.length > 0 ? out : undefined;
}

/** Read a multi-value filter from a query object, accepting `key` and `key[]`. */
export function multiParam(query: Query, key: string): string[] | undefined {
  return parseMulti(query[key] ?? query[`${key}[]`]);
}

/** Multi-value integer filter; non-integer entries are dropped. */
export function multiIntParam(query: Query, key: string): number[] | undefined {
  const ints = (multiParam(query, key) ?? [])
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));
  return ints.length > 0 ? ints : undefined;
}

/** Multi-value boolean filter; selecting both true and false means no filter. */
export function multiBoolParam(query: Query, key: string): boolean[] | undefined {
  const values = new Set<boolean>();
  for (const v of multiParam(query, key) ?? []) {
    if (v === 'true') values.add(true);
    else if (v === 'false') values.add(false);
  }
  return values.size === 1 ? [...values] : undefined;
}

export function buildDTResponse<Row, Extra extends object = object>(args: {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: Row[];
  statusStats: DTStat[];
  extra?: Extra;
}): DTResponse<Row> & Extra {
  const { extra, ...base } = args;
  return { ...base, ...(extra ?? ({} as Extra)) };
}
