<script lang="ts">
	import { COLORS } from '$lib/tokens';
	import { FINGER_COLORS, getFingerColor, isColorDark } from '../fingerColors';
	import type { Layout, Key } from '../schemas/titl';
	import { Lock, Layers } from '@lucide/svelte';

	let {
		layout,
		activeLayerIndex = 0,
		pressedKeys = new Set<string>(),
		incomingKeys = new Set<string>(),
		unlockedKeys = new Set<string>(['f', 'j']),
		scale = 1.0,
		selectable = false,
		selectedKeys = new Set<string>(),
		onKeyToggle = (char: string) => {}
	}: {
		layout: Layout;
		activeLayerIndex?: number;
		pressedKeys?: Set<string>;
		incomingKeys?: Set<string>;
		unlockedKeys?: Set<string>;
		scale?: number;
		selectable?: boolean;
		selectedKeys?: Set<string>;
		onKeyToggle?: (char: string) => void;
	} = $props();

	// Physical row stagger offsets for standard keyboards
	const rowStaggerOffsets: Record<number, number> = {
		0: 0,
		1: 0,
		2: 0,
		3: 0
	};

	// Group keys by row (y coordinate) for active layer
	const rows = $derived.by(() => {
		const targetLayer = layout.layers[activeLayerIndex] ?? layout.layers[0];
		const baseKeys = targetLayer?.keys ?? [];
		const rowMap = new Map<number, Key[]>();

		for (const key of baseKeys) {
			const y = key.y ?? 0;
			if (!rowMap.has(y)) {
				rowMap.set(y, []);
			}
			rowMap.get(y)!.push(key);
		}

		return Array.from(rowMap.entries())
			.sort(([y1], [y2]) => y1 - y2)
			.map(([_, keys]) => keys.sort((k1, k2) => k1.x - k2.x));
	});

	function isPressed(key: Key): boolean {
		return pressedKeys.has(key.keyCode) || pressedKeys.has(key.char.toLowerCase());
	}

	function isIncoming(key: Key): boolean {
		const char = key.char.toLowerCase();
		return incomingKeys.has(char) || incomingKeys.has(key.char.toUpperCase());
	}

	function isUnlocked(key: Key): boolean {
		const char = key.char.toLowerCase();
		return unlockedKeys.has(char) || unlockedKeys.size === 0;
	}
</script>

<div
	class="flex flex-col gap-1.5 md:gap-2 p-4 md:p-5 bg-secondary/30 border-4 border-secondary rounded-xl shadow-neo select-none w-fit mx-auto transition-transform duration-100"
	style="transform: scale({scale}); transform-origin: center bottom;"
>
	{#each rows as rowKeys, rowIndex}
		{@const rowOffset = rowStaggerOffsets[rowIndex] ?? 0}

		<div
			class="flex justify-center gap-1.5 md:gap-2"
			style="transform: translateX({rowOffset}px);"
		>
			{#each rowKeys as key}
				{@const pressed = isPressed(key)}
				{@const incoming = isIncoming(key)}
				{@const unlocked = isUnlocked(key)}
				{@const fingerColor = getFingerColor(key.finger)}
				{@const lightText = isColorDark(fingerColor)}

				<button
					type="button"
					onclick={() => {
						if (selectable && unlocked) {
							onKeyToggle(key.char.toLowerCase());
						}
					}}
					disabled={selectable && !unlocked}
					data-key={key.char.toLowerCase()}
					data-code={key.keyCode.toLowerCase()}
					data-finger-color={fingerColor}
					data-light-text={lightText}
					data-unlocked={unlocked}
					data-modifier={key.isModifier}
					class="
						keyboard-key relative w-10 h-10 md:w-12 md:h-12 border-2 border-secondary rounded-lg flex flex-col items-center justify-center
						font-mono font-black text-xs md:text-sm uppercase transition-all select-none
						{selectable
							? !unlocked
								? 'bg-secondary/10 text-text-dim border-dashed opacity-25 shadow-none cursor-not-allowed'
								: selectedKeys.has(key.char.toLowerCase())
									? 'bg-bg text-text shadow-[2px_2px_0px_0px_var(--color-secondary)] cursor-pointer'
									: 'bg-secondary/5 text-text-dim border-dashed opacity-40 hover:opacity-70 cursor-pointer shadow-none'
							: !unlocked
								? 'bg-secondary/10 text-text-dim border-dashed opacity-45 shadow-none cursor-not-allowed'
								: pressed
									? 'translate-x-[2px] translate-y-[2px] shadow-none border-secondary'
									: incoming
										? 'animate-pulse'
										: 'bg-bg text-text shadow-[2px_2px_0px_0px_var(--color-secondary)] hover:border-text-dim'
						}
					"
					style={
						selectable
							? unlocked && selectedKeys.has(key.char.toLowerCase())
								? `background-color: ${fingerColor}; color: ${lightText ? '#ffffff' : '#150029'};`
								: ''
							: !unlocked
								? ''
								: pressed
									? `background-color: ${fingerColor}; color: ${lightText ? '#ffffff' : '#150029'}; border-color: #0B0014;`
									: incoming
										? `background-color: ${fingerColor}33; border-color: ${fingerColor}; color: ${fingerColor}; box-shadow: 2px 2px 0px 0px ${fingerColor};`
										: key.isModifier
											? `border-color: ${COLORS.accent};`
											: ''
					}
				>
					{#if !unlocked}
						<Lock class="w-3.5 h-3.5 md:w-4 md:h-4 text-text-dim" />
					{:else}
						<span class="absolute top-1 left-2 text-[10px] md:text-xs leading-none">{key.char}</span>
					{/if}

					{#if key.isModifier && unlocked}
						<span class="absolute top-0.5 right-1 text-[7px] font-black text-accent uppercase leading-none">
							{key.targetLayer ? key.targetLayer.slice(0, 4) : 'MOD'}
						</span>
					{/if}

					{#if unlocked}
						<span
							class="keyboard-dot w-1.5 h-1.5 rounded-full absolute bottom-1.5 left-1/2 -translate-x-1/2 transition-opacity"
							style="background-color: {fingerColor}; opacity: {pressed ? 0 : 1};"
						></span>
					{/if}
				</button>
			{/each}
		</div>
	{/each}
</div>
