import { parse } from 'csv-parse/sync';

export type CsvRow = Record<string, unknown>;

export class CsvParser {
  parse(buffer: Buffer): CsvRow[] {
    const content = buffer.toString('utf-8');

    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    return rows.map((row) => {
      const normalized: CsvRow = {};

      for (const [key, value] of Object.entries(row)) {
        normalized[key] = this.normalizeValue(value);
      }

      return normalized;
    });
  }

  private normalizeValue(value: string): unknown {
    const trimmed = value.trim();

    if (trimmed === '') {
      return null;
    }

    if (/^-?\d+$/.test(trimmed)) {
      return Number.parseInt(trimmed, 10);
    }

    if (/^-?\d+\.\d+$/.test(trimmed)) {
      return Number.parseFloat(trimmed);
    }

    return trimmed;
  }
}