<script lang="ts">
	import { createSlider, melt } from '@melt-ui/svelte';

	let {
		value = $bindable(50),
		min = 0,
		max = 100,
		step = 1,
		disabled = false,
		label,
		onchange
	}: {
		value: number;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		label?: string;
		onchange?: () => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	const {
		elements: { root, range, thumbs },
		states: { value: meltValue }
	} = createSlider({
		defaultValue: [value],
		min,
		max,
		step,
		disabled
	});

	// One-way: melt internal state → bindable prop
	$effect(() => {
		const val = $meltValue[0];
		if (value !== val) {
			value = val;
			onchange?.();
		}
	});
</script>

<div class="flex flex-col gap-2 w-full select-none">
	{#if label}
		<div class="flex justify-between items-center text-sm md:text-base font-black uppercase tracking-wider">
			<span class="text-text-dim">{label}</span>
			<span class="text-primary font-black bg-secondary border-2 border-secondary px-2 py-0.5 rounded">{value}</span>
		</div>
	{/if}
	<span 
		use:melt={$root} 
		class="relative flex h-6 w-full touch-none select-none items-center cursor-pointer disabled:opacity-50"
	>
		<span class="relative h-4 w-full grow rounded-full bg-secondary/80 border-4 border-secondary overflow-hidden">
			<span use:melt={$range} class="absolute h-full bg-accent"></span>
		</span>
		<span 
			use:melt={$thumbs[0]} 
			class="block h-7 w-7 rounded-md border-4 border-secondary bg-primary hover:bg-accent transition-all cursor-grab active:cursor-grabbing shadow-none hover:scale-105 active:scale-95"
		></span>
	</span>
</div>
