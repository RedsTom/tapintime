<script lang="ts">
	import type { RankGrade, MapScore } from '$lib/features/progression/progression';
	import type { MapInfo } from '$lib/features/beatmap/types';
	import { MoreVertical, Edit2, Trash2 } from '@lucide/svelte';

	let {
		map,
		mapScore,
		id = map?.id ?? '',
		title = map?.title ?? '',
		artist = map?.artist ?? '',
		mapper = map?.mapper,
		bpm = map?.bpm,
		difficulty = map?.difficulty,
		highScore = mapScore?.score,
		grade = mapScore?.grade,
		isSelected = false,
		onSelect,
		onEdit,
		onDelete
	}: {
		map?: MapInfo;
		mapScore?: MapScore;
		id?: string;
		title?: string;
		artist?: string;
		mapper?: string;
		bpm?: number;
		difficulty?: string;
		highScore?: number;
		grade?: RankGrade;
		isSelected?: boolean;
		onSelect?: (id: string) => void;
		onEdit?: () => void;
		onDelete?: () => void;
	} = $props();

	let isMenuOpen = $state(false);

	const gradeColors: Record<RankGrade, string> = {
		SS: '#ffc145',
		S: '#80D39B',
		A: '#5995ED',
		B: '#AB47BC',
		C: '#FF9800',
		D: '#f9564f'
	};

	function toggleMenu(e: MouseEvent) {
		e.stopPropagation();
		isMenuOpen = !isMenuOpen;
	}

	function handleEdit(e: MouseEvent) {
		e.stopPropagation();
		isMenuOpen = false;
		onEdit?.();
	}

	function handleDelete(e: MouseEvent) {
		e.stopPropagation();
		isMenuOpen = false;
		onDelete?.();
	}
</script>

<div class="relative w-full select-none mb-1 group {isMenuOpen ? 'z-40' : 'z-0'}">
	<div 
		class="absolute inset-0 border-4 border-secondary rounded-lg translate-x-[4px] translate-y-[4px] transition-colors duration-150 {isSelected ? 'bg-accent' : 'bg-secondary'}"
	></div>

	<div 
		onclick={() => onSelect?.(id)}
		class="
			relative border-4 border-secondary p-3.5 md:p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between 
			transition-all duration-150 ease-out cursor-pointer select-none text-left gap-3
			{isSelected 
				? 'bg-primary text-secondary translate-x-[2px] translate-y-[2px]' 
				: 'bg-surface text-text hover:bg-secondary/40 hover:translate-x-[1px] hover:translate-y-[1px]'
			}
		"
	>
		<div class="flex flex-col gap-0.5 min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<h3 class="text-base font-black uppercase tracking-wider leading-tight truncate">
					{title}
				</h3>
				{#if difficulty}
					<span 
						class="
							px-2 py-0.5 text-[9px] font-black uppercase rounded border-2 border-secondary shrink-0
							{isSelected ? 'bg-secondary text-primary' : 'bg-accent text-secondary'}
						"
					>
						{difficulty}
					</span>
				{/if}
			</div>

			<div class="text-[11px] font-bold uppercase tracking-wider flex flex-wrap items-center gap-x-2 gap-y-0.5 {isSelected ? 'text-secondary/80' : 'text-text-dim'}">
				<span>{artist}</span>
				{#if mapper}
					<span>• Map par {mapper}</span>
				{/if}
				{#if bpm}
					<span>• {bpm} BPM</span>
				{/if}
			</div>
		</div>

		<div class="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-secondary/20 pt-2 md:pt-0 shrink-0">
			{#if highScore !== undefined && highScore > 0}
				<div class="flex flex-col text-left md:text-right">
					<span class="text-[9px] font-black uppercase {isSelected ? 'text-secondary/70' : 'text-text-dim'}">Meilleur Score</span>
					<span class="text-xs font-black tracking-wide">{highScore.toLocaleString()}</span>
				</div>
			{/if}

			{#if grade}
				<div 
					class="
						w-9 h-9 rounded-full border-4 border-secondary flex items-center justify-center font-black text-sm 
						shadow-[2px_2px_0px_0px_var(--color-secondary)] transition-transform group-hover:scale-105
					"
					style="background-color: {gradeColors[grade]}; color: #150029;"
				>
					{grade}
				</div>
			{/if}

			{#if onEdit || onDelete}
				<div class="relative shrink-0">
					<button
						onclick={toggleMenu}
						class="p-1.5 rounded-lg border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 text-text transition-all cursor-pointer"
						title="Options de la map"
					>
						<MoreVertical class="w-4 h-4" />
					</button>

					{#if isMenuOpen}
						<div 
							class="fixed inset-0 z-40" 
							onclick={(e) => {
								e.stopPropagation();
								isMenuOpen = false;
							}}
						></div>

						<div class="absolute right-0 top-full mt-1.5 z-50 bg-surface border-4 border-secondary rounded-lg shadow-[4px_4px_0px_#1a0033] p-1 flex flex-col gap-1 w-36 select-none">
							{#if onEdit}
								<button
									onclick={handleEdit}
									class="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-black uppercase text-text hover:bg-primary/20 hover:text-primary transition-all text-left cursor-pointer"
								>
									<Edit2 class="w-3.5 h-3.5" /> Éditer
								</button>
							{/if}
							{#if onDelete}
								<button
									onclick={handleDelete}
									class="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-black uppercase text-accent hover:bg-accent/20 transition-all text-left cursor-pointer"
								>
									<Trash2 class="w-3.5 h-3.5 text-accent" /> Supprimer
								</button>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
