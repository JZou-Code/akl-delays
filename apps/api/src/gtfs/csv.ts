import { parse } from 'csv-parse/sync';
import type { z } from 'zod';

export class GtfsError extends Error {
  override name = 'GtfsError';
}

export function parseRows<T>(text: string, fileName: string, rowSchema: z.ZodType<T>): T[] {
  let records: Record<string, string>[];
  try {
    records = parse<Record<string, string>>(text, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new GtfsError(`${fileName} is not valid CSV: ${reason}`);
  }
  return records.map((record, index) => {
    const result = rowSchema.safeParse(record);
    if (!result.success) {
      const problems = result.error.issues.map((issue) => issue.message).join('; ');
      throw new GtfsError(`${fileName} row ${index + 1}: ${problems}`);
    }
    return result.data;
  });
}
