import localforage from 'localforage';
import type { Layout } from '$lib/schemas/titl';

export interface FingerStats {
	totalHits: number;
	perfect: number;
	great: number;
	good: number;
	miss: number;
}

export type RankGrade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface MapScore {
	mapId: string;
	score: number;
	accuracy: number;
	grade: RankGrade;
	maxCombo: number;
	date: number;
}

export interface ProgressionData {
	xp: number;
	accuracy: number;
	fingerStats: Record<string, FingerStats>;
	keyStats: Record<string, FingerStats>;
	unlockedKeys: string[];
	unlockedLayers: string[];
	mapsCompleted: string[];
	mapScores: Record<string, MapScore>;
	totalLatencySamples?: number;
	accumulatedLatencyMs?: number;
	averageLatencyMs?: number;
}

export interface KeyTierDefinition {
	tier: number;
	keyCodes: string[];
	xpRequired: number;
}

export interface KeyTier {
	tier: number;
	keys: string[];
	xpRequired: number;
	name: string;
	keyCodes: string[];
}

/**
 * Définition physique des 15 paliers basée sur les répertoires de touches (KeyCodes).
 */
export const KEY_TIER_DEFINITIONS: KeyTierDefinition[] = [
	{ tier: 1, keyCodes: ['KeyF', 'KeyJ'], xpRequired: 0 },
	{ tier: 2, keyCodes: ['KeyD', 'KeyK'], xpRequired: 100 },
	{ tier: 3, keyCodes: ['KeyS', 'KeyL'], xpRequired: 220 },
	{ tier: 4, keyCodes: ['KeyA', 'Semicolon'], xpRequired: 360 },
	{ tier: 5, keyCodes: ['KeyG', 'KeyH'], xpRequired: 520 },
	{ tier: 6, keyCodes: ['KeyR', 'KeyU'], xpRequired: 700 },
	{ tier: 7, keyCodes: ['KeyE', 'KeyI'], xpRequired: 900 },
	{ tier: 8, keyCodes: ['KeyW', 'KeyO'], xpRequired: 1120 },
	{ tier: 9, keyCodes: ['KeyQ', 'KeyP'], xpRequired: 1360 },
	{ tier: 10, keyCodes: ['KeyT', 'KeyY'], xpRequired: 1620 },
	{ tier: 11, keyCodes: ['KeyV', 'KeyM'], xpRequired: 1900 },
	{ tier: 12, keyCodes: ['KeyC', 'Comma'], xpRequired: 2200 },
	{ tier: 13, keyCodes: ['KeyX', 'Period'], xpRequired: 2520 },
	{ tier: 14, keyCodes: ['KeyZ', 'Slash'], xpRequired: 2860 },
	{ tier: 15, keyCodes: ['KeyB', 'KeyN'], xpRequired: 3220 }
];

/**
 * Résout le caractère associé à un KeyCode pour une disposition donnée.
 */
export function getCharForKeyCode(keyCode: string, layout?: Layout | null): string {
	if (!layout || !layout.layers || layout.layers.length === 0) {
		const azertyDefaults: Record<string, string> = {
			KeyF: 'f', KeyJ: 'j', KeyD: 'd', KeyK: 'k', KeyS: 's', KeyL: 'l',
			KeyQ: 'q', KeyM: 'm', KeyG: 'g', KeyH: 'h', KeyR: 'r', KeyU: 'u',
			KeyE: 'e', KeyI: 'i', KeyZ: 'z', KeyO: 'o', KeyA: 'a', KeyP: 'p',
			KeyT: 't', KeyY: 'y', KeyV: 'v', Comma: ',', KeyC: 'c', Semicolon: ';',
			KeyX: 'x', Colon: ':', KeyW: 'w', Exclamation: '!', KeyB: 'b', KeyN: 'n'
		};
		return azertyDefaults[keyCode] || keyCode.replace('Key', '').toLowerCase();
	}

	for (const layer of layout.layers) {
		const key = layer.keys.find((k) => k.keyCode.toLowerCase() === keyCode.toLowerCase());
		if (key && key.char) return key.char.toLowerCase();
	}
	for (const thumbKey of layout.thumbKeys || []) {
		if (thumbKey.keyCode.toLowerCase() === keyCode.toLowerCase()) return 'space';
	}
	return keyCode.replace('Key', '').toLowerCase();
}

