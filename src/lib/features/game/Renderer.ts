import { Application, Container, Graphics } from 'pixi.js';
import { COLORS_HEX, GAME } from '$lib/tokens';
import { NotePool } from './objectPool';
import type { GameState } from './GameState';
import type { Layout } from '$lib/schemas/titl';
import { getFingerColor, getFingerForKey } from '$lib/features/layout/fingerColors';

export interface TimingWindows {
	perfectWindow: number;
	greatWindow: number;
	goodWindow: number;
}

/**
 * Coordonnateur de rendu Canvas 2D / WebGL via PixiJS.
 * Gère la piste, la ligne d'impact, les zones de timing translucides, le défilement fluide des notes et les effets de frappe.
 *
 * Optimisations :
 * - Couleurs pré-calculées en constantes numériques (zéro parseInt à chaque frame)
 * - Spark pooling avec swap-and-pop O(1) pour éliminer les stutters GC
 * - incomingKeys calculé directement dans la boucle de mise à jour des notes (zéro itération supplémentaire)
 * - travelTimeMs pré-calculé (ne change pas pendant le jeu)
 * - Animation réactive du caret (indicateur de perfect) lors des frappes
 * - Zones de timing (Perfect, Great, Good) affichées en arrière-plan translucide sur la piste
 */
export class Renderer {
	private app: Application;
	private hitSparks: Container;
	public hitLine: Container;
	public laserLineGfx!: Graphics;
	public targetZoneGfxList: Graphics[] = [];
	public noteContainer: Container;
	public pool: NotePool;
	public noteSpeed: number;

	// Spark pooling avec swap-and-pop pour éliminer les réallocations WebGL et les pauses GC
	private sparkPool: Graphics[] = [];
	private activeSparks: { el: Graphics; life: number }[] = [];

	// Animation du caret (indicateur de perfect / ligne laser)
	private caretPulseLife: number = 0;
	private caretPulseColor: number = COLORS_HEX.primary;

	// Cache des couleurs par doigt pour un lookup O(1)
	private fingerColorCache: Map<string, string> = new Map();
	private cachedLayout: Layout | null = null;

	// Pré-calcul des constantes de défilement (ne changent jamais pendant le jeu)
	private cachedTravelDistance: number = 0;
	private cachedTravelTimeMs: number = 0;

	// Touches « entrantes » calculées pendant updateNotes() — exposées au moteur
	public incomingKeys: Set<string> = new Set();
	private nextIncomingKeys: Set<string> = new Set();

	constructor(
		app: Application,
		totalLanes: number = 1,
		noteSpeed: number = GAME.noteSpeed,
		timingWindows?: TimingWindows
	) {
		this.app = app;
		this.noteSpeed = noteSpeed;

		this.hitSparks = new Container();
		this.app.stage.addChild(this.hitSparks);

		const { hitLine, noteContainer } = this.initGameGraphics(totalLanes, timingWindows);
		this.hitLine = hitLine;
		this.noteContainer = noteContainer;

		this.pool = new NotePool(this.noteContainer, GAME.objectPoolSize);

		// Pré-calcul des constantes de défilement
		this.cachedTravelDistance = (this.app.screen.width + 80) - this.hitLineX;
		this.cachedTravelTimeMs = (this.cachedTravelDistance / this.noteSpeed) * 1000;

		// Pré-peupler le pool de sparks (15 suffisent pour les hits simultanés)
		for (let i = 0; i < 15; i++) {
			const spark = new Graphics()
				.roundRect(-38, -38, 76, 76, 12)
				.fill({ color: 0xFFFFFF }); // Blanc de base pour le tinting
			spark.visible = false;
			this.hitSparks.addChild(spark);
			this.sparkPool.push(spark);
		}
	}

	/**
	 * Position X de la ligne d'impact sur l'écran (40% de la largeur).
	 */
	public get hitLineX(): number {
		return this.app.screen.width * 0.4;
	}

