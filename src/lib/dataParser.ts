import type { DataRecord, DynamicFilterOption } from '@/types';

const DEFAULT_TEXT = '未知';

function normalizeText(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text || ['null', 'undefined', 'nan', '--', 'N/A'].includes(text.toLowerCase())) {
    return '';
  }
  return text;
}

function parseNumber(value: unknown, fallback = 0): number {
  const cleaned = String(value ?? '').replace(/,/g, '').trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => normalizeText(h) || DEFAULT_TEXT);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

function parseSpreadsheetXml(text: string): Record<string, unknown>[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');
  const rows = Array.from(xml.getElementsByTagName('Row'));
  if (rows.length < 2) return [];

  const headerCells = Array.from(rows[0].getElementsByTagName('Cell'));
  const headers = headerCells.map((cell) => normalizeText(cell.textContent) || DEFAULT_TEXT);

  return rows.slice(1).map((rowNode) => {
    const cells = Array.from(rowNode.getElementsByTagName('Cell'));
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index]?.textContent ?? '';
    });
    return row;
  });
}

export async function parseFileToRows(file: File): Promise<Record<string, unknown>[]> {
  const text = await file.text();
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return parseCsv(text);
  }

  if (lower.endsWith('.xls') || lower.endsWith('.xml')) {
    return parseSpreadsheetXml(text);
  }

  // xlsx 无法在当前离线依赖环境下直接解析，尝试按 CSV 回退。
  return parseCsv(text);
}

export function cleanRows(rows: Record<string, unknown>[]): DataRecord[] {
  const cleaned: DataRecord[] = [];

  rows.forEach((row) => {
    const record: DataRecord = {
      学部: normalizeText(row.学部) || DEFAULT_TEXT,
      学院: normalizeText(row.学院) || DEFAULT_TEXT,
      学历: normalizeText(row.学历) || DEFAULT_TEXT,
      毕业年度: parseNumber(row.毕业年度, 0),
      去向类别: normalizeText(row.去向类别) || DEFAULT_TEXT,
      单位名称: normalizeText(row.单位名称) || DEFAULT_TEXT,
      人数: parseNumber(row.人数, 1),
    };

    let hasUsefulValue = false;

    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = normalizeText(key);
      if (!normalizedKey) return;

      if (normalizedKey === '人数') {
        record[normalizedKey] = parseNumber(value, 1);
      } else if (normalizedKey === '毕业年度') {
        record[normalizedKey] = parseNumber(value, 0);
      } else {
        const text = normalizeText(value);
        if (text) {
          record[normalizedKey] = text;
          hasUsefulValue = true;
        }
      }
    });

    if (!hasUsefulValue) return;

    if (!record.人数 || record.人数 < 0) {
      record.人数 = 1;
    }

    cleaned.push(record);
  });

  return cleaned;
}

export function buildDynamicFilterOptions(data: DataRecord[]): DynamicFilterOption[] {
  if (!data.length) return [];

  const fixedKeys = new Set(['学部', '学院', '学历', '毕业年度', '去向类别', '单位名称', '人数']);
  const allKeys = new Set<string>();

  data.forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (!fixedKeys.has(key)) {
        allKeys.add(key);
      }
    });
  });

  return Array.from(allKeys).map((key) => {
    const values = new Set<string>();
    data.forEach((record) => {
      const value = normalizeText(record[key]);
      if (value) values.add(value);
    });

    return {
      key,
      values: ['全部', ...Array.from(values).sort((a, b) => a.localeCompare(b, 'zh-CN')).slice(0, 300)],
    };
  });
}
