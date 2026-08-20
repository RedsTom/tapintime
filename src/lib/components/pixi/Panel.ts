import { Container, Graphics } from 'pixi.js';
import { COLORS, SPACING } from '../../tokens';

export interface PixiPanelOptions {
	width?: number;
	height?: number;
}

export class PixiPanel {
	public container: Container;
	private bg: Graphics;

	constructor(options: PixiPanelOptions = {}) {
		const width = options.width ?? 400;
		const height = options.height ?? 300;

		this.container = new Container();
		this.bg = new Graphics()
			.roundRect(0, 0, width, height, SPACING.borderRadius)
			.fill({ color: parseInt(COLORS.secondary.replace('#', ''), 16), alpha: 0.8 })
			.stroke({ width: SPACING.borderWidth, color: parseInt(COLORS.bg.replace('#', ''), 16) });

		this.container.addChild(this.bg);
	}

	public destroy() {
		this.container.destroy({ children: true });
	}
}
