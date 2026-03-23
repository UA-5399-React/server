import { SortOrder } from '@/common/enums/sort-order.enum';

export function buildSort<TField extends string>(
  sortField: TField | undefined,
  order: SortOrder | undefined,
  defaultField: TField,
): Record<string, 1 | -1> {
  const field = sortField ?? defaultField;
  const direction = order === SortOrder.asc ? 1 : -1;

  return { [field]: direction };
}
