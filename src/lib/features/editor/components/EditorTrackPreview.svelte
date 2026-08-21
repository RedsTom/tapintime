<script lang="ts">
	import { onMount } from 'svelte';
	import { Application, Container, Graphics, Text } from 'pixi.js';
	import type { BeatmapEditorState } from '../beatmapEditorState.svelte';
	import { COLORS, GAME } from '$lib/tokens';
	import { getFingerColorForKey, isColorDark } from '$lib/fingerColors';
	import { _ } from '$lib/i18n';

	let { editor }: { editor: BeatmapEditorState } = $props();

	let containerEl: HTMLDivElement | undefined = $state();
	let app: Application | null = null;
	let noteContainer: Container | null = null;

	let trackLane: Graphics | null = null;
	let targetZonesContainer: Container | null = null;
	let laserLine: Graphics | null = null;
	let maskGfx: Graphics | null = null;

	let totalLanes = $derived.by(() => {
		const adapted = editor.getAdaptedHitObjects();
		if (adapted.length === 0) return 1;
		let maxLane = 0;
		for (const note of adapted) {
			if (note.laneIndex !== undefined && note.laneIndex > maxLane) {
				maxLane = note.laneIndex;
			}
		}
		return maxLane + 1;
	});

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

	function redrawGraphics(lanes: number, width: number) {
		if (!trackLane || !targetZonesContainer || !laserLine || !maskGfx) return;

		const height = 140 + (lanes - 1) * 35;
		const yCenter = height / 2;
		const hitLineX = width * 0.4;
		const margin = 24;
		const laneSpacing = 35;
		const trackHeight = 96 + (lanes - 1) * laneSpacing;

		trackLane.clear()
			.roundRect(margin, yCenter - trackHeight / 2, width - margin * 2, trackHeight, 14)
			.fill({ color: parseInt(COLORS.secondary.replace('#', ''), 16), alpha: 0.85 })
			.stroke({ width: 4, color: parseInt(COLORS.primary.replace('#', ''), 16), alpha: 1.0 });

		targetZonesContainer.position.set(hitLineX, yCenter);
		targetZonesContainer.removeChildren();
		for (let i = 0; i < lanes; i++) {
			const laneYOffset = (i - (lanes - 1) / 2) * laneSpacing;
			const targetZoneGfx = new Graphics()
				.roundRect(-30, -30 + laneYOffset, 60, 60, 10)
				.fill({ color: parseInt(COLORS.primary.replace('#', ''), 16), alpha: 0.25 })
				.stroke({ width: 4, color: parseInt(COLORS.accent.replace('#', ''), 16), alpha: 1.0 });
			targetZonesContainer.addChild(targetZoneGfx);
		}

		laserLine.position.set(hitLineX, yCenter);
		laserLine.clear()
			.rect(-2, -trackHeight / 2, 4, trackHeight)
			.fill({ color: parseInt(COLORS.primary.replace('#', ''), 16), alpha: 1.0 });

		maskGfx.clear()
			.roundRect(margin, yCenter - trackHeight / 2, width - margin * 2, trackHeight, 14)
			.fill({ color: 0xffffff });
	}

	onMount(() => {
		let animId: number;

		const handleResize = () => {
			if (app && containerEl) {
				const height = 140 + (totalLanes - 1) * 35;
				app.renderer.resize(containerEl.clientWidth, height);
				redrawGraphics(totalLanes, containerEl.clientWidth);
			}
		};

		// React to changes in totalLanes
		const effectUnsub = $effect.root(() => {
			$effect(() => {
				const lanes = totalLanes;
				if (app && containerEl) {
					const height = 140 + (lanes - 1) * 35;
					app.renderer.resize(containerEl.clientWidth, height);
					redrawGraphics(lanes, containerEl.clientWidth);
				}
			});
		});

		async function initApp() {
			if (!containerEl) return;

			const canvas = document.createElement('canvas');
			canvas.style.width = '100%';
			canvas.style.height = '100%';
			canvas.style.display = 'block';
			canvas.style.position = 'absolute';
			canvas.style.top = '0';
			canvas.style.left = '0';

			app = new Application();
			await app.init({
				canvas,
				width: containerEl.clientWidth,
				height: 140 + (totalLanes - 1) * 35,
				backgroundAlpha: 0,
				antialias: true,
				resolution: window.devicePixelRatio,
				autoDensity: true
			});

			containerEl.appendChild(app.canvas);

			trackLane = new Graphics();
			app.stage.addChild(trackLane);

			targetZonesContainer = new Container();
			app.stage.addChild(targetZonesContainer);

			laserLine = new Graphics();
			app.stage.addChild(laserLine);

			noteContainer = new Container();
			maskGfx = new Graphics();
			app.stage.addChild(maskGfx);
			noteContainer.mask = maskGfx;
			app.stage.addChild(noteContainer);

			redrawGraphics(totalLanes, containerEl.clientWidth);

			const renderLoop = () => {
				if (app && noteContainer && containerEl) {
					const hitLineX = containerEl.clientWidth * 0.4;
					updatePreviewNotes(app, noteContainer, hitLineX);
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
			effectUnsub();
			if (app) {
				app.destroy(true);
				app = null;
			}
		};
	});

	function updatePreviewNotes(app: Application, container: Container, hitLineX: number) {
		for (const node of nodePool) {
			node.active = false;
			node.container.visible = false;
		}

		const height = app.screen.height;
		const yCenter = height / 2;
		const laneSpacing = 35;

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

			const laneY = yCenter + ((noteObj.laneIndex ?? 0) - (totalLanes - 1) / 2) * laneSpacing;

			const node = acquireNode(container, noteObj.char, fingerColor, isSelected);
			node.container.position.set(noteX, laneY);
		}
	}
</script>

<div class="bg-surface border-4 border-secondary p-4 rounded-xl shadow-[5px_5px_0px_#1a0033] flex flex-col gap-2 select-none">
	<div class="flex items-center justify-between">
		<h3 class="text-xs font-black uppercase text-accent tracking-wider flex items-center gap-2">
			<span class="w-2.5 h-2.5 rounded-full bg-accent animate-ping"></span>
			{$_('beatmap_editor.track_preview')}
		</h3>
		<span class="text-[10px] font-mono font-black text-text-dim uppercase">
			{$_('beatmap_editor.speed_px', { values: { speed: GAME.noteSpeed } })}
		</span>
	</div>
	<div bind:this={containerEl} style="height: {140 + (totalLanes - 1) * 35}px" class="w-full relative overflow-hidden rounded-lg"></div>
</div>