	private initGameGraphics(
		totalLanes: number = 1,
		timingWindows?: TimingWindows
	): { hitLine: Container; noteContainer: Container } {
		const yCenter = this.app.screen.height * 0.38;
		const margin = 48;
		const laneSpacing = 50;
		const trackHeight = 110 + (totalLanes - 1) * laneSpacing;
		const trackRadius = 16;
		const hitLineX = this.hitLineX;

		// Piste de jeu Neo-Brutalism
		const trackLane = new Graphics();
		trackLane
			.roundRect(
				margin,
				yCenter - trackHeight / 2,
				this.app.screen.width - margin * 2,
				trackHeight,
				trackRadius
			)
			.fill({ color: COLORS_HEX.secondary, alpha: 0.9 })
			.stroke({ width: 4, color: COLORS_HEX.primary, alpha: 1.0 });
		this.app.stage.addChild(trackLane);

		// Masque de rognage pour la piste (conserve le contenu dans les limites arrondies)
		const trackMask = new Graphics()
			.roundRect(
				margin + 2,
				yCenter - trackHeight / 2 + 2,
				this.app.screen.width - margin * 2 - 4,
				trackHeight - 4,
				trackRadius - 2
			)
			.fill({ color: 0xffffff });
		this.app.stage.addChild(trackMask);

		// --- ZONES DE TIMING TRANSLUCIDES SUR LE FOND DE LA PARTITION ---
		const timingContainer = new Container();
		timingContainer.mask = trackMask;

		const windows = timingWindows ?? { perfectWindow: 80, greatWindow: 160, goodWindow: 240 };
		const topY = yCenter - trackHeight / 2;

		// 1. Zone Good (Extérieure - Bleu)
		const dxGood = (windows.goodWindow / 1000) * this.noteSpeed;
		const goodZone = new Graphics()
			.rect(hitLineX - dxGood, topY, dxGood * 2, trackHeight)
			.fill({ color: COLORS_HEX.good, alpha: 0.14 });
		timingContainer.addChild(goodZone);

		// 2. Zone Great (Intermédiaire - Vert)
		const dxGreat = (windows.greatWindow / 1000) * this.noteSpeed;
		const greatZone = new Graphics()
			.rect(hitLineX - dxGreat, topY, dxGreat * 2, trackHeight)
			.fill({ color: COLORS_HEX.great, alpha: 0.20 });
		timingContainer.addChild(greatZone);

		// 3. Zone Perfect (Centre / Caret - Jaune Or)
		const dxPerfect = (windows.perfectWindow / 1000) * this.noteSpeed;
		const perfectZone = new Graphics()
			.rect(hitLineX - dxPerfect, topY, dxPerfect * 2, trackHeight)
			.fill({ color: COLORS_HEX.perfect, alpha: 0.30 })
			.stroke({ width: 2, color: COLORS_HEX.perfect, alpha: 0.6 });
		timingContainer.addChild(perfectZone);

		// Graduations / Ticks visuels en haut et en bas des bordures de timing
		const ticksGfx = new Graphics();
		const tickHeight = 8;
		[
			{ dx: dxGood, color: COLORS_HEX.good },
			{ dx: dxGreat, color: COLORS_HEX.great },
			{ dx: dxPerfect, color: COLORS_HEX.perfect }
		].forEach(({ dx, color }) => {
			[-dx, dx].forEach((offsetX) => {
				const posX = hitLineX + offsetX;
				ticksGfx
					.rect(posX - 1, topY, 2, tickHeight)
					.fill({ color, alpha: 0.8 })
					.rect(posX - 1, topY + trackHeight - tickHeight, 2, tickHeight)
					.fill({ color, alpha: 0.8 });
			});
		});
		timingContainer.addChild(ticksGfx);
		this.app.stage.addChild(timingContainer);

		// Zone de frappe et ligne laser (Caret)
		const hitLine = new Container();
		this.targetZoneGfxList = [];
		
		for (let i = 0; i < totalLanes; i++) {
			const laneYOffset = (i - (totalLanes - 1) / 2) * laneSpacing;
			const targetZoneGfx = new Graphics()
				.roundRect(-38, -38 + laneYOffset, 76, 76, 12)
				.fill({ color: COLORS_HEX.primary, alpha: 0.25 })
				.stroke({ width: 4, color: COLORS_HEX.accent, alpha: 1.0 });
			hitLine.addChild(targetZoneGfx);
			this.targetZoneGfxList.push(targetZoneGfx);
		}

		this.laserLineGfx = new Graphics()
			.rect(-3, -trackHeight / 2, 6, trackHeight)
			.fill({ color: COLORS_HEX.primary, alpha: 1.0 });
		hitLine.addChild(this.laserLineGfx);
		
		hitLine.position.set(hitLineX, yCenter);
		this.app.stage.addChild(hitLine);

		// Conteneur de notes avec masque de rognage
		const noteContainer = new Container();
		noteContainer.mask = trackMask;
		this.app.stage.addChild(noteContainer);

		return { hitLine, noteContainer };
	}

