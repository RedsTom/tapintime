<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import CalibrationTool from '$lib/features/calibration/components/CalibrationTool.svelte';
	import { _ } from '$lib/i18n';

	let {
		visualOffsetMs,
		audioOffsetMs,
		leniencyMode = $bindable(),
		onPrev,
		onSave
	}: {
		visualOffsetMs: number;
		audioOffsetMs: number;
		leniencyMode: 'strict' | 'normal' | 'facile';
		onPrev: () => void;
		onSave: (visualMs: number, audioMs: number) => void;
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
		<span class="text-xs font-black uppercase text-text-dim">{$_('onboarding.calibration.title')}</span>
	</div>

	<!-- Leniency Mode Selection in Onboarding -->
	<div class="flex flex-col gap-2 bg-secondary/15 border-2 border-secondary p-4 rounded-xl">
		<span class="text-xs font-black uppercase tracking-wider text-text flex items-center gap-2">
			{$_('onboarding.calibration.leniency_title')}
		</span>
		<span class="text-[10px] font-black uppercase text-text-dim/70 -mt-1 leading-tight text-left">
			{$_('settings.controls_section.subtitle')}
		</span>
		<div class="grid grid-cols-3 gap-2 w-full mt-1">
			{#each ['facile', 'normal', 'strict'] as leniency}
				{@const selected = leniencyMode === leniency}
				<button
					onclick={() => leniencyMode = leniency as any}
					class="
						border-2 border-secondary py-2 rounded-lg font-black uppercase text-xs transition-all select-none cursor-pointer text-center
						{selected
							? 'bg-primary text-secondary shadow-[2px_2px_0px_0px_#f9564f]'
							: 'bg-secondary/35 text-white hover:bg-secondary/50 shadow-none'
						}
					"
				>
					{$_(`settings.controls_section.leniency_${leniency}`)}
				</button>
			{/each}
		</div>
	</div>

	<CalibrationTool
		{visualOffsetMs}
		{audioOffsetMs}
		{onSave}
	/>
</div>
