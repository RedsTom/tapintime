<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { Music, ArrowLeft, Save, Download, Upload } from '@lucide/svelte';
	import type { BeatmapEditorState } from '../beatmapEditorState.svelte';
	import { _ } from '$lib/i18n';

	let { editor }: { editor: BeatmapEditorState } = $props();

	function handleAudioUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		editor.setAudioTrack(file, file.name);
	}
</script>

<header class="bg-surface border-4 border-secondary p-4 rounded-xl shadow-[6px_6px_0px_#1a0033] flex flex-col md:flex-row items-center justify-between gap-4">
	<div class="flex items-center gap-4">
		<a
			href="/"
			class="p-2 border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 rounded-lg text-text transition-all"
			title="Retour au menu"
		>
			<ArrowLeft class="w-5 h-5" />
		</a>
		<div>
			<h1 class="text-xl font-black uppercase text-primary tracking-wider leading-none">{$_('beatmap_editor.title')}</h1>
			<p class="text-xs font-bold text-text-dim uppercase mt-1">{$_('beatmap_editor.subtitle')}</p>
		</div>
	</div>

	<div class="flex items-center gap-3">
		<Button variant="primary" size="md" onclick={() => editor.saveBeatmap()}>
			<Save class="w-4 h-4" /> {$_('beatmap_editor.save')}
		</Button>
		<Button variant="secondary" size="md" onclick={() => editor.exportTitmPackage()}>
			<Download class="w-4 h-4" /> {$_('beatmap_editor.export')}
		</Button>
	</div>
</header>
