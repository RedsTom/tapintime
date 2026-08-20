import { Application, Container, Graphics } from 'pixi.js';
import { COLORS, GAME } from '$lib/tokens';
import { NotePool } from './objectPool';
import type { GameState } from './GameState';
import type { Layout } from '$lib/schemas/titl';
import { getFingerColor, getFingerForKey } from '$lib/features/layout/fingerColors';

/**
 * Coordonnateur de rendu Canvas 2D / WebGL via PixiJS.
 * Gère la piste, la ligne d'impact, le défilement fluide des notes et les effets de frappe.
 */
export class Renderer {
	private app: Application;
	private hitSparks: Container;
	public hitLine: Container;
	public noteContainer: Container;
	public pool: NotePool;

	// Spark pooling to eliminate WebGL buffer reallocation and GC stutters
	private sparkPool: Graphics[] = [];
	private activeSparks: { el: Graphics; life: number }[] = [];

	// Layout colors caching for fast O(1) rendering lookups
	private fingerColorCache: Map<string, string> = new Map();
	private cachedLayout: Layout | null = null;

	constructor(app: Application) {
		this.app = app;

		this.hitSparks = new Container();
		this.app.stage.addChild(this.hitSparks);

		const { hitLine, noteContainer } = this.initGameGraphics();
		this.hitLine = hitLine;
		this.noteContainer = noteContainer;

		this.pool = new NotePool(this.noteContainer, GAME.objectPoolSize);

		// Pre-populate spark pool (15 sparks should be plenty for simultaneous hits)
		for (let i = 0; i < 15; i++) {
			const spark = new Graphics()
				.roundRect(-38, -38, 76, 76, 12)
				.fill({ color: 0xFFFFFF }); // Base white for easy tinting
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

	private initGameGraphics(): { hitLine: Container; noteContainer: Container } {
		const yCenter = this.app.screen.height * 0.38;
		const margin = 48;
		const trackHeight = 110;
		const trackRadius = 16;

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
			.fill({ color: parseInt(COLORS.secondary.replace('#', ''), 16), alpha: 0.9 })
			.stroke({ width: 4, color: parseInt(COLORS.primary.replace('#', ''), 16), alpha: 1.0 });
		this.app.stage.addChild(trackLane);

		// Zone de frappe et ligne laser
		const hitLine = new Container();
		const targetZoneGfx = new Graphics()
			.roundRect(-38, -38, 76, 76, 12)
			.fill({ color: parseInt(COLORS.primary.replace('#', ''), 16), alpha: 0.25 })
			.stroke({ width: 4, color: parseInt(COLORS.accent.replace('#', ''), 16), alpha: 1.0 });
		const laserLineGfx = new Graphics()
			.rect(-3, -60, 6, 120)
			.fill({ color: parseInt(COLORS.primary.replace('#', ''), 16), alpha: 1.0 });
		hitLine.addChild(targetZoneGfx);
		hitLine.addChild(laserLineGfx);
		hitLine.position.set(this.hitLineX, yCenter);
		this.app.stage.addChild(hitLine);

		// Conteneur de notes avec masque de rognage
		const noteContainer = new Container();
		const noteMask = new Graphics()
			.roundRect(
				margin,
				yCenter - trackHeight / 2,
				this.app.screen.width - margin * 2,
				trackHeight,
				trackRadius
			)
			.fill({ color: 0xffffff });
		this.app.stage.addChild(noteMask);
		noteContainer.mask = noteMask;
		this.app.stage.addChild(noteContainer);

		return { hitLine, noteContainer };
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
	 * Déclenche une étincelle/effet visuel lors d'une frappe réussie en utilisant le pool.
	 */
	public spawnHitSpark(x: number, y: number, color: number) {
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
	}

	/**
	 * Animate existing sparks in a single tick to avoid multi-ticker overhead and closures.
	 */
	private updateSparks() {
		for (let i = this.activeSparks.length - 1; i >= 0; i--) {
			const sparkObj = this.activeSparks[i];
			sparkObj.life -= 0.12;
			if (sparkObj.life <= 0) {
				sparkObj.el.visible = false;
				this.sparkPool.push(sparkObj.el);
				this.activeSparks.splice(i, 1);
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
		const travelDistance = (this.app.screen.width + 80) - this.hitLineX;
		const travelTimeMs = (travelDistance / GAME.noteSpeed) * 1000;

		// Spawning O(1) des notes à venir
		while (
			state.nextNoteIndex < state.manifest.hitObjects.length &&
			currentTimeMs >= state.manifest.hitObjects[state.nextNoteIndex].time - travelTimeMs
		) {
			const idx = state.nextNoteIndex;
			const hitObj = state.manifest.hitObjects[idx];
			const fingerColor = this.getCachedFingerColor(hitObj.char, layout);
			const note = this.pool.acquire(hitObj.char, hitObj.time, fingerColor);
			// Remarque: Pas besoin d'appeler noteContainer.addChild à chaque frame
			// si note.container est déjà attaché de manière persistante lors de l'acquire.
			state.processedIndices.add(idx);
			state.nextNoteIndex++;
		}

		// Déplacement des notes actives
		const activeNotes = this.pool.getActive();
		for (let i = activeNotes.length - 1; i >= 0; i--) {
			const note = activeNotes[i];
			if (!note || !note.active) continue;

			const timeRemainingSec = (note.time - currentTimeMs) / 1000;
			const targetX = this.hitLineX + timeRemainingSec * GAME.noteSpeed;

			note.container.position.set(targetX, yCenter);

			// Détection des ratés (timing dépassé) sans faire disparaître la note immédiatement
			if (!note.missed && currentTimeMs >= 0 && currentTimeMs - note.time > state.timingWindows.goodWindow) {
				state.registerMiss(note);
				note.container.alpha = 0.35; // Asombrissement / transparence de la note ratée
			}

			// Libération du pool uniquement quand la note a glissé jusqu'à l'extrême gauche de la piste
			if (targetX <= 30) {
				this.pool.release(note);
			}
		}
	}
}
