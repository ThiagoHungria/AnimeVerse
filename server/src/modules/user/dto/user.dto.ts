import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  avatar: z.string().url().nullable().optional(),
  preferredGenres: z.array(z.string()).optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
