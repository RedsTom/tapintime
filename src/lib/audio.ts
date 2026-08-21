let audioContext: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let audioBuffer: AudioBuffer | null = null;
let audioZeroTime = 0; // AudioContext.currentTime corresponding to song time 0
let pausedTimeSec = 0;
let masterVolume = 0.8; // 0.0 to 1.0
let effectsVolume = 0.8; // 0.0 to 1.0

export function setMasterVolume(vol: number): void {
	masterVolume = Math.max(0, Math.min(1, vol));
	if (gainNode) {
		const ctx = getAudioContext();
		try {
			gainNode.gain.cancelScheduledValues(ctx.currentTime);
			gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
			gainNode.gain.linearRampToValueAtTime(masterVolume, ctx.currentTime + 0.05);

			if (audioBuffer && audioZeroTime > 0) {
				const FADE_OUT_DURATION = 1.5;
				const duration = audioBuffer.duration;
				const fadeOutStartTime = audioZeroTime + Math.max(0, duration - FADE_OUT_DURATION);
				if (fadeOutStartTime > ctx.currentTime + 0.1) {
					gainNode.gain.setValueAtTime(masterVolume, fadeOutStartTime);
					gainNode.gain.linearRampToValueAtTime(0.001, fadeOutStartTime + FADE_OUT_DURATION);
				}
			}
		} catch {}
	}
}

export function getMasterVolume(): number {
	return masterVolume;
}

export function getEffectsVolume(): number {
	return effectsVolume;
}

export function setEffectsVolume(vol: number): void {
	effectsVolume = Math.max(0, Math.min(1, vol));
}


export function getAudioContext(): AudioContext {
	if (!audioContext) {
		audioContext = new AudioContext();
	}
	return audioContext;
}

export function resumeAudioContext(): void {
	if (audioContext && audioContext.state === 'suspended') {
		audioContext.resume();
	}
}

export async function ensureAudioContextRunning(): Promise<boolean> {
	const ctx = getAudioContext();
	if (ctx.state === 'suspended') {
		try {
			await ctx.resume();
		} catch {}
	}
	return ctx.state === 'running';
}

export function isAudioLoaded(): boolean {
	return audioBuffer !== null && audioBuffer.duration > 0;
}

export async function loadAudio(blob: Blob): Promise<AudioBuffer> {
	const ctx = getAudioContext();
	const arrayBuffer = await blob.arrayBuffer();
	audioBuffer = await ctx.decodeAudioData(arrayBuffer);
	return audioBuffer;
}

/** Schedules audio playback with fade-in and fade-out using Web Audio API timing */
export function scheduleAudioPlay(countdownDelaySec = 3.0, startOffsetSec = 0): void {
	const ctx = getAudioContext();
	resumeAudioContext();
	if (!audioBuffer) return;

	stopAudio();

	const now = ctx.currentTime;
	const playAtTime = now + countdownDelaySec;

	sourceNode = ctx.createBufferSource();
	sourceNode.buffer = audioBuffer;

	gainNode = ctx.createGain();
	sourceNode.connect(gainNode);
	gainNode.connect(ctx.destination);

	// Fade-In over 0.8s
	const FADE_IN_DURATION = 0.8;
	gainNode.gain.setValueAtTime(0, playAtTime);
	gainNode.gain.linearRampToValueAtTime(masterVolume, playAtTime + FADE_IN_DURATION);

	// Fade-Out at end of track over 1.5s
	const FADE_OUT_DURATION = 1.5;
	const duration = audioBuffer.duration;
	const fadeOutStartTime = playAtTime + Math.max(0, duration - startOffsetSec - FADE_OUT_DURATION);
	gainNode.gain.setValueAtTime(masterVolume, fadeOutStartTime);
	gainNode.gain.linearRampToValueAtTime(0.001, fadeOutStartTime + FADE_OUT_DURATION);

	sourceNode.start(playAtTime, startOffsetSec);

	// Zero time is the AudioContext.currentTime when song position = 0
	audioZeroTime = playAtTime - startOffsetSec;
}

export function pauseAudio(): number {
	pausedTimeSec = Math.max(0, getPlaybackTime());
	stopAudio();
	return pausedTimeSec;
}

export function resumeAudioFromPause(): void {
	scheduleAudioPlay(0, pausedTimeSec);
}

export function stopAudio(): void {
	if (sourceNode) {
		try {
			sourceNode.stop();
		} catch {}
		sourceNode = null;
	}
	if (gainNode) {
		try {
			gainNode.disconnect();
		} catch {}
		gainNode = null;
	}
	audioZeroTime = 0;
}

export function getPlaybackTime(): number {
	const ctx = audioContext;
	if (ctx && audioZeroTime > 0) {
		return ctx.currentTime - audioZeroTime;
	}
	return 0;
}

/**
 * Synthétise un son de frappe (Hit sound) percussif et réactif (35ms).
 */
export function playHitSound(): void {
	try {
		const ctx = getAudioContext();
		if (ctx.state === 'suspended') ctx.resume();

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(900, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.035);

		gain.gain.setValueAtTime(0.45 * masterVolume * effectsVolume, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(ctx.currentTime);
		osc.stop(ctx.currentTime + 0.035);
	} catch {}
}

/**
 * Synthétise un son de rupture de combo (Combo Break sound) grave et lourd (220ms).
 */
export function playComboBreakSound(): void {
	try {
		const ctx = getAudioContext();
		if (ctx.state === 'suspended') ctx.resume();

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(220, ctx.currentTime);
		osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.22);

		gain.gain.setValueAtTime(0.5 * masterVolume * effectsVolume, ctx.currentTime);
		gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.22);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(ctx.currentTime);
		osc.stop(ctx.currentTime + 0.22);
	} catch {}
}

/**
 * Synthétise une fanfare joyeuse lors du déblocage d'un palier/nouvelles touches.
 */
export function playUnlockFanfareSound(): void {
	try {
		const ctx = getAudioContext();
		if (ctx.state === 'suspended') ctx.resume();

		const freqs = [523.25, 659.25, 783.99, 1046.50]; // Do5, Mi5, Sol5, Do6
		freqs.forEach((freq, idx) => {
			const startTime = ctx.currentTime + idx * 0.08;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'triangle';
			osc.frequency.setValueAtTime(freq, startTime);

			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.4 * masterVolume * effectsVolume, startTime + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(startTime);
			osc.stop(startTime + 0.2);
		});
	} catch {}
}
