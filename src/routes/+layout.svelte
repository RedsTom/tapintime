<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import favicon from '$lib/assets/favicon.svg';
	import { Bug } from '@lucide/svelte';
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
		<div class="w-full bg-accent/90 border-b-4 border-secondary px-4 py-1.5 flex items-center justify-between gap-4 select-none">
			<p class="text-secondary text-xs md:text-sm font-black uppercase tracking-wider flex items-center gap-2">
				<span class="bg-secondary text-accent px-2 py-0.5 rounded text-[10px] md:text-xs font-black tracking-widest">BÊTA</span>
				<span class="hidden sm:inline">Cette application est en bêta et peut contenir des bugs.</span>
				<span class="sm:hidden">Application en bêta.</span>
			</p>
			<a
				href="https://github.com/RedsTom/tapintime/issues"
				target="_blank"
				rel="noopener noreferrer"
				class="shrink-0 border-2 border-secondary bg-secondary text-accent px-3 py-1 rounded font-black uppercase text-[10px] md:text-xs tracking-wider hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
			>
				<Bug class="w-3.5 h-3.5" /> Signaler un bug
			</a>
		</div>
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
