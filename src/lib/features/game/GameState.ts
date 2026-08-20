import type { Manifest } from '../beatmap/schemas/titm';
import type { PooledNote } from './objectPool';
import { NotePool } from './objectPool';
import { TIMING_MODES, type LeniencyMode } from '$lib/tokens';

const SCORE = {
	perfect: 300,
	great: 100,
	good: 50
} as const;

export interface HitResult {
	rating: 'perfect' | 'great' | 'good';
	deltaMs: number;
	laneIndex: number;
}

/**
 * Gestionnaire d'état de partie (Score, Combo, Précision, Notes traitées).
 */
export class GameState {
	public manifest: Manifest;
	public score: number = 0;
	public rawScore: number = 0;
	public maxPossibleRawScore: number = 0;
	public combo: number = 0;
	public maxCombo: number = 0;
	public perfect: number = 0;
	public great: number = 0;
	public good: number = 0;
	public miss: number = 0;

	public processedIndices: Set<number> = new Set();
	public nextNoteIndex: number = 0;
	public totalNotes: number = 0;
	public totalLanes: number = 1;

	public onMissCallback?: (note: PooledNote, comboBefore: number) => void;
	
	public timingWindows: typeof TIMING_MODES[LeniencyMode];

	constructor(manifest: Manifest, unlockedKeys: string[] = ['f', 'j'], leniencyMode: LeniencyMode = 'normal', noteSpeed: number = 400) {
		this.timingWindows = TIMING_MODES[leniencyMode];
		const availableKeys = unlockedKeys.length > 0 ? unlockedKeys : ['f', 'j'];

		// Adapter et sécuriser toutes les notes pour correspondre aux touches débloquées
		const adaptedHitObjects = (manifest.hitObjects || []).map((obj, i) => {
			const rawChar = obj.char || 'f';
			const charLower = rawChar.toLowerCase();
			if (availableKeys.map((k) => k.toLowerCase()).includes(charLower)) {
				return { ...obj, char: rawChar };
			}
			const adaptedChar = availableKeys[i % availableKeys.length].toLowerCase();
			return { ...obj, char: adaptedChar };
		});

		adaptedHitObjects.sort((a, b) => a.time - b.time);

		// Calculer l'attribution des lignes/lanes pour éviter le chevauchement visuel des notes proches
		const laneThresholdMs = Math.max(150, Math.min(300, (80 / noteSpeed) * 1000));
		const activeLanes: number[] = [];
		let maxLane = 0;

		for (const obj of adaptedHitObjects) {
			let assignedLane = 0;
			while (assignedLane < activeLanes.length) {
				if (obj.time - activeLanes[assignedLane] >= laneThresholdMs) {
					break;
				}
				assignedLane++;
			}
			activeLanes[assignedLane] = obj.time;
			(obj as any).laneIndex = assignedLane;
			if (assignedLane > maxLane) {
				maxLane = assignedLane;
			}
		}

		this.totalLanes = maxLane + 1;
		this.manifest = { ...manifest, hitObjects: adaptedHitObjects };
		this.totalNotes = this.manifest.hitObjects.length;
		this.nextNoteIndex = 0;

		// Compute max possible raw score (100% SS)
		let maxRaw = 0;
		for (let i = 1; i <= this.totalNotes; i++) {
			maxRaw += SCORE.perfect * Math.min(i, 10);
		}
		this.maxPossibleRawScore = maxRaw;
	}

	/**
	 * Calcule la précision globale actuelle en pourcentage.
	 */
	public getAccuracy(): number {
		const totalHits = this.perfect + this.great + this.good + this.miss;
		if (totalHits === 0) return 100;
		const points = this.perfect * 100 + this.great * 70 + this.good * 40;
		return points / totalHits;
	}

	/**
	 * Tente de valider une note lorsqu'une touche est pressée.
	 */
	public hitNote(char: string, currentTimeMs: number, pool: NotePool): HitResult | null {
		const activeNotes = pool.getActive();
		let closest: PooledNote | null = null;
		let minDelta = Infinity;
		let rawDelta = 0;

		for (const note of activeNotes) {
			if (!note.active || note.missed) continue;

			if (note.char.toLowerCase() === char.toLowerCase()) {
				const delta = Math.abs(currentTimeMs - note.time);
				if (delta <= this.timingWindows.goodWindow && delta < minDelta) {
					minDelta = delta;
					rawDelta = currentTimeMs - note.time;
					closest = note;
				}
			}
		}

		if (!closest) return null;

		let rating: 'perfect' | 'great' | 'good' = 'good';
		let points: number = SCORE.good;

		if (minDelta <= this.timingWindows.perfectWindow) {
			rating = 'perfect';
			points = SCORE.perfect;
			this.perfect++;
		} else if (minDelta <= this.timingWindows.greatWindow) {
			rating = 'great';
			points = SCORE.great;
			this.great++;
		} else {
			this.good++;
		}

		this.combo++;
		if (this.combo > this.maxCombo) this.maxCombo = this.combo;

		this.rawScore += points * Math.min(this.combo, 10);
		if (this.maxPossibleRawScore > 0) {
			this.score = Math.floor(1_000_000 * (this.rawScore / this.maxPossibleRawScore));
		}
		
		const laneIndex = closest.laneIndex ?? 0;
		pool.release(closest);
		return { rating, deltaMs: rawDelta, laneIndex };
	}

	/**
	 * Enregistre un raté (Miss) et réinitialise le combo sans faire disparaître immédiatement la note.
	 */
	public registerMiss(note: PooledNote) {
		if (note.missed) return;
		const comboBefore = this.combo;
		note.missed = true;
		this.miss++;
		this.combo = 0;
		this.onMissCallback?.(note, comboBefore);
	}
}