	/**
	 * Calcule la position Y pour une ligne/lane spécifique en fonction du nombre total de lanes.
	 */
	public getLaneY(laneIndex: number, totalLanes: number, yCenter: number): number {
		if (totalLanes <= 1) return yCenter;
		const laneSpacing = 50;
		return yCenter + (laneIndex - (totalLanes - 1) / 2) * laneSpacing;
	}

	/**
	 * Résout la couleur de doigt d'une touche de manière O(1) grâce au cache.
	 */
	private getCachedFingerColor(char: string, layout?: Layout | null): string {
		if (!layout) return '#FFD500';
		if (this.cachedLayout !== layout) {
			this.cachedLayout = layout;
			this.fingerColorCache.clear();
			for (const layer of layout.layers) {
				for (const key of layer.keys) {
					const col = getFingerColor(key.finger);
					this.fingerColorCache.set(key.char.toLowerCase(), col);
				}
			}
			if (layout.thumbKeys) {
				for (const key of layout.thumbKeys) {
					const col = getFingerColor(key.finger);
					this.fingerColorCache.set(' ', col);
					this.fingerColorCache.set('space', col);
				}
			}
		}
		return this.fingerColorCache.get(char.toLowerCase()) ?? '#FFD500';
	}

	/**
	 * Déclenche une animation visuelle (impulsion + clignotement / flash) sur le caret lors d'un hit.
	 */
	public triggerCaretPulse(color: number = COLORS_HEX.perfect) {
		this.caretPulseLife = 1.0;
		this.caretPulseColor = color;
	}

	/**
	 * Met à jour l'animation de clignotement et d'impulsion du caret à chaque frame.
	 */
	private updateCaretAnimation() {
		if (this.caretPulseLife > 0) {
			this.caretPulseLife -= 0.09;
			const life = Math.max(0, this.caretPulseLife);

			// Animation d'impulsion d'échelle sur le caret (bounce dynamique)
			const scale = 1.0 + life * 0.16;
			this.hitLine.scale.set(scale, scale);

			// Flash lumineux et changement de couleur de la ligne laser
			this.laserLineGfx.tint = this.caretPulseColor;
			this.laserLineGfx.alpha = 0.7 + life * 0.3;

			for (const zone of this.targetZoneGfxList) {
				zone.tint = this.caretPulseColor;
			}
		} else if (this.hitLine.scale.x !== 1.0) {
			// Réinitialisation douce à l'état initial
			this.hitLine.scale.set(1.0, 1.0);
			this.laserLineGfx.tint = 0xFFFFFF;
			this.laserLineGfx.alpha = 1.0;
			for (const zone of this.targetZoneGfxList) {
				zone.tint = 0xFFFFFF;
			}
		}
	}

	/**
	 * Déclenche une étincelle/effet visuel lors d'une frappe réussie en utilisant le pool.
	 * Anime également le caret.
	 */
	public spawnHitSpark(x: number, y: number, color: number) {
		// Animer le caret (ligne d'impact / perfect indicator)
		this.triggerCaretPulse(color);

		let spark = this.sparkPool.pop();
		if (!spark) {
			spark = new Graphics()
				.roundRect(-38, -38, 76, 76, 12)
				.fill({ color: 0xFFFFFF });
			this.hitSparks.addChild(spark);
		}

		spark.position.set(x, y);
		spark.tint = color;
		spark.alpha = 1.0;
		spark.visible = true;

		this.activeSparks.push({ el: spark, life: 1.0 });
	}

