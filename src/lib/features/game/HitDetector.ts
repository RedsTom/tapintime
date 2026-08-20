import { TIMING } from '$lib/tokens';

export type HitRating = 'perfect' | 'great' | 'good' | 'miss';

/**
 * Calculateur de précision et de jugement de frappe pour TapInTime.
 */
export class HitDetector {
	/**
	 * Détermine la note de précision en fonction du décalage temporel en millisecondes.
	 *
	 * @param deltaMs Différence absolue entre le moment de la frappe et le timestamp de la note
	 * @returns Rating ou null si en dehors des fenêtres de jugement
	 */
	static evaluateHitDelta(deltaMs: number): 'perfect' | 'great' | 'good' | null {
		if (deltaMs <= TIMING.perfectWindow) return 'perfect';
		if (deltaMs <= TIMING.greatWindow) return 'great';
		if (deltaMs <= TIMING.goodWindow) return 'good';
		return null;
	}

	/**
	 * Calcule la précision globale pondérée (en pourcentage).
	 */
	static calculateAccuracy(perfect: number, great: number, good: number, miss: number): number {
		const total = perfect + great + good + miss;
		if (total === 0) return 100;
		const weighted = perfect * 100 + great * 80 + good * 50;
		return weighted / total;
	}
}
