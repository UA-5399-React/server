import { Transform, TransformFnParams } from 'class-transformer';

export function Trim(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  );
}
