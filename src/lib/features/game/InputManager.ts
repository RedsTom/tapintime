/**
 * Gestionnaire d'événements clavier pour la session de jeu.
 */
export class InputManager {
	private pressedKeys: Set<string> = new Set();
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
		onPressedKeysChange: (keys: Set<string>) => void;
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

			if (e.code) this.pressedKeys.add(e.code);
			callbacks.onPressedKeysChange(new Set(this.pressedKeys));

			if (e.code) this.onKeyPress(e.code);
		};

		this.keyupListener = (e: KeyboardEvent) => {
			if (e.code) this.pressedKeys.delete(e.code);
			callbacks.onPressedKeysChange(new Set(this.pressedKeys));
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
