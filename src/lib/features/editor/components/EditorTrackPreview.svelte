<script lang="ts">
	import { onMount } from 'svelte';
	import { Application, Container, Graphics, Text } from 'pixi.js';
	import type { BeatmapEditorState } from '../beatmapEditorState.svelte';
	import { COLORS, GAME } from '$lib/tokens';
	import { getFingerColorForKey, isColorDark } from '$lib/fingerColors';

	let { editor }: { editor: BeatmapEditorState } = $props();

	let containerEl: HTMLDivElement | undefined = $state();
	let app: Application | null = null;
	let noteContainer: Container | null = null;

	interface PreviewNode {
		container: Container;
		bg: Graphics;
		label: Text;
		active: boolean;
		char: string;
		fingerColor: string;
		isSelected: boolean;
	}

	const nodePool: PreviewNode[] = [];

	function acquireNode(container: Container, char: string, fingerColor: string, isSelected: boolean): PreviewNode {
		let node = nodePool.find((n) => !n.active);
		if (!node) {
			const c = new Container();
			const bg = new Graphics();
			const label = new Text({
				text: '',
				style: {
					fontFamily: 'system-ui, sans-serif',
					fontSize: 26,
					fontWeight: '900',
					fill: 0xffffff
				}
			});
			label.anchor.set(0.5);
			c.addChild(bg);
			c.addChild(label);

			node = { container: c, bg, label, active: true, char: '', fingerColor: '', isSelected: false };
			nodePool.push(node);
			container.addChild(c);
		}

		node.active = true;
		node.container.visible = true;

		if (node.char !== char || node.fingerColor !== fingerColor || node.isSelected !== isSelected) {
			node.char = char;
			node.fingerColor = fingerColor;
			node.isSelected = isSelected;

			const isDark = isColorDark(fingerColor);
			node.label.text = char.toUpperCase();
			node.label.style.fill = isDark ? 0xffffff : parseInt(COLORS.bg.replace('#', ''), 16);

			node.bg.clear();
			node.bg
				.roundRect(-28, -28, 56, 56, 10)
				.fill({ color: parseInt(fingerColor.replace('#', ''), 16) })
				.stroke({
					width: isSelected ? 5 : 3,
					color: isSelected ? parseInt(COLORS.primary.replace('#', ''), 16) : parseInt(COLORS.secondary.replace('#', ''), 16)
				});
		}

		return node;
	}

	onMount(() => {
		let animId: number;

		const handleResize = () => {
			if (app && containerEl) {
				app.renderer.resize(containerEl.clientWidth, 140);
			}
		};

		async function initApp() {
			if (!containerEl) return;

			app = new Application();
			await app.init({
				canvas: document.createElement('canvas'),
				width: containerEl.clientWidth,
				height: 140,
				backgroundAlpha: 0,
				antialias: true,
				resolution: window.devicePixelRatio,
				autoDensity: true
			});

			containerEl.appendChild(app.canvas);

			const yCenter = 70;
			const hitLineX = containerEl.clientWidth * 0.4;
			const margin = 24;

			// Track Lane
			const trackLane = new Graphics()
				.roundRect(margin, yCenter - 48, containerEl.clientWidth - margin * 2, 96, 14)
				.fill({ color: parseInt(COLORS.secondary.replace('#', ''), 16), alpha: 0.85 })
				.stroke({ width: 4, color: parseInt(COLORS.primary.replace('#', ''), 16), alpha: 1.0 });
			app.stage.addChild(trackLane);

			// Target Zone Line
			const targetZoneGfx = new Graphics()
				.roundRect(-30, -30, 60, 60, 10)
				.fill({ color: parseInt(COLORS.primary.replace('#', ''), 16), alpha: 0.25 })
				.stroke({ width: 4, color: parseInt(COLORS.accent.replace('#', ''), 16), alpha: 1.0 });
			const laserLineGfx = new Graphics()
				.rect(-2, -48, 4, 96)
				.fill({ color: parseInt(COLORS.primary.replace('#', ''), 16), alpha: 1.0 });

			const hitLineContainer = new Container();
			hitLineContainer.addChild(targetZoneGfx);
			hitLineContainer.addChild(laserLineGfx);
			hitLineContainer.position.set(hitLineX, yCenter);
			app.stage.addChild(hitLineContainer);

			// Note Mask & Container
			noteContainer = new Container();
			const maskGfx = new Graphics()
				.roundRect(margin, yCenter - 48, containerEl.clientWidth - margin * 2, 96, 14)
				.fill({ color: 0xffffff });
			app.stage.addChild(maskGfx);
			noteContainer.mask = maskGfx;
			app.stage.addChild(noteContainer);

			const renderLoop = () => {
				if (app && noteContainer) {
					updatePreviewNotes(app, noteContainer, hitLineX, yCenter);
				}
				animId = requestAnimationFrame(renderLoop);
			};
			animId = requestAnimationFrame(renderLoop);

			window.addEventListener('resize', handleResize);
		}

		initApp();

		return () => {
			if (animId) cancelAnimationFrame(animId);
			window.removeEventListener('resize', handleResize);
			if (app) {
				app.destroy(true);
				app = null;
			}
		};
	});

	function updatePreviewNotes(app: Application, container: Container, hitLineX: number, yCenter: number) {
		for (const node of nodePool) {
			node.active = false;
			node.container.visible = false;
		}

		const currentTimeMs = editor.currentTime * 1000;
		const travelDistance = (app.screen.width + 60) - hitLineX;
		const travelTimeMs = (travelDistance / GAME.noteSpeed) * 1000;
		const adaptedNotes = editor.getAdaptedHitObjects();

		for (let i = 0; i < adaptedNotes.length; i++) {
			const noteObj = adaptedNotes[i];
			const timeDiffMs = noteObj.time - currentTimeMs;

			if (timeDiffMs > travelTimeMs + 500 || timeDiffMs < -1500) continue;

			const timeRemainingSec = timeDiffMs / 1000;
			const noteX = hitLineX + timeRemainingSec * GAME.noteSpeed;

			if (noteX < -50 || noteX > app.screen.width + 50) continue;

			const isSelected = editor.selectedIndex === noteObj.originalIndex;
			const fingerColor = getFingerColorForKey(noteObj.char);

			const node = acquireNode(container, noteObj.char, fingerColor, isSelected);
			node.container.position.set(noteX, yCenter);
		}
	}
</script>

<div class="bg-surface border-4 border-secondary p-4 rounded-xl shadow-[5px_5px_0px_#1a0033] flex flex-col gap-2 select-none">
	<div class="flex items-center justify-between">
		<h3 class="text-xs font-black uppercase text-accent tracking-wider flex items-center gap-2">
			<span class="w-2.5 h-2.5 rounded-full bg-accent animate-ping"></span>
			Aperçu Piste en Direct (Gameplay Canvas)
		</h3>
		<span class="text-[10px] font-mono font-black text-text-dim uppercase">
			Vitesse: {GAME.noteSpeed} px/s
		</span>
	</div>
	<div bind:this={containerEl} class="w-full h-[140px] relative overflow-hidden rounded-lg"></div>
</div>