/**
 * Génère les paliers de touches traduits selon le layout actif.
 */
export function getKeyTiersForLayout(layout?: Layout | null): KeyTier[] {
	return KEY_TIER_DEFINITIONS.map((def) => {
		const keys = def.keyCodes.map((code) => getCharForKeyCode(code, layout)).filter(Boolean);
		const name = keys.map((k) => k.toUpperCase()).join(', ');
		return {
			tier: def.tier,
			keys,
			xpRequired: def.xpRequired,
			name,
			keyCodes: def.keyCodes
		};
	});
}

export const KEY_TIERS: KeyTier[] = getKeyTiersForLayout(null);

const DEFAULT: ProgressionData = {
	xp: 0,
	accuracy: 0,
	fingerStats: {},
	keyStats: {},
	unlockedKeys: ['f', 'j'],
	unlockedLayers: ['Base'],
	mapsCompleted: [],
	mapScores: {},
	totalLatencySamples: 0,
	accumulatedLatencyMs: 0,
	averageLatencyMs: 0
};

const KEY = 'progression';

let cachedProgression: ProgressionData | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Calcule le rang (SS, S, A, B, C, D) selon la précision et le nombre de ratés.
 */
export function getGradeRank(accuracy: number, missCount: number): RankGrade {
	if (accuracy >= 98 && missCount === 0) return 'SS';
	if (accuracy >= 95) return 'S';
	if (accuracy >= 85) return 'A';
	if (accuracy >= 75) return 'B';
	if (accuracy >= 60) return 'C';
	return 'D';
}

/**
 * Renvoie les informations de niveau du joueur calculées à partir de son XP.
 */
export function getPlayerLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } {
	const level = Math.floor(xp / 100) + 1;
	const currentXp = xp % 100;
	const nextLevelXp = 100;
	const progress = currentXp / nextLevelXp;
	return { level, currentXp, nextLevelXp, progress };
}

/**
 * Calcule la liste des touches débloquées en fonction des paliers d'XP.
 */
export function getUnlockedKeys(xp: number, minTier: number = 1): string[] {
	const tiers = getKeyTiersForLayout(null);
	const unlocked: string[] = [];
	for (const tier of tiers) {
		if (xp >= tier.xpRequired || tier.tier <= minTier) {
			for (const key of tier.keys) {
				if (!unlocked.includes(key.toLowerCase())) {
					unlocked.push(key.toLowerCase());
				}
			}
		}
	}
	return unlocked.length > 0 ? unlocked : [getCharForKeyCode('KeyF', null), getCharForKeyCode('KeyJ', null)];
}

/**
 * Renvoie les détails du palier actuel et du prochain palier indépendants du layout.
 */
export function getTierInfo(xp: number): {
	currentTier: KeyTier;
	nextTier: KeyTier | null;
	progressToNextRatio: number;
	xpNeededForNext: number;
	allTiers: KeyTier[];
} {
	const allTiers = getKeyTiersForLayout(null);
	let currentTier = allTiers[0];
	let nextTier: KeyTier | null = allTiers[1];

	for (let i = 0; i < allTiers.length; i++) {
		if (xp >= allTiers[i].xpRequired) {
			currentTier = allTiers[i];
			nextTier = allTiers[i + 1] ?? null;
		}
	}

	if (!nextTier) {
		return { currentTier, nextTier: null, progressToNextRatio: 1.0, xpNeededForNext: 0, allTiers };
	}

	const xpStart = currentTier.xpRequired;
	const xpEnd = nextTier.xpRequired;
	const currentProgress = xp - xpStart;
	const totalNeeded = xpEnd - xpStart;
	const progressToNextRatio = Math.min(1.0, Math.max(0, currentProgress / totalNeeded));
	const xpNeededForNext = xpEnd - xp;

	return { currentTier, nextTier, progressToNextRatio, xpNeededForNext, allTiers };
}

/**
 * Charge les données de progression depuis le stockage local.
 */
export async function loadProgression(): Promise<ProgressionData> {
	if (!cachedProgression) {
		const data = await localforage.getItem<ProgressionData>(KEY);
		cachedProgression = {
			...DEFAULT,
			...data,
			mapScores: data?.mapScores ?? {},
			fingerStats: data?.fingerStats ?? {},
			keyStats: data?.keyStats ?? {}
		};
		cachedProgression.unlockedKeys = getUnlockedKeys(cachedProgression.xp);
	}
	return cachedProgression;
}

