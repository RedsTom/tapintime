<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import LevelCard from '$lib/components/LevelCard.svelte';
	import { loadProgression, type ProgressionData } from '$lib/features/progression/progression';
	import { loadSettings, type UserSettings } from '$lib/settings';
	import { getCustomBeatmaps, deleteCustomBeatmap, loadLayoutByNameOrId } from '$lib/storage';
	import type { Layout } from '$lib/schemas/titl';
	import { BeatmapImporter } from '$lib/features/beatmap/importers/beatmapImporter';
	import { AudioPreviewManager } from '$lib/features/beatmap/audioPreview';
	import PlayerBar from '$lib/features/beatmap/components/PlayerBar.svelte';
	import KeysProgressionWidget from '$lib/features/progression/components/KeysProgressionWidget.svelte';
	import OszImportModal from '$lib/features/beatmap/components/OszImportModal.svelte';
	import DragAndDropOverlay from '$lib/features/beatmap/components/DragAndDropOverlay.svelte';
	import type { MapInfo, ParsedOszPackage, OszDifficultyItem } from '$lib/features/beatmap/types';
	import { Upload, Search, Music, Plus, SlidersHorizontal, ArrowUpDown } from '@lucide/svelte';
	import { _ } from '$lib/i18n';

	type SortOption = 'recent' | 'difficulty' | 'name' | 'artist' | 'bpm' | 'notes';
	type SortOrder = 'asc' | 'desc';

	let maps = $state<MapInfo[]>([]);
	let selectedMapId = $state<string | null>(null);
	let searchQuery = $state<string>('');
	let sortBy = $state<SortOption>('recent');
	let sortOrder = $state<SortOrder>('desc');
	let progression = $state<ProgressionData | null>(null);
	let settings = $state<UserSettings | null>(null);
	let activeLayout = $state<Layout | null>(null);

	// Drag & drop state
	let isDraggingFile = $state(false);
	let dragCounter = 0;

	// OSZ Import modal state
	let oszPackage = $state<ParsedOszPackage | null>(null);
	let isOszModalOpen = $state(false);

	// Service pré-écoute audio
	const audioPreview = new AudioPreviewManager();
	let isMenuAudioPaused = $state(false);

	const selectedMap = $derived(selectedMapId ? maps.find((m) => m.id === selectedMapId) ?? null : null);
	const selectedMapScore = $derived(selectedMapId ? progression?.mapScores?.[selectedMapId] : undefined);

	const difficultyRank: Record<string, number> = {
		EASY: 1,
		FACILE: 1,
		NORMAL: 2,
		MOYEN: 2,
		HARD: 3,
		DIFFICILE: 3,
		EXPERT: 4,
		INSANE: 4,
		MASTER: 5
	};

	const filteredMaps = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		let list = maps.filter(
			(m) =>
				!query ||
				m.title.toLowerCase().includes(query) ||
				m.artist.toLowerCase().includes(query) ||
				m.difficulty.toLowerCase().includes(query)
		);

		return [...list].sort((a, b) => {
			let cmp = 0;
			if (sortBy === 'recent') {
				const dateA = progression?.mapScores?.[a.id]?.date ?? a.createdAt ?? 0;
				const dateB = progression?.mapScores?.[b.id]?.date ?? b.createdAt ?? 0;
				cmp = dateA - dateB;
			} else if (sortBy === 'difficulty') {
				const diffA = difficultyRank[a.difficulty.toUpperCase()] ?? 0;
				const diffB = difficultyRank[b.difficulty.toUpperCase()] ?? 0;
				cmp = diffA - diffB;
			} else if (sortBy === 'name') {
				cmp = a.title.localeCompare(b.title);
			} else if (sortBy === 'artist') {
				cmp = a.artist.localeCompare(b.artist);
			} else if (sortBy === 'bpm') {
				cmp = (a.bpm || 0) - (b.bpm || 0);
			} else if (sortBy === 'notes') {
				cmp = (a.noteCount || 0) - (b.noteCount || 0);
			}

			return sortOrder === 'asc' ? cmp : -cmp;
		});
	});

	$effect(() => {
		const targetId = selectedMapId;
		if (targetId) {
			untrack(() => audioPreview.playPreview(targetId));
		} else {
			untrack(() => audioPreview.stopPreview());
		}
	});

	onMount(() => {
		async function init() {
			progression = await loadProgression();
			settings = await loadSettings();
			try {
				activeLayout = await loadLayoutByNameOrId(settings.activeLayout);
			} catch {}
			await refreshMapsList();
		}
		init();

		window.addEventListener('keydown', handleGlobalKeys);
		window.addEventListener('dragenter', handleWindowDragEnter);
		window.addEventListener('dragover', handleWindowDragOver);
		window.addEventListener('dragleave', handleWindowDragLeave);
		window.addEventListener('drop', handleWindowDrop);

		return () => {
			audioPreview.stopPreview();
			window.removeEventListener('keydown', handleGlobalKeys);
			window.removeEventListener('dragenter', handleWindowDragEnter);
			window.removeEventListener('dragover', handleWindowDragOver);
			window.removeEventListener('dragleave', handleWindowDragLeave);
			window.removeEventListener('drop', handleWindowDrop);
		};
	});

	onDestroy(() => {
		audioPreview.stopPreview();
	});

	function handleWindowDragEnter(e: DragEvent) {
		e.preventDefault();
		if (!e.dataTransfer?.types.includes('Files')) return;
		dragCounter++;
		if (dragCounter === 1) isDraggingFile = true;
	}

	function handleWindowDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
	}

	function handleWindowDragLeave(e: DragEvent) {
		e.preventDefault();
		dragCounter--;
		if (dragCounter <= 0) {
			dragCounter = 0;
			isDraggingFile = false;
		}
	}

	async function handleWindowDrop(e: DragEvent) {
		e.preventDefault();
		dragCounter = 0;
		isDraggingFile = false;
		if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;
		await processFileImport(e.dataTransfer.files[0]);
	}

	async function processFileImport(file: File) {
		try {
			const result = await BeatmapImporter.importFile(file);
			if (result.oszPackage) {
				oszPackage = result.oszPackage;
				isOszModalOpen = true;
			} else if (result.mapId) {
				await refreshMapsList();
				selectedMapId = result.mapId;
			}
		} catch (err) {
			alert("Erreur lors de l'importation de la map : " + String(err));
		}
	}

	async function handleSelectOszDiff(diffItem: OszDifficultyItem) {
		if (!oszPackage) return;
		const mapId = await BeatmapImporter.importOszDifficulty(oszPackage, diffItem);
		isOszModalOpen = false;
		await refreshMapsList();
		selectedMapId = mapId;
	}

	async function refreshMapsList() {
		const customMaps = await getCustomBeatmaps();
		const mappedCustoms: MapInfo[] = customMaps.map((cm) => ({
			id: cm.id,
			title: cm.title,
			artist: cm.artist,
			mapper: 'Moi',
			bpm: cm.bpm,
			difficulty: cm.difficulty.toUpperCase(),
			noteCount: cm.manifest.hitObjects.length,
			audioBlob: cm.audioBlob,
			bgBlob: cm.bgBlob,
			coverBlob: cm.coverBlob,
			isVideo: cm.isVideo,
			createdAt: cm.createdAt
		}));

		maps = mappedCustoms;
	}

	function handleGlobalKeys(e: KeyboardEvent) {
		if (e.key === 'Enter' && !isOszModalOpen && selectedMap) startGame();
	}

	function startGame() {
		if (!selectedMap || !settings) return;
		audioPreview.stopPreview();
		window.location.href = `/play?map=${selectedMap.id}&layout=${settings.activeLayout}`;
	}

	function editMap(id: string) {
		audioPreview.stopPreview();
		window.location.href = `/creator/beatmap?edit=${id}`;
	}

	async function deleteMap(id: string) {
		if (confirm('Voulez-vous vraiment supprimer cette beatmap ?')) {
			await deleteCustomBeatmap(id);
			if (selectedMapId === id) selectedMapId = null;
			await refreshMapsList();
		}
	}

	function handleDeselect() {
		selectedMapId = null;
		audioPreview.stopPreview();
	}
