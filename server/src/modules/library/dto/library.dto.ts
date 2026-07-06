import { z } from "zod";

export const libraryUpsertSchema = z.object({
  animeId: z.number().int().positive(),
  list: z.enum(["watching", "completed", "planned"]),
});

export type LibraryUpsertDto = z.infer<typeof libraryUpsertSchema>;
