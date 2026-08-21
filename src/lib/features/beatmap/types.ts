import type { Manifest, HitObject } from './schemas/titm';

/**
 * Informations synthétiques d'une beatmap pour l'affichage dans le menu.
 */
export interface MapInfo {
	/** Identifiant unique de la beatmap */
	id: string;
	/** Titre du morceau */
	title: string;
	/** Nom de l'artiste */
	artist: string;
	/** Auteur de la beatmap (mapper) */
	mapper: string;
	/** Tempo en Battements Par Minute */
	bpm: number;
	/** Difficulté affichée (Facile, Moyen, Difficile, Expert, etc.) */
	difficulty: string;
	/** Nombre total de notes */
	noteCount: number;
	/** Horodatage de création (optionnel) */
	createdAt?: number;
	/** Fichier audio optionnel sous forme de Blob */
	blob?: Blob;
}

/**
 * Structure d'une carte osu! analysée.
 */
export interface ParsedOsuMap {
	title: string;
	artist: string;
	mapper: string;
	version: string;
	bpm: number;
	audioFilename: string;
	bgFilename?: string;
	mode: number;
	hitObjects: HitObject[];
	filename?: string;
}

/**
 * Élément de difficulté extrait d'un package .osz
 */
export interface OszDifficultyItem {
	filename: string;
	version: string;
	parsed: ParsedOsuMap;
}

/**
 * Package .osz analysé contenant l'audio, l'image de fond et les difficultés
 */
export interface ParsedOszPackage {
	title: string;
	artist: string;
	mapper: string;
	audioFilename: string;
	audioBlob?: Blob;
	bgBlob?: Blob;
	difficulties: OszDifficultyItem[];
}

/**
 * Élément de stockage local d'une beatmap personnalisée
 */
export interface CustomBeatmapItem {
	id: string;
	title: string;
	artist: string;
	bpm: number;
	difficulty: 'easy' | 'normal' | 'hard' | 'expert';
	manifest: Manifest;
	audioBlob?: Blob;
	createdAt: number;
}
