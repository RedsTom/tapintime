<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/components/Logo.svelte';
	import { getPlayerLevel, loadProgression, type ProgressionData } from '../../progression/progression';
	import { loadSettings, type UserSettings } from '../../../settings';
	import { BarChart2, Music, Settings, Wrench } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let progression = $state<ProgressionData | null>(null);
	let settings = $state<UserSettings | null>(null);

	const levelInfo = $derived(
		progression ? getPlayerLevel(progression.xp) : { level: 1, currentXp: 0, nextLevelXp: 100, progress: 0 }
	);

	const currentRoute = $derived(page.url.pathname);

	onMount(async () => {
		progression = await loadProgression();
		settings = await loadSettings();
	});
</script>

<header class="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-surface border-b-4 border-secondary sticky top-0 z-50 select-none">
	<!-- Logo -->
	<a href="/" class="transition-transform hover:scale-105 active:scale-95">
		<Logo />
	</a>

	<!-- Onglets de navigation -->
	<nav class="flex items-center gap-2 md:gap-4">
		<a 
			href="/" 
			class="
				flex items-center gap-2 px-4 py-2 font-black uppercase text-sm border-4 rounded-lg transition-all
				{currentRoute === '/' 
					? 'border-secondary bg-primary text-secondary shadow-[4px_4px_0px_0px_var(--color-secondary)] translate-x-[-2px] translate-y-[-2px]' 
					: 'border-transparent text-text-dim hover:text-text hover:bg-secondary/30'
				}
			"
		>
			<Music class="w-4 h-4" /> Niveaux
		</a>

		<a 
			href="/creator" 
			class="
				flex items-center gap-2 px-4 py-2 font-black uppercase text-sm border-4 rounded-lg transition-all
				{currentRoute.startsWith('/creator') 
					? 'border-secondary bg-primary text-secondary shadow-[4px_4px_0px_0px_var(--color-secondary)] translate-x-[-2px] translate-y-[-2px]' 
					: 'border-transparent text-text-dim hover:text-text hover:bg-secondary/30'
				}
			"
		>
			<Wrench class="w-4 h-4" /> Éditeurs
		</a>

		<a 
			href="/stats" 
			class="
				flex items-center gap-2 px-4 py-2 font-black uppercase text-sm border-4 rounded-lg transition-all
				{currentRoute === '/stats' 
					? 'border-secondary bg-primary text-secondary shadow-[4px_4px_0px_0px_var(--color-secondary)] translate-x-[-2px] translate-y-[-2px]' 
					: 'border-transparent text-text-dim hover:text-text hover:bg-secondary/30'
				}
			"
		>
			<BarChart2 class="w-4 h-4" /> Stats
		</a>

		<a 
			href="/settings" 
			class="
				flex items-center gap-2 px-4 py-2 font-black uppercase text-sm border-4 rounded-lg transition-all
				{currentRoute === '/settings' 
					? 'border-secondary bg-primary text-secondary shadow-[4px_4px_0px_0px_var(--color-secondary)] translate-x-[-2px] translate-y-[-2px]' 
					: 'border-transparent text-text-dim hover:text-text hover:bg-secondary/30'
				}
			"
		>
			<Settings class="w-4 h-4" /> Paramètres
		</a>
	</nav>

	<div class="flex items-center">
		<!-- Carte d'expérience -->
		<div class="flex items-center gap-4 bg-surface border-4 border-secondary p-2.5 rounded-lg shadow-neo-hover">
			<div class="w-10 h-10 rounded bg-accent text-secondary border-2 border-secondary flex items-center justify-center font-black text-xl shadow-[2px_2px_0px_0px_var(--color-secondary)]">
				{levelInfo.level}
			</div>

			<div class="flex flex-col gap-1 w-32 md:w-40 text-left">
				<div class="flex justify-between text-[10px] font-black tracking-wider uppercase">
					<span class="text-text">NIV {levelInfo.level}</span>
					<span class="text-text-dim">{levelInfo.currentXp}/{levelInfo.nextLevelXp} XP</span>
				</div>
				<div class="w-full h-3.5 bg-bg border-2 border-secondary rounded overflow-hidden relative">
					<div 
						class="h-full bg-primary transition-all duration-300 rounded-sm"
						style="width: {levelInfo.progress * 100}%"
					></div>
				</div>
			</div>
		</div>
	</div>
</header>
