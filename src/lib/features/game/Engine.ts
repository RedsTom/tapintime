import { Application } from 'pixi.js';
import { GameState } from './GameState';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { getPlaybackTime, resumeAudioContext, ensureAudioContextRunning, scheduleAudioPlay, pauseAudio, resumeAudioFromPause, stopAudio } from '../../audio';
import type { Manifest } from '../beatmap/schemas/titm';
import type { Layout } from '../layout/schemas/titl';
import { getFingerForKey } from '../layout/fingerColors';
import { COLORS, GAME, type LeniencyMode } from '$lib/tokens';

export interface EngineCallbacks {
	onStateUpdate: (state: GameState, incomingKeys: Set<string>) => void;
	onHit: (
		rating: 'perfect' | 'great' | 'good' | 'miss',
		char?: string,
		finger?: string,
		deltaMs?: number,
		comboBeforeMiss?: number
	) => void;
	onFinish: () => void;
	onPressedKeysChange: (keys: Set<string>) => void;
	onPauseChange?: (isPaused: boolean) => void;
}

class SmoothClock {
	private lastFrameTime: number = 0;
	private smoothTimeMs: number = 0;
	private initialized: boolean = false;

	public update(rawAudioTimeMs: number): number {
		const now = performance.now();
		if (!this.initialized || this.lastFrameTime === 0) {
			this.lastFrameTime = now;
			this.smoothTimeMs = rawAudioTimeMs;
			this.initialized = true;
			return this.smoothTimeMs;
		}

		const deltaMs = Math.min(50, now - this.lastFrameTime);
		this.lastFrameTime = now;

		this.smoothTimeMs += deltaMs;

		const driftMs = rawAudioTimeMs - this.smoothTimeMs;
		if (Math.abs(driftMs) > 50) {
			this.smoothTimeMs = rawAudioTimeMs;
		} else {
			this.smoothTimeMs += driftMs * 0.05;
		}

		return this.smoothTimeMs;
	}

	public reset() {
		this.lastFrameTime = 0;
		this.smoothTimeMs = 0;
		this.initialized = false;
	}
}

/**
 * Orchestrateur principal du moteur de jeu.
 * Synchronise l'horloge audio, la saisie utilisateur et le rendu Canvas PixiJS.
 */
export class Engine {
	public app: Application | null = null;
	public state: GameState;
	public renderer!: Renderer;
	public ready: Promise<void>;
	private inputManager!: InputManager;
	private layout: Layout;

	public running: boolean = false;
	public finished: boolean = false;
	public isPaused: boolean = false;

	private audioOffsetMs: number;
	private visualOffsetMs: number;
	private callbacks: EngineCallbacks;
	private smoothClock = new SmoothClock();

	private lastStateUpdateMs = 0;
	private lastIncomingStr = '';

	constructor(
		canvasEl: HTMLCanvasElement,
		manifest: Manifest,
		layout: Layout,
		unlockedKeys: string[],
		audioOffsetMs: number,
		visualOffsetMs: number,
		leniencyMode: LeniencyMode,
		callbacks: EngineCallbacks
	) {
		this.state = new GameState(manifest, unlockedKeys, leniencyMode);
		this.layout = layout;
		this.audioOffsetMs = audioOffsetMs;
		this.visualOffsetMs = visualOffsetMs;
		this.callbacks = callbacks;

		this.state.onMissCallback = (note, comboBefore) => {
			const finger = getFingerForKey(note.char, this.layout);
			this.callbacks.onHit('miss', note.char, finger, 0, comboBefore);
		};

		this.ready = this.init(canvasEl).catch(console.error);
	}

	private async init(canvasEl: HTMLCanvasElement) {
		await ensureAudioContextRunning();

		this.app = new Application();
		await this.app.init({
			canvas: canvasEl,
			width: window.innerWidth,
			height: window.innerHeight,
			backgroundAlpha: 0,
			antialias: true,
			resolution: window.devicePixelRatio,
			autoDensity: true
		});

		this.renderer = new Renderer(this.app);
		
		// Pré-allouer et chauffer le pool de notes pour éviter tout freeze au spawn
		const requiredPoolSize = Math.max(
			GAME.objectPoolSize,
			Math.min(100, this.state.manifest.hitObjects.length)
		);
		this.renderer.pool.ensureCapacity(requiredPoolSize);

		this.inputManager = new InputManager({
			onKeyPress: this.handleKeyPress.bind(this),
			onEscape: () => {
				this.togglePause();
			},
			onEnter: () => {
				if (this.finished) window.location.reload();
			},
			onPressedKeysChange: this.callbacks.onPressedKeysChange
		});

		const COUNTDOWN_SEC = 3.0;
		this.running = true;

		this.smoothClock.reset();
		scheduleAudioPlay(COUNTDOWN_SEC, 0);

		this.app.ticker.add(this.tick.bind(this));
	}