/**
 * Enregistre les données de progression dans le stockage local.
 */
export async function saveProgression(data?: ProgressionData): Promise<void> {
	if (data) {
		cachedProgression = data;
	}
	if (!cachedProgression) return;

	try {
		const plainData = JSON.parse(JSON.stringify(cachedProgression));
		await localforage.setItem(KEY, plainData);
	} catch (e) {
		console.error('Failed to save progression:', e);
	}
}

/**
 * Sauvegarde temporisée (debounced) pour accumuler les modifications en mémoire.
 */
function queueSaveProgression(): void {
	if (saveTimeout) clearTimeout(saveTimeout);
	saveTimeout = setTimeout(() => {
		saveProgression();
	}, 300);
}

/**
 * Enregistre un échantillon de latence de frappe.
 */
export async function recordHitLatency(deltaMs: number): Promise<void> {
	const prog = await loadProgression();
	const samples = (prog.totalLatencySamples ?? 0) + 1;
	const accumulated = (prog.accumulatedLatencyMs ?? 0) + deltaMs;
	const avg = accumulated / samples;

	prog.totalLatencySamples = samples;
	prog.accumulatedLatencyMs = accumulated;
	prog.averageLatencyMs = Math.round(avg);

	queueSaveProgression();
}

/**
 * Met à jour les statistiques de frappe d'un doigt donné.
 */
export async function updateFingerStats(
	finger: string,
	rating: 'perfect' | 'great' | 'good' | 'miss'
): Promise<void> {
	const prog = await loadProgression();
	if (!prog.fingerStats[finger]) {
		prog.fingerStats[finger] = { totalHits: 0, perfect: 0, great: 0, good: 0, miss: 0 };
	}
	const stats = prog.fingerStats[finger];
	stats.totalHits++;
	stats[rating]++;
	queueSaveProgression();
}

/**
 * Met à jour les statistiques de frappe pour une touche spécifique.
 */
export async function updateKeyStats(
	key: string,
	rating: 'perfect' | 'great' | 'good' | 'miss'
): Promise<void> {
	const prog = await loadProgression();
	const keyLower = key.toLowerCase();
	if (!prog.keyStats[keyLower]) {
		prog.keyStats[keyLower] = { totalHits: 0, perfect: 0, great: 0, good: 0, miss: 0 };
	}
	const stats = prog.keyStats[keyLower];
	stats.totalHits++;
	stats[rating]++;
	queueSaveProgression();
}

/**
 * Ajoute des points XP au joueur.
 */
export async function addXP(amount: number): Promise<void> {
	const prog = await loadProgression();
	prog.xp += amount;
	prog.unlockedKeys = getUnlockedKeys(prog.xp);
	await saveProgression(prog);
}

/**
 * Enregistre la complétion d'une map et calcule les récompenses.
 */
export async function completeMap(
	mapName: string,
	score: number,
	accuracy: number,
	missCount: number,
	maxCombo: number
): Promise<{ xpEarned: number; grade: RankGrade; newlyUnlockedKeys: string[] }> {
	const prog = await loadProgression();
	const oldUnlocked = getUnlockedKeys(prog.xp);

	const grade = getGradeRank(accuracy, missCount);
	const xpEarned = grade === 'SS' ? 50 : grade === 'S' ? 35 : grade === 'A' ? 25 : grade === 'B' ? 15 : 10;

	prog.xp += xpEarned;
	const newUnlocked = getUnlockedKeys(prog.xp);
	prog.unlockedKeys = newUnlocked;

	const newlyUnlockedKeys = newUnlocked.filter((k) => !oldUnlocked.includes(k));

	if (!prog.mapsCompleted.includes(mapName)) {
		prog.mapsCompleted.push(mapName);
	}

	const existingScore = prog.mapScores[mapName];
	if (!existingScore || score > existingScore.score) {
		prog.mapScores[mapName] = {
			mapId: mapName,
			score,
			accuracy,
			grade,
			maxCombo,
			date: Date.now()
		};
	}

	await saveProgression(prog);
	return { xpEarned, grade, newlyUnlockedKeys };
}
