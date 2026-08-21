<script lang="ts">
	import { untrack } from 'svelte';
	import { saveSettings, type UserSettings } from '$lib/settings';
	import Logo from '$lib/components/Logo.svelte';
	import OnboardingStepLanguage from './OnboardingStepLanguage.svelte';
	import OnboardingStepProfile from './OnboardingStepProfile.svelte';
	import OnboardingStepFamiliarity from './OnboardingStepFamiliarity.svelte';
	import OnboardingStepCalibration from './OnboardingStepCalibration.svelte';
	import { loadLayoutByNameOrId } from '$lib/storage';
	import type { Layout } from '$lib/schemas/titl';
	import { _ } from '$lib/i18n';

	let {
		settings,
		onComplete
	}: {
		settings: UserSettings;
		onComplete: (updatedSettings: UserSettings) => void;
	} = $props();

	let step = $state(1);

	let username = $state(untrack(() => settings.username));
	let activeLayout = $state(untrack(() => settings.activeLayout));
	let layoutFamiliarity = $state(untrack(() => settings.layoutFamiliarity));
	let leniencyMode = $state(untrack(() => settings.leniencyMode));
	
	let previewLayout = $state<Layout | null>(null);

	$effect(() => {
		let currentLayout = activeLayout;
		loadLayoutByNameOrId(currentLayout)
			.then(layout => {
				if (activeLayout === currentLayout) {
					previewLayout = layout;
				}
			})
			.catch(err => {
				console.error('Erreur lors du chargement de la disposition', err);
				previewLayout = null;
			});
	});

	function nextStep() {
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
			layoutFamiliarity,
			leniencyMode,
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
				<div class="w-3.5 h-3.5 rounded-full border-2 border-secondary transition-all {step === 1 ? 'bg-primary' : 'bg-secondary'}" title={$_('onboarding.steps.language')}></div>
				<div class="w-3.5 h-3.5 rounded-full border-2 border-secondary transition-all {step === 2 ? 'bg-primary' : 'bg-secondary'}" title={$_('onboarding.steps.profile')}></div>
				<div class="w-3.5 h-3.5 rounded-full border-2 border-secondary transition-all {step === 3 ? 'bg-primary' : 'bg-secondary'}" title={$_('onboarding.steps.familiarity')}></div>
				<div class="w-3.5 h-3.5 rounded-full border-2 border-secondary transition-all {step === 4 ? 'bg-primary' : 'bg-secondary'}" title={$_('onboarding.steps.calibration')}></div>
			</div>
		</div>

		{#if step === 1}
			<OnboardingStepLanguage 
				bind:settings
				onNext={nextStep}
			/>
		{:else if step === 2}
			<OnboardingStepProfile 
				bind:username 
				bind:activeLayout 
				onNext={nextStep} 
			/>
		{:else if step === 3}
			<OnboardingStepFamiliarity 
				bind:layoutFamiliarity 
				{previewLayout} 
				onNext={nextStep} 
				onPrev={prevStep} 
			/>
		{:else if step === 4}
			<OnboardingStepCalibration 
				visualOffsetMs={settings.visualOffsetMs} 
				audioOffsetMs={settings.audioOffsetMs} 
				bind:leniencyMode
				onPrev={prevStep} 
				onSave={handleCalibrationSave} 
			/>
		{/if}
	</div>
</div>