</script>

<DragAndDropOverlay isDragging={isDraggingFile} />

<div class="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6 text-left select-none pb-32">
	<!-- Widget de Progression des Paliers de Touches Adapté au Layout Actif -->
	<KeysProgressionWidget xp={progression?.xp ?? 0} layout={activeLayout} />

	<!-- Barre de Recherche, Tri et Importation -->
	<div class="flex flex-col gap-3">
		<div class="flex items-center justify-between gap-4">
			<div class="relative flex-1">
				<Search class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder={$_('home.search_placeholder')}
					class="w-full bg-surface border-4 border-secondary rounded-2xl pl-12 pr-4 py-3 text-text font-black text-sm uppercase tracking-wider focus:outline-none focus:border-primary shadow-[5px_5px_0px_#1a0033]"
				/>
			</div>

			<label
				class="px-5 py-3 rounded-2xl border-4 border-secondary bg-primary text-secondary shadow-[5px_5px_0px_#1a0033] text-xs font-black uppercase cursor-pointer transition-transform hover:scale-105 flex items-center gap-2 shrink-0"
			>
				<Upload class="w-4 h-4" /> {$_('home.import_btn')}
				<input
					type="file"
					accept=".osz,.titm,.osu"
					onchange={(e) => {
						const input = e.target as HTMLInputElement;
						if (input.files?.[0]) processFileImport(input.files[0]);
						input.value = '';
					}}
					class="sr-only"
				/>
			</label>
		</div>

		<!-- Options de Tri & Compteur -->
		<div class="flex flex-wrap items-center justify-between gap-3 px-1">
			<div class="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wider text-text-dim">
				<SlidersHorizontal class="w-4 h-4 text-primary shrink-0" />
				<span>{$_('home.sort_by')}</span>
				<select
					bind:value={sortBy}
					class="bg-surface border-2 border-secondary rounded-lg px-3 py-1.5 text-text font-black text-xs uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_#1a0033] focus:outline-none focus:border-primary"
				>
					<option value="recent">{$_('home.sort_recent')}</option>
					<option value="difficulty">{$_('home.sort_difficulty')}</option>
					<option value="name">{$_('home.sort_title')}</option>
					<option value="artist">{$_('home.sort_artist')}</option>
					<option value="bpm">{$_('home.sort_bpm')}</option>
					<option value="notes">{$_('home.sort_notes')}</option>
				</select>

				<button
					onclick={() => (sortOrder = sortOrder === 'asc' ? 'desc' : 'asc')}
					class="border-2 border-secondary bg-surface text-primary px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_#1a0033] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center gap-1.5 font-black text-xs uppercase"
				>
					<ArrowUpDown class="w-3.5 h-3.5" />
					<span>{sortOrder === 'asc' ? $_('home.sort_asc') : $_('home.sort_desc')}</span>
				</button>
			</div>

			<div class="text-[11px] font-black uppercase tracking-wider text-text-dim">
				{$_('home.available_maps', { values: { count: filteredMaps.length } })}
			</div>
		</div>
	</div>

	<!-- Liste des cartes de niveaux -->
	<div class="flex flex-col gap-3">
		{#each filteredMaps as map (map.id)}
			<LevelCard
				{map}
				isSelected={selectedMapId === map.id}
				mapScore={progression?.mapScores?.[map.id]}
				onSelect={(id) => {
					if (selectedMapId === id) startGame();
					else selectedMapId = id;
				}}
				onEdit={() => editMap(map.id)}
				onDelete={map.id.startsWith('custom_') ? () => deleteMap(map.id) : undefined}
			/>
		{/each}

		{#if filteredMaps.length === 0}
			<div class="p-10 text-center rounded-2xl border-4 border-secondary bg-surface text-text-dim font-black uppercase text-xs tracking-wider flex flex-col items-center gap-4 shadow-[6px_6px_0px_#1a0033]">
				<div class="w-16 h-16 rounded-full border-4 border-secondary bg-secondary/20 flex items-center justify-center text-primary">
					<Music class="w-8 h-8" />
				</div>
				<div class="flex flex-col items-center gap-1">
					<span class="text-base text-text">{$_('home.no_maps_title')}</span>
					<span class="text-[11px] text-text-dim max-w-sm">{$_('home.no_maps_desc')}</span>
				</div>
				<a
					href="/creator/beatmap"
					class="border-4 border-secondary bg-primary text-secondary px-5 py-2.5 rounded-xl font-black uppercase text-xs shadow-[3px_3px_0px_#ff3366] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer flex items-center gap-2 mt-1"
				>
					<Plus class="w-4 h-4" /> {$_('home.create_map_btn')}
				</a>
			</div>
		{/if}
	</div>
</div>

<!-- Barre d'écoute fixe en bas de page pour le niveau sélectionné -->
{#if selectedMap}
	<PlayerBar
		{selectedMap}
		{selectedMapScore}
		{isMenuAudioPaused}
		onStartGame={startGame}
		onToggleAudio={() => (isMenuAudioPaused = audioPreview.toggle())}
		onDeselect={handleDeselect}
	/>
{/if}

<OszImportModal
	isOpen={isOszModalOpen}
	{oszPackage}
	onSelectDifficulty={handleSelectOszDiff}
	onClose={() => (isOszModalOpen = false)}
/>