	public togglePause() {
		if (this.finished) return;
		if (this.isPaused) {
			this.resume();
		} else {
			this.pause();
		}
	}

	public pause() {
		if (this.finished || this.isPaused) return;
		this.isPaused = true;
		this.smoothClock.reset();
		pauseAudio();
		this.callbacks.onPauseChange?.(true);
	}

	public resume() {
		if (this.finished || !this.isPaused) return;
		this.isPaused = false;
		this.smoothClock.reset();
		resumeAudioFromPause();
		this.callbacks.onPauseChange?.(false);
	}

	private tick() {
		if (!this.app || !this.running || this.isPaused) return;

		const missBefore = this.state.miss;
		const manifestOffset = this.state.manifest.audioOffset || 0;
		const rawAudioTimeMs = getPlaybackTime() * 1000 + manifestOffset;

		const currentTimeMs = this.smoothClock.update(rawAudioTimeMs);

		// Rendu ultra-fluide 60/120/144 FPS
		this.renderer.updateNotes(this.state, currentTimeMs + this.visualOffsetMs, this.layout);

		// Optimisation des callbacks UI Svelte (Throttling 30fps maximum pour éviter les reflows DOM)
		const now = performance.now();
		if (now - this.lastStateUpdateMs > 33) {
			this.lastStateUpdateMs = now;

			const incomingKeys = new Set<string>();
			for (const note of this.renderer.pool.getActive()) {
				if (note.container.x > this.renderer.hitLineX && note.container.x < this.renderer.hitLineX + 300) {
					incomingKeys.add(note.char.toLowerCase());
				}
			}

			const incomingStr = Array.from(incomingKeys).sort().join(',');
			if (incomingStr !== this.lastIncomingStr || missBefore !== this.state.miss) {
				this.lastIncomingStr = incomingStr;
				this.callbacks.onStateUpdate(this.state, incomingKeys);
			}
		}

		if (
			!this.finished &&
			this.state.processedIndices.size >= this.state.totalNotes &&
			this.renderer.pool.getActive().length === 0
		) {
			this.finished = true;
			this.running = false;
			this.inputManager.setFinished(true);
			setTimeout(() => {
				this.callbacks.onFinish();
			}, 1500);
		}
	}

	private handleKeyPress(code: string) {
		resumeAudioContext();
		if (!this.running || this.isPaused) return;
		if (getPlaybackTime() * 1000 < 0) return;

		let layoutKey = this.layout.layers[0]?.keys.find((k) => k.keyCode === code);
		if (!layoutKey) {
			layoutKey = this.layout.layers[0]?.keys.find((k) => k.keyCode.toLowerCase() === code.toLowerCase());
		}
		if (!layoutKey) return;

		const manifestOffset = this.state.manifest.audioOffset || 0;
		const rawAudioTimeMs = getPlaybackTime() * 1000 + manifestOffset;
		const currentTimeMs = this.smoothClock.update(rawAudioTimeMs);
		const adjustedTimeMs = currentTimeMs + this.audioOffsetMs;

		const hitResult = this.state.hitNote(layoutKey.char, adjustedTimeMs, this.renderer.pool);

		if (hitResult) {
			const { rating, deltaMs } = hitResult;
			const color =
				rating === 'perfect'
					? parseInt(COLORS.perfect.replace('#', ''), 16)
					: rating === 'great'
						? parseInt(COLORS.great.replace('#', ''), 16)
						: parseInt(COLORS.good.replace('#', ''), 16);

			this.renderer.spawnHitSpark(this.renderer.hitLineX, this.app!.screen.height * 0.38, color);

			const finger = layoutKey.finger || getFingerForKey(layoutKey.char, this.layout);

			this.callbacks.onHit(rating, layoutKey.char, finger, deltaMs);
		}
	}

	public destroy() {
		this.running = false;
		stopAudio();
		this.inputManager?.destroy();
		if (this.app) {
			this.app.destroy(true);
			this.app = null;
		}
	}
}
