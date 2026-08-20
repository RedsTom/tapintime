import type { HitObject, Manifest } from '../beatmap/schemas/titm';
import { ManifestSchema } from '../beatmap/schemas/titm';
import type { ParsedOszPackage } from '../beatmap/types';
import { saveCustomBeatmap } from '$lib/storage';
import { KEY_TIERS } from '$lib/progression';

export type BeatSnapFraction = '1/1' | '1/2' | '1/4' | '1/8' | '1/16';

/**
 * Store réactif Svelte 5 pour l'éditeur de beatmaps.
 */
export class BeatmapEditorState {
	public title = $state('Ma Beatmap');
	public artist = $state('Artiste');
	public bpm = $state(120);
	public audioOffset = $state(0);
	public difficulty = $state<'easy' | 'normal' | 'hard' | 'expert'>('normal');

	public hitObjects = $state<HitObject[]>([]);
	public audioFile = $state<File | Blob | null>(null);
	public audioFileName = $state<string>('');
	public audioUrl = $state<string | null>(null);
	public audioElement = $state<HTMLAudioElement | null>(null);

	public isPlaying = $state(false);
	public currentTime = $state(0); // en secondes
	public duration = $state(0);
	public playbackRate = $state(1.0);

	// Ergonomie & Navigation
	public zoomLevel = $state(4); // 1x à 20x (échelle de visibilité en secondes)
	public beatSnap = $state<BeatSnapFraction>('1/4');
	public selectedIndex = $state<number | null>(null);
	public saveSuccess = $state<string | null>(null);
	public mapId = $state(`custom_map_${Date.now()}`);

	// Prévisualisation de Layout & Palier de Progression
	public selectedLayoutName = $state('azerty');
	public selectedTierLevel = $state(15); // 1 à 15 (15 = Toutes les touches débloquées)

	// Package OSZ
	public oszPackage = $state<ParsedOszPackage | null>(null);
	public isOszModalOpen = $state(false);

	// Stack d'annulation / rétablissement (Undo / Redo)
	private undoStack: HitObject[][] = [];
	private redoStack: HitObject[][] = [];

	private pushHistory() {
		this.undoStack.push(JSON.parse(JSON.stringify(this.hitObjects)));
		if (this.undoStack.length > 50) this.undoStack.shift();
		this.redoStack = [];
	}

	public undo() {
		if (this.undoStack.length === 0) return;
		this.redoStack.push(JSON.parse(JSON.stringify(this.hitObjects)));
		this.hitObjects = this.undoStack.pop()!;
		this.selectedIndex = null;
	}

	public redo() {
		if (this.redoStack.length === 0) return;
		this.undoStack.push(JSON.parse(JSON.stringify(this.hitObjects)));
		this.hitObjects = this.redoStack.pop()!;
		this.selectedIndex = null;
	}

	/**
	 * Calcule la liste des touches débloquées pour le palier actuellement sélectionné.
	 */
	public getUnlockedKeyList(): string[] {
		if (this.selectedTierLevel >= 15) return [];

		const keys: string[] = [];
		for (const tier of KEY_TIERS) {
			if (tier.tier <= this.selectedTierLevel) {
				for (const k of tier.keys) {
					if (!keys.includes(k.toLowerCase())) keys.push(k.toLowerCase());
				}
			}
		}
		return keys.length > 0 ? keys : ['f', 'j'];
	}

	/**
	 * Renvoie la liste des notes ADAPTÉES EN DIRECT pour la prévisualisation du layout et du palier.
	 * Ne modifie en AUCUN CAS le tableau brut hitObjects !
	 */
	public getAdaptedHitObjects(): { time: number; char: string; originalIndex: number }[] {
		const targetKeys = this.getUnlockedKeyList();

		return this.hitObjects.map((note, i) => {
			let char = note.char.toLowerCase();

			// 1. Traduction physique de disposition (AZERTY <-> QWERTY)
			if (this.selectedLayoutName === 'qwerty') {
				if (char === 'a') char = 'q';
				else if (char === 'z') char = 'w';
				else if (char === 'q') char = 'a';
				else if (char === 'w') char = 'z';
				else if (char === 'm') char = ',';
			} else if (this.selectedLayoutName === 'azerty') {
				if (char === 'q') char = 'a';
				else if (char === 'w') char = 'z';
				else if (char === 'a') char = 'q';
				else if (char === 'z') char = 'w';
				else if (char === ',') char = 'm';
			}

			// 2. Traduction de palier de déblocage (logique identique à GameState)
			if (targetKeys.length > 0 && !targetKeys.includes(char)) {
				char = targetKeys[i % targetKeys.length];
			}

			return { time: note.time, char, originalIndex: i };
		});
	}

	/**
	 * Calcule la durée d'une subdivision de beat (en ms) selon le BPM et le snap.
	 */
	public getSnapIntervalMs(): number {
		const beatMs = 60000 / Math.max(1, this.bpm);
		switch (this.beatSnap) {
			case '1/1': return beatMs;
			case '1/2': return beatMs / 2;
			case '1/4': return beatMs / 4;
			case '1/8': return beatMs / 8;
			case '1/16': return beatMs / 16;
			default: return beatMs / 4;
		}
	}

