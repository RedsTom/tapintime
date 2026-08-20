import { Application, Container, Graphics } from 'pixi.js';
import { COLORS, GAME } from '$lib/tokens';
import { NotePool } from './objectPool';
import { getFingerColorForKey } from '$lib/fingerColors';
import type { GameState } from './GameState';
import type { Layout } from '$lib/schemas/titl';

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

	constructor(app: Application) {
		this.app = app;

		this.hitSparks = new Container();
		this.app.stage.addChild(this.hitSparks);

		const { hitLine, noteContainer } = this.initGameGraphics();
		this.hitLine = hitLine;
		this.noteContainer = noteContainer;

		this.pool = new NotePool(this.noteContainer, GAME.objectPoolSize);
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
	 * Déclenche une étincelle/effet visuel lors d'une frappe réussie.
	 */
	public spawnHitSpark(x: number, y: number, _color: number) {
		const pulse = new Graphics()
			.roundRect(-38, -38, 76, 76, 12)
			.fill({ color: 0xFFD500, alpha: 1 });
		pulse.position.set(x, y);
		this.hitSparks.addChild(pulse);

		let life = 1;
		const ticker = () => {
			life -= 0.12;
			if (life <= 0) {
				this.app.ticker.remove(ticker);
				this.hitSparks.removeChild(pulse);
				pulse.destroy();
				return;
			}
			pulse.alpha = life;
		};
		this.app.ticker.add(ticker);
	}

	/**
	 * Fait défiler les notes et gère leur apparition / disparition à chaque frame.
	 */
	public updateNotes(state: GameState, currentTimeMs: number, layout?: Layout | null) {
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
			const fingerColor = getFingerColorForKey(hitObj.char, layout);
			const note = this.pool.acquire(hitObj.char, hitObj.time, fingerColor);
			this.noteContainer.addChild(note.container);
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
