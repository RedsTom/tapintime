<script lang="ts">
	import { Key, Lock, Sparkles, Trophy } from '@lucide/svelte';
	import { getTierInfo, type KeyTier } from '../progression';
	import type { Layout } from '$lib/schemas/titl';
	import { _ } from '$lib/i18n';

	let { xp = 0, layout = null }: { xp?: number; layout?: Layout | null } = $props();

	const tierInfo = $derived(getTierInfo(xp, layout));
</script>

<div class="bg-surface border-4 border-secondary p-5 rounded-2xl shadow-[6px_6px_0px_#1a0033] flex flex-col gap-4 text-left select-none">
	<!-- Top: Palier Actuel et Prochain Palier -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-secondary/30 pb-3">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl border-2 border-secondary bg-primary text-secondary flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_#1a0033]">
				{tierInfo.currentTier.tier}
			</div>
			<div>
				<div class="text-[10px] font-black uppercase text-accent tracking-widest flex items-center gap-1">
					<Sparkles class="w-3 h-3" /> {$_('home.current_tier_unlocked')}
				</div>
				<div class="text-base font-black uppercase text-primary">
					{tierInfo.currentTier.name}
				</div>
			</div>
		</div>

		{#if tierInfo.nextTier}
			<div class="flex flex-col items-start sm:items-end text-left sm:text-right">
				<div class="text-[10px] font-black uppercase text-text-dim tracking-wider">
					{$_('home.next_tier')} <span class="text-text">{tierInfo.nextTier.name}</span>
				</div>
				<div class="text-xs font-bold text-primary">
					{$_('home.xp_remaining', { values: { remaining: tierInfo.xpNeededForNext, total: tierInfo.nextTier.xpRequired } })}
				</div>
				<div class="w-36 h-2.5 bg-bg border-2 border-secondary rounded-full overflow-hidden mt-1 relative">
					<div
						class="h-full bg-accent transition-all duration-300 rounded-full"
						style="width: {tierInfo.progressToNextRatio * 100}%"
					></div>
				</div>
			</div>
		{:else}
			<div class="text-xs font-black uppercase text-accent">
				{$_('home.all_tiers_unlocked')}
			</div>
		{/if}
	</div>

	<!-- Grille des 15 Paliers dans l'ordre (Traduits selon le layout actif) -->
	<div class="flex flex-wrap gap-2">
		{#each tierInfo.allTiers as tier}
			{@const isUnlocked = xp >= tier.xpRequired}
			{@const isCurrent = tier.tier === tierInfo.currentTier.tier}

			<div
				class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-mono font-black text-xs uppercase transition-all select-none
					{isCurrent
						? 'bg-primary text-secondary border-secondary shadow-[3px_3px_0px_#ff3366] scale-105 z-10'
						: isUnlocked
							? 'bg-secondary/40 text-text border-secondary'
							: 'bg-bg/40 text-text-dim border-secondary/40 opacity-50'}"
			>
				<span class="text-[10px] opacity-70">#{tier.tier}</span>
				<span>{tier.keys.join(', ')}</span>
				{#if !isUnlocked}
					<Lock class="w-3 h-3 text-text-dim ml-0.5" />
				{/if}
			</div>
		{/each}
	</div>
</div>
