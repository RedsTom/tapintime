export const COLORS = {
	bg: '#150029',
	surface: '#2a0052',
	primary: '#ffc145',
	secondary: '#0B0014',
	accent: '#f9564f',
	text: '#f7edf0',
	textDim: '#E6C7D0',
	perfect: '#ffc145',
	great: '#80D39B',
	good: '#5995ED',
	miss: '#f9564f'
} as const;

export const SPACING = {
	borderWidth: 4,
	shadowOffset: 6,
	borderRadius: 8
} as const;

export const SHADOW = {
	neo: `${SPACING.shadowOffset}px ${SPACING.shadowOffset}px 0px 0px ${COLORS.secondary}`,
	neoHover: `4px 4px 0px 0px ${COLORS.secondary}`,
	neoActive: `0px 0px 0px 0px ${COLORS.secondary}`,
	yellowPink: `${SPACING.shadowOffset}px ${SPACING.shadowOffset}px 0px 0px ${COLORS.accent}`,
	yellowPinkHover: `4px 4px 0px 0px ${COLORS.accent}`,
	pinkYellow: `${SPACING.shadowOffset}px ${SPACING.shadowOffset}px 0px 0px ${COLORS.primary}`,
	pinkYellowHover: `4px 4px 0px 0px ${COLORS.primary}`,
	blueYellow: `${SPACING.shadowOffset}px ${SPACING.shadowOffset}px 0px 0px ${COLORS.primary}`,
	blueYellowHover: `4px 4px 0px 0px ${COLORS.primary}`
} as const;

export const TIMING_MODES = {
	strict: {
		perfectWindow: 50,
		greatWindow: 100,
		goodWindow: 150
	},
	normal: {
		perfectWindow: 80,
		greatWindow: 160,
		goodWindow: 240
	},
	facile: {
		perfectWindow: 120,
		greatWindow: 240,
		goodWindow: 360
	}
} as const;

export type LeniencyMode = keyof typeof TIMING_MODES;

export const GAME = {
	noteSpeed: 400,
	approachRate: 2,
	objectPoolSize: 50
} as const;

/**
 * Couleurs pré-calculées en valeurs numériques pour PixiJS (évite parseInt à chaque frame).
 */
function hexToNum(hex: string): number {
	return parseInt(hex.replace('#', ''), 16);
}

export const COLORS_HEX = {
	bg: hexToNum(COLORS.bg),
	surface: hexToNum(COLORS.surface),
	primary: hexToNum(COLORS.primary),
	secondary: hexToNum(COLORS.secondary),
	accent: hexToNum(COLORS.accent),
	text: hexToNum(COLORS.text),
	textDim: hexToNum(COLORS.textDim),
	perfect: hexToNum(COLORS.perfect),
	great: hexToNum(COLORS.great),
	good: hexToNum(COLORS.good),
	miss: hexToNum(COLORS.miss)
} as const;

// CSS custom properties for Tailwind
export const cssVariables = `
	:root {
		--color-bg: ${COLORS.bg};
		--color-surface: ${COLORS.surface};
		--color-primary: ${COLORS.primary};
		--color-secondary: ${COLORS.secondary};
		--color-accent: ${COLORS.accent};
		--color-text: ${COLORS.text};
		--color-text-dim: ${COLORS.textDim};
		--border-width: ${SPACING.borderWidth}px;
		--shadow-neo: ${SHADOW.neo};
		--shadow-neo-hover: ${SHADOW.neoHover};
		--shadow-neo-active: ${SHADOW.neoActive};
		--shadow-yellow-pink: ${SHADOW.yellowPink};
		--shadow-yellow-pink-hover: ${SHADOW.yellowPinkHover};
		--shadow-pink-yellow: ${SHADOW.pinkYellow};
		--shadow-pink-yellow-hover: ${SHADOW.pinkYellowHover};
		--shadow-blue-yellow: ${SHADOW.blueYellow};
		--shadow-blue-yellow-hover: ${SHADOW.blueYellowHover};
		--border-radius: ${SPACING.borderRadius}px;
	}
`;
