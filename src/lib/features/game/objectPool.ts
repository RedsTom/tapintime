import { Container, Graphics, Text } from 'pixi.js';
import { COLORS_HEX, SPACING } from '$lib/tokens';
import { isColorDark } from '$lib/fingerColors';

export interface PooledNote {
	container: Container;
	bg: Graphics;
	label: Text;
	active: boolean;
	missed: boolean;
	char: string;
	time: number;
	laneIndex?: number;
	/** Index dans le tableau active[] pour un retrait O(1) via swap-and-pop */
	activeIndex: number;
}

/**
 * Gestionnaire d'Object Pooling pour le recyclage des conteneurs de notes PixiJS.
 * Évite les allocations mémoires fréquentes pendant la boucle de jeu.
 *
 * Optimisations clés :
 * - Les Graphics de fond sont dessinées UNE SEULE FOIS en blanc, puis colorées via `tint` (zéro rebuild GPU)
 * - Le retrait du tableau actif utilise swap-and-pop O(1) au lieu de splice O(n)
 */
export class NotePool {
	private pool: PooledNote[] = [];
	private active: PooledNote[] = [];
	private parent: Container;

	constructor(parent: Container, size: number) {
		this.parent = parent;
		this.ensureCapacity(size);
	}

	/**
	 * S'assure que le pool contient au moins 'size' notes inactives pré-créées.
	 */
	public ensureCapacity(size: number): void {
		while (this.pool.length + this.active.length < size) {
			const note = this.createNote();
			this.parent.addChild(note.container);
			this.pool.push(note);
		}
	}

	private createNote(): PooledNote {
		const container = new Container();

		// Dessiner le fond en BLANC une seule fois — la couleur sera appliquée via `tint`
		// Cela évite de reconstruire la géométrie GPU à chaque acquire()
		const bg = new Graphics()
			.roundRect(-36, -36, 72, 72, 12)
			.fill({ color: 0xFFFFFF })
			.stroke({ width: SPACING.borderWidth, color: COLORS_HEX.secondary });

		const label = new Text({
			text: '',
			style: {
				fontFamily: 'system-ui, sans-serif',
				fontSize: 36,
				fontWeight: '900',
				fill: COLORS_HEX.bg
			}
		});
		label.anchor.set(0.5);
		label.position.set(0, 0);

		container.addChild(bg);
		container.addChild(label);
		container.visible = false;

		return { container, bg, label, active: false, missed: false, char: '', time: 0, activeIndex: -1 };
	}

	/**
	 * Récupère ou instancie une note disponible depuis le pool.
	 * Utilise `tint` pour coloriser au lieu de reconstruire la géométrie GPU.
	 */
	acquire(char: string, time: number, fingerColor: string = '#FFD500', laneIndex: number = 0): PooledNote {
		let note: PooledNote;
		if (this.pool.length > 0) {
			note = this.pool.pop()!;
		} else {
			note = this.createNote();
			this.parent.addChild(note.container);
		}

		note.char = char;
		note.time = time;
		note.missed = false;
		note.laneIndex = laneIndex;
		note.container.alpha = 1.0;
		note.label.text = char.toUpperCase();

		// Coloriser via tint — O(1), zéro allocation GPU
		const colorHex = parseInt(fingerColor.replace('#', ''), 16);
		note.bg.tint = colorHex;

		const textColor = isColorDark(fingerColor) ? 0xffffff : COLORS_HEX.bg;
		note.label.style.fill = textColor;

		note.container.visible = true;
		note.active = true;

		// Swap-and-pop tracking : stocker l'index dans le tableau actif
		note.activeIndex = this.active.length;
		this.active.push(note);
		return note;
	}

	/**
	 * Libère une note et la remet dans le pool d'objets inactifs.
	 * Utilise swap-and-pop O(1) au lieu de splice O(n).
	 */
	release(note: PooledNote): void {
		note.active = false;
		note.missed = false;
		note.container.visible = false;
		note.container.alpha = 1.0;

		const idx = note.activeIndex;
		if (idx >= 0 && idx < this.active.length) {
			const lastIdx = this.active.length - 1;
			if (idx !== lastIdx) {
				// Swap avec le dernier élément
				const last = this.active[lastIdx];
				this.active[idx] = last;
				last.activeIndex = idx;
			}
			this.active.pop();
		}
		note.activeIndex = -1;
		this.pool.push(note);
	}

	/**
	 * Libère toutes les notes actuellement actives.
	 */
	releaseAll(): void {
		while (this.active.length > 0) {
			this.release(this.active[this.active.length - 1]);
		}
	}

	/**
	 * Renvoie la liste en lecture seule des notes actuellement actives à l'écran.
	 */
	getActive(): readonly PooledNote[] {
		return this.active;
	}
}
