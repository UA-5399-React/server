import { Transform, type TransformFnParams } from 'class-transformer';

export function TrimArray(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams): unknown => {
    if (!Array.isArray(value)) return value;

    return value.map((v: unknown) => (typeof v === 'string' ? v.trim() : v));
  });
}
