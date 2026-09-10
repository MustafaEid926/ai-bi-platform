import { parse } from 'csv-parse/sync';

export interface CsvValidationResult {
  valid: boolean;
  rowCount: number;
  columnCount: number;
  columns: string[];
  error?: string;
}

export function validateCsv(buffer: Buffer): CsvValidationResult {
  try {
    const content = buffer.toString('utf-8');

    if (!content.trim()) {
      return {
        valid: false,
        rowCount: 0,
        columnCount: 0,
        columns: [],
        error: 'CSV file is empty',
      };
    }

    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    if (rows.length === 0) {
      return {
        valid: false,
        rowCount: 0,
        columnCount: 0,
        columns: [],
        error: 'CSV file contains no data rows',
      };
    }

    const columns = Object.keys(rows[0]);

    if (columns.length === 0) {
      return {
        valid: false,
        rowCount: rows.length,
        columnCount: 0,
        columns: [],
        error: 'CSV file contains no columns',
      };
    }

    return {
      valid: true,
      rowCount: rows.length,
      columnCount: columns.length,
      columns,
    };
  } catch (error) {
    return {
      valid: false,
      rowCount: 0,
      columnCount: 0,
      columns: [],
      error:
        error instanceof Error
          ? error.message
          : 'Invalid CSV file',
    };
  }
}