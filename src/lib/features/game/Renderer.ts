import { Application, Container, Graphics, Sprite, Texture, Text } from 'pixi.js';
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

const ratingTextureCache: Map<string, Texture> = new Map();

/**
 * Pré-rend les textures des textes de feedback de précision (PERFECT, GREAT, GOOD, MISS!)
 * pendant la phase de chargement de la carte. Évite toute allocation/rasterization pendant le jeu.
 */
export function preRenderRatingTextures(app: Application): void {
	const ratings: { key: string; text: string; color: number }[] = [
		{ key: 'perfect', text: 'PERFECT', color: COLORS_HEX.perfect },
		{ key: 'great', text: 'GREAT', color: COLORS_HEX.great },
		{ key: 'good', text: 'GOOD', color: COLORS_HEX.good },
		{ key: 'miss', text: 'MISS!', color: COLORS_HEX.miss }
	];

	for (const r of ratings) {
		if (ratingTextureCache.has(r.key)) continue;

		const textObj = new Text({
			text: r.text,
			style: {
				fontFamily: 'system-ui, sans-serif',
				fontSize: 42,
				fontWeight: '900',
				fill: r.color,
				stroke: { width: 5, color: COLORS_HEX.secondary }
			}
		});
		const texture = app.renderer.generateTexture(textObj);
		ratingTextureCache.set(r.key, texture);
		textObj.destroy();
	}
}

/**
 * Coordonnateur de rendu Canvas 2D / WebGL via PixiJS.
 * Gère la piste, la ligne d'impact, les zones de timing translucides, le défilement fluide des notes et les effets de frappe.
 *
 * Design : Sleek Neo-Brutalism Precision Gauge
 * - Allouer et charger TOUTES les textures au chargement de la map
 * - Rendu réactif natif Canvas du feedback de hit (0 modification DOM Svelte pendant le jeu)
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

	// Feedback visuel de rating (PERFECT, GREAT, GOOD, MISS!) rendu nativement dans PixiJS
	private ratingSprite!: Sprite;
	private ratingLife: number = 0;

	// Spark pooling avec swap-and-pop pour éliminer les réallocations WebGL et les pauses GC
	private sparkPool: Graphics[] = [];
	private activeSparks: { el: Graphics; life: number }[] = [];

	// Animation du caret (indicateur de perfect / ligne laser)
	private caretPulseLife: number = 0;

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

		// Pré-rendre les textures de rating au chargement
		preRenderRatingTextures(this.app);

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
		const topY = yCenter - trackHeight / 2;

		// 1. Piste de jeu Neo-Brutalism (Fond sombre + bordure brillante)
		const trackLane = new Graphics();
		trackLane
			.roundRect(
				margin,
				topY,
				this.app.screen.width - margin * 2,
				trackHeight,
				trackRadius
			)
			.fill({ color: COLORS_HEX.secondary, alpha: 0.92 })
			.stroke({ width: 4, color: COLORS_HEX.primary, alpha: 1.0 });
		this.app.stage.addChild(trackLane);

		// 2. Masque de rognage de la piste
		const trackMask = new Graphics()
			.roundRect(
				margin + 2,
				topY + 2,
				this.app.screen.width - margin * 2 - 4,
				trackHeight - 4,
				trackRadius - 2
			)
			.fill({ color: 0xffffff });
		this.app.stage.addChild(trackMask);

		// 3. --- ZONES DE TIMING SUR LE FOND DE LA PARTITION ---
		const timingContainer = new Container();
		timingContainer.mask = trackMask;

		const windows = timingWindows ?? { perfectWindow: 80, greatWindow: 160, goodWindow: 240 };

		const dxGood = (windows.goodWindow / 1000) * this.noteSpeed;
		const dxGreat = (windows.greatWindow / 1000) * this.noteSpeed;
		const dxPerfect = (windows.perfectWindow / 1000) * this.noteSpeed;

		// Bande Good
		const goodZone = new Graphics()
			.rect(hitLineX - dxGood, topY, dxGood * 2, trackHeight)
			.fill({ color: COLORS_HEX.good, alpha: 0.08 });
		timingContainer.addChild(goodZone);

		// Bande Great
		const greatZone = new Graphics()
			.rect(hitLineX - dxGreat, topY, dxGreat * 2, trackHeight)
			.fill({ color: COLORS_HEX.great, alpha: 0.12 });
		timingContainer.addChild(greatZone);

		// Bande Perfect
		const perfectZone = new Graphics()
			.rect(hitLineX - dxPerfect, topY, dxPerfect * 2, trackHeight)
			.fill({ color: COLORS_HEX.perfect, alpha: 0.18 });
		timingContainer.addChild(perfectZone);

		// Lignes guide verticales épurées
		const guideLinesGfx = new Graphics();
		guideLinesGfx
			.rect(hitLineX - dxGood - 1, topY, 2, trackHeight)
			.fill({ color: COLORS_HEX.good, alpha: 0.35 })
			.rect(hitLineX + dxGood - 1, topY, 2, trackHeight)
			.fill({ color: COLORS_HEX.good, alpha: 0.35 })
			.rect(hitLineX - dxGreat - 1, topY, 2, trackHeight)
			.fill({ color: COLORS_HEX.great, alpha: 0.45 })
			.rect(hitLineX + dxGreat - 1, topY, 2, trackHeight)
			.fill({ color: COLORS_HEX.great, alpha: 0.45 })
			.rect(hitLineX - dxPerfect - 1, topY, 2, trackHeight)
			.fill({ color: COLORS_HEX.perfect, alpha: 0.65 })
			.rect(hitLineX + dxPerfect - 1, topY, 2, trackHeight)
			.fill({ color: COLORS_HEX.perfect, alpha: 0.65 });

		timingContainer.addChild(guideLinesGfx);
		this.app.stage.addChild(timingContainer);

		// 4. Zone de frappe et ligne laser (Caret au-dessus de la jauge)
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

		// 5. Conteneur de notes avec masque
		const noteContainer = new Container();
		noteContainer.mask = trackMask;
		this.app.stage.addChild(noteContainer);

		// 6. Sprite de rating (PERFECT, GREAT, GOOD, MISS!) nativement sur le Canvas PixiJS
		this.ratingSprite = new Sprite();
		this.ratingSprite.anchor.set(0.5);
		this.ratingSprite.position.set(hitLineX, topY - 32);
		this.ratingSprite.visible = false;
		this.app.stage.addChild(this.ratingSprite);

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
	 * Affiche le texte de feedback de précision (PERFECT, GREAT, GOOD, MISS!) nativement dans PixiJS Canvas.
	 */
	public showRating(rating: 'perfect' | 'great' | 'good' | 'miss') {
		const texture = ratingTextureCache.get(rating);
		if (texture) {
			this.ratingSprite.texture = texture;
			this.ratingSprite.visible = true;
			this.ratingLife = 1.0;
		}
	}

	/**
	 * Déclenche une animation visuelle sur le caret lors d'un hit.
	 */
	public triggerCaretPulse() {
		this.caretPulseLife = 1.0;
	}

	/**
	 * Met à jour l'animation de clignotement et d'impulsion du caret à chaque frame.
	 */
	private updateCaretAnimation() {
		if (this.caretPulseLife > 0) {
			this.caretPulseLife -= 0.10;
			const life = Math.max(0, this.caretPulseLife);

			const scale = 1.0 + life * 0.14;
			this.hitLine.scale.set(scale, scale);

			this.laserLineGfx.alpha = 1.0 + life * 0.4;

			for (const zone of this.targetZoneGfxList) {
				zone.alpha = 1.0 + life * 0.3;
			}
		} else if (this.hitLine.scale.x !== 1.0) {
			this.hitLine.scale.set(1.0, 1.0);
			this.laserLineGfx.alpha = 1.0;
			for (const zone of this.targetZoneGfxList) {
				zone.alpha = 1.0;
			}
		}
	}

	/**
	 * Met à jour l'animation du sprite de rating (scale pop + fade out).
	 */
	private updateRatingAnimation() {
		if (this.ratingLife > 0) {
			this.ratingLife -= 0.08;
			const life = Math.max(0, this.ratingLife);
			const scale = 0.85 + life * 0.35;
			this.ratingSprite.scale.set(scale, scale);
			this.ratingSprite.alpha = Math.min(1.0, life * 1.8);
		} else if (this.ratingSprite.visible) {
			this.ratingSprite.visible = false;
		}
	}

	/**
	 * Déclenche une étincelle/effet visuel lors d'une frappe réussie en utilisant le pool.
	 */
	public spawnHitSpark(x: number, y: number, color: number) {
		this.triggerCaretPulse();

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
		this.updateRatingAnimation();
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

		// Calcul des incomingKeys
		this.nextIncomingKeys.clear();

		const activeNotes = this.pool.getActive();
		for (let i = activeNotes.length - 1; i >= 0; i--) {
			const note = activeNotes[i];
			if (!note || !note.active) continue;

			const timeRemainingSec = (note.time - currentTimeMs) / 1000;
			const targetX = hitLineX + timeRemainingSec * this.noteSpeed;

			const laneY = this.getLaneY(note.laneIndex ?? 0, state.totalLanes, yCenter);
			note.container.position.set(targetX, laneY);

			if (targetX > hitLineX && targetX < hitLineX + 300) {
				this.nextIncomingKeys.add(note.char.toLowerCase());
			}

			if (!note.missed && currentTimeMs >= 0 && currentTimeMs - note.time > state.timingWindows.goodWindow) {
				state.registerMiss(note);
				note.container.alpha = 0.35;
			}

			if (targetX <= 30) {
				this.pool.release(note);
			}
		}

		const temp = this.incomingKeys;
		this.incomingKeys = this.nextIncomingKeys;
		this.nextIncomingKeys = temp;
	}
}
