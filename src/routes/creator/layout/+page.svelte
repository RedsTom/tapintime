<script lang="ts">
	import { onMount } from 'svelte';
	import { LayoutSchema, type Layout, type Layer, type Key, type Finger, FingerEnum } from '$lib/features/layout/schemas/titl';
	import { saveCustomLayout } from '$lib/storage';
	import VirtualKeyboard from '$lib/features/layout/components/VirtualKeyboard.svelte';
	import LayoutKeyEditor from '$lib/features/layout/components/LayoutKeyEditor.svelte';
	import LayoutLayerManager from '$lib/features/layout/components/LayoutLayerManager.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import { Keyboard, Save, Download, Plus, ArrowLeft, Check, Sparkles } from '@lucide/svelte';

	let layoutName = $state('Mon Layout');
	let layoutDesc = $state('Layout personnalisé avec couches créé sur TapInTime');
	let layoutId = $state(`custom_${Date.now()}`);

	let layers = $state<Layer[]>([
		{
			name: 'Base',
			keys: [
				{ keyCode: 'KeyQ', char: 'a', finger: 'L_PINKY', x: 0, y: 0 },
				{ keyCode: 'KeyW', char: 'z', finger: 'L_RING', x: 1, y: 0 },
				{ keyCode: 'KeyE', char: 'e', finger: 'L_MIDDLE', x: 2, y: 0 },
				{ keyCode: 'KeyR', char: 'r', finger: 'L_INDEX', x: 3, y: 0 },
				{ keyCode: 'KeyT', char: 't', finger: 'L_INDEX', x: 4, y: 0 },
				{ keyCode: 'KeyY', char: 'y', finger: 'R_INDEX', x: 5, y: 0 },
				{ keyCode: 'KeyU', char: 'u', finger: 'R_INDEX', x: 6, y: 0 },
				{ keyCode: 'KeyI', char: 'i', finger: 'R_MIDDLE', x: 7, y: 0 },
				{ keyCode: 'KeyO', char: 'o', finger: 'R_RING', x: 8, y: 0 },
				{ keyCode: 'KeyP', char: 'p', finger: 'R_PINKY', x: 9, y: 0 },

				{ keyCode: 'KeyA', char: 'q', finger: 'L_PINKY', x: 0, y: 1 },
				{ keyCode: 'KeyS', char: 's', finger: 'L_RING', x: 1, y: 1 },
				{ keyCode: 'KeyD', char: 'd', finger: 'L_MIDDLE', x: 2, y: 1 },
				{ keyCode: 'KeyF', char: 'f', finger: 'L_INDEX', x: 3, y: 1 },
				{ keyCode: 'KeyG', char: 'g', finger: 'L_INDEX', x: 4, y: 1 },
				{ keyCode: 'KeyH', char: 'h', finger: 'R_INDEX', x: 5, y: 1 },
				{ keyCode: 'KeyJ', char: 'j', finger: 'R_INDEX', x: 6, y: 1 },
				{ keyCode: 'KeyK', char: 'k', finger: 'R_MIDDLE', x: 7, y: 1 },
				{ keyCode: 'KeyL', char: 'l', finger: 'R_RING', x: 8, y: 1 },
				{ keyCode: 'Semicolon', char: 'm', finger: 'R_PINKY', x: 9, y: 1 }
			]
		}
	]);

	let activeLayerIndex = $state(0);
	let selectedKeyIndex = $state<number | null>(null);
	let pressedKeys = $state<Set<string>>(new Set());
	let saveSuccessMessage = $state<string | null>(null);

	const activeKeys = $derived(layers[activeLayerIndex]?.keys ?? []);

	const activeLayout = $derived<Layout>({
		name: layoutName,
		description: layoutDesc,
		layers: layers,
		thumbKeys: [
			{ keyCode: 'Space', finger: 'L_THUMB', x: 0, y: 0 },
			{ keyCode: 'Space', finger: 'R_THUMB', x: 1, y: 0 }
		]
	});

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	});

	function handleKeyDown(e: KeyboardEvent) {
		pressedKeys.add(e.code);
		pressedKeys.add(e.key.toLowerCase());
		pressedKeys = new Set(pressedKeys);
	}

	function handleKeyUp(e: KeyboardEvent) {
		pressedKeys.delete(e.code);
		pressedKeys.delete(e.key.toLowerCase());
		pressedKeys = new Set(pressedKeys);
	}

	async function loadPreset(presetName: string) {
		try {
			const res = await fetch(`/layouts/${presetName}.titl`);
			if (!res.ok) return;
			const data: Layout = await res.json();
			layoutName = `${data.name} (Custom)`;
			layoutDesc = data.description;
			layers = data.layers && data.layers.length > 0 ? data.layers : [{ name: 'Base', keys: [] }];
			activeLayerIndex = 0;
			selectedKeyIndex = null;
		} catch (err) {
			console.error(err);
		}
	}

	function handleAddLayer(name: string, copyFromBase: boolean) {
		const baseKeys = layers[0]?.keys ?? [];
		const newKeys: Key[] = copyFromBase
			? JSON.parse(JSON.stringify(baseKeys))
			: [
					{ keyCode: 'KeyQ', char: 'a', finger: 'L_PINKY', x: 0, y: 0 },
					{ keyCode: 'KeyW', char: 'z', finger: 'L_RING', x: 1, y: 0 }
			  ];

		layers = [...layers, { name, keys: newKeys }];
		activeLayerIndex = layers.length - 1;
		selectedKeyIndex = null;
	}

	function handleDuplicateLayer(index: number) {
		const target = layers[index];
		if (!target) return;
		const duplicated: Layer = {
			name: `${target.name} (Copie)`,
			keys: JSON.parse(JSON.stringify(target.keys))
		};
		layers = [...layers, duplicated];
		activeLayerIndex = layers.length - 1;
		selectedKeyIndex = null;
	}

	function handleRenameLayer(index: number, newName: string) {
		if (layers[index]) {
			layers[index].name = newName;
		}
	}

	function handleDeleteLayer(index: number) {
		if (layers.length <= 1) return;
		layers = layers.filter((_, i) => i !== index);
		activeLayerIndex = Math.max(0, activeLayerIndex - 1);
		selectedKeyIndex = null;
	}

	function addKey() {
		const currentLayerKeys = layers[activeLayerIndex]?.keys ?? [];
		const newKey: Key = {
			keyCode: 'KeyZ',
			char: 'z',
			finger: 'R_INDEX',
			x: currentLayerKeys.length % 10,
			y: Math.floor(currentLayerKeys.length / 10)
		};
		layers[activeLayerIndex].keys = [...currentLayerKeys, newKey];
		selectedKeyIndex = layers[activeLayerIndex].keys.length - 1;
	}

	function removeKey(index: number) {
		const currentLayerKeys = layers[activeLayerIndex]?.keys ?? [];
		layers[activeLayerIndex].keys = currentLayerKeys.filter((_, i) => i !== index);
		if (selectedKeyIndex === index) selectedKeyIndex = null;
		else if (selectedKeyIndex !== null && selectedKeyIndex > index) selectedKeyIndex--;
	}

	async function saveLayout() {
		try {
			const parsed = LayoutSchema.parse(activeLayout);
			await saveCustomLayout({
				id: layoutId,
				name: layoutName,
				description: layoutDesc,
				layout: parsed,
				createdAt: Date.now()
			});
			saveSuccessMessage = `Layout "${layoutName}" avec ${layers.length} couche(s) sauvegardé avec succès !`;
			setTimeout(() => (saveSuccessMessage = null), 3500);
		} catch (err) {
			alert('Erreur de validation du layout: ' + String(err));
		}
	}

	function exportLayout() {
		try {
			const parsed = LayoutSchema.parse(activeLayout);
			const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${layoutName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.titl`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			alert('Erreur lors de l’export: ' + String(err));
		}
	}
</script>

<div class="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-6 text-left select-none pb-24">
	<!-- Top Bar -->
	<div class="flex items-center justify-between border-b-4 border-secondary pb-4">
		<div class="flex items-center gap-4">
			<a
				href="/"
				class="flex items-center gap-1.5 border-4 border-secondary bg-surface px-3 py-1.5 rounded-lg font-black text-xs uppercase hover:bg-secondary/20 transition-all shadow-[2px_2px_0px_#1a0033]"
			>
				<ArrowLeft class="w-4 h-4" /> Accueil
			</a>
			<h1 class="text-2xl md:text-3xl font-black uppercase tracking-wider text-primary flex items-center gap-2">
				<Keyboard class="w-7 h-7" /> Éditeur de Layout Multi-Couches
			</h1>
		</div>

		<div class="flex items-center gap-3">
			<Button variant="secondary" size="small" onclick={exportLayout}>
				<Download class="w-4 h-4" /> Export .titl
			</Button>
			<Button variant="primary" size="small" onclick={saveLayout}>
				<Save class="w-4 h-4" /> Sauvegarder
			</Button>
		</div>
	</div>

	{#if saveSuccessMessage}
		<div class="bg-primary/20 border-4 border-primary p-3 rounded-lg text-primary font-black text-xs uppercase tracking-wider flex items-center gap-2">
			<Check class="w-4 h-4" /> {saveSuccessMessage}
		</div>
	{/if}

	<!-- Gestionnaire de Couches (Layer Manager) -->
	<LayoutLayerManager
		{layers}
		{activeLayerIndex}
		onSelectLayer={(idx) => {
			activeLayerIndex = idx;
			selectedKeyIndex = null;
		}}
		onAddLayer={handleAddLayer}
		onDuplicateLayer={handleDuplicateLayer}
		onRenameLayer={handleRenameLayer}
		onDeleteLayer={handleDeleteLayer}
	/>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Panneau de Gauche : Métadonnées & Éditeur de Touche -->
		<div class="flex flex-col gap-6 lg:col-span-1">
			<!-- Métadonnées & Modèles -->
			<div class="bg-surface border-4 border-secondary p-5 rounded-xl shadow-[5px_5px_0px_#1a0033] flex flex-col gap-4">
				<h3 class="text-sm font-black uppercase tracking-wider text-primary border-b-2 border-secondary pb-1.5">
					Informations du Layout
				</h3>
				<Input label="Nom du Layout" bind:value={layoutName} />
				<Input label="Description" bind:value={layoutDesc} />

				<div class="flex flex-col gap-1.5 pt-2 border-t-2 border-secondary/20">
					<span class="text-xs font-black uppercase tracking-wider text-text-dim">Charger un modèle</span>
					<div class="grid grid-cols-3 gap-2">
						<button
							onclick={() => loadPreset('azerty')}
							class="border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 py-1.5 rounded text-xs font-black uppercase transition-all"
						>
							AZERTY
						</button>
						<button
							onclick={() => loadPreset('qwerty')}
							class="border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 py-1.5 rounded text-xs font-black uppercase transition-all"
						>
							QWERTY
						</button>
						<button
							onclick={() => loadPreset('ergo-l')}
							class="border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 py-1.5 rounded text-xs font-black uppercase transition-all"
						>
							ERGO-L
						</button>
					</div>
				</div>
			</div>

			<!-- Éditeur de Touche Unique (avec support des Modifier Keys) -->
			{#if selectedKeyIndex !== null && layers[activeLayerIndex]?.keys[selectedKeyIndex]}
				<LayoutKeyEditor
					bind:key={layers[activeLayerIndex].keys[selectedKeyIndex]}
					index={selectedKeyIndex}
					{layers}
					onRemoveKey={removeKey}
				/>
			{:else}
				<div class="bg-surface/50 border-4 border-dashed border-secondary/40 p-6 rounded-xl text-center text-xs font-black text-text-dim uppercase tracking-wider">
					Cliquez sur une touche de la couche "{layers[activeLayerIndex]?.name}" pour la modifier.
				</div>
			{/if}
		</div>

		<!-- Panneau de Droite : Clavier Visuel de la Couche Active & Grille de Touches -->
		<div class="flex flex-col gap-6 lg:col-span-2">
			<!-- Clavier Visuel Interactif de la Couche Active -->
			<div class="bg-surface border-4 border-secondary p-6 rounded-xl shadow-[6px_6px_0px_#1a0033] flex flex-col gap-4 text-center">
				<div class="flex items-center justify-between border-b-2 border-secondary pb-2">
					<h2 class="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
						<Sparkles class="w-4 h-4 text-primary" /> Couche Active: {layers[activeLayerIndex]?.name}
					</h2>
					<span class="text-[10px] font-black text-text-dim uppercase">Tapez au clavier pour tester</span>
				</div>

				<div class="w-full overflow-x-auto py-2">
					<VirtualKeyboard layout={activeLayout} {activeLayerIndex} {pressedKeys} />
				</div>
			</div>

			<!-- Grille de Touches de la Couche Active -->
			<div class="bg-surface border-4 border-secondary p-6 rounded-xl shadow-[6px_6px_0px_#1a0033] flex flex-col gap-4">
				<div class="flex items-center justify-between border-b-2 border-secondary pb-2">
					<h3 class="text-sm font-black uppercase tracking-wider text-text">
						Touches de la couche "{layers[activeLayerIndex]?.name}" ({activeKeys.length})
					</h3>
					<Button variant="accent" size="small" onclick={addKey}>
						<Plus class="w-4 h-4" /> Ajouter Touche
					</Button>
				</div>

				<div class="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-72 overflow-y-auto pr-1">
					{#each activeKeys as key, idx}
						{@const isSelected = selectedKeyIndex === idx}
						<button
							onclick={() => (selectedKeyIndex = idx)}
							class="
								h-12 border-2 border-secondary rounded-lg flex flex-col items-center justify-center font-mono font-black text-xs uppercase transition-all cursor-pointer relative
								{isSelected
									? 'bg-primary text-secondary shadow-[3px_3px_0px_#f9564f] scale-105 z-10'
									: key.isModifier
										? 'bg-accent/20 text-accent border-accent/60 shadow-none'
										: 'bg-secondary/20 text-text hover:bg-secondary/40 shadow-none'
								}
							"
						>
							<span class="text-sm font-black leading-none">{key.char}</span>
							{#if key.isModifier}
								<span class="text-[7px] font-black text-accent uppercase leading-none mt-0.5">MOD</span>
							{:else}
								<span class="text-[8px] opacity-70 font-mono leading-none mt-1">{key.keyCode.replace('Key', '')}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
