import { z } from "zod";

export const TranslationSchema = z.object({
  /** Sentence in traditional characters, no Western punctuation */
  zh: z.string(),
  /** Word-by-word gloss */
  words: z.array(z.object({ zh: z.string(), it: z.string() })),
  confidence: z.enum(["alta", "media", "bassa"]),
  /** Empty string when there is nothing to add */
  note: z.string(),
});

export type Translation = z.infer<typeof TranslationSchema>;
