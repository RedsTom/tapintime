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
	onStateUpdate: (state: GameState) => void;
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

	private pressedKeys: Set<string> = new Set();
	private incomingKeys: Set<string> = new Set();
	private keyboardEl: HTMLElement | null = null;
	private keyElements: HTMLElement[] = [];

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
			this.callbacks.onStateUpdate(this.state);
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
			onPressedKeysChange: (keys) => {
				this.pressedKeys = keys;
				this.updateKeyboardDOM();
				this.callbacks.onPressedKeysChange(keys);
			}
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

		const manifestOffset = this.state.manifest.audioOffset || 0;
		const rawAudioTimeMs = getPlaybackTime() * 1000 + manifestOffset;

		const currentTimeMs = this.smoothClock.update(rawAudioTimeMs);

		// Rendu ultra-fluide 60/120/144 FPS
		this.renderer.update(this.state, currentTimeMs + this.visualOffsetMs, this.layout);

		// Calculer les touches "incoming" de manière optimisée
		this.incomingKeys.clear();
		for (const note of this.renderer.pool.getActive()) {
			if (note.container.x > this.renderer.hitLineX && note.container.x < this.renderer.hitLineX + 300) {
				this.incomingKeys.add(note.char.toLowerCase());
			}
		}
		this.updateKeyboardDOM();

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

	private initKeyboardElements() {
		if (!this.keyboardEl) {
			this.keyboardEl = document.getElementById('game-keyboard-container');
		}
		if (!this.keyboardEl) return;
		this.keyElements = Array.from(this.keyboardEl.querySelectorAll('.keyboard-key')) as HTMLElement[];
	}

	private updateKeyboardDOM() {
		if (this.keyElements.length === 0) {
			this.initKeyboardElements();
		}
		if (this.keyElements.length === 0) return;

		for (const htmlEl of this.keyElements) {
			const unlocked = htmlEl.dataset.unlocked === 'true';
			if (!unlocked) continue;

			const char = htmlEl.dataset.key || '';
			const code = htmlEl.dataset.code || '';
			
			const isPressed = this.pressedKeys.has(code) || this.pressedKeys.has(char);
			const isIncoming = this.incomingKeys.has(char);

			const wasPressed = htmlEl.dataset.statePressed === 'true';
			const wasIncoming = htmlEl.dataset.stateIncoming === 'true';

			if (isPressed === wasPressed && isIncoming === wasIncoming) {
				continue; // Aucun changement d'état, évite d'écrire dans le DOM
			}

			htmlEl.dataset.statePressed = isPressed ? 'true' : 'false';
			htmlEl.dataset.stateIncoming = isIncoming ? 'true' : 'false';

			const fingerColor = htmlEl.dataset.fingerColor || '';
			const lightText = htmlEl.dataset.lightText === 'true';
			const isModifier = htmlEl.dataset.modifier === 'true';
			const dotEl = htmlEl.querySelector('.keyboard-dot') as HTMLElement;

			htmlEl.classList.remove('translate-x-[2px]', 'translate-y-[2px]', 'shadow-none', 'animate-pulse', 'bg-bg', 'text-text', 'hover:border-text-dim');

			if (isPressed) {
				htmlEl.classList.add('translate-x-[2px]', 'translate-y-[2px]', 'shadow-none');
				htmlEl.style.backgroundColor = fingerColor;
				htmlEl.style.color = lightText ? '#ffffff' : '#150029';
				htmlEl.style.borderColor = '#0B0014';
				htmlEl.style.boxShadow = 'none';
				if (dotEl) dotEl.style.opacity = '0';
			} else if (isIncoming) {
				htmlEl.classList.add('animate-pulse');
				htmlEl.style.backgroundColor = fingerColor + '33';
				htmlEl.style.borderColor = fingerColor;
				htmlEl.style.color = fingerColor;
				htmlEl.style.boxShadow = `2px 2px 0px 0px ${fingerColor}`;
				if (dotEl) dotEl.style.opacity = '1';
			} else {
				htmlEl.classList.add('bg-bg', 'text-text', 'hover:border-text-dim');
				htmlEl.style.backgroundColor = '';
				htmlEl.style.color = '';
				htmlEl.style.borderColor = '';
				htmlEl.style.boxShadow = '';
				if (isModifier) {
					htmlEl.style.borderColor = '#f9564f';
				}
				if (dotEl) dotEl.style.opacity = '1';
			}
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

			const finger = layoutKey.char || getFingerForKey(layoutKey.char, this.layout);

			this.callbacks.onHit(rating, layoutKey.char, finger, deltaMs);
			this.callbacks.onStateUpdate(this.state);
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
