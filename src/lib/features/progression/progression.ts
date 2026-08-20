import localforage from 'localforage';

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

export interface KeyTier {
	tier: number;
	keys: string[];
	xpRequired: number;
	name: string;
}

/**
 * 15 Paliers de déblocage progressif des touches.
 */
export const KEY_TIERS: KeyTier[] = [
	{ tier: 1, keys: ['f', 'j'], xpRequired: 0, name: 'F, J' },
	{ tier: 2, keys: ['d', 'k'], xpRequired: 100, name: 'D, K' },
	{ tier: 3, keys: ['s', 'l'], xpRequired: 220, name: 'S, L' },
	{ tier: 4, keys: ['q', 'm'], xpRequired: 360, name: 'Q, M' },
	{ tier: 5, keys: ['g', 'h'], xpRequired: 520, name: 'G, H' },
	{ tier: 6, keys: ['r', 'u'], xpRequired: 700, name: 'R, U' },
	{ tier: 7, keys: ['e', 'i'], xpRequired: 900, name: 'E, I' },
	{ tier: 8, keys: ['z', 'o'], xpRequired: 1120, name: 'Z, O' },
	{ tier: 9, keys: ['a', 'p'], xpRequired: 1360, name: 'A, P' },
	{ tier: 10, keys: ['t', 'y'], xpRequired: 1620, name: 'T, Y' },
	{ tier: 11, keys: ['v', ','], xpRequired: 1900, name: 'V, ,' },
	{ tier: 12, keys: ['c', ';'], xpRequired: 2200, name: 'C, ;' },
	{ tier: 13, keys: ['x', ':'], xpRequired: 2520, name: 'X, :' },
	{ tier: 14, keys: ['w', '!'], xpRequired: 2860, name: 'W, !' },
	{ tier: 15, keys: ['b', 'n'], xpRequired: 3220, name: 'B, N' }
];

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
 * Calcule la liste des touches débloquées en fonction des paliers d'XP accumulés.
 */
export function getUnlockedKeys(xp: number): string[] {
	const unlocked: string[] = [];
	for (const tier of KEY_TIERS) {
		if (xp >= tier.xpRequired) {
			unlocked.push(...tier.keys);
		}
	}
	return unlocked.length > 0 ? unlocked : ['f', 'j'];
}

/**
 * Renvoie les détails du palier actuel et du prochain palier à débloquer.
 */
export function getTierInfo(xp: number): {
	currentTier: KeyTier;
	nextTier: KeyTier | null;
	progressToNextRatio: number;
	xpNeededForNext: number;
} {
	let currentTier = KEY_TIERS[0];
	let nextTier: KeyTier | null = KEY_TIERS[1];

	for (let i = 0; i < KEY_TIERS.length; i++) {
		if (xp >= KEY_TIERS[i].xpRequired) {
			currentTier = KEY_TIERS[i];
			nextTier = KEY_TIERS[i + 1] ?? null;
		}
	}

	if (!nextTier) {
		return { currentTier, nextTier: null, progressToNextRatio: 1.0, xpNeededForNext: 0 };
	}

	const xpStart = currentTier.xpRequired;
	const xpEnd = nextTier.xpRequired;
	const currentProgress = xp - xpStart;
	const totalNeeded = xpEnd - xpStart;
	const progressToNextRatio = Math.min(1.0, Math.max(0, currentProgress / totalNeeded));
	const xpNeededForNext = xpEnd - xp;

	return { currentTier, nextTier, progressToNextRatio, xpNeededForNext };
}

/**
 * Charge les données de progression depuis le stockage local (avec cache en mémoire).
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
 * Sauvegarde temporisée pour accumuler les modifications en mémoire avant d'écrire dans LocalForage.
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
