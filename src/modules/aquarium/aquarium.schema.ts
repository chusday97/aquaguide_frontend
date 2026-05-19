import { z } from 'zod';

export const aquariumFishSchema = z.object({
  id: z.string().min(1),
  fishId: z.string().min(1),
  quantity: z.number().int().positive(),
  entryDate: z.string().min(1),
  lastWaterChangeDate: z.string().min(1),
});

export const aquariumSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fishes: z.array(aquariumFishSchema).default([]),
  lastWaterChangeDate: z.string().optional(),
  waterChangeHistory: z.array(z.string()).optional(),
  lastWaterStoredDate: z.string().optional(),
  dimensions: z.object({
    length: z.string(),
    width: z.string(),
    height: z.string(),
  }).optional(),
  waterType: z.enum(['Freshwater', 'Saltwater']).optional(),
  targetTemperature: z.string().optional(),
  substrate: z.string().optional(),
  plants: z.array(z.string()).optional(),
  hardscape: z.array(z.string()).optional(),
  equipment: z.object({
    filter: z.enum(['无', '瀑布过滤', '桶滤', '上滤', '海绵过滤']).optional(),
    heater: z.boolean().optional(),
    oxygen: z.boolean().optional(),
    light: z.enum(['无', '普通灯', '水草灯', '海水灯']).optional(),
  }).optional(),
});

export const aquariumSaveInputSchema = z.object({
  userId: z.string().min(1).default('local-user'),
  aquarium: aquariumSchema,
});

export const aquariumReadInputSchema = z.object({
  userId: z.string().min(1).default('local-user'),
});

export const aquariumListOutputSchema = z.object({
  aquariums: z.array(aquariumSchema),
});

export const aquariumSaveOutputSchema = z.object({
  aquarium: aquariumSchema,
});

export type AquariumRecord = z.infer<typeof aquariumSchema>;
export type AquariumSaveInput = z.infer<typeof aquariumSaveInputSchema>;
export type AquariumReadInput = z.infer<typeof aquariumReadInputSchema>;
export type AquariumListOutput = z.infer<typeof aquariumListOutputSchema>;
export type AquariumSaveOutput = z.infer<typeof aquariumSaveOutputSchema>;

