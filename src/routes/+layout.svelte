<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import favicon from '$lib/assets/favicon.svg';
	import BackgroundParallax from '$lib/components/BackgroundParallax.svelte';
	import GameHeader from '$lib/components/GameHeader.svelte';

	import { onMount } from 'svelte';
	import { loadSettings } from '$lib/settings';

	let { children } = $props();

	const isPlayRoute = $derived(page.url.pathname === '/play');
	const isOnboardingRoute = $derived(page.url.pathname === '/onboarding');
	const isEditorRoute = $derived(page.url.pathname.startsWith('/creator/beatmap'));

	onMount(async () => {
		const settings = await loadSettings();
		if (!settings.onboardingCompleted && window.location.pathname !== '/onboarding') {
			window.location.href = '/onboarding';
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>TapInTime - osu! Typing Rhythm Game</title>
</svelte:head>

<!-- Animated Background -->
<BackgroundParallax />

<!-- Main Container -->
<div class="min-h-screen flex flex-col relative z-10 w-full">
	{#if !isPlayRoute && !isOnboardingRoute && !isEditorRoute}
		<GameHeader />
	{/if}

	<main class="flex-1 w-full grid grid-cols-1 grid-rows-1 relative">
		{#key page.url.pathname}
			<div in:fly={{ y: 20, duration: 400, easing: backOut, delay: 100 }} out:fly={{ y: -20, duration: 300 }} class="col-start-1 row-start-1 w-full">
				{@render children()}
			</div>
		{/key}
	</main>
</div>
