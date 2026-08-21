<script lang="ts">
	import type { BeatmapEditorState } from '../beatmapEditorState.svelte';
	import { getKeyTiersForLayout } from '$lib/features/progression/progression';
	import { Layers, Award, Eye } from '@lucide/svelte';
	import { _ } from '$lib/i18n';

	let { editor }: { editor: BeatmapEditorState } = $props();

	const activeTiers = $derived(getKeyTiersForLayout(null));
</script>

<div class="bg-surface border-4 border-secondary p-4 rounded-xl shadow-[5px_5px_0px_#1a0033] flex flex-col gap-3 select-none">
	<div class="flex items-center justify-between border-b-2 border-secondary pb-2">
		<h3 class="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-2">
			<Eye class="w-4 h-4 text-accent" />
			{$_('beatmap_editor.preview_layout_title')}
		</h3>
	</div>

	<!-- Configuration de Prévisualisation -->
	<div class="flex flex-col gap-3">
		<!-- Choix du Layout -->
		<div class="flex flex-col gap-1 text-left">
			<label for="editor-layout-select" class="text-[10px] font-black uppercase text-text-dim flex items-center gap-1">
				<Layers class="w-3 h-3 text-accent" /> {$_('beatmap_editor.keyboard_layout')}
			</label>
			<select
				id="editor-layout-select"
				bind:value={editor.selectedLayoutName}
				class="w-full bg-surface text-text border-2 border-secondary font-mono font-black text-xs uppercase rounded p-2 focus:outline-none focus:border-primary shadow-[2px_2px_0px_#1a0033] cursor-pointer"
			>
				<option value="azerty">AZERTY</option>
				<option value="qwerty">QWERTY</option>
				<option value="ergo-l">ERGO-L</option>
			</select>
		</div>

		<!-- Choix du Palier de Progression -->
		<div class="flex flex-col gap-1 text-left">
			<label for="editor-tier-select" class="text-[10px] font-black uppercase text-text-dim flex items-center gap-1">
				<Award class="w-3 h-3 text-primary" /> {$_('beatmap_editor.playability_tier')}
			</label>
			<select
				id="editor-tier-select"
				bind:value={editor.selectedTierLevel}
				class="w-full bg-surface text-text border-2 border-secondary font-mono font-black text-xs uppercase rounded p-2 focus:outline-none focus:border-primary shadow-[2px_2px_0px_#1a0033] cursor-pointer"
			>
				<option value={15}>{$_('beatmap_editor.all_keys_option')}</option>
				{#each activeTiers as tier}
					<option value={tier.tier}>
						Palier {tier.tier} ({tier.name})
					</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Badge d'information -->
	<div class="bg-secondary/15 border-2 border-secondary p-2.5 rounded-lg text-[10px] font-bold uppercase text-text-dim text-left leading-relaxed">
		{$_('beatmap_editor.simulation_notice')}
	</div>
</div>
