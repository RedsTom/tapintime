<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Layout } from '$lib/schemas/titl';
	import type { Manifest } from '$lib/schemas/titm';
	import { loadAudio, ensureAudioContextRunning, getAudioContext, playHitSound, playComboBreakSound, setMasterVolume, setEffectsVolume } from '$lib/audio';
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
		bgBlob,
		isVideo = false,
		mapId = 'tutorial'
	}: {
		layout: Layout;
		manifest: Manifest;
		audioBlob: Blob;
		bgBlob?: Blob;
		isVideo?: boolean;
		mapId?: string;
	} = $props();

	let bgUrl = $state<string | null>(null);

	$effect(() => {
		if (bgBlob) {
			const url = URL.createObjectURL(bgBlob);
			bgUrl = url;
			return () => {
				URL.revokeObjectURL(url);
			};
		} else {
			bgUrl = null;
		}
	});

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let engine = $state<Engine | null>(null);
	let settings = $state<UserSettings | null>(null);
	let isLoaded = $state(false);

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
	let showKeySelector = $state(false);
	let selectedKeys = $state<Set<string>>(new Set());

	function toggleKey(char: string) {
		if (selectedKeys.has(char)) {
			if (selectedKeys.size <= 2) return; // minimum 2 keys active required
			selectedKeys.delete(char);
		} else {
			selectedKeys.add(char);
		}
		selectedKeys = new Set(selectedKeys);
	}

	function returnToLevelList() {
		window.location.href = '/';
	}

	onMount(() => {
		let cleanupKeydown: (() => void) | undefined;

		async function init() {
			settings = await loadSettings();
			const prog = await loadProgression();
			unlockedKeys = new Set(getUnlockedKeys(prog.xp, layout, settings?.layoutFamiliarity ?? 1));
			selectedKeys = new Set(unlockedKeys);

			setMasterVolume(settings.masterVolume / 100);
			setEffectsVolume(settings.effectsVolume / 100);

			await loadAudio(audioBlob);

			isLoaded = true;
			showKeySelector = true;

			function handlePreGameKeys(e: KeyboardEvent) {
				if (showKeySelector && isLoaded) {
					if (e.key === 'Escape') {
						e.preventDefault();
						returnToLevelList();
					} else if (e.key === 'Enter') {
						e.preventDefault();
						if (selectedKeys.size >= 2) {
							initEngineAndStart();
						}
					}
				}
			}

			window.addEventListener('keydown', handlePreGameKeys);
			cleanupKeydown = () => window.removeEventListener('keydown', handlePreGameKeys);
		}

		init();

		return () => {
			if (cleanupKeydown) cleanupKeydown();
		};
	});

	// Throttle HUD via requestAnimationFrame — batch les updates pour éviter les re-renders Svelte excessifs
	let hudUpdatePending = false;
	let pendingCombo = 0;
	let pendingScore = 0;
	let pendingAccuracy = 100;

	function scheduleHudUpdate(state: import('$lib/features/game/GameState').GameState) {
		pendingCombo = state.combo;
		pendingScore = state.score;
		pendingAccuracy = state.getAccuracy();
		if (!hudUpdatePending) {
			hudUpdatePending = true;
			requestAnimationFrame(() => {
				combo = pendingCombo;
				score = pendingScore;
				accuracy = pendingAccuracy;
				hudUpdatePending = false;
			});
		}
	}

	async function initEngineAndStart() {
		await ensureAudioContextRunning();
		if (canvasEl && !engine) {
			showKeySelector = false;
			const instance = new Engine(
				canvasEl,
				manifest,
				layout,
				Array.from(selectedKeys),
				settings?.audioOffsetMs ?? 0,
				settings?.visualOffsetMs ?? 0,
				settings?.leniencyMode ?? 'normal',
				settings?.noteSpeed ?? 400,
				{
					onStateUpdate: (state) => {
						scheduleHudUpdate(state);
					},
					onHit: (rating, _char, _finger, _deltaMs, comboBeforeMiss) => {
						if (rating === 'miss') {
							// Son de fin de combo UNIQUEMENT si combo > 10
							if (comboBeforeMiss && comboBeforeMiss > 10) {
								playComboBreakSound();
							}
						} else {
							// Son de hit dynamique à chaque frappe réussie
							playHitSound();
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
	const showLevelBg = $derived(settings?.showLevelBackground ?? true);
	const bgDimPercent = $derived(settings?.backgroundDim ?? 50);
</script>

<div class="relative w-full h-screen overflow-hidden bg-bg select-none">
	<!-- Arrière-plan adaptatif (Image ou Vidéo de fond) uniquement si activé dans les paramètres -->
	{#if bgUrl && showLevelBg && bgDimPercent < 100}
		{@const mediaOpacity = Math.max(0, (100 - bgDimPercent) / 100)}
		{@const overlayOpacity = bgDimPercent / 100}
		<div class="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
			{#if isVideo}
				<video
					src={bgUrl}
					autoplay
					loop
					muted
					playsinline
					class="w-full h-full object-cover filter blur-[1px] transition-opacity duration-300"
					style="opacity: {mediaOpacity};"
				></video>
			{:else}
				<img
					src={bgUrl}
					alt="Background"
					class="w-full h-full object-cover filter blur-[1px] transition-opacity duration-300"
					style="opacity: {mediaOpacity};"
				/>
			{/if}
			<!-- Voile assombrissant configurable selon les paramètres -->
			<div
				class="absolute inset-0 bg-bg transition-opacity duration-300"
				style="opacity: {overlayOpacity};"
			></div>
		</div>
	{/if}

	<canvas bind:this={canvasEl} class="w-full h-full block absolute inset-0 z-10 focus:outline-none"></canvas>

	<!-- Overlay de préchargement -->
	{#if !isLoaded}
		<div class="absolute inset-0 z-30 bg-bg flex items-center justify-center">
			<div class="flex flex-col items-center gap-3">
				<div class="w-12 h-12 rounded-full border-4 border-t-accent border-secondary animate-spin"></div>
				<div class="font-black uppercase tracking-wider text-primary text-sm">Chargement du morceau & préparation des notes...</div>
			</div>
		</div>
	{/if}

	<!-- Overlay de sélection des touches actives (Prêt à démarrer) -->
	{#if showKeySelector && isLoaded}
		<div class="absolute inset-0 z-40 bg-bg/95 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-md text-text">
			<div class="bg-surface border-4 border-secondary p-10 rounded-xl shadow-[8px_8px_0px_#1a0033] max-w-3xl w-full flex flex-col items-center gap-8 transition-all duration-300">
				<div class="flex flex-col gap-2">
					<h2 class="text-3xl font-black uppercase text-primary tracking-wider">Prêt à Démarrer</h2>
					<p class="text-sm font-bold text-text-dim uppercase tracking-wider">
						Configurez vos touches actives avant de lancer le niveau ({selectedKeys.size} actives).
					</p>
					<p class="text-xs font-black text-accent uppercase tracking-widest mt-1">
						(Cliquez sur les touches pour les activer/désactiver — Minimum 2 touches)
					</p>
				</div>

				<!-- Clavier Virtuel Interactif -->
				<div class="w-full flex justify-center py-4 my-2 border-y-4 border-secondary/20">
					<VirtualKeyboard 
						{layout} 
						{unlockedKeys} 
						scale={1.0} 
						selectable={true}
						{selectedKeys}
						onKeyToggle={toggleKey}
					/>
				</div>

				<div class="flex flex-wrap items-center justify-center gap-4 w-full">
					<button
						onclick={returnToLevelList}
						class="border-4 border-secondary bg-surface text-text hover:bg-secondary/30 px-6 py-4 rounded-xl font-black uppercase text-sm md:text-base shadow-[4px_4px_0px_#1a0033] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center gap-2"
						title="Retourner à la liste des niveaux (Échap)"
					>
						<ArrowLeft class="w-5 h-5 text-accent" />
						<span>RETOUR</span>
						<kbd class="px-2 py-0.5 text-xs bg-secondary text-primary border border-secondary rounded font-mono font-black uppercase shadow-sm">
							ÉCHAP
						</kbd>
					</button>

					<button
						onclick={initEngineAndStart}
						disabled={selectedKeys.size < 2}
						class="border-4 border-secondary bg-primary text-secondary px-8 py-4 rounded-xl font-black uppercase text-base md:text-lg shadow-[6px_6px_0px_#ff3366] hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 flex items-center gap-3 active:scale-95"
						title="Lancer la partie (Entrée)"
					>
						<Play class="w-6 h-6 fill-secondary" />
						<span>LANCER LA PARTIE</span>
						<kbd class="px-2 py-0.5 text-xs bg-secondary text-primary border border-secondary rounded font-mono font-black uppercase shadow-sm">
							ENTRÉE ↵
						</kbd>
					</button>
				</div>
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
