<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import { Music, ChevronRight } from '@lucide/svelte';
	import type { ParsedOszPackage, OszDifficultyItem } from '../types';

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
	<Modal title="Sélectionner une difficulté" close={onClose}>
		<div class="flex flex-col gap-4">
			<div class="bg-secondary/20 p-3 rounded-lg border-2 border-secondary">
				<div class="text-xs font-black uppercase text-primary tracking-wider">{oszPackage.artist}</div>
				<div class="text-lg font-black uppercase text-text">{oszPackage.title}</div>
				<div class="text-xs text-text-dim">Mappé par {oszPackage.mapper}</div>
			</div>

			<p class="text-xs font-bold text-text-dim uppercase">
				Ce pack contient {oszPackage.difficulties.length} difficultés. Choisissez celle à importer :
			</p>

			<div class="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
				{#each oszPackage.difficulties as diff}
					<button
						onclick={() => onSelectDifficulty(diff)}
						class="bg-surface hover:bg-secondary/40 border-2 border-secondary p-3 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer group"
					>
						<div>
							<div class="font-black text-sm text-primary group-hover:text-accent transition-colors">
								{diff.version}
							</div>
							<div class="text-[10px] font-bold text-text-dim uppercase">
								{diff.parsed.hitObjects.length} notes • BPM {diff.parsed.bpm}
							</div>
						</div>
						<ChevronRight class="w-5 h-5 text-secondary group-hover:text-primary transition-colors" />
					</button>
				{/each}
			</div>

			<div class="flex justify-end pt-2">
				<Button variant="secondary" size="md" onclick={onClose}>Annuler</Button>
			</div>
		</div>
	</Modal>
{/if}
