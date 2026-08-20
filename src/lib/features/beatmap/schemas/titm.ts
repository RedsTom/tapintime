import { z } from 'zod';

export const HitObjectTypeEnum = z.enum(['normal', 'slide', 'spin']);

export const HitObjectSchema = z.object({
	time: z.number().positive(),
	char: z.string().length(1),
	type: HitObjectTypeEnum.default('normal')
});

export const ManifestSchema = z.object({
	title: z.string(),
	artist: z.string(),
	bpm: z.number().positive(),
	audioOffset: z.number().default(0),
	difficulty: z.enum(['easy', 'normal', 'hard', 'expert']),
	hitObjects: z.array(HitObjectSchema)
});

export type Manifest = z.infer<typeof ManifestSchema>;
export type HitObject = z.infer<typeof HitObjectSchema>;
export type HitObjectType = z.infer<typeof HitObjectTypeEnum>;
