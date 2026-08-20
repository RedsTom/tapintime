import { Container, Graphics, Text } from 'pixi.js';
import { COLORS, SPACING } from '../../tokens';

export interface PixiButtonOptions {
	text?: string;
	variant?: 'primary' | 'secondary' | 'accent';
	size?: 'small' | 'large';
	disabled?: boolean;
	onclick?: () => void;
}

export class PixiButton {
	public container: Container;
	private bg: Graphics;
	private shadowGraphic: Graphics;
	private label: Text;
	private contentContainer: Container;
	
	private variant: 'primary' | 'secondary' | 'accent';
	private size: 'small' | 'large';
	private disabled: boolean;
	private onclick?: () => void;

	constructor(options: PixiButtonOptions = {}) {
		this.variant = options.variant ?? 'primary';
		this.size = options.size ?? 'large';
		this.disabled = options.disabled ?? false;
		this.onclick = options.onclick;

		const bgColor = this.variant === 'accent' ? COLORS.accent : COLORS.primary;
		const shadowColor = this.variant === 'accent' ? COLORS.primary : COLORS.accent;
		const fgColor = COLORS.secondary;

		this.container = new Container();
		
		this.bg = new Graphics()
			.roundRect(0, 0, 200, 60, SPACING.borderRadius)
			.fill({ color: parseInt(bgColor.replace('#', ''), 16) })
			.stroke({ width: SPACING.borderWidth, color: parseInt(COLORS.secondary.replace('#', ''), 16) });

		const offset = this.size === 'small' ? 4 : 6;
		const hoverOffset = this.size === 'small' ? 1 : 2;

		this.shadowGraphic = new Graphics()
			.roundRect(0, 0, 200, 60, SPACING.borderRadius)
			.fill({ color: parseInt(shadowColor.replace('#', ''), 16) });
		
		this.shadowGraphic.position.set(offset, offset);
		
		this.label = new Text({
			text: options.text ?? '',
			style: {
				fontFamily: 'system-ui, sans-serif',
				fontSize: 20,
				fontWeight: '900',
				fill: parseInt(fgColor.replace('#', ''), 16),
				letterSpacing: 2
			}
		});
		this.label.anchor.set(0.5);
		this.label.position.set(100, 30);

		this.contentContainer = new Container();
		this.contentContainer.addChild(this.bg);
		this.contentContainer.addChild(this.label);
		
		this.container.addChild(this.shadowGraphic);
		this.container.addChild(this.contentContainer);
		
		if (!this.disabled) {
			this.container.eventMode = 'static';
			this.container.cursor = 'pointer';
			
			this.container.on('pointerenter', () => {
				this.contentContainer.position.set(hoverOffset, hoverOffset);
			});
			this.container.on('pointerleave', () => {
				this.contentContainer.position.set(0, 0);
			});
			this.container.on('pointerdown', () => {
				this.contentContainer.position.set(offset, offset);
				if (this.onclick) this.onclick();
			});
			this.container.on('pointerup', () => {
				this.contentContainer.position.set(hoverOffset, hoverOffset);
			});
			this.container.on('pointerupoutside', () => {
				this.contentContainer.position.set(0, 0);
			});
		} else {
			this.container.alpha = 0.5;
		}
	}

	public setText(text: string) {
		this.label.text = text;
	}

	public destroy() {
		this.container.destroy({ children: true });
	}
}
