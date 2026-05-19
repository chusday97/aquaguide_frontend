import { z } from 'zod';

export const aiMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export const aiAskInputSchema = z.object({
  messages: z.array(aiMessageSchema).min(1),
  system: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.4),
  maxTokens: z.number().int().min(100).max(4000).default(1200),
  thinking: z.enum(['enabled', 'disabled']).default('disabled'),
});

export const aiAskOutputSchema = z.object({
  content: z.string(),
});

export type AiAskInput = z.infer<typeof aiAskInputSchema>;
export type AiAskOutput = z.infer<typeof aiAskOutputSchema>;

