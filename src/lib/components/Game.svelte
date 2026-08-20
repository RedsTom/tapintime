<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Layout } from '$lib/schemas/titl';
	import type { Manifest } from '$lib/schemas/titm';
	import { loadAudio, ensureAudioContextRunning, getAudioContext, playHitSound, playComboBreakSound, setMasterVolume } from '$lib/audio';
	import { updateFingerStats, updateKeyStats, recordHitLatency, completeMap, loadProgression, getUnlockedKeys, type RankGrade } from '$lib/progression';
	import { loadSettings, type UserSettings } from '$lib/settings';
	import VirtualKeyboard from '$lib/components/VirtualKeyboard.svelte';
	import GameCountdown from '$lib/features/game/components/GameCountdown.svelte';
	import GameResultsModal from '$lib/features/game/components/GameResultsModal.svelte';
	import { ArrowLeft, RotateCcw, Play } from '@lucide/svelte';
	import { Engine } from '$lib/features/game/Engine';

	let {
		layout,
		manifest,
		audioBlob,
		mapId = 'tutorial'
	}: {
		layout: Layout;
		manifest: Manifest;
		audioBlob: Blob;
		mapId?: string;
	} = $props();

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let engine = $state<Engine | null>(null);
	let settings = $state<UserSettings | null>(null);
	let isLoaded = $state(false);
	let requiresClickToStart = $state(false);

	// HUD State
	let accuracy = $state(100);
	let combo = $state(0);
	let score = $state(0);
	let lastRating = $state<string | null>(null);
	let ratingOpacity = $state(0);

	// Pause & Countdown State
	let isPaused = $state(false);
	let countdown = $state<number | 'GO!' | null>(null);

	// End screen state
	let finished = $state(false);
	let calculatingResults = $state(false);
	let earnedGrade = $state<RankGrade>('C');
	let earnedXp = $state(0);
	let newlyUnlockedKeys = $state<string[]>([]);
	let finalStats = $state({ perfect: 0, great: 0, good: 0, miss: 0 });

	// Keyboard state
	let unlockedKeys = $state<Set<string>>(new Set(['f', 'j']));

	onMount(async () => {
		settings = await loadSettings();
		const prog = await loadProgression();
		unlockedKeys = new Set(getUnlockedKeys(prog.xp, layout, settings?.layoutFamiliarity ?? 1));

		setMasterVolume(settings.masterVolume / 100);

		await loadAudio(audioBlob);

		const isRunning = getAudioContext().state === 'running';
		if (!isRunning) {
			requiresClickToStart = true;
		} else {
			await initEngineAndStart();
		}
	});

	async function handleUserStart() {
		requiresClickToStart = false;
		await ensureAudioContextRunning();
		await initEngineAndStart();
	}

	async function initEngineAndStart() {
		if (canvasEl && !engine) {
			const instance = new Engine(
				canvasEl,
				manifest,
				layout,
				Array.from(unlockedKeys),
				settings?.audioOffsetMs ?? 0,
				settings?.visualOffsetMs ?? 0,
				settings?.leniencyMode ?? 'normal',
				{
					onStateUpdate: (state) => {
						combo = state.combo;
						score = state.score;
						accuracy = state.getAccuracy();
					},
					onHit: (rating, char, finger, deltaMs, comboBeforeMiss) => {
						lastRating = rating;
						ratingOpacity = 1;
						setTimeout(() => {
							ratingOpacity = 0;
						}, 150);

						if (rating === 'miss') {
							// Son de fin de combo UNIQUEMENT si combo > 10
							if (comboBeforeMiss && comboBeforeMiss > 10) {
								playComboBreakSound();
							}
						} else {
							// Son de hit dynamique à chaque frappe réussie
							playHitSound();
							if (deltaMs !== undefined) {
								recordHitLatency(deltaMs);
							}
						}

						if (finger) {
							updateFingerStats(finger, rating);
						}
						if (char) {
							updateKeyStats(char, rating);
						}
					},
					onPauseChange: (paused) => {
						isPaused = paused;
					},
					onFinish: async () => {
						finished = true;
						calculatingResults = true;
						if (!engine) return;
						const acc = engine.state.getAccuracy();
						const result = await completeMap(
							mapId,
							engine.state.score,
							acc,
							engine.state.miss,
							engine.state.maxCombo
						);
						earnedGrade = result.grade;
						earnedXp = result.xpEarned;
						newlyUnlockedKeys = result.newlyUnlockedKeys;
						finalStats = {
							perfect: engine.state.perfect,
							great: engine.state.great,
							good: engine.state.good,
							miss: engine.state.miss
						};
						calculatingResults = false;
					},
					onPressedKeysChange: () => {}
				}
			);

			await instance.ready;
			engine = instance;
			isLoaded = true;
			startCountdown();
		}
	}

	function startCountdown() {
		countdown = 3;
		const countdownSteps: (number | 'GO!')[] = [3, 2, 1, 'GO!'];
		let stepIdx = 0;
		const tick = () => {
			countdown = countdownSteps[stepIdx];
			stepIdx++;
			if (stepIdx < countdownSteps.length) {
				setTimeout(tick, 1000);
			} else {
				setTimeout(() => {
					countdown = null;
				}, 600);
			}
		};
		tick();
	}

	function restartGame() {
		window.location.reload();
	}

	onDestroy(() => {
		if (engine) {
			engine.destroy();
			engine = null;
		}
	});
