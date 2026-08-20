<script lang="ts">
	import { untrack } from 'svelte';
	import { saveSettings, type UserSettings } from '$lib/settings';
	import Button from '$lib/components/Button.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { Keyboard, User, ArrowRight, ArrowLeft } from '@lucide/svelte';
	import { createLabel, melt } from '@melt-ui/svelte';
	import CalibrationTool from '$lib/features/calibration/components/CalibrationTool.svelte';

	const { elements: { root: usernameLabel } } = createLabel();
	const { elements: { root: layoutLabel } } = createLabel();

	let {
		settings,
		onComplete
	}: {
		settings: UserSettings;
		onComplete: (updatedSettings: UserSettings) => void;
	} = $props();

	let step = $state(1);

	// Step 1 State
	let username = $state(untrack(() => settings.username));
	let activeLayout = $state(untrack(() => settings.activeLayout));

	const layouts = [
		{ id: 'azerty', name: 'AZERTY', desc: 'Standard FR' },
		{ id: 'qwerty', name: 'QWERTY', desc: 'Standard EN' },
		{ id: 'ergol', name: 'Ergo-L', desc: 'Ergonomique FR' }
	];

	function nextStep() {
		if (step === 1 && !username.trim()) {
			alert('Veuillez entrer un pseudo pour commencer !');
			return;
		}
		step++;
	}

	function prevStep() {
		step--;
	}

	async function handleCalibrationSave(visualMs: number, audioMs: number) {
		const updated = {
			...settings,
			username: username.trim(),
			activeLayout,
			onboardingCompleted: true,
			visualOffsetMs: visualMs,
			audioOffsetMs: audioMs
		};

		await saveSettings(updated);
		onComplete(updated);
	}
</script>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-xl bg-surface border-4 border-secondary p-6 md:p-8 rounded-xl shadow-neo flex flex-col relative overflow-hidden">
		<!-- Header -->
		<div class="flex items-center justify-between border-b-4 border-secondary pb-4 mb-6 select-none">
			<Logo scale={0.75} />
			<div class="flex items-center gap-1.5">
				<div class="w-3.5 h-3.5 rounded-full border-2 border-secondary transition-all {step === 1 ? 'bg-primary' : 'bg-secondary'}" title="Profil"></div>
				<div class="w-3.5 h-3.5 rounded-full border-2 border-secondary transition-all {step === 2 ? 'bg-primary' : 'bg-secondary'}" title="Calibration"></div>
			</div>
		</div>

		{#if step === 1}
			<!-- STEP 1: Profil -->
			<div class="flex flex-col gap-6 text-left">
				<div class="flex flex-col gap-2">
					<label use:melt={$usernameLabel} for="username-input" class="text-sm md:text-base font-black uppercase tracking-wider text-text flex items-center gap-2">
						<User class="w-5 h-5 text-primary" /> Quel est votre pseudo ?
					</label>
					<div class="relative w-full">
						<input 
							id="username-input" 
							type="text" 
							bind:value={username} 
							placeholder="Ex: RhythmMaster99" 
							maxlength="20" 
							class="w-full px-4 py-3 bg-secondary/35 border-4 border-secondary text-text font-black rounded-lg focus:outline-none focus:border-primary placeholder:text-text-dim text-lg tracking-wide"
						/>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<label use:melt={$layoutLabel} class="text-sm md:text-base font-black uppercase tracking-wider text-text flex items-center gap-2">
						<Keyboard class="w-5 h-5 text-primary" /> Quelle disposition souhaitez-vous apprendre ?
					</label>
					
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
						{#each layouts as layout}
							{@const selected = activeLayout === layout.id}
							<div class="relative flex flex-col w-full h-full select-none cursor-pointer">
								<div class="absolute inset-0 bg-secondary border-4 border-secondary rounded-lg translate-x-[4px] translate-y-[4px]"></div>
								<button 
									onclick={() => activeLayout = layout.id}
									class="
										relative border-4 border-secondary p-3 rounded-lg flex flex-col items-center justify-center text-center transition-all w-full
										{selected 
											? 'bg-primary text-secondary translate-x-[2px] translate-y-[2px]' 
											: 'bg-secondary/35 text-white hover:bg-secondary/50 hover:translate-x-[1px] hover:translate-y-[1px]'
										}
									"
								>
									<span class="font-black text-lg tracking-wider uppercase leading-none">{layout.name}</span>
									<span class="text-[10px] font-black uppercase mt-1 leading-tight {selected ? 'text-secondary/70' : 'text-text-dim'}">
										{layout.desc}
									</span>
								</button>
							</div>
						{/each}
					</div>
				</div>

				<div class="flex justify-end border-t-4 border-secondary pt-6 mt-4">
					<Button onclick={nextStep} disabled={!username.trim()} shortcut="ENTER">
						<span>
							SUIVANT <ArrowRight class="inline w-5 h-5 ml-1" />
						</span>
					</Button>
				</div>
			</div>

		{:else if step === 2}
			<!-- STEP 2: Calibration Réutilisable -->
			<div class="flex flex-col gap-6 text-left">
				<div class="flex items-center justify-between">
					<button 
						onclick={prevStep}
						class="flex items-center gap-2 border-2 border-secondary bg-secondary/30 text-text font-black uppercase px-3 py-1.5 rounded-lg hover:bg-secondary/60 transition-all text-xs"
					>
						<ArrowLeft class="w-4 h-4" /> Retour
					</button>
					<span class="text-xs font-black uppercase text-text-dim">Étape 2 / 2</span>
				</div>

				<CalibrationTool
					visualOffsetMs={settings.visualOffsetMs}
					audioOffsetMs={settings.audioOffsetMs}
					onSave={handleCalibrationSave}
				/>
			</div>
		{/if}
	</div>
</div>
