<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import { Eye, Volume2, CheckCircle2, Activity } from '@lucide/svelte';

	let {
		visualOffsetMs = 0,
		audioOffsetMs = 0,
		onSave,
		onClose
	}: {
		visualOffsetMs?: number;
		audioOffsetMs?: number;
		onSave: (visualMs: number, audioMs: number) => void;
		onClose?: () => void;
	} = $props();

	let activeTab = $state<'visual' | 'audio'>('visual');

	// Calibration State
	let audioCtx: AudioContext | null = null;
	let metronomeInterval: ReturnType<typeof setInterval> | null = null;
	let isPlaying = $state(false);
	let beatVisual = $state(false);

	const BPM = 100;
	const TICK_INTERVAL = 60000 / BPM; // 600ms
	let nextTickTime = 0;

	let tapOffsets: number[] = $state([]);
	let calculatedVisualOffset = $state<number | null>(untrack(() => visualOffsetMs));
	let calculatedAudioOffset = $state<number | null>(untrack(() => audioOffsetMs));

	function playBeep() {
		if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
		if (audioCtx.state === 'suspended') audioCtx.resume();

		const osc = audioCtx.createOscillator();
		const gainNode = audioCtx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(880, audioCtx.currentTime);

		gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

		osc.connect(gainNode);
		gainNode.connect(audioCtx.destination);

		osc.start();
		osc.stop(audioCtx.currentTime + 0.1);
	}

	function startCalibration() {
		if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
		if (audioCtx.state === 'suspended') audioCtx.resume();

		isPlaying = true;
		tapOffsets = [];
		if (activeTab === 'visual') calculatedVisualOffset = null;
		if (activeTab === 'audio') calculatedAudioOffset = null;
		nextTickTime = performance.now() + TICK_INTERVAL;

		metronomeInterval = setInterval(() => {
			if (activeTab === 'audio') {
				playBeep();
			}

			if (activeTab === 'visual') {
				beatVisual = true;
				setTimeout(() => {
					beatVisual = false;
				}, 100);
			}

			nextTickTime = performance.now() + TICK_INTERVAL;
		}, TICK_INTERVAL);
	}

	function stopCalibration() {
		isPlaying = false;
		if (metronomeInterval) {
			clearInterval(metronomeInterval);
			metronomeInterval = null;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isPlaying) return;
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
		if (e.code === 'Tab' || e.code === 'Escape') return;

		e.preventDefault();

		const tapTime = performance.now();
		const diffCurrent = tapTime - (nextTickTime - TICK_INTERVAL);
		const diffNext = nextTickTime - tapTime;

		let offset = 0;
		if (diffCurrent < diffNext) {
			offset = -diffCurrent;
		} else {
			offset = diffNext;
		}

		tapOffsets = [...tapOffsets, offset].slice(-8);

		if (tapOffsets.length >= 4) {
			const sum = tapOffsets.reduce((a, b) => a + b, 0);
			const avg = Math.round(sum / tapOffsets.length);
			if (activeTab === 'visual') calculatedVisualOffset = avg;
			if (activeTab === 'audio') calculatedAudioOffset = avg;
		}
	}

	function switchTab(tab: 'visual' | 'audio') {
		stopCalibration();
		activeTab = tab;
	}

	function saveAndFinish() {
		stopCalibration();
		onSave(calculatedVisualOffset ?? 0, calculatedAudioOffset ?? 0);
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		stopCalibration();
		window.removeEventListener('keydown', handleKeydown);
		if (audioCtx) audioCtx.close();
	});
</script>

<div class="flex flex-col gap-6 text-left select-none">
	<!-- Mode Switcher -->
	<div class="flex border-4 border-secondary rounded-lg overflow-hidden p-1 bg-secondary/30 gap-1">
		<button
			onclick={() => switchTab('visual')}
			class="flex-1 py-2 px-3 rounded font-black text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer
				{activeTab === 'visual'
					? 'bg-primary text-secondary shadow-[2px_2px_0px_#1a0033]'
					: 'text-text-dim hover:text-text'}"
		>
			<Eye class="w-4 h-4" /> Calibration Visuelle
		</button>
		<button
			onclick={() => switchTab('audio')}
			class="flex-1 py-2 px-3 rounded font-black text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer
				{activeTab === 'audio'
					? 'bg-accent text-secondary shadow-[2px_2px_0px_#1a0033]'
					: 'text-text-dim hover:text-text'}"
		>
			<Volume2 class="w-4 h-4" /> Calibration Audio
		</button>
	</div>

	<!-- Interactive Area -->
	<div class="bg-surface border-4 border-secondary p-8 rounded-xl flex flex-col items-center justify-center min-h-[220px] relative shadow-[6px_6px_0px_#1a0033]">
		{#if activeTab === 'visual'}
			<div
				class="w-32 h-32 border-4 border-secondary rounded-2xl flex items-center justify-center transition-all duration-75 shadow-neo"
				class:bg-primary={beatVisual}
				class:bg-secondary={!beatVisual}
				class:scale-110={beatVisual}
			>
				<Activity class="w-12 h-12 {beatVisual ? 'text-secondary' : 'text-primary'}" />
			</div>
		{:else}
			<div class="w-32 h-32 border-4 border-secondary bg-secondary/30 rounded-2xl flex items-center justify-center shadow-neo">
				<Volume2 class="w-12 h-12 text-accent {isPlaying ? 'animate-bounce' : ''}" />
			</div>
		{/if}

		{#if !isPlaying}
			<div class="mt-6">
				<Button variant="primary" size="md" onclick={startCalibration}>
					DÉMARRER LE TEST (N'IMPORTE QUELLE TOUCHE)
				</Button>
			</div>
		{:else}
			<div class="mt-4 text-center">
				<p class="text-xs font-black uppercase text-text-dim animate-pulse">
					Appuyez sur n'importe quelle touche en rythme avec les {activeTab === 'visual' ? 'flashes' : 'bips'}...
				</p>
				<p class="text-[10px] text-text-dim mt-1">({tapOffsets.length} / 8 frappes enregistrées)</p>
			</div>
		{/if}
	</div>

	<!-- Offset Result Card -->
	<div class="bg-surface border-4 border-secondary p-4 rounded-xl flex items-center justify-between shadow-[4px_4px_0px_#1a0033]">
		<div>
			<span class="text-xs font-black uppercase text-text-dim block">
				Décalage {activeTab === 'visual' ? 'visuel' : 'audio'} calculé :
			</span>
			<span class="text-2xl font-black text-primary">
				{#if activeTab === 'visual'}
					{calculatedVisualOffset !== null ? `${calculatedVisualOffset} ms` : 'Non mesuré'}
				{:else}
					{calculatedAudioOffset !== null ? `${calculatedAudioOffset} ms` : 'Non mesuré'}
				{/if}
			</span>
		</div>
		<Button variant="accent" size="md" onclick={saveAndFinish}>
			<CheckCircle2 class="w-4 h-4" /> ENREGISTRER & VALIDER
		</Button>
	</div>
</div>
