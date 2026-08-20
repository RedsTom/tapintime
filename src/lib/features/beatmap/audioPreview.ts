import { getCustomBeatmap } from '../../storage';

/**
 * Service autonome pour la pré-écoute audio des beatmaps dans les menus.
 * Gère le chargement, le fade-in/fade-out et la libération de la mémoire.
 */
export class AudioPreviewManager {
	private previewAudio: HTMLAudioElement | null = null;
	private currentPreviewUrl: string | null = null;
	private isPaused = false;

	/**
	 * Démarre la pré-écoute audio d'une beatmap avec un effet de fade-in.
	 *
	 * @param mapId Identifiant de la beatmap
	 */
	async playPreview(mapId: string): Promise<void> {
		await this.stopPreview();
		this.isPaused = false;

		try {
			let blob: Blob | null = null;

			const customMap = await getCustomBeatmap(mapId);
			if (customMap && customMap.audioBlob) {
				blob = customMap.audioBlob;
			} else {
				const res = await fetch(`/maps/${mapId}.titm`);
				if (res.ok) {
					const JSZip = (await import('jszip')).default;
					const zip = await JSZip.loadAsync(await res.arrayBuffer());
					const audioFile = zip.file('audio.mp3') ?? zip.file('audio.ogg');
					if (audioFile) {
						blob = await audioFile.async('blob');
					}
				}
			}

			if (blob) {
				this.currentPreviewUrl = URL.createObjectURL(blob);
				this.previewAudio = new Audio(this.currentPreviewUrl);
				this.previewAudio.volume = 0;
				this.previewAudio.loop = true;

				const playPromise = this.previewAudio.play();
				if (playPromise !== undefined) {
					await playPromise;
					let vol = 0;
					const targetVol = 0.4;
					const step = targetVol / 16;
					const fadeTimer = setInterval(() => {
						if (!this.previewAudio) {
							clearInterval(fadeTimer);
							return;
						}
						vol = Math.min(targetVol, vol + step);
						this.previewAudio.volume = vol;
						if (vol >= targetVol) clearInterval(fadeTimer);
					}, 50);
				}
			}
		} catch (e) {
			console.error('Failed to load audio preview:', e);
		}
	}

	/**
	 * Bascule la pré-écoute audio entre lecture et pause.
	 */
	toggle(): boolean {
		if (!this.previewAudio) return false;
		if (this.previewAudio.paused) {
			this.previewAudio.play().catch(() => {});
			this.isPaused = false;
		} else {
			this.previewAudio.pause();
			this.isPaused = true;
		}
		return this.isPaused;
	}

	/**
	 * Arrête la pré-écoute audio avec un effet de fade-out progressif.
	 *
	 * @param fadeDurationMs Durée de la fondue en fermeture en millisecondes
	 */
	stopPreview(fadeDurationMs = 300): Promise<void> {
		return new Promise((resolve) => {
			const audioToStop = this.previewAudio;
			const urlToClean = this.currentPreviewUrl;
			this.previewAudio = null;
			this.currentPreviewUrl = null;

			if (!audioToStop) {
				if (urlToClean) URL.revokeObjectURL(urlToClean);
				resolve();
				return;
			}

			let vol = audioToStop.volume;
			const steps = 10;
			const intervalTime = fadeDurationMs / steps;
			const volStep = vol / steps;

			const timer = setInterval(() => {
				vol = Math.max(0, vol - volStep);
				audioToStop.volume = vol;
				if (vol <= 0) {
					clearInterval(timer);
					audioToStop.pause();
					if (urlToClean) URL.revokeObjectURL(urlToClean);
					resolve();
				}
			}, intervalTime);
		});
	}

	/** Indique si l'audio de pré-écoute est actuellement en pause */
	get isAudioPaused(): boolean {
		return this.isPaused;
	}
}
