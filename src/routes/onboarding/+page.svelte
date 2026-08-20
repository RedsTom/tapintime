<script lang="ts">
	import { onMount } from 'svelte';
	import { loadSettings, type UserSettings } from '$lib/settings';
	import Onboarding from '$lib/components/Onboarding.svelte';
	import { COLORS } from '$lib/tokens';

	let settings = $state<UserSettings | null>(null);

	onMount(async () => {
		settings = await loadSettings();
		if (settings.onboardingCompleted) {
			window.location.href = '/';
		}
	});

	function handleComplete() {
		window.location.href = '/';
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-bg">
	{#if settings && !settings.onboardingCompleted}
		<Onboarding {settings} onComplete={handleComplete} />
	{:else}
		<div class="flex flex-col items-center gap-3">
			<div class="w-12 h-12 rounded-full border-4 border-t-primary border-secondary animate-spin"></div>
			<div class="font-black text-text-dim text-xs uppercase tracking-wider">Chargement...</div>
		</div>
	{/if}
</div>
