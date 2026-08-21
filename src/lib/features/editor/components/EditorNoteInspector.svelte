<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { Trash2, Plus, Info, Edit3 } from '@lucide/svelte';
	import type { BeatmapEditorState } from '../beatmapEditorState.svelte';
	import { getFingerColorForKey, isColorDark } from '$lib/fingerColors';
	import { _ } from '$lib/i18n';

	let { editor }: { editor: BeatmapEditorState } = $props();

	const selectedNote = $derived(
		editor.selectedIndex !== null && editor.selectedIndex < editor.hitObjects.length
			? editor.hitObjects[editor.selectedIndex]
			: null
	);
</script>

<div class="bg-surface border-4 border-secondary p-4 rounded-xl shadow-[5px_5px_0px_#1a0033] flex flex-col gap-4 select-none">
	<div class="flex items-center justify-between border-b-2 border-secondary pb-2">
		<h3 class="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-2">
			<Info class="w-4 h-4 text-primary" />
			{selectedNote ? $_('beatmap_editor.note_number', { values: { number: editor.selectedIndex! + 1 } }) : $_('beatmap_editor.note_inspector')}
		</h3>

		{#if selectedNote}
			<button
				onclick={() => editor.deleteNote()}
				class="px-2 py-1 rounded border-2 border-secondary bg-accent/20 hover:bg-accent text-accent hover:text-secondary text-[11px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
			>
				<Trash2 class="w-3.5 h-3.5" /> {$_('common.delete')}
			</button>
		{:else}
			<button
				onclick={() => editor.addNoteAtCurrentTime()}
				class="px-2 py-1 rounded border-2 border-secondary bg-primary text-secondary text-[11px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer hover:translate-x-[1px]"
			>
				<Plus class="w-3.5 h-3.5" /> {$_('beatmap_editor.add_note')}
			</button>
		{/if}
	</div>

	<!-- Info Note Sélectionnée -->
	{#if selectedNote}
		{@const color = getFingerColorForKey(selectedNote.char)}
		{@const darkText = isColorDark(color)}
		<div class="flex flex-col gap-3 bg-secondary/15 border-2 border-secondary p-4 rounded-lg">
			<div class="flex items-center justify-between">
				<div class="flex flex-col text-left">
					<span class="text-[10px] font-black uppercase text-text-dim">{$_('beatmap_editor.hit_time')}</span>
					<span class="text-base font-mono font-black text-primary">{selectedNote.time} ms</span>
				</div>
				<div
					class="w-12 h-12 rounded-xl border-3 border-secondary font-mono font-black text-xl uppercase flex items-center justify-center shadow-[3px_3px_0px_#1a0033]"
					style="background-color: {color}; color: {darkText ? '#ffffff' : '#150029'};"
				>
					{selectedNote.char.toUpperCase()}
				</div>
			</div>

			<!-- Formulaire de modification rapide de la lettre -->
			<div class="flex flex-col gap-1.5 pt-2 border-t border-secondary/20">
				<label for="key-char-input" class="text-[10px] font-black uppercase text-text-dim text-left">{$_('beatmap_editor.change_key')}</label>
				<input
					id="key-char-input"
					type="text"
					maxLength={1}
					value={selectedNote.char.toUpperCase()}
					oninput={(e) => {
						const val = (e.target as HTMLInputElement).value;
						if (val) editor.changeSelectedNoteChar(val);
					}}
					class="w-full bg-surface border-2 border-secondary rounded p-2 font-mono font-black text-center text-lg uppercase text-text focus:outline-none focus:border-primary shadow-[2px_2px_0px_#1a0033]"
				/>
			</div>
		</div>
	{:else}
		<div class="bg-secondary/10 border-2 border-dashed border-secondary p-5 rounded-lg text-center text-xs font-bold uppercase text-text-dim flex flex-col items-center gap-2">
			<Edit3 class="w-6 h-6 text-text-dim opacity-50" />
			<span>{$_('beatmap_editor.no_note_selected')}</span>
			<span class="text-[10px] text-text-dim/80">{$_('beatmap_editor.note_inspector_help')}</span>
		</div>
	{/if}

	<!-- Statistiques de la Carte -->
	<div class="bg-secondary/10 border-2 border-secondary p-3 rounded-lg flex flex-col gap-2 text-left">
		<span class="text-[10px] font-black uppercase text-text-dim">{$_('beatmap_editor.map_stats')}</span>
		<div class="flex justify-between items-center text-xs font-bold uppercase">
			<span class="text-text-dim">{$_('beatmap_editor.note_count_label')}</span>
			<span class="font-mono font-black text-primary">{editor.hitObjects.length}</span>
		</div>
		<div class="flex justify-between items-center text-xs font-bold uppercase">
			<span class="text-text-dim">{$_('beatmap_editor.avg_density')}</span>
			<span class="font-mono font-black text-accent">
				{editor.duration > 0 ? (editor.hitObjects.length / editor.duration).toFixed(1) : 0} n/s
			</span>
		</div>
	</div>
</div>
