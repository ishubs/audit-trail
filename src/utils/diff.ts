type DiffConfig = {
  exclude: readonly string[];
  redact: readonly string[];
};

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toJsonValue(v: unknown): JsonValue {
  if (v === null) return null;
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : String(v);
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(toJsonValue);
  if (isPlainObject(v)) {
    const out: Record<string, JsonValue> = {};
    for (const [k, vv] of Object.entries(v)) out[k] = toJsonValue(vv);
    return out;
  }
  // Fallback for things like Buffers, symbols, etc.
  return String(v);
}

function filterObject(obj: Record<string, unknown>, cfg: DiffConfig) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (cfg.exclude.includes(k)) continue;
    if (cfg.redact.includes(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = toJsonValue(v);
    }
  }
  return out;
}

export function buildAuditDiff(params: {
  before: unknown;
  after: unknown;
  cfg: DiffConfig;
}): { before: JsonValue | unknown; after: JsonValue | unknown; changedFields: string[] } {
  const { before, after, cfg } = params;

  const beforeObj = isPlainObject(before) ? (filterObject(before, cfg) as JsonValue) : toJsonValue(before);
  const afterObj = isPlainObject(after) ? (filterObject(after, cfg) as JsonValue) : toJsonValue(after);

  const changedFields: string[] = [];
  if (isPlainObject(beforeObj) && isPlainObject(afterObj)) {
    const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
    for (const k of keys) {
      const b = beforeObj[k];
      const a = afterObj[k];
      if (JSON.stringify(b) !== JSON.stringify(a)) changedFields.push(k);
    }
    changedFields.sort();
  }

  return { before: beforeObj, after: afterObj, changedFields };
}

