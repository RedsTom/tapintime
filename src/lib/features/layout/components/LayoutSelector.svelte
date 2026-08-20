<script lang="ts">
	import { createTabs, melt } from '@melt-ui/svelte';
	import type { Layout } from '../schemas/titl';
	import { LayoutSchema } from '../schemas/titl';

	let {
		selectedLayout = $bindable('azerty'),
		onSelect
	}: {
		selectedLayout?: string;
		onSelect?: (layout: Layout, name: string) => void;
	} = $props();

	const layouts = [
		{ name: 'azerty', label: 'AZERTY', desc: 'Français standard' },
		{ name: 'qwerty', label: 'QWERTY', desc: 'International' },
		{ name: 'ergo-l', label: 'Ergo-L', desc: 'Ergonomique FR' }
	];

	const {
		elements: { root, list, trigger, content },
		states: { value: meltValue }
	} = createTabs({
		defaultValue: selectedLayout
	});

	// Sync Melt state -> prop and load layout
	$effect(() => {
		const val = $meltValue;
		if (val && val !== selectedLayout) {
			loadLayout(val);
		}
	});

	// Sync prop -> Melt state
	$effect(() => {
		if (selectedLayout !== $meltValue) {
			meltValue.set(selectedLayout);
		}
	});

	async function loadLayout(name: string) {
		const res = await fetch(`/layouts/${name}.titl`);
		const raw = await res.json();
		const parsed = LayoutSchema.parse(raw);
		selectedLayout = name;
		onSelect?.(parsed, name);
	}
</script>

<div use:melt={$root} class="w-full flex flex-col gap-4 select-none">
	<h2 class="text-lg font-black uppercase tracking-wider text-text-dim text-left">
		Choisir une disposition (Layout)
	</h2>

	<div use:melt={$list} class="flex flex-col sm:flex-row gap-4 w-full">
		{#each layouts as layout}
			{@const active = $meltValue === layout.name}
			<button 
				use:melt={$trigger(layout.name)}
				class="
					flex-1 flex flex-col items-start p-4 border-4 border-secondary rounded-lg transition-all text-left
					relative select-none cursor-pointer
					{active 
						? 'bg-primary text-secondary shadow-[4px_4px_0px_0px_var(--color-secondary)] translate-x-[-2px] translate-y-[-2px]' 
						: 'bg-secondary/35 text-text hover:bg-secondary/50 shadow-none'
					}
				"
			>
				<div class="font-black text-lg md:text-xl tracking-wider uppercase leading-none">
					{layout.label}
				</div>
				<div class="text-xs font-bold uppercase tracking-wider mt-1 opacity-75">
					{layout.desc}
				</div>
			</button>
		{/each}
	</div>

	{#each layouts as layout}
		<div use:melt={$content(layout.name)} class="w-full"></div>
	{/each}
</div>
