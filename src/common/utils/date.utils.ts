import { BadRequestException } from '@nestjs/common';

export function parseDate(value?: unknown) {
  const date =
    value instanceof Date ? value : typeof value === 'string' ? new Date(value) : undefined;

  if (date && Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date');
  }

  return date;
}

export function parseDateRange(dateFrom?: unknown, dateTo?: unknown) {
  const from = parseDate(dateFrom);
  const to = parseDate(dateTo);

  if (from && to && from > to) {
    throw new BadRequestException('Invalid date range: updatedFrom must be <= updatedTo');
  }

  return { from, to };
}

export function buildDateFilter<TField extends string>(
  dateFrom: Date | undefined,
  dateTo: Date | undefined,
  field: TField | undefined,
  defaultField: TField,
): Record<string, unknown> {
  const { from, to } = parseDateRange(dateFrom, dateTo);

  if (!from && !to) {
    return {};
  }

  const targetField = field ?? defaultField;

  return {
    [targetField]: {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    },
  };
}
