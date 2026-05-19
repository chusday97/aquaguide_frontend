import { z } from 'zod';

export const assistantAskInputSchema = z.object({
  userId: z.string().min(1).default('local-user'),
  conversationId: z.string().optional(),
  question: z.string().min(1),
  aquariumId: z.string().optional(),
  context: z.object({
    aquariumSummary: z.string().optional(),
    selectedSpeciesIds: z.array(z.string()).default([]),
  }).optional(),
});

export const assistantAskOutputSchema = z.object({
  answer: z.string(),
  mentionedSpeciesIds: z.array(z.string()),
  suggestedActions: z.array(z.object({
    type: z.enum(['add_to_wishlist', 'open_species', 'open_aquarium', 'none']),
    label: z.string(),
    speciesId: z.string().optional(),
  })),
});

export type AssistantAskInput = z.infer<typeof assistantAskInputSchema>;
export type AssistantAskOutput = z.infer<typeof assistantAskOutputSchema>;

