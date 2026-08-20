<script lang="ts">
	import { onMount } from 'svelte';
	import { COLORS, SHADOW, SPACING } from '$lib/tokens';
	import { loadSettings, saveSettings, type UserSettings } from '$lib/settings';
	import { loadProgression, getUnlockedKeys, type ProgressionData } from '$lib/progression';
	import { setMasterVolume, setEffectsVolume, playHitSound } from '$lib/audio';
	import VirtualKeyboard from '$lib/components/VirtualKeyboard.svelte';
	import { LayoutSchema, type Layout } from '$lib/schemas/titl';
	import { loadLayoutByNameOrId, saveCustomLayout, getCustomLayouts, type CustomLayoutItem } from '$lib/storage';
	import { Keyboard, Sliders, Gamepad2, Eye, Upload, Target, Check, RefreshCw, Zap, Clock, Volume2 } from '@lucide/svelte';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import CalibrationTool from '$lib/features/calibration/components/CalibrationTool.svelte';

	let settings = $state<UserSettings | null>(null);
	let progression = $state<ProgressionData | null>(null);
	let previewLayout = $state<Layout | null>(null);
	let pressedKeys = $state<Set<string>>(new Set(['f', 'j']));
	let customLayouts = $state<CustomLayoutItem[]>([]);
	let message = $state<string | null>(null);

	let activeCategory = $state<'calibration' | 'controls' | 'display' | 'audio'>('calibration');
	let isCalibrating = $state(false);

	const measuredLatency = $derived(progression?.averageLatencyMs ?? 0);

	onMount(() => {
		async function init() {
			settings = await loadSettings();
			progression = await loadProgression();
			customLayouts = await getCustomLayouts();
			setMasterVolume(settings.masterVolume / 100);
			setEffectsVolume(settings.effectsVolume / 100);
			await loadLayoutPreview(settings.activeLayout);
		}
		init();

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	});

	function handleKeyDown(e: KeyboardEvent) {
		pressedKeys.add(e.key.toLowerCase());
		pressedKeys = new Set(pressedKeys);
	}

	function handleKeyUp(e: KeyboardEvent) {
		pressedKeys.delete(e.key.toLowerCase());
		pressedKeys = new Set(pressedKeys);
	}

	async function loadLayoutPreview(nameOrId: string) {
		try {
			previewLayout = await loadLayoutByNameOrId(nameOrId);
		} catch (e) {
			console.error('Failed to load layout preview:', e);
		}
	}

	async function updateSettings() {
		if (!settings) return;
		await saveSettings(settings);
	}

	function onVolumeChange() {
		if (!settings) return;
		setMasterVolume(settings.masterVolume / 100);
		playHitSound();
		updateSettings();
	}

	function onEffectsVolumeChange() {
		if (!settings) return;
		setEffectsVolume(settings.effectsVolume / 100);
		playHitSound();
		updateSettings();
	}

	async function changeLayout(nameOrId: string) {
		if (!settings) return;
		settings.activeLayout = nameOrId;
		await updateSettings();
		await loadLayoutPreview(nameOrId);
	}

	async function autoAdjustLatency() {
		if (!settings) return;
		settings.audioOffsetMs = Math.round(measuredLatency);
		await updateSettings();
		message = `Offset audio ajusté automatiquement à ${settings.audioOffsetMs} ms d'après vos parties !`;
		setTimeout(() => (message = null), 4000);
	}

	async function handleLayoutImport(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];

		try {
			const text = await file.text();
			const json = JSON.parse(text);
			const parsed = LayoutSchema.parse(json);

			const id = `custom_${file.name.replace('.titl', '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
			const item: CustomLayoutItem = {
				id,
				name: parsed.name || file.name.replace('.titl', ''),
				description: parsed.description || 'Layout importé',
				layout: parsed,
				createdAt: Date.now()
			};

			await saveCustomLayout(item);
			customLayouts = await getCustomLayouts();
			await changeLayout(id);
			message = `Layout "${item.name}" importé avec succès !`;
			setTimeout(() => (message = null), 3000);
		} catch (err) {
			alert('Erreur lors de l’importation du layout: ' + String(err));
		}
	}

	async function handleCalibrationSave(visualMs: number, audioMs: number) {
		if (!settings) return;
		settings.visualOffsetMs = visualMs;
		settings.audioOffsetMs = audioMs;
		await updateSettings();
		isCalibrating = false;
		message = `Calibration enregistrée ! Audio: ${audioMs}ms, Visuel: ${visualMs}ms`;
		setTimeout(() => (message = null), 4000);
	}
</script>

<div class="max-w-6xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-6 text-left select-none pb-24">
	<!-- Page Header -->
	<div class="flex flex-col gap-1.5 border-b-4 border-secondary pb-4">
		<h1 class="text-2xl md:text-3xl font-black uppercase tracking-wider text-primary flex items-center gap-2">
			<Sliders class="w-7 h-7" /> PARAMÈTRES DE JEU
		</h1>
		<p class="text-xs md:text-sm font-bold text-text-dim uppercase tracking-wider">
			Personnalisez votre affichage, vos dispositions et synchronisez votre audio.
		</p>
	</div>

	{#if message}
		<div class="bg-primary/20 border-4 border-primary p-3.5 rounded-xl text-primary font-black text-xs uppercase tracking-wider flex items-center gap-2">
			<Check class="w-4 h-4" /> {message}
		</div>
	{/if}

	{#if settings}
		<div class="flex flex-col md:flex-row gap-6 items-start">
			<!-- Col 1: Categories Sidebar -->
			<div class="w-full md:w-[260px] flex-shrink-0 bg-surface border-4 border-secondary p-4 rounded-xl shadow-neo flex flex-col gap-3">
				<button
					onclick={() => activeCategory = 'calibration'}
					class="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 border-secondary font-black uppercase text-xs md:text-sm text-left transition-all cursor-pointer
					{activeCategory === 'calibration'
						? 'bg-primary text-secondary shadow-[3px_3px_0px_0px_#0B0014] translate-x-[-1px] translate-y-[-1px]'
						: 'bg-secondary/20 hover:bg-secondary/35 text-white shadow-none'
					}"
				>
					<Target class="w-5 h-5 flex-shrink-0" />
					<div class="flex flex-col leading-tight">
						<span>Calibration</span>
						<span class="text-[8px] font-bold opacity-75">Latence & Ajustement</span>
					</div>
				</button>

				<button
					onclick={() => activeCategory = 'controls'}
					class="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 border-secondary font-black uppercase text-xs md:text-sm text-left transition-all cursor-pointer
					{activeCategory === 'controls'
						? 'bg-primary text-secondary shadow-[3px_3px_0px_0px_#0B0014] translate-x-[-1px] translate-y-[-1px]'
						: 'bg-secondary/20 hover:bg-secondary/35 text-white shadow-none'
					}"
				>
					<Gamepad2 class="w-5 h-5 flex-shrink-0" />
					<div class="flex flex-col leading-tight">
						<span>Contrôles</span>
						<span class="text-[8px] font-bold opacity-75">Layout & Tolérance</span>
					</div>
				</button>

				<button
					onclick={() => activeCategory = 'display'}
					class="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 border-secondary font-black uppercase text-xs md:text-sm text-left transition-all cursor-pointer
					{activeCategory === 'display'
						? 'bg-primary text-secondary shadow-[3px_3px_0px_0px_#0B0014] translate-x-[-1px] translate-y-[-1px]'
						: 'bg-secondary/20 hover:bg-secondary/35 text-white shadow-none'
					}"
				>
					<Eye class="w-5 h-5 flex-shrink-0" />
					<div class="flex flex-col leading-tight">
						<span>Affichage</span>
						<span class="text-[8px] font-bold opacity-75">Vitesse & Clavier</span>
					</div>
				</button>

				<button
					onclick={() => activeCategory = 'audio'}
					class="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 border-secondary font-black uppercase text-xs md:text-sm text-left transition-all cursor-pointer
					{activeCategory === 'audio'
						? 'bg-primary text-secondary shadow-[3px_3px_0px_0px_#0B0014] translate-x-[-1px] translate-y-[-1px]'
						: 'bg-secondary/20 hover:bg-secondary/35 text-white shadow-none'
					}"
				>
					<Volume2 class="w-5 h-5 flex-shrink-0" />
					<div class="flex flex-col leading-tight">
						<span>Son</span>
						<span class="text-[8px] font-bold opacity-75">Volumes Musique & SFX</span>
					</div>
				</button>
			</div>

			<!-- Col 2: Category Details -->
			<div class="flex-1 w-full flex flex-col gap-6">
				<div class="bg-surface border-4 border-secondary p-6 rounded-xl shadow-neo flex flex-col gap-6 w-full">
					{#if activeCategory === 'calibration'}
						<!-- SECTION CALIBRATION -->
						<div class="flex flex-col gap-1 border-b-2 border-secondary pb-3">
							<h2 class="text-lg md:text-xl font-black uppercase tracking-wider text-primary flex items-center gap-2">
								<Target class="w-5 h-5 text-primary" /> Calibration de synchronisation
							</h2>
							<p class="text-[10px] font-black text-text-dim uppercase tracking-wider">
								Synchronisez l'affichage avec le rythme audio selon votre équipement.
							</p>
						</div>

						<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
							<div class="flex flex-col gap-5">
								<Slider label="Offset Audio (ms)" min={-200} max={200} step={5} bind:value={settings.audioOffsetMs} onchange={updateSettings} />
								<Slider label="Offset Visuel (ms)" min={-200} max={200} step={5} bind:value={settings.visualOffsetMs} onchange={updateSettings} />
							</div>

							<div class="flex flex-col gap-4 bg-secondary/15 border-2 border-secondary p-4 rounded-xl">
								<div class="flex items-center justify-between">
									<span class="text-xs font-black uppercase text-text-dim flex items-center gap-1.5">
										<Clock class="w-4 h-4 text-accent" /> Latence Moyenne Mesurée :
									</span>
									<span class="font-mono font-black text-base text-primary">
										{measuredLatency > 0 ? `+${measuredLatency}` : measuredLatency} ms
									</span>
								</div>

								<Button variant="primary" size="small" onclick={autoAdjustLatency}>
									<Zap class="w-4 h-4" /> AJUSTER AUTOMATIQUEMENT LA LATENCE
								</Button>

								<div class="pt-2 border-t border-secondary/20 flex flex-col gap-2">
									<span class="text-[10px] font-black uppercase text-text-dim">Ou utiliser l'assistant pour calibrer précisément :</span>
									<Button variant="accent" size="small" onclick={() => (isCalibrating = true)}>
										<RefreshCw class="w-4 h-4" /> Lancer l'assistant de calibration
									</Button>
								</div>
							</div>
						</div>

					{:else if activeCategory === 'controls'}
						<!-- SECTION CONTRÔLES -->
						<div class="flex flex-col gap-1 border-b-2 border-secondary pb-3">
							<h2 class="text-lg md:text-xl font-black uppercase tracking-wider text-primary flex items-center gap-2">
								<Gamepad2 class="w-5 h-5 text-primary" /> Configuration des Contrôles
							</h2>
							<p class="text-[10px] font-black text-text-dim uppercase tracking-wider">
								Choisissez votre disposition de touches et la tolérance des timings.
							</p>
						</div>

						<div class="flex flex-col gap-6">
							<!-- Layout selection -->
							<div class="flex flex-col gap-2">
								<span class="text-xs font-black uppercase tracking-wider text-text-dim text-left">Disposition Active</span>
								<div class="grid grid-cols-3 gap-2 w-full">
									{#each ['azerty', 'qwerty', 'ergo-l'] as layoutOption}
										{@const selected = settings.activeLayout === layoutOption}
										<button
											onclick={() => changeLayout(layoutOption)}
											class="
												border-2 border-secondary py-2 rounded-lg font-black uppercase text-xs transition-all select-none cursor-pointer
												{selected
													? 'bg-primary text-secondary shadow-[2px_2px_0px_0px_#0B0014]'
													: 'bg-secondary/35 text-white hover:bg-secondary/50 shadow-none'
												}
											"
										>
											{layoutOption}
										</button>
									{/each}
								</div>

								{#if customLayouts.length > 0}
									<span class="text-xs font-black uppercase tracking-wider text-text-dim text-left mt-2">Layouts Personnalisés</span>
									<div class="grid grid-cols-2 gap-2 w-full">
										{#each customLayouts as cLayout}
											{@const selected = settings.activeLayout === cLayout.id}
											<button
												onclick={() => changeLayout(cLayout.id)}
												class="
													border-2 border-secondary py-2 px-2 rounded-lg font-black uppercase text-xs truncate transition-all select-none cursor-pointer
													{selected
														? 'bg-accent text-secondary shadow-[2px_2px_0px_0px_#0B0014]'
														: 'bg-secondary/35 text-white hover:bg-secondary/50 shadow-none'
													}
												"
											>
												{cLayout.name}
											</button>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Layout Familiarity -->
							<div class="pt-3 border-t-2 border-secondary/20 flex flex-col gap-2">
								<span class="text-xs font-black uppercase tracking-wider text-text-dim text-left">Niveau de familiarité</span>
								<span class="text-[9px] font-black uppercase text-text-dim/70 -mt-1 leading-tight text-left">Sélectionnez le niveau pour lequel vous êtes à l'aise. Les touches de ce niveau et des niveaux inférieurs seront débloquées d'office.</span>
								<select bind:value={settings.layoutFamiliarity} onchange={updateSettings} class="w-full bg-secondary/35 border-2 border-secondary text-text font-black uppercase text-xs p-2 rounded-lg outline-none focus:border-primary">
									{#each Array.from({length: 15}, (_, i) => i + 1) as tier}
										<option value={tier}>Niveau {tier}</option>
									{/each}
								</select>
							</div>

							<!-- Leniency Mode -->
							<div class="pt-3 border-t-2 border-secondary/20 flex flex-col gap-2">
								<span class="text-xs font-black uppercase tracking-wider text-text-dim text-left">Tolérance de Timing</span>
								<div class="grid grid-cols-3 gap-2 w-full">
									{#each ['facile', 'normal', 'strict'] as leniency}
										{@const selected = settings.leniencyMode === leniency}
										<button
											onclick={() => { settings!.leniencyMode = leniency as any; updateSettings(); }}
											class="
												border-2 border-secondary py-2 rounded-lg font-black uppercase text-[10px] transition-all select-none cursor-pointer
												{selected
													? 'bg-primary text-secondary shadow-[2px_2px_0px_0px_#0B0014]'
													: 'bg-secondary/35 text-white hover:bg-secondary/50 shadow-none'
												}
											"
										>
											{leniency}
										</button>
									{/each}
								</div>
							</div>

							<!-- Import Layout Button -->
							<div class="pt-3 border-t-2 border-secondary/20 flex flex-col gap-2">
								<label class="w-full border-4 border-secondary bg-primary text-secondary py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-black uppercase text-xs shadow-[3px_3px_0px_0px_#0B0014] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all">
									<Upload class="w-4 h-4" /> Importer un Layout (.titl)
									<input type="file" accept=".titl" onchange={handleLayoutImport} class="sr-only" />
								</label>
							</div>
						</div>

					{:else if activeCategory === 'display'}
						<!-- SECTION AFFICHAGE -->
						<div class="flex flex-col gap-1 border-b-2 border-secondary pb-3">
							<h2 class="text-lg md:text-xl font-black uppercase tracking-wider text-primary flex items-center gap-2">
								<Eye class="w-5 h-5 text-primary" /> Paramètres d'Affichage
							</h2>
							<p class="text-[10px] font-black text-text-dim uppercase tracking-wider">
								Configurez l'apparence des éléments et la vitesse de défilement.
							</p>
						</div>

						<div class="flex flex-col gap-5">
							<!-- Note Speed (Scroll speed) -->
							<div class="flex flex-col gap-1">
								<Slider label="Vitesse de défilement (px/s)" min={200} max={800} step={50} bind:value={settings.noteSpeed} onchange={updateSettings} />
								<span class="text-[9px] font-black uppercase text-text-dim/70 leading-tight">Définit la vitesse à laquelle les notes de la piste glissent vers la ligne d'impact.</span>
							</div>

							<div class="w-full h-px bg-secondary/30 my-1"></div>

							<!-- Toggle Show Keyboard -->
							<div class="flex items-center justify-between gap-4">
								<div class="flex flex-col text-left gap-1">
									<span class="text-sm md:text-base font-black uppercase tracking-wider text-text">Afficher le clavier</span>
									<span class="text-[10px] font-black text-text-dim uppercase tracking-wider leading-tight">Affiche le rappel visuel des touches en bas d'écran.</span>
								</div>
								<Checkbox bind:checked={settings.showKeyboard} onchange={updateSettings} />
							</div>

							<!-- Scale Slider -->
							<div class="pt-2 border-t-2 border-secondary/20">
								<Slider label="Échelle du clavier" min={0.7} max={1.3} step={0.1} bind:value={settings.keyboardScale} onchange={updateSettings} />
							</div>

							<div class="w-full h-px bg-secondary/30 my-1"></div>

							<!-- Background Parallax -->
							<div class="flex items-center justify-between gap-4">
								<div class="flex flex-col text-left gap-1">
									<span class="text-sm md:text-base font-black uppercase tracking-wider text-text">Parallaxe d'Arrière-plan</span>
									<span class="text-[10px] font-black text-text-dim uppercase tracking-wider leading-tight">Active le mouvement léger en arrière-plan lié aux mouvements du curseur.</span>
								</div>
								<Checkbox bind:checked={settings.backgroundParallax} onchange={updateSettings} />
							</div>
						</div>

					{:else if activeCategory === 'audio'}
						<!-- SECTION SON -->
						<div class="flex flex-col gap-1 border-b-2 border-secondary pb-3">
							<h2 class="text-lg md:text-xl font-black uppercase tracking-wider text-primary flex items-center gap-2">
								<Volume2 class="w-5 h-5 text-primary" /> Paramètres Audio
							</h2>
							<p class="text-[10px] font-black text-text-dim uppercase tracking-wider">
								Réglez le volume général de la musique et le volume des bruitages de jeu.
							</p>
						</div>

						<div class="flex flex-col gap-6">
							<Slider label="Volume Général (%)" min={0} max={100} step={5} bind:value={settings.masterVolume} onchange={onVolumeChange} />
							<Slider label="Volume des Effets (%)" min={0} max={100} step={5} bind:value={settings.effectsVolume} onchange={onEffectsVolumeChange} />
						</div>
					{/if}
				</div>

				<!-- Live Keyboard Preview (visible for Contrôles or Affichage) -->
				{#if (activeCategory === 'controls' || activeCategory === 'display') && previewLayout}
					<div class="bg-surface border-4 border-secondary p-6 rounded-xl shadow-neo flex flex-col gap-4 text-center relative overflow-hidden w-full">
						<h3 class="text-xs md:text-sm font-black uppercase tracking-wider text-primary flex items-center justify-center gap-2 mb-2">
							<Eye class="w-5 h-5 text-primary" /> PRÉVISUALISATION DU CLAVIER (Tapez des touches pour tester)
						</h3>

						{#if settings.showKeyboard}
							<div class="w-full flex justify-center py-2 max-w-full overflow-x-auto scrollbar-none">
								<VirtualKeyboard 
									layout={previewLayout} 
									{pressedKeys} 
									unlockedKeys={new Set(getUnlockedKeys(progression?.xp ?? 0, previewLayout, settings.layoutFamiliarity))}
									scale={settings.keyboardScale} 
								/>
							</div>
						{:else}
							<div class="border-2 border-dashed border-secondary/50 bg-secondary/15 py-8 rounded-lg text-center font-black text-text-dim text-xs uppercase tracking-wider">
								Clavier masqué selon vos paramètres
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Modal Calibration (reusing CalibrationTool component) -->
	<Modal isOpen={isCalibrating} title="ASSISTANT DE CALIBRATION" onClose={() => (isCalibrating = false)}>
		{#if settings}
			<CalibrationTool
				visualOffsetMs={settings.visualOffsetMs}
				audioOffsetMs={settings.audioOffsetMs}
				onSave={handleCalibrationSave}
				onClose={() => (isCalibrating = false)}
			/>
		{/if}
	</Modal>
</div>
