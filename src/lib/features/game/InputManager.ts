/**
 * Gestionnaire d'événements clavier pour la session de jeu.
 *
 * Optimisation : expose une référence directe au Set de touches pressées
 * et un compteur de version pour signaler les changements sans allocation.
 */
export class InputManager {
	/** Touches actuellement pressées (référence stable, pas de new Set à chaque événement) */
	public readonly pressedKeys: Set<string> = new Set();
	/** Compteur incrémenté à chaque changement de touches pressées (évite de créer un nouveau Set) */
	public pressedVersion: number = 0;

	private keydownListener: (e: KeyboardEvent) => void;
	private keyupListener: (e: KeyboardEvent) => void;
	private onKeyPress: (code: string) => void;
	private onEscape: () => void;
	private onEnter: () => void;
	private finished: boolean = false;

	constructor(callbacks: {
		onKeyPress: (code: string) => void;
		onEscape: () => void;
		onEnter: () => void;
		onPressedKeysChange: (keys: Set<string>, version: number) => void;
	}) {
		this.onKeyPress = callbacks.onKeyPress;
		this.onEscape = callbacks.onEscape;
		this.onEnter = callbacks.onEnter;

		this.keydownListener = (e: KeyboardEvent) => {
			if (e.repeat) return; // Empêche le key-repeat d'impacter plusieurs notes d'un coup

			if (e.key === 'Escape') {
				this.onEscape();
				return;
			}
			if (e.key === 'Enter' && this.finished) {
				this.onEnter();
				return;
			}

			// Empêcher le défilement navigateur ou raccourcis système sur les touches de jeu
			if (e.code === 'Space' || e.code.startsWith('Key') || e.code.startsWith('Digit')) {
				e.preventDefault();
			}

			if (e.code) this.pressedKeys.add(e.code);
			this.pressedVersion++;
			callbacks.onPressedKeysChange(this.pressedKeys, this.pressedVersion);

			if (e.code) this.onKeyPress(e.code);
		};

		this.keyupListener = (e: KeyboardEvent) => {
			if (e.code) this.pressedKeys.delete(e.code);
			this.pressedVersion++;
			callbacks.onPressedKeysChange(this.pressedKeys, this.pressedVersion);
		};

		window.addEventListener('keydown', this.keydownListener);
		window.addEventListener('keyup', this.keyupListener);
	}

	/**
	 * Marque la partie comme terminée.
	 */
	public setFinished(finished: boolean) {
		this.finished = finished;
	}

	/**
	 * Supprime les écouteurs d'événements de la fenêtre.
	 */
	public destroy() {
		window.removeEventListener('keydown', this.keydownListener);
		window.removeEventListener('keyup', this.keyupListener);
	}
}
