<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import { Music, ChevronRight } from '@lucide/svelte';
	import type { ParsedOszPackage, OszDifficultyItem } from '../types';
	import { _ } from '$lib/i18n';

	let {
		isOpen,
		oszPackage,
		onSelectDifficulty,
		onClose
	}: {
		isOpen: boolean;
		oszPackage: ParsedOszPackage | null;
		onSelectDifficulty: (item: OszDifficultyItem) => void;
		onClose: () => void;
	} = $props();
</script>

{#if isOpen && oszPackage}
	<Modal title={$_('osz_import.title')} close={onClose}>
		<div class="flex flex-col gap-4">
			<div class="bg-secondary/20 p-3 rounded-lg border-2 border-secondary">
				<div class="text-xs font-black uppercase text-primary tracking-wider">{oszPackage.artist}</div>
				<div class="text-lg font-black uppercase text-text">{oszPackage.title}</div>
				<div class="text-xs text-text-dim">{$_('osz_import.mapped_by', { values: { mapper: oszPackage.mapper } })}</div>
			</div>

			<p class="text-xs font-bold text-text-dim uppercase">
				{$_('osz_import.pack_contains', { values: { count: oszPackage.difficulties.length } })}
			</p>

			<div class="bg-[#FFc145]/20 border-2 border-[#ffc145] text-[#ffc145] p-3 rounded-lg text-[10px] font-black uppercase mt-1">
				{$_('osz_import.warning_notice')}
			</div>

			<div class="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 mt-2">
				{#each oszPackage.difficulties.slice().sort((a, b) => a.parsed.hitObjects.length - b.parsed.hitObjects.length) as diff}
					<button
						onclick={() => onSelectDifficulty(diff)}
						class="bg-surface hover:bg-secondary/40 border-2 border-secondary p-3 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer group"
					>
						<div>
							<div class="font-black text-sm text-primary group-hover:text-accent transition-colors">
								{diff.version}
							</div>
							<div class="text-[10px] font-bold text-text-dim uppercase">
								{$_('osz_import.notes_bpm', { values: { count: diff.parsed.hitObjects.length, bpm: diff.parsed.bpm } })}
							</div>
						</div>
						<ChevronRight class="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
					</button>
				{/each}
			</div>

			<div class="flex justify-end pt-2">
				<Button variant="secondary" size="md" onclick={onClose}>{$_('common.cancel')}</Button>
			</div>
		</div>
	</Modal>
{/if}