	/**
	 * Met à jour le défilement et l'état des éléments à chaque frame (Centralisé pour la performance).
	 */
	public update(state: GameState, currentTimeMs: number, layout?: Layout | null) {
		this.updateNotes(state, currentTimeMs, layout);
		this.updateSparks();
		this.updateCaretAnimation();
	}

	/**
	 * Anime les sparks existants en un seul tick avec swap-and-pop O(1).
	 */
	private updateSparks() {
		for (let i = this.activeSparks.length - 1; i >= 0; i--) {
			const sparkObj = this.activeSparks[i];
			sparkObj.life -= 0.12;
			if (sparkObj.life <= 0) {
				sparkObj.el.visible = false;
				this.sparkPool.push(sparkObj.el);
				// Swap-and-pop O(1) au lieu de splice O(n)
				const lastIdx = this.activeSparks.length - 1;
				if (i !== lastIdx) {
					this.activeSparks[i] = this.activeSparks[lastIdx];
				}
				this.activeSparks.pop();
			} else {
				sparkObj.el.alpha = sparkObj.life;
			}
		}
	}

	/**
	 * Fait défiler les notes et gère leur apparition / disparition à chaque frame.
	 * Calcule aussi les `incomingKeys` dans la même boucle (évite une itération supplémentaire).
	 */
	private updateNotes(state: GameState, currentTimeMs: number, layout?: Layout | null) {
		const yCenter = this.app.screen.height * 0.38;
		const travelTimeMs = this.cachedTravelTimeMs;
		const hitLineX = this.hitLineX;

		// Spawning O(1) des notes à venir
		while (
			state.nextNoteIndex < state.manifest.hitObjects.length &&
			currentTimeMs >= state.manifest.hitObjects[state.nextNoteIndex].time - travelTimeMs
		) {
			const idx = state.nextNoteIndex;
			const hitObj = state.manifest.hitObjects[idx];
			const fingerColor = this.getCachedFingerColor(hitObj.char, layout);
			this.pool.acquire(hitObj.char, hitObj.time, fingerColor, (hitObj as any).laneIndex || 0);
			state.processedIndices.add(idx);
			state.nextNoteIndex++;
		}

		// Calcul des incomingKeys : réutiliser le Set existant pour éviter toute allocation
		this.nextIncomingKeys.clear();

		// Déplacement des notes actives + calcul incomingKeys dans la MÊME boucle
		const activeNotes = this.pool.getActive();
		for (let i = activeNotes.length - 1; i >= 0; i--) {
			const note = activeNotes[i];
			if (!note || !note.active) continue;

			const timeRemainingSec = (note.time - currentTimeMs) / 1000;
			const targetX = hitLineX + timeRemainingSec * this.noteSpeed;

			const laneY = this.getLaneY(note.laneIndex ?? 0, state.totalLanes, yCenter);
			note.container.position.set(targetX, laneY);

			// Calcul incomingKeys intégré — zéro itération supplémentaire
			if (targetX > hitLineX && targetX < hitLineX + 300) {
				this.nextIncomingKeys.add(note.char.toLowerCase());
			}

			// Détection des ratés (timing dépassé) sans faire disparaître la note immédiatement
			if (!note.missed && currentTimeMs >= 0 && currentTimeMs - note.time > state.timingWindows.goodWindow) {
				state.registerMiss(note);
				note.container.alpha = 0.35; // Assombrissement / transparence de la note ratée
			}

			// Libération du pool uniquement quand la note a glissé jusqu'à l'extrême gauche de la piste
			if (targetX <= 30) {
				this.pool.release(note);
			}
		}

		// Swap les Sets pour exposer les incomingKeys sans allocation
		const temp = this.incomingKeys;
		this.incomingKeys = this.nextIncomingKeys;
		this.nextIncomingKeys = temp;
	}
}
