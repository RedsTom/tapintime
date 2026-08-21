<script lang="ts">
	import type { Layer, Key } from '../schemas/titl';
	import { Layers, Plus, Copy, Trash2, Edit2, Check } from '@lucide/svelte';
	import { _ } from '$lib/i18n';

	let {
		layers,
		activeLayerIndex,
		onSelectLayer,
		onAddLayer,
		onDuplicateLayer,
		onRenameLayer,
		onDeleteLayer
	}: {
		layers: Layer[];
		activeLayerIndex: number;
		onSelectLayer: (index: number) => void;
		onAddLayer: (name: string, copyFromBase: boolean) => void;
		onDuplicateLayer: (index: number) => void;
		onRenameLayer: (index: number, newName: string) => void;
		onDeleteLayer: (index: number) => void;
	} = $props();

	let isAddingModalOpen = $state(false);
	let newLayerName = $state('');
	let copyFromBase = $state(true);

	let editingIndex = $state<number | null>(null);
	let editingName = $state('');

	function handleCreate() {
		if (!newLayerName.trim()) return;
		onAddLayer(newLayerName.trim(), copyFromBase);
		newLayerName = '';
		isAddingModalOpen = false;
	}

	function startRename(idx: number, currentName: string) {
		editingIndex = idx;
		editingName = currentName;
	}

	function confirmRename(idx: number) {
		if (editingName.trim()) {
			onRenameLayer(idx, editingName.trim());
		}
		editingIndex = null;
	}
</script>

<div class="bg-surface border-4 border-secondary p-4 rounded-xl shadow-[5px_5px_0px_#1a0033] flex flex-col gap-3 select-none">
	<div class="flex items-center justify-between border-b-2 border-secondary pb-2">
		<h3 class="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-2">
			<Layers class="w-4 h-4 text-primary" />
			{$_('layout_editor.layer_manager_title', { values: { count: layers.length } })}
		</h3>

		<button
			onclick={() => (isAddingModalOpen = true)}
			class="px-2.5 py-1 rounded border-2 border-secondary bg-primary text-secondary text-xs font-black uppercase transition-all flex items-center gap-1 cursor-pointer hover:translate-x-[1px]"
		>
			<Plus class="w-3.5 h-3.5" /> {$_('layout_editor.new_layer')}
		</button>
	</div>

	<!-- Barre d'Onglets de Couches -->
	<div class="flex flex-wrap items-center gap-2">
		{#each layers as layer, idx}
			{@const isActive = activeLayerIndex === idx}
			<div class="relative flex items-center">
				{#if editingIndex === idx}
					<div class="flex items-center gap-1 bg-surface border-2 border-primary px-2 py-1 rounded-lg">
						<input
							type="text"
							bind:value={editingName}
							class="w-24 bg-transparent font-mono font-black text-xs uppercase text-text focus:outline-none"
							onkeydown={(e) => e.key === 'Enter' && confirmRename(idx)}
						/>
						<button onclick={() => confirmRename(idx)} class="text-primary hover:text-text">
							<Check class="w-3.5 h-3.5" />
						</button>
					</div>
				{:else}
					<button
						onclick={() => onSelectLayer(idx)}
						class="px-3 py-1.5 rounded-lg border-2 font-mono font-black text-xs uppercase transition-all cursor-pointer flex items-center gap-2 shadow-[2px_2px_0px_#1a0033]
							{isActive
								? 'bg-primary text-secondary border-secondary shadow-[3px_3px_0px_#ff3366] scale-105 z-10'
								: 'bg-secondary/20 text-text border-secondary/40 hover:bg-secondary/40'}"
					>
						<span>{layer.name}</span>
						<span class="text-[9px] opacity-70">({layer.keys.length})</span>
					</button>

					{#if isActive}
						<div class="flex items-center gap-1 ml-1.5">
							<button
								onclick={() => startRename(idx, layer.name)}
								class="p-1 rounded border border-secondary bg-secondary/20 hover:bg-secondary/40 text-text-dim hover:text-text cursor-pointer"
								title="Renommer la couche"
							>
								<Edit2 class="w-3 h-3" />
							</button>
							<button
								onclick={() => onDuplicateLayer(idx)}
								class="p-1 rounded border border-secondary bg-secondary/20 hover:bg-secondary/40 text-text-dim hover:text-text cursor-pointer"
								title="Dupliquer la couche"
							>
								<Copy class="w-3 h-3" />
							</button>
							{#if layers.length > 1}
								<button
									onclick={() => onDeleteLayer(idx)}
									class="p-1 rounded border border-secondary bg-accent/20 hover:bg-accent text-accent hover:text-secondary cursor-pointer"
									title="Supprimer la couche"
								>
									<Trash2 class="w-3 h-3" />
								</button>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		{/each}
	</div>

	<!-- Modal d'Ajout de Nouvelle Couche -->
	{#if isAddingModalOpen}
		<div class="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="bg-surface border-4 border-secondary p-5 rounded-xl shadow-[8px_8px_0px_#1a0033] max-w-sm w-full flex flex-col gap-4 text-left">
				<h4 class="text-sm font-black uppercase text-primary border-b-2 border-secondary pb-1">
					{$_('layout_editor.add_layer_modal_title')}
				</h4>

				<div class="flex flex-col gap-1.5">
					<label for="new-layer-name-input" class="text-xs font-black uppercase text-text-dim">{$_('layout_editor.layer_name_hint')}</label>
					<input
						id="new-layer-name-input"
						type="text"
						bind:value={newLayerName}
						placeholder={$_('layout_editor.layer_name_placeholder')}
						class="w-full bg-surface border-2 border-secondary rounded p-2 text-xs font-black text-text uppercase focus:outline-none focus:border-primary"
					/>
				</div>

				<label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-text uppercase select-none">
					<input type="checkbox" bind:checked={copyFromBase} class="accent-primary w-4 h-4 cursor-pointer" />
					{$_('layout_editor.copy_base_keys')}
				</label>

				<div class="flex items-center justify-end gap-2 pt-2">
					<button
						onclick={() => (isAddingModalOpen = false)}
						class="px-3 py-1.5 rounded border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 text-text text-xs font-black uppercase cursor-pointer"
					>
						{$_('common.cancel')}
					</button>
					<button
						onclick={handleCreate}
						class="px-4 py-1.5 rounded border-2 border-secondary bg-primary text-secondary text-xs font-black uppercase cursor-pointer hover:translate-x-[1px]"
					>
						{$_('layout_editor.create_btn')}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
