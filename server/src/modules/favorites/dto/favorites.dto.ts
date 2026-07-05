import { z } from "zod";

export const favoriteSchema = z.object({
  animeId: z.number().int().positive(),
});

export type FavoriteDto = z.infer<typeof favoriteSchema>;
