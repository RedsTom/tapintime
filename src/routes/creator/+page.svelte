<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import { getCustomBeatmaps } from '$lib/storage';
	import type { MapInfo } from '$lib/features/beatmap/types';
	import { Music, Layout as LayoutIcon, Plus, Wrench, Sparkles, ArrowRight, Edit2, Trash2 } from '@lucide/svelte';
	import { deleteCustomBeatmap } from '$lib/storage';

	let maps = $state<MapInfo[]>([]);

	onMount(async () => {
		await loadMaps();
	});

	async function loadMaps() {
		const customMaps = await getCustomBeatmaps();
		const mappedCustoms: MapInfo[] = customMaps.map((cm) => ({
			id: cm.id,
			title: cm.title,
			artist: cm.artist,
			mapper: 'Moi',
			bpm: cm.bpm,
			difficulty: cm.difficulty.toUpperCase(),
			noteCount: cm.manifest.hitObjects.length
		}));
		maps = mappedCustoms;
	}

	function editLevel(id: string) {
		window.location.href = `/creator/beatmap?edit=${id}`;
	}

	async function deleteLevel(id: string, e: MouseEvent) {
		e.stopPropagation();
		if (confirm('Voulez-vous vraiment supprimer cette beatmap ?')) {
			await deleteCustomBeatmap(id);
			await loadMaps();
		}
	}
</script>

<div class="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-10 text-left select-none pb-24">
	<!-- En-tête de la page Studio -->
	<div class="flex flex-col gap-2 border-b-4 border-secondary pb-6">
		<span class="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-1.5">
			<Sparkles class="w-4 h-4" /> STUDIO DE CRÉATION
		</span>
		<h1 class="text-3xl md:text-4xl font-black uppercase text-primary tracking-wider">
			Éditeurs TapInTime
		</h1>
		<p class="text-sm font-bold text-text-dim uppercase">
			Gérez et éditez vos cartes de jeu ou personnalisez la disposition de votre clavier.
		</p>
	</div>

	<!-- Section 1: Éditeur de Beatmaps -->
	<div class="bg-surface border-4 border-secondary p-6 md:p-8 rounded-2xl shadow-[8px_8px_0px_#1a0033] flex flex-col gap-6">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-secondary/30 pb-4">
			<div class="flex items-center gap-4">
				<div class="w-14 h-14 bg-primary/20 border-4 border-primary rounded-xl flex items-center justify-center text-primary shrink-0">
					<Music class="w-7 h-7" />
				</div>
				<div>
					<h2 class="text-2xl font-black uppercase text-primary">Éditeur de Beatmaps</h2>
					<p class="text-xs font-bold text-text-dim uppercase mt-0.5">
						Créez de nouvelles cartes ou modifiez vos cartes existantes
					</p>
				</div>
			</div>

			<Button variant="primary" size="large" onclick={() => (window.location.href = '/creator/beatmap')}>
				<Plus class="w-5 h-5" /> CRÉER UN NOUVEAU NIVEAU
			</Button>
		</div>

		<!-- Liste des niveaux pour édition -->
		<div class="flex flex-col gap-3">
			<h3 class="text-xs font-black uppercase tracking-wider text-text-dim">
				Vos cartes créées ({maps.length}) :
			</h3>

			{#if maps.length === 0}
				<div class="p-6 text-center rounded-xl border-2 border-dashed border-secondary/50 bg-secondary/15 text-text-dim font-black uppercase text-xs tracking-wider">
					Aucune carte créée pour le moment. Cliquez sur "Créer un nouveau niveau" pour commencer !
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
					{#each maps as map}
						<div
							onclick={() => editLevel(map.id)}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && editLevel(map.id)}
							class="bg-bg border-4 border-secondary p-4 rounded-xl flex items-center justify-between transition-all hover:border-primary hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#1a0033] cursor-pointer group select-none"
						>
							<div class="flex flex-col text-left min-w-0 pr-2">
								<div class="flex items-center gap-2">
									<span class="font-black text-base text-text uppercase group-hover:text-primary transition-colors truncate">
										{map.title}
									</span>
									<span class="px-2 py-0.5 text-[9px] font-black uppercase rounded border border-secondary bg-accent text-secondary shrink-0">
										{map.difficulty}
									</span>
								</div>
								<span class="text-xs font-bold text-text-dim uppercase truncate mt-1">
									{map.artist} • <span class="text-text">{map.noteCount} notes</span> • {map.bpm} BPM
								</span>
							</div>

							<div class="flex items-center gap-2 shrink-0">
								<button
									onclick={(e) => {
										e.stopPropagation();
										editLevel(map.id);
									}}
									class="p-2 border-2 border-secondary bg-primary text-secondary rounded-lg font-black text-xs uppercase flex items-center gap-1 hover:scale-105 transition-transform"
									title="Éditer cette map"
								>
									<Edit2 class="w-4 h-4" /> Éditer
								</button>

								<button
									onclick={(e) => deleteLevel(map.id, e)}
									class="p-2 border-2 border-secondary bg-accent text-secondary rounded-lg hover:scale-105 transition-transform"
									title="Supprimer"
								>
									<Trash2 class="w-4 h-4 text-secondary" />
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Section 2: Éditeur de Layouts -->
	<div class="bg-surface border-4 border-secondary p-6 md:p-8 rounded-2xl shadow-[8px_8px_0px_#1a0033] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
		<div class="flex items-center gap-4">
			<div class="w-14 h-14 bg-accent/20 border-4 border-accent rounded-xl flex items-center justify-center text-accent shrink-0">
				<LayoutIcon class="w-7 h-7" />
			</div>
			<div>
				<h2 class="text-2xl font-black uppercase text-accent">Éditeur de Layouts Clavier</h2>
				<p class="text-xs font-bold text-text-dim uppercase mt-0.5">
					Modifiez la disposition des touches et réattribuez les couleurs de vos doigts.
				</p>
			</div>
		</div>

		<Button variant="accent" size="large" onclick={() => (window.location.href = '/creator/layout')}>
			<Wrench class="w-5 h-5" /> OUVRIR L'ÉDITEUR DE LAYOUTS
		</Button>
	</div>
</div>