</script>

<div class="relative w-full h-screen overflow-hidden bg-bg select-none">
	<canvas bind:this={canvasEl} class="w-full h-full block absolute inset-0 z-0"></canvas>

	<!-- Overlay si l'audio nécessite une interaction utilisateur -->
	{#if requiresClickToStart}
		<div class="absolute inset-0 z-40 bg-bg/95 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-sm">
			<div class="bg-surface border-4 border-secondary p-8 rounded-xl shadow-[8px_8px_0px_#1a0033] max-w-md flex flex-col items-center gap-6">
				<div class="text-2xl font-black uppercase text-primary tracking-wider">Audio prêt</div>
				<p class="text-xs font-bold text-text-dim uppercase tracking-wider">Cliquez ci-dessous pour démarrer le morceau et lancer le décompte.</p>
				<button
					onclick={handleUserStart}
					class="border-4 border-secondary bg-primary text-secondary px-6 py-3 rounded-lg font-black uppercase text-sm md:text-base shadow-[4px_4px_0px_#ff3366] hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer transition-all flex items-center gap-2"
				>
					<Play class="w-5 h-5 fill-secondary" /> CLIQUER POUR DÉMARRER
				</button>
			</div>
		</div>
	{/if}

	<!-- Overlay de préchargement -->
	{#if !isLoaded && !requiresClickToStart}
		<div class="absolute inset-0 z-30 bg-bg flex items-center justify-center">
			<div class="flex flex-col items-center gap-3">
				<div class="w-12 h-12 rounded-full border-4 border-t-accent border-secondary animate-spin"></div>
				<div class="font-black uppercase tracking-wider text-primary text-sm">Chargement du morceau & préparation des notes...</div>
			</div>
		</div>
	{/if}

	<!-- Overlay de décompte 3-2-1-GO -->
	<GameCountdown {countdown} />

	<!-- Top HUD Bar -->
	<div class="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-6 bg-surface border-4 border-secondary px-6 py-2 md:py-2.5 rounded-lg shadow-neo select-none">
		<div class="font-black text-lg md:text-2xl text-accent">
			{combo}x
		</div>
		<div class="w-1 h-6 bg-secondary rounded"></div>
		<div class="font-black text-lg md:text-2xl text-primary font-mono">
			{accuracy.toFixed(1)}%
		</div>
		<div class="w-1 h-6 bg-secondary rounded"></div>
		<div class="font-black text-lg md:text-2xl text-text font-mono">
			{score.toLocaleString()}
		</div>
	</div>

	<!-- Bouton Pause ESC -->
	<div class="absolute top-6 left-6 z-10 select-none">
		<div class="relative group">
			<div class="absolute inset-0 bg-secondary border-4 border-secondary rounded-lg translate-x-[4px] translate-y-[4px]"></div>
			<button
				onclick={() => engine?.togglePause()}
				class="relative border-4 border-secondary px-4 py-2 bg-primary text-secondary rounded-lg flex items-center gap-2 font-black uppercase text-xs md:text-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer"
			>
				<Play class="w-4 h-4 fill-secondary" /> PAUSE
				<kbd class="ml-1 px-1.5 py-0.5 text-[10px] bg-secondary text-primary border border-secondary rounded font-mono font-black uppercase">ESC</kbd>
			</button>
		</div>
	</div>

	<!-- Feedback visuel de frappe -->
	{#if lastRating}
		{@const ratingColor =
			lastRating === 'perfect'
				? 'text-perfect'
				: lastRating === 'great'
					? 'text-great'
					: lastRating === 'good'
						? 'text-good'
						: 'text-miss'}
		<div
			class="absolute left-1/2 pointer-events-none select-none font-sans font-black text-3xl md:text-4xl uppercase tracking-widest text-center transition-all duration-100 ease-out {ratingColor}"
			style="top: 26%; transform: translate(-50%, -50%) scale({ratingOpacity * 0.3 + 0.7}); opacity: {ratingOpacity}; text-shadow: 3px 3px 0px #0B0014;"
		>
			{lastRating === 'miss' ? 'miss!' : lastRating}
		</div>
	{/if}

	<!-- Clavier Virtuel Overlay (DOM mis à jour manuellement par le moteur pour éviter les stutters) -->
	{#if settings?.showKeyboard && !finished}
		<div id="game-keyboard-container" class="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-fit">
			<VirtualKeyboard {layout} {unlockedKeys} scale={settings.keyboardScale} />
		</div>
	{/if}

	<!-- Modal Pause -->
	{#if isPaused}
		<div class="fixed inset-0 z-50 bg-bg/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
			<div class="bg-surface border-4 border-secondary rounded-xl p-8 shadow-[8px_8px_0px_0px_#1a0033] max-w-sm w-full flex flex-col gap-6 text-center relative overflow-hidden">
				<div class="flex flex-col gap-1 border-b-4 border-secondary pb-3">
					<h2 class="text-3xl font-black uppercase text-primary tracking-wider">PAUSE</h2>
					<p class="text-xs font-bold text-text-dim uppercase tracking-wider">{manifest.title}</p>
				</div>

				<div class="flex flex-col gap-3">
					<button
						onclick={() => engine?.resume()}
						class="w-full border-4 border-secondary bg-primary text-secondary py-3 rounded-lg font-black uppercase text-sm shadow-[4px_4px_0px_0px_#f9564f] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center justify-center gap-2"
					>
						<Play class="w-4 h-4 fill-secondary" /> REPRENDRE
						<kbd class="px-1.5 py-0.5 text-[9px] bg-secondary text-primary border border-secondary rounded font-mono font-black">ESC</kbd>
					</button>

					<button
						onclick={restartGame}
						class="w-full border-4 border-secondary bg-accent text-secondary py-3 rounded-lg font-black uppercase text-sm shadow-[4px_4px_0px_0px_#ffc145] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center justify-center gap-2"
					>
						<RotateCcw class="w-4 h-4" /> RECOMMENCER
					</button>

					<a
						href="/"
						class="w-full border-4 border-secondary bg-secondary text-white py-3 rounded-lg font-black uppercase text-sm shadow-[4px_4px_0px_0px_#1a0033] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center justify-center gap-2"
					>
						<ArrowLeft class="w-4 h-4" /> RETOUR AU MENU
					</a>
				</div>
			</div>
		</div>
	{/if}

	<!-- Modal de fin de partie avec résultats -->
	<GameResultsModal
		{finished}
		{calculatingResults}
		{earnedGrade}
		{earnedXp}
		{newlyUnlockedKeys}
		title={manifest.title}
		{score}
		{accuracy}
		{finalStats}
		onRestart={restartGame}
	/>
</div>
