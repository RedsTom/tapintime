<script lang="ts">
	import { ArrowRight, ArrowLeft, Eye } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import VirtualKeyboard from '$lib/components/VirtualKeyboard.svelte';
	import { getUnlockedKeys } from '$lib/features/progression/progression';
	import type { Layout } from '$lib/schemas/titl';
	import { _ } from '$lib/i18n';

	let {
		layoutFamiliarity = $bindable(),
		previewLayout,
		onNext,
		onPrev
	}: {
		layoutFamiliarity: number;
		previewLayout: Layout | null;
		onNext: () => void;
		onPrev: () => void;
	} = $props();
</script>

<div class="flex flex-col gap-6 text-left">
	<div class="flex items-center justify-between">
		<button 
			onclick={onPrev}
			class="flex items-center gap-2 border-2 border-secondary bg-secondary/30 text-text font-black uppercase px-3 py-1.5 rounded-lg hover:bg-secondary/60 transition-all text-xs"
		>
			<ArrowLeft class="w-4 h-4" /> {$_('common.previous')}
		</button>
		<span class="text-xs font-black uppercase text-text-dim">{$_('onboarding.familiarity.title')}</span>
	</div>

	<div class="flex flex-col gap-2 mt-2">
		<label class="text-sm md:text-base font-black uppercase tracking-wider text-text flex items-center gap-2">
			<Eye class="w-5 h-5 text-primary" /> {$_('onboarding.familiarity.title')}
		</label>
		<span class="text-xs font-black uppercase text-text-dim/70 leading-tight">
			{$_('onboarding.familiarity.subtitle')}
		</span>
		
		<select bind:value={layoutFamiliarity} class="w-full bg-secondary/35 border-4 border-secondary text-text font-black uppercase text-sm p-3 rounded-lg outline-none focus:border-primary mt-2">
			{#each Array.from({length: 15}, (_, i) => i + 1) as tier}
				<option value={tier}>{$_('onboarding.familiarity.tier_label', { values: { tier } })}</option>
			{/each}
		</select>
	</div>

	{#if previewLayout}
		<div class="bg-surface border-4 border-secondary p-4 rounded-xl shadow-neo flex flex-col gap-4 text-center mt-2 relative overflow-hidden">
			<h3 class="text-xs font-black uppercase tracking-wider text-primary">{$_('onboarding.familiarity.unlocked_keys_count', { values: { count: getUnlockedKeys(0, previewLayout, layoutFamiliarity).length } })}</h3>
			<div class="w-full flex justify-center py-2 max-w-full overflow-x-auto scrollbar-none">
				<VirtualKeyboard 
					layout={previewLayout} 
					pressedKeys={new Set()} 
					unlockedKeys={new Set(getUnlockedKeys(0, previewLayout, layoutFamiliarity))}
					scale={0.7} 
				/>
			</div>
		</div>
	{/if}

	<div class="flex justify-end border-t-4 border-secondary pt-6 mt-4">
		<Button onclick={onNext} shortcut="ENTER">
			<span>
				{$_('common.next')} <ArrowRight class="inline w-5 h-5 ml-1" />
			</span>
		</Button>
	</div>
</div>
