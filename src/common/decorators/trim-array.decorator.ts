import { Transform, type TransformFnParams } from 'class-transformer';

export function NormalizeStringArray(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams): unknown => {
    if (!Array.isArray(value)) return value;

    const normalized = value
      .filter((v) => typeof v === 'string')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);

    return Array.from(new Set(normalized));
  });
}
