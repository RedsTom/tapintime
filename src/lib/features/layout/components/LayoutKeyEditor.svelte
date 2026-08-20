<script lang="ts">
	import Input from '$lib/components/Input.svelte';
	import { Trash2, ShieldAlert } from '@lucide/svelte';
	import type { Key, Finger, Layer } from '../schemas/titl';
	import { FINGER_COLORS, FINGER_LABELS } from '../fingerColors';

	let {
		key = $bindable(),
		index,
		layers = [],
		onRemoveKey
	}: {
		key: Key;
		index: number;
		layers?: Layer[];
		onRemoveKey: (index: number) => void;
	} = $props();

	const FINGERS: { id: Finger; label: string; color: string }[] = (
		Object.keys(FINGER_COLORS) as Finger[]
	).map((f) => ({
		id: f,
		label: FINGER_LABELS[f],
		color: FINGER_COLORS[f]
	}));
</script>

<div class="bg-surface border-4 border-secondary p-5 rounded-xl shadow-[5px_5px_0px_#ff3366] flex flex-col gap-4 text-left">
	<div class="flex items-center justify-between border-b-2 border-secondary pb-1.5">
		<h3 class="text-sm font-black uppercase tracking-wider text-accent">
			Édition Touche #{index + 1}
		</h3>
		<button
			onclick={() => onRemoveKey(index)}
			class="text-accent hover:text-red-400 p-1 transition-all cursor-pointer"
			title="Supprimer cette touche"
		>
			<Trash2 class="w-4 h-4" />
		</button>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<Input label="Caractère (char)" bind:value={key.char} placeholder="a" />
		<Input label="KeyCode (ex: KeyA)" bind:value={key.keyCode} placeholder="KeyA" />
	</div>

	<div class="grid grid-cols-2 gap-3">
		<Input label="Position X (0..10)" type="number" bind:value={key.x} />
		<Input label="Ligne Y (0..3)" type="number" bind:value={key.y} />
	</div>

	<div class="flex flex-col gap-1.5">
		<label for="finger-select" class="text-xs font-black uppercase tracking-wider text-text-dim">Doigt Assigné</label>
		<select
			id="finger-select"
			bind:value={key.finger}
			class="w-full bg-surface border-4 border-secondary rounded-lg px-3 py-2 text-text font-black text-xs uppercase tracking-wider focus:outline-none focus:border-primary shadow-[2px_2px_0px_#1a0033]"
		>
			{#each FINGERS as f}
				<option value={f.id}>{f.label}</option>
			{/each}
		</select>
	</div>

	<!-- Configuration de Touche Modifier / Accès aux Couches (Layers) -->
	<div class="bg-secondary/15 border-2 border-secondary p-3 rounded-lg flex flex-col gap-3">
		<label class="flex items-center gap-2 cursor-pointer text-xs font-black uppercase text-primary select-none">
			<input
				type="checkbox"
				bind:checked={key.isModifier}
				class="accent-primary w-4 h-4 cursor-pointer"
			/>
			<span>Touche Modifier / Accès Couche</span>
		</label>

		{#if key.isModifier}
			<div class="flex flex-col gap-3 pt-1 border-t border-secondary/20">
				<div class="grid grid-cols-2 gap-2">
					<div class="flex flex-col gap-1">
						<label for="mod-type-select" class="text-[10px] font-black uppercase text-text-dim">Type Modifier</label>
						<select
							id="mod-type-select"
							bind:value={key.modifierType}
							class="w-full bg-surface border-2 border-secondary rounded p-1.5 font-mono font-black text-xs uppercase text-text focus:outline-none"
						>
							<option value="shift">Shift</option>
							<option value="altgr">AltGr</option>
							<option value="layer">Changement Couche</option>
							<option value="fn">Fn</option>
							<option value="custom">Personnalisé</option>
						</select>
					</div>

					<div class="flex flex-col gap-1">
						<label for="mod-action-select" class="text-[10px] font-black uppercase text-text-dim">Action</label>
						<select
							id="mod-action-select"
							bind:value={key.modifierAction}
							class="w-full bg-surface border-2 border-secondary rounded p-1.5 font-mono font-black text-xs uppercase text-text focus:outline-none"
						>
							<option value="hold">Hold (Maintenir)</option>
							<option value="toggle">Toggle (Activer/Désactiver)</option>
							<option value="one_shot">1-Shot (1 Frappe)</option>
						</select>
					</div>
				</div>

				<div class="flex flex-col gap-1">
					<label for="target-layer-select" class="text-[10px] font-black uppercase text-text-dim">Couche Cible Activée</label>
					<select
						id="target-layer-select"
						bind:value={key.targetLayer}
						class="w-full bg-surface border-2 border-secondary rounded p-1.5 font-mono font-black text-xs uppercase text-text focus:outline-none"
					>
						<option value="">Aucune</option>
						{#each layers as layer}
							<option value={layer.name}>{layer.name}</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}
	</div>
</div>
