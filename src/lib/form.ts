import { zodResolver } from '@hookform/resolvers/zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = any

/**
 * Thin wrapper around zodResolver.
 *
 * With Zod 4 + @hookform/resolvers v5 the resolver overloads require
 * concrete FieldValues constraints that conflict with generic ZodType.
 * Type safety is provided by the explicit generic on useForm<FormData>(…)
 * at each call site — the resolver itself is effectively `any`-typed but
 * the form data type is still fully checked everywhere it is used.
 *
 * For coerced fields (e.g. z.coerce.number()), pass separate generics
 * to useForm:
 *   useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
 *     resolver: typedZodResolver(schema),
 *   })
 */
export function typedZodResolver(schema: AnySchema): AnySchema {
  return zodResolver(schema)
}
