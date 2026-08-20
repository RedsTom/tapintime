import { Container, Graphics, Text } from 'pixi.js';
import { COLORS, SPACING } from '$lib/tokens';
import { isColorDark } from '$lib/fingerColors';

export interface PooledNote {
	container: Container;
	bg: Graphics;
	label: Text;
	active: boolean;
	missed: boolean;
	char: string;
	time: number;
}

/**
 * Gestionnaire d'Object Pooling pour le recyclage des conteneurs de notes PixiJS.
 * Évite les allocations mémoires fréquentes pendant la boucle de jeu.
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
			this.pool.push(this.createNote());
		}
	}

	private createNote(): PooledNote {
		const container = new Container();

		const bg = new Graphics()
			.roundRect(-36, -36, 72, 72, 12)
			.fill({ color: parseInt(COLORS.primary.replace('#', ''), 16) })
			.stroke({ width: SPACING.borderWidth, color: parseInt(COLORS.secondary.replace('#', ''), 16) });

		const label = new Text({
			text: '',
			style: {
				fontFamily: 'system-ui, sans-serif',
				fontSize: 36,
				fontWeight: '900',
				fill: parseInt(COLORS.bg.replace('#', ''), 16)
			}
		});
		label.anchor.set(0.5);
		label.position.set(0, 0);

		container.addChild(bg);
		container.addChild(label);
		container.visible = false;

		return { container, bg, label, active: false, missed: false, char: '', time: 0 };
	}

	/**
	 * Récupère ou instancie une note disponible depuis le pool.
	 */
	acquire(char: string, time: number, fingerColor: string = '#FFD500'): PooledNote {
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
		note.container.alpha = 1.0;
		note.label.text = char.toUpperCase();

		const colorHex = parseInt(fingerColor.replace('#', ''), 16);
		note.bg
			.clear()
			.roundRect(-36, -36, 72, 72, 12)
			.fill({ color: colorHex })
			.stroke({ width: SPACING.borderWidth, color: parseInt(COLORS.secondary.replace('#', ''), 16) });

		const textColor = isColorDark(fingerColor) ? 0xffffff : parseInt(COLORS.bg.replace('#', ''), 16);
		note.label.style.fill = textColor;

		note.container.visible = true;
		note.active = true;
		this.active.push(note);
		return note;
	}

	/**
	 * Libère une note et la remet dans le pool d'objets inactifs.
	 */
	release(note: PooledNote): void {
		note.active = false;
		note.missed = false;
		note.container.visible = false;
		note.container.alpha = 1.0;
		const idx = this.active.indexOf(note);
		if (idx !== -1) this.active.splice(idx, 1);
		this.pool.push(note);
	}

	/**
	 * Libère toutes les notes actuellement actives.
	 */
	releaseAll(): void {
		while (this.active.length > 0) {
			this.release(this.active[0]);
		}
	}

	/**
	 * Renvoie la liste en lecture seule des notes actuellement actives à l'écran.
	 */
	getActive(): readonly PooledNote[] {
		return this.active;
	}
}
