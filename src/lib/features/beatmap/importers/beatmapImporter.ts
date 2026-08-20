import { parseOszFile, parseOsuFile, mapOsuDifficultyToTitm } from '../parsers/osuParser';
import { ManifestSchema, type Manifest } from '../schemas/titm';
import { saveCustomBeatmap } from '../../../storage';
import type { ParsedOszPackage, OszDifficultyItem } from '../types';

export interface ImportResult {
	success: boolean;
	mapId?: string;
	oszPackage?: ParsedOszPackage;
	message?: string;
}

/**
 * Service gérant l'importation de fichiers de beatmaps (.osz, .osu, .titm).
 */
export class BeatmapImporter {
	/**
	 * Traite l'importation d'un fichier quelconque (.osz, .osu, .titm).
	 *
	 * @param file Fichier téléversé
	 * @returns Résultat de l'import (identifiant de map sauvegardée ou package multi-difficultés)
	 */
	static async importFile(file: File): Promise<ImportResult> {
		const fileNameLower = file.name.toLowerCase();

		if (fileNameLower.endsWith('.osz')) {
			const pkg = await parseOszFile(file);
			if (pkg.difficulties.length === 1) {
				const mapId = await this.importOszDifficulty(pkg, pkg.difficulties[0]);
				return { success: true, mapId };
			}
			return { success: true, oszPackage: pkg };
		}

		if (fileNameLower.endsWith('.osu')) {
			const mapId = await this.importSingleOsuFile(file);
			return { success: true, mapId };
		}

		if (fileNameLower.endsWith('.titm')) {
			const mapId = await this.importTitmPackage(file);
			return { success: true, mapId };
		}

		throw new Error(`Format non supporté: ${file.name}`);
	}

	/**
	 * Importe une difficulté spécifique depuis un package OSZ.
	 */
	static async importOszDifficulty(pkg: ParsedOszPackage, diffItem: OszDifficultyItem): Promise<string> {
		const parsed = diffItem.parsed;
		const diffCategory = mapOsuDifficultyToTitm(parsed.version);

		const manifest: Manifest = ManifestSchema.parse({
			title: `${parsed.title} [${parsed.version}]`,
			artist: parsed.artist,
			bpm: parsed.bpm,
			audioOffset: 0,
			difficulty: diffCategory,
			hitObjects: parsed.hitObjects
		});

		const cleanId = `${parsed.title}_${parsed.version}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
		const mapId = `custom_${cleanId}`;

		await saveCustomBeatmap({
			id: mapId,
			title: manifest.title,
			artist: manifest.artist,
			bpm: manifest.bpm,
			difficulty: manifest.difficulty,
			manifest,
			audioBlob: pkg.audioBlob,
			createdAt: Date.now()
		});

		return mapId;
	}

	/**
	 * Importe un fichier .osu unique.
	 */
	private static async importSingleOsuFile(file: File): Promise<string> {
		const text = await file.text();
		const parsed = parseOsuFile(text, file.name);
		const diff = mapOsuDifficultyToTitm(parsed.version);

		const manifest: Manifest = ManifestSchema.parse({
			title: parsed.title,
			artist: parsed.artist,
			bpm: parsed.bpm,
			audioOffset: 0,
			difficulty: diff,
			hitObjects: parsed.hitObjects
		});

		const mapId = `custom_${file.name.replace('.osu', '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

		await saveCustomBeatmap({
			id: mapId,
			title: parsed.title,
			artist: parsed.artist,
			bpm: parsed.bpm,
			difficulty: diff,
			manifest,
			createdAt: Date.now()
		});

		return mapId;
	}

	/**
	 * Importe un package archive .titm.
	 */
	private static async importTitmPackage(file: File): Promise<string> {
		const JSZip = (await import('jszip')).default;
		const zip = await JSZip.loadAsync(file);
		const manifestFile = zip.file('manifest.json');
		if (!manifestFile) throw new Error('manifest.json manquant dans le fichier .titm');

		const manifestRaw = JSON.parse(await manifestFile.async('text'));
		const manifest = ManifestSchema.parse(manifestRaw);

		const audioFile = zip.file('audio.mp3') ?? zip.file('audio.ogg');
		let audioBlob: Blob | undefined;
		if (audioFile) audioBlob = await audioFile.async('blob');

		const mapId = `custom_${file.name.replace('.titm', '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

		await saveCustomBeatmap({
			id: mapId,
			title: manifest.title,
			artist: manifest.artist,
			bpm: manifest.bpm,
			difficulty: manifest.difficulty,
			manifest,
			audioBlob,
			createdAt: Date.now()
		});

		return mapId;
	}
}
