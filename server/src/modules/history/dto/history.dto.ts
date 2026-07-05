import { z } from "zod";

export const historySchema = z.object({
  animeId: z.number().int().positive(),
  episodeId: z.string().min(1),
  episodeNumber: z.number().int().positive(),
  episodeTitle: z.string().min(1),
  progress: z.number().int().min(0).default(0),
  duration: z.number().int().min(0).default(0),
});

export type HistoryDto = z.infer<typeof historySchema>;