	/**
	 * Aligne un timestamp (ms) sur la grille rythmique (Beat Snap).
	 */
	public snapToGrid(timeMs: number): number {
		const interval = this.getSnapIntervalMs();
		const offset = this.audioOffset || 0;
		const relative = timeMs - offset;
		const snapped = Math.round(relative / interval) * interval;
		return Math.max(0, Math.round(snapped + offset));
	}

	/**
	 * Définit la piste audio actuelle.
	 */
	public setAudioTrack(blob: Blob, name: string) {
		this.audioFile = blob;
		this.audioFileName = name;
		if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
		this.audioUrl = URL.createObjectURL(blob);
	}

	/**
	 * Bascule la lecture de l'audio.
	 */
	public togglePlay() {
		if (!this.audioElement) return;
		if (this.isPlaying) {
			this.audioElement.pause();
			this.isPlaying = false;
		} else {
			this.audioElement.playbackRate = this.playbackRate;
			this.audioElement.play();
			this.isPlaying = true;
		}
	}

	/**
	 * Modifie la vitesse de lecture audio (25%, 50%, 75%, 100%).
	 */
	public setPlaybackRate(rate: number) {
		this.playbackRate = rate;
		if (this.audioElement) {
			this.audioElement.playbackRate = rate;
		}
	}

	/**
	 * Modifie le temps de lecture audio.
	 */
	public seekTo(timeSec: number) {
		this.currentTime = Math.max(0, Math.min(this.duration, timeSec));
		if (this.audioElement) {
			this.audioElement.currentTime = this.currentTime;
		}
	}

	/**
	 * Avance ou recule la tête de lecture d'une graduation de grille (Snap).
	 */
	public stepPlayhead(direction: -1 | 1) {
		const stepSec = this.getSnapIntervalMs() / 1000;
		this.seekTo(this.currentTime + direction * stepSec);
	}

	/**
	 * Ajoute ou met à jour une note au temps actuel (alignée sur la grille).
	 */
	public addNoteAtCurrentTime(char: string = 'f') {
		this.pushHistory();
		const rawTimeMs = Math.round(this.currentTime * 1000);
		const snappedTimeMs = this.snapToGrid(rawTimeMs);

		const existingIdx = this.hitObjects.findIndex(n => Math.abs(n.time - snappedTimeMs) < 10);
		if (existingIdx !== -1) {
			this.hitObjects[existingIdx].char = char.toLowerCase();
			this.selectedIndex = existingIdx;
			return;
		}

		const newNote: HitObject = {
			time: snappedTimeMs,
			char: char.toLowerCase(),
			type: 'normal'
		};
		this.hitObjects = [...this.hitObjects, newNote].sort((a, b) => a.time - b.time);
		this.selectedIndex = this.hitObjects.findIndex(n => n.time === snappedTimeMs);
	}

	/**
	 * Change la lettre de la note actuellement sélectionnée.
	 */
	public changeSelectedNoteChar(char: string) {
		if (this.selectedIndex === null || this.selectedIndex >= this.hitObjects.length) {
			this.addNoteAtCurrentTime(char);
			return;
		}
		this.pushHistory();
		this.hitObjects[this.selectedIndex].char = char.toLowerCase();
	}

	/**
	 * Supprime la note actuellement sélectionnée ou à l'index donné.
	 */
	public deleteNote(index: number | null = this.selectedIndex) {
		if (index === null || index < 0 || index >= this.hitObjects.length) return;
		this.pushHistory();
		this.hitObjects = this.hitObjects.filter((_, i) => i !== index);
		this.selectedIndex = null;
	}

	/**
	 * Sauvegarde la beatmap dans le stockage local.
	 */
	public async saveBeatmap() {
		const manifest: Manifest = ManifestSchema.parse({
			title: this.title,
			artist: this.artist,
			bpm: this.bpm,
			audioOffset: this.audioOffset,
			difficulty: this.difficulty,
			hitObjects: this.hitObjects
		});

		let audioBlob: Blob | undefined;
		if (this.audioFile) {
			audioBlob = this.audioFile;
		}

		await saveCustomBeatmap({
			id: this.mapId,
			title: this.title,
			artist: this.artist,
			bpm: this.bpm,
			difficulty: this.difficulty,
			manifest,
			audioBlob,
			createdAt: Date.now()
		});

		this.saveSuccess = 'Beatmap sauvegardée avec succès !';
		setTimeout(() => (this.saveSuccess = null), 3000);
	}

	/**
	 * Exporte la beatmap sous forme d'archive .titm
	 */
	public async exportTitmPackage() {
		const JSZip = (await import('jszip')).default;
		const zip = new JSZip();

		const manifest: Manifest = ManifestSchema.parse({
			title: this.title,
			artist: this.artist,
			bpm: this.bpm,
			audioOffset: this.audioOffset,
			difficulty: this.difficulty,
			hitObjects: this.hitObjects
		});

		zip.file('manifest.json', JSON.stringify(manifest, null, 2));

		if (this.audioFile) {
			zip.file('audio.mp3', this.audioFile);
		}

		const blob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const cleanName = `${this.artist}_${this.title}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
		a.download = `${cleanName}.titm`;
		a.click();
		URL.revokeObjectURL(url);
	}
}
