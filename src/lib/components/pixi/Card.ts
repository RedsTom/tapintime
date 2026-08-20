import { Container, Graphics, Text } from 'pixi.js';
import { COLORS, SPACING } from '../../tokens';

export interface PixiCardOptions {
	title?: string;
	subtitle?: string;
}

export class PixiCard {
	public container: Container;
	private bg: Graphics;
	private titleText?: Text;

	constructor(options: PixiCardOptions = {}) {
		this.container = new Container();

		this.bg = new Graphics()
			.roundRect(0, 0, 300, 180, SPACING.borderRadius)
			.fill({ color: parseInt(COLORS.surface.replace('#', ''), 16) })
			.stroke({ width: SPACING.borderWidth, color: parseInt(COLORS.accent.replace('#', ''), 16) });

		this.container.addChild(this.bg);

		if (options.title) {
			this.titleText = new Text({
				text: options.title,
				style: {
					fontFamily: 'system-ui, sans-serif',
					fontSize: 18,
					fontWeight: '900',
					fill: parseInt(COLORS.primary.replace('#', ''), 16),
					letterSpacing: 1
				}
			});
			this.titleText.position.set(16, 16);
			this.container.addChild(this.titleText);
		}
	}

	public destroy() {
		this.container.destroy({ children: true });
	}
}
