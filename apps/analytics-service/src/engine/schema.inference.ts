export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'unknown';

export interface DatasetField {
  name: string;
  type: FieldType;
}

export interface DatasetSchema {
  fields: DatasetField[];
}

export type AnalyticsRow = Record<string, unknown>;

export class SchemaInference {
  infer(rows: AnalyticsRow[]): DatasetSchema {
    if (rows.length === 0) {
      return {
        fields: [],
      };
    }

    const fieldNames = new Set<string>();

    for (const row of rows) {
      for (const field of Object.keys(row)) {
        fieldNames.add(field);
      }
    }

    const fields: DatasetField[] = [];

    for (const fieldName of fieldNames) {
      const values = rows
        .map((row) => row[fieldName])
        .filter(
          (value) =>
            value !== null &&
            value !== undefined,
        );

      fields.push({
        name: fieldName,
        type: this.inferFieldType(values),
      });
    }

    return {
      fields,
    };
  }

  private inferFieldType(
    values: unknown[],
  ): FieldType {
    if (values.length === 0) {
      return 'unknown';
    }

    const types = new Set(
      values.map((value) => this.getType(value)),
    );

    if (types.size === 1) {
      return [...types][0];
    }

    return 'unknown';
  }

  private getType(value: unknown): FieldType {
    if (typeof value === 'number') {
      return 'number';
    }

    if (typeof value === 'boolean') {
      return 'boolean';
    }

    if (typeof value === 'string') {
      return 'string';
    }

    if (value === null) {
      return 'null';
    }

    return 'unknown';
  }
}
