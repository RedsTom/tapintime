import type { Finger, Layout } from './schemas/titl';

/**
 * 10 couleurs distinctes Neo-Brutalism attribuées à chaque doigt.
 * Main gauche : tons chauds / néon (Rose -> Rose fuchsia -> Ambre -> Jaune Cyber -> Turquoise)
 * Main droite : tons froids / néon (Teal -> Bleu électrique -> Bleu royal -> Violet -> Magenta vif)
 */
export const FINGER_COLORS: Record<Finger, string> = {
	L_PINKY: '#FF2A6D',  // Neon Pink
	L_RING: '#FF70A6',   // Soft Rose Pink
	L_MIDDLE: '#FF9F1C', // Vivid Amber
	L_INDEX: '#FFD500',  // Cyber Yellow
	L_THUMB: '#2EC4B6',  // Turquoise
	R_THUMB: '#00F5D4',  // Neon Cyan / Mint
	R_INDEX: '#00BBF9',  // Electric Sky Blue
	R_MIDDLE: '#4361EE', // Royal Blue / Indigo
	R_RING: '#7209B7',   // Deep Violet / Purple
	R_PINKY: '#F72585'   // Hot Magenta
};

/**
 * Libellés francophones des 10 doigts.
 */
export const FINGER_LABELS: Record<Finger, string> = {
	L_PINKY: 'Auriculaire G.',
	L_RING: 'Annulaire G.',
	L_MIDDLE: 'Majeur G.',
	L_INDEX: 'Index G.',
	L_THUMB: 'Pouce G.',
	R_THUMB: 'Pouce D.',
	R_INDEX: 'Index D.',
	R_MIDDLE: 'Majeur D.',
	R_RING: 'Annulaire D.',
	R_PINKY: 'Auriculaire D.'
};

/**
 * Renvoie la couleur hexadécimale associée à un doigt.
 *
 * @param finger Doigt sélectionné
 * @returns Code couleur hexadécimal (défaut : Jaune Cyber #FFD500)
 */
export function getFingerColor(finger?: Finger | string): string {
	if (!finger) return '#FFD500';
	return FINGER_COLORS[finger as Finger] ?? '#FFD500';
}

/**
 * Calcule la luminosité perçue d'une couleur hexadécimale pour déterminer le contraste du texte.
 *
 * @param hexColor Code couleur au format hexadécimal (#RRGGBB)
 * @returns true si la couleur est sombre (texte clair requis), false sinon (texte sombre requis)
 */
export function isColorDark(hexColor: string): boolean {
	const hex = hexColor.replace('#', '');
	if (hex.length !== 6) return false;
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);
	const perceivedBrightness = (r * 299 + g * 587 + b * 114) / 1000;
	return perceivedBrightness < 140;
}

/**
 * Trouve le doigt assigné à un caractère de touche dans un layout donné.
 *
 * @param char Caractère de la touche
 * @param layout Configuration du layout clavier
 */
export function getFingerForKey(char: string, layout?: Layout | null): Finger | undefined {
	if (!char || !layout?.layers) return undefined;
	const searchChar = char.toLowerCase();

	// Recherche dans les couches principales
	for (const layer of layout.layers) {
		for (const key of layer.keys) {
			if (key.char.toLowerCase() === searchChar) {
				return key.finger;
			}
		}
	}

	// Recherche dans les touches pouces
	if (layout.thumbKeys) {
		for (const thumbKey of layout.thumbKeys) {
			if (searchChar === ' ' || searchChar === 'space') {
				return thumbKey.finger;
			}
		}
	}

	return undefined;
}

/**
 * Renvoie la couleur de doigt associée à une touche de note en fonction du layout actif.
 *
 * @param char Caractère de la touche
 * @param layout Layout clavier actif
 */
export function getFingerColorForKey(char: string, layout?: Layout | null): string {
	const finger = getFingerForKey(char, layout);
	return getFingerColor(finger);
}
