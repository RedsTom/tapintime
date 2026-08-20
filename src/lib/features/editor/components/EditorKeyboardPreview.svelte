<script lang="ts">
	import { onMount } from 'svelte';
	import type { BeatmapEditorState } from '../beatmapEditorState.svelte';
	import type { Layout } from '$lib/schemas/titl';
	import { loadLayoutByNameOrId } from '$lib/storage';
	import VirtualKeyboard from '$lib/components/VirtualKeyboard.svelte';
	import { Keyboard } from '@lucide/svelte';

	let { editor }: { editor: BeatmapEditorState } = $props();

	let currentLayout = $state<Layout | null>(null);

	$effect(() => {
		loadLayout(editor.selectedLayoutName);
	});

	async function loadLayout(name: string) {
		try {
			currentLayout = await loadLayoutByNameOrId(name);
		} catch (e) {
			console.error('Erreur chargement layout:', e);
		}
	}

	const unlockedKeyList = $derived(editor.getUnlockedKeyList());

	const unlockedKeys = $derived(
		unlockedKeyList.length > 0 ? new Set<string>(unlockedKeyList) : new Set<string>()
	);

	const adaptedNotes = $derived(editor.getAdaptedHitObjects());

	const currentTimeMs = $derived(editor.currentTime * 1000);

	// Calcul O(log N) ultra-rapide des touches pressées avec traduction en direct
	const pressedKeys = $derived.by(() => {
		const keys = new Set<string>();
		const t = currentTimeMs;
		const notes = adaptedNotes;

		for (let i = 0; i < notes.length; i++) {
			const note = notes[i];
			if (note.time > t + 150) break;
			if (Math.abs(note.time - t) <= 120) {
				keys.add(note.char);
			}
		}
		return keys;
	});

	// Calcul O(log N) ultra-rapide des touches arrivantes avec traduction en direct
	const incomingKeys = $derived.by(() => {
		const keys = new Set<string>();
		const t = currentTimeMs;
		const notes = adaptedNotes;

		for (let i = 0; i < notes.length; i++) {
			const note = notes[i];
			if (note.time > t + 800) break;
			const diff = note.time - t;
			if (diff > 120 && diff <= 800) {
				keys.add(note.char);
			}
		}
		return keys;
	});
</script>

<div class="bg-surface border-4 border-secondary p-4 rounded-xl shadow-[5px_5px_0px_#1a0033] flex flex-col gap-3 select-none">
	<!-- En-tête de configuration du Clavier -->
	<div class="flex items-center justify-between border-b-2 border-secondary pb-2">
		<div class="flex items-center gap-2">
			<Keyboard class="w-4 h-4 text-primary" />
			<h3 class="text-xs font-black uppercase text-primary tracking-wider">
				Aperçu Clavier Dynamique en Direct
			</h3>
		</div>
		<span class="text-[10px] font-mono font-black text-accent uppercase">
			Layout: {editor.selectedLayoutName.toUpperCase()} · Palier: {editor.selectedTierLevel}/15
		</span>
	</div>

	<!-- Rendu du Clavier Virtuel Dynamique -->
	{#if currentLayout}
		<div class="flex flex-col items-center justify-center py-1 overflow-x-auto">
			<VirtualKeyboard
				layout={currentLayout}
				{pressedKeys}
				{incomingKeys}
				{unlockedKeys}
				scale={0.9}
			/>
		</div>
	{:else}
		<div class="p-6 text-center text-xs font-mono font-black text-text-dim uppercase">
			Chargement de la disposition clavier...
		</div>
	{/if}
</div>
