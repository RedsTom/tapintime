<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { COLORS } from '$lib/tokens';
	import { LayoutSchema, type Layout } from '$lib/schemas/titl';
	import { ManifestSchema, type Manifest } from '$lib/schemas/titm';
	import { loadLayoutByNameOrId, getCustomBeatmap } from '$lib/storage';
	import Game from '$lib/components/Game.svelte';

	const layoutName = $derived(page.url.searchParams.get('layout') ?? 'azerty');
	const mapName = $derived(page.url.searchParams.get('map') ?? 'tutorial');

	let layout = $state<Layout | null>(null);
	let manifest = $state<Manifest | null>(null);
	let audioBlob = $state<Blob | null>(null);
	let bgBlob = $state<Blob | undefined>(undefined);
	let isVideo = $state<boolean>(false);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			// 1. Load layout (custom or static preset)
			layout = await loadLayoutByNameOrId(layoutName);

			// 2. Check if custom map in localForage
			const customMap = await getCustomBeatmap(mapName);
			if (customMap) {
				manifest = customMap.manifest;
				bgBlob = customMap.bgBlob;
				isVideo = !!customMap.isVideo;

				if (customMap.audioBlob) {
					audioBlob = customMap.audioBlob;
				} else {
					// Fallback to tutorial audio if no custom audio provided
					const res = await fetch('/maps/tutorial.titm');
					const JSZip = (await import('jszip')).default;
					const zip = await JSZip.loadAsync(await res.arrayBuffer());
					const audioFile = zip.file('audio.mp3') ?? zip.file('audio.ogg');
					if (audioFile) audioBlob = await audioFile.async('blob');
				}
			} else {
				// 3. Fallback to static .titm file in /maps/
				const mapRes = await fetch(`/maps/${mapName}.titm`);
				if (!mapRes.ok) throw new Error(`Map "${mapName}" introuvable.`);
				const mapBuffer = await mapRes.arrayBuffer();

				const JSZip = (await import('jszip')).default;
				const zip = await JSZip.loadAsync(mapBuffer);

				const manifestFile = zip.file('manifest.json');
				if (!manifestFile) throw new Error('manifest.json manquant');
				const manifestRaw = JSON.parse(await manifestFile.async('text'));
				manifest = ManifestSchema.parse(manifestRaw);

				const audioFile = zip.file('audio.mp3') ?? zip.file('audio.ogg');
				if (!audioFile) throw new Error('Fichier audio manquant');
				audioBlob = await audioFile.async('blob');

				const videoFile = zip.file(/\.(mp4|webm|avi|mkv)$/i)[0];
				const imageFile = zip.file(/\.(jpg|jpeg|png|webp)$/i)[0];

				if (videoFile) {
					bgBlob = await videoFile.async('blob');
					isVideo = true;
				} else if (imageFile) {
					bgBlob = await imageFile.async('blob');
					isVideo = false;
				}
			}
		} catch (e) {
			error = String(e);
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center bg-bg w-full">
	{#if error}
		<div class="flex flex-col items-center gap-4 bg-secondary/30 border-4 border-secondary p-8 rounded-xl shadow-neo max-w-md text-center select-none">
			<div class="text-xl font-black text-accent uppercase tracking-wider">Erreur de Chargement</div>
			<div class="text-xs font-mono text-text-dim max-w-xs break-all bg-secondary/20 p-3 border-2 border-secondary rounded-lg my-1">{error}</div>
			<a 
				href="/" 
				class="border-4 border-secondary bg-primary text-secondary px-5 py-2.5 rounded-lg font-black uppercase text-xs md:text-sm shadow-neo-hover hover:translate-x-[1px] hover:translate-y-[1px]"
			>
				← Retour menu
			</a>
		</div>
	{:else if layout && manifest && audioBlob}
		<Game {layout} {manifest} {audioBlob} {bgBlob} {isVideo} mapId={mapName} />
	{:else}
		<div class="flex flex-col items-center gap-3">
			<div class="w-12 h-12 rounded-full border-4 border-t-primary border-secondary animate-spin"></div>
			<div class="font-black text-text-dim text-xs uppercase tracking-wider">Chargement de la map...</div>
		</div>
	{/if}
</div>
