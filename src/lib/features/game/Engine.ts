import { Application } from 'pixi.js';
import { GameState } from './GameState';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { getPlaybackTime, resumeAudioContext, ensureAudioContextRunning, scheduleAudioPlay, pauseAudio, resumeAudioFromPause, stopAudio } from '../../audio';
import type { Manifest } from '../beatmap/schemas/titm';
import type { Layout, Key } from '../layout/schemas/titl';
import { getFingerForKey } from '../layout/fingerColors';
import { COLORS_HEX, GAME, type LeniencyMode } from '$lib/tokens';

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
 *
 * Optimisations :
 * - Map<keyCode, Key> pré-construit pour handleKeyPress O(1) au lieu de find() O(n)
 * - Throttle des mises à jour DOM du clavier virtuel (~100ms au lieu de chaque frame)
 * - incomingKeys lu depuis le Renderer (déjà calculé dans la boucle de rendu)
 * - Touches pressées : référence stable du Set, pas de new Set() à chaque événement
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
	private noteSpeed: number;
	private callbacks: EngineCallbacks;
	private smoothClock = new SmoothClock();

	private pressedKeys: Set<string> = new Set();

	// Cache DOM du clavier virtuel
	private keyboardEl: HTMLElement | null = null;
	private keyElementsMap: Map<string, HTMLElement> = new Map();
	private keyElementsInitialized: boolean = false;

	// Throttle du clavier virtuel DOM (~100ms)
	private lastKeyboardUpdateMs: number = 0;
	private keyboardDirty: boolean = false;
	private static readonly KEYBOARD_THROTTLE_MS = 100;

	// Map pré-construit keyCode → Key pour lookup O(1)
	private keyCodeMap: Map<string, Key> = new Map();

	constructor(
		canvasEl: HTMLCanvasElement,
		manifest: Manifest,
		layout: Layout,
		unlockedKeys: string[],
		audioOffsetMs: number,
		visualOffsetMs: number,
		leniencyMode: LeniencyMode,
		noteSpeed: number,
		callbacks: EngineCallbacks
	) {
		this.state = new GameState(manifest, unlockedKeys, leniencyMode, noteSpeed);
		this.layout = layout;
		this.audioOffsetMs = audioOffsetMs;
		this.visualOffsetMs = visualOffsetMs;
		this.noteSpeed = noteSpeed;
		this.callbacks = callbacks;

		// Pré-construire le Map keyCode → Key pour handleKeyPress O(1)
		this.buildKeyCodeMap();

		this.state.onMissCallback = (note, comboBefore) => {
			const finger = getFingerForKey(note.char, this.layout);
			this.callbacks.onHit('miss', note.char, finger, 0, comboBefore);
			this.callbacks.onStateUpdate(this.state);
		};

		this.ready = this.init(canvasEl).catch(console.error);
	}

	/**
	 * Construit un Map de lookup rapide keyCode → Key
	 * pour éviter le Array.find() linéaire à chaque frappe.
	 */
	private buildKeyCodeMap() {
		if (!this.layout.layers[0]) return;
		for (const key of this.layout.layers[0].keys) {
			this.keyCodeMap.set(key.keyCode, key);
			// Stocker aussi la version lowercase pour les cas insensibles
			this.keyCodeMap.set(key.keyCode.toLowerCase(), key);
		}
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

		this.renderer = new Renderer(this.app, this.state.totalLanes, this.noteSpeed);
		
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
				this.keyboardDirty = true;
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
		// Le Renderer calcule aussi incomingKeys dans la même boucle — zéro itération redondante
		this.renderer.update(this.state, currentTimeMs + this.visualOffsetMs, this.layout);

		// Mise à jour du clavier virtuel DOM — throttlée à ~100ms
		const now = performance.now();
		if (this.keyboardDirty || now - this.lastKeyboardUpdateMs >= Engine.KEYBOARD_THROTTLE_MS) {
			this.updateKeyboardDOM();
			this.lastKeyboardUpdateMs = now;
			this.keyboardDirty = false;
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

	/**
	 * Initialise le cache DOM du clavier virtuel une seule fois.
	 */
	private initKeyboardElements() {
		if (this.keyElementsInitialized) return;
		this.keyboardEl = document.getElementById('game-keyboard-container');
		if (!this.keyboardEl) return;
		const elements = this.keyboardEl.querySelectorAll('.keyboard-key') as NodeListOf<HTMLElement>;
		for (const el of elements) {
			const key = el.dataset.key || '';
			if (key) {
				this.keyElementsMap.set(key.toLowerCase(), el);
			}
		}
		this.keyElementsInitialized = true;
	}

	/**
	 * Met à jour les états visuels du clavier virtuel DOM.
	 * Throttlée à ~100ms car l'état "incoming" n'a pas besoin de 144 fps de précision.
	 * Utilise un cache Map<string, HTMLElement> au lieu de querySelectorAll à chaque frame.
	 */
	private updateKeyboardDOM() {
		if (!this.keyElementsInitialized) {
			this.initKeyboardElements();
		}
		if (this.keyElementsMap.size === 0) return;

		// Lire les incomingKeys directement depuis le Renderer (déjà calculé dans updateNotes)
		const incomingKeys = this.renderer.incomingKeys;

		for (const [, htmlEl] of this.keyElementsMap) {
			const unlocked = htmlEl.dataset.unlocked === 'true';
			if (!unlocked) continue;

			const char = htmlEl.dataset.key || '';
			const code = htmlEl.dataset.code || '';
			
			const isPressed = this.pressedKeys.has(code) || this.pressedKeys.has(char);
			const isIncoming = incomingKeys.has(char);

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

		// Lookup O(1) via le Map pré-construit au lieu de Array.find() O(n)
		let layoutKey = this.keyCodeMap.get(code);
		if (!layoutKey) {
			layoutKey = this.keyCodeMap.get(code.toLowerCase());
		}
		if (!layoutKey) return;

		const manifestOffset = this.state.manifest.audioOffset || 0;
		const rawAudioTimeMs = getPlaybackTime() * 1000 + manifestOffset;
		const currentTimeMs = this.smoothClock.update(rawAudioTimeMs);
		const adjustedTimeMs = currentTimeMs + this.audioOffsetMs;

		const hitResult = this.state.hitNote(layoutKey.char, adjustedTimeMs, this.renderer.pool);

		if (hitResult) {
			const { rating, deltaMs, laneIndex } = hitResult;
			const color =
				rating === 'perfect'
					? COLORS_HEX.perfect
					: rating === 'great'
						? COLORS_HEX.great
						: COLORS_HEX.good;

			const yCenter = this.app!.screen.height * 0.38;
			const hitY = this.renderer.getLaneY(laneIndex, this.state.totalLanes, yCenter);
			this.renderer.spawnHitSpark(this.renderer.hitLineX, hitY, color);

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
