import { z } from 'zod';

export const moduleErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export const moduleMetaSchema = z.object({
  module: z.string().min(1),
  action: z.string().min(1),
  timestamp: z.string().datetime(),
});

export const createModuleOutputSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  ok: z.literal(true),
  data: dataSchema,
  meta: moduleMetaSchema,
}).or(z.object({
  ok: z.literal(false),
  error: moduleErrorSchema,
  meta: moduleMetaSchema,
}));

export type ModuleError = z.infer<typeof moduleErrorSchema>;
export type ModuleMeta = z.infer<typeof moduleMetaSchema>;

