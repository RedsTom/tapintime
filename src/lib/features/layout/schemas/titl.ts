import { z } from 'zod';

export const FingerEnum = z.enum([
	'L_PINKY', 'L_RING', 'L_MIDDLE', 'L_INDEX', 'L_THUMB',
	'R_THUMB', 'R_INDEX', 'R_MIDDLE', 'R_RING', 'R_PINKY'
]);

export const ModifierTypeEnum = z.enum(['shift', 'altgr', 'layer', 'fn', 'custom']);
export const ModifierActionEnum = z.enum(['hold', 'toggle', 'one_shot']);

export const KeySchema = z.object({
	keyCode: z.string(),
	char: z.string().length(1),
	finger: FingerEnum,
	x: z.number(),
	y: z.number(),
	isModifier: z.boolean().optional(),
	modifierType: ModifierTypeEnum.optional(),
	targetLayer: z.string().optional(),
	modifierAction: ModifierActionEnum.optional()
});

export const ThumbKeySchema = z.object({
	keyCode: z.string(),
	finger: z.enum(['L_THUMB', 'R_THUMB']),
	x: z.number(),
	y: z.number(),
	isModifier: z.boolean().optional(),
	modifierType: ModifierTypeEnum.optional(),
	layer: z.string().optional(),
	targetLayer: z.string().optional(),
	action: ModifierActionEnum.optional()
});

export const LayerSchema = z.object({
	name: z.string(),
	keys: z.array(KeySchema)
});

export const LayoutSchema = z.object({
	name: z.string(),
	description: z.string(),
	layers: z.array(LayerSchema),
	thumbKeys: z.array(ThumbKeySchema)
});

export type Layout = z.infer<typeof LayoutSchema>;
export type Layer = z.infer<typeof LayerSchema>;
export type Key = z.infer<typeof KeySchema>;
export type ThumbKey = z.infer<typeof ThumbKeySchema>;
export type Finger = z.infer<typeof FingerEnum>;
export type ModifierType = z.infer<typeof ModifierTypeEnum>;
export type ModifierAction = z.infer<typeof ModifierActionEnum>;
