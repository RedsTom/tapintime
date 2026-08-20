import type { HitObject } from '../schemas/titm';
import type { ParsedOsuMap, OszDifficultyItem, ParsedOszPackage } from '../types';
import JSZip from 'jszip';

function cleanFilename(pathStr: string): string {
	let clean = pathStr.trim();
	if (clean.startsWith('file://')) {
		clean = clean.replace(/^file:\/\/\/?/, '');
	}
	const parts = clean.split(/[/\\]/);
	return parts[parts.length - 1] || clean;
}

/**
 * Analyse le contenu texte d'un fichier .osu et extrait ses propriétés et ses notes.
 *
 * @param content Contenu brut du fichier .osu
 * @param filename Nom optionnel du fichier source
 * @returns Structure ParsedOsuMap documentée
 */
export function parseOsuFile(content: string, filename?: string): ParsedOsuMap {
	const lines = content.split(/\r?\n/);
	let currentSection = '';

	let title = 'Titre Inconnu';
	let artist = 'Artiste Inconnu';
	let mapper = 'Mapper Inconnu';
	let version = 'Normal';
	let audioFilename = 'audio.mp3';
	let bgFilename: string | undefined = undefined;
	let bpm = 120;
	let mode = 1; // Default taiko

	const rawHitObjects: { time: number; type: 'normal' | 'slide' | 'spin' }[] = [];
	let firstBeatLength = 0;

	for (let line of lines) {
		line = line.trim();
		if (!line || line.startsWith('//')) continue;

		if (line.startsWith('[') && line.endsWith(']')) {
			currentSection = line.slice(1, -1);
			continue;
		}

		if (currentSection === 'General') {
			const [key, ...val] = line.split(':');
			const k = key.trim();
			const v = val.join(':').trim();
			if (k === 'AudioFilename') audioFilename = cleanFilename(v);
			else if (k === 'Mode') mode = parseInt(v, 10);
		} else if (currentSection === 'Metadata') {
			const [key, ...val] = line.split(':');
			const k = key.trim();
			const v = val.join(':').trim();
			if (k === 'Title') title = v;
			else if (k === 'Artist') artist = v;
			else if (k === 'Creator') mapper = v;
			else if (k === 'Version') version = v;
		} else if (currentSection === 'Events') {
			const match = line.match(/^0,0,"([^"]+)"/);
			if (match && match[1]) {
				bgFilename = cleanFilename(match[1]);
			}
		} else if (currentSection === 'TimingPoints') {
			const parts = line.split(',');
			if (parts.length >= 2) {
				const beatLength = parseFloat(parts[1]);
				const uninherited = parts.length > 6 ? parseInt(parts[6]) === 1 : beatLength > 0;
				if (uninherited && beatLength > 0 && firstBeatLength === 0) {
					firstBeatLength = beatLength;
					bpm = Math.round(60000 / beatLength);
				}
			}
		} else if (currentSection === 'HitObjects') {
			const parts = line.split(',');
			if (parts.length >= 3) {
				const time = parseInt(parts[2], 10);
				const typeBitmask = parseInt(parts[3], 10);

				let type: 'normal' | 'slide' | 'spin' = 'normal';
				if (typeBitmask & 2) type = 'slide';
				else if (typeBitmask & 8) type = 'spin';

				if (!isNaN(time) && time >= 0) {
					rawHitObjects.push({ time, type });
				}
			}
		}
	}

	// Trier les notes par timestamp
	rawHitObjects.sort((a, b) => a.time - b.time);

	// Group into runs (patterns)
	const gapThreshold = firstBeatLength ? (firstBeatLength * 1.5) : 500;
	const runs: number[][] = [];
	let currentRun: number[] = [];

	for (let i = 0; i < rawHitObjects.length; i++) {
		if (i === 0) {
			currentRun.push(i);
		} else {
			const dt = rawHitObjects[i].time - rawHitObjects[i - 1].time;
			if (dt > gapThreshold) {
				runs.push(currentRun);
				currentRun = [i];
			} else {
				currentRun.push(i);
			}
		}
	}
	if (currentRun.length > 0) {
		runs.push(currentRun);
	}

	// Hash utility for pattern signatures
	const getHashCode = (str: string): number => {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = (hash << 5) - hash + str.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash);
	};

	// 13 Left/Right pairs mapping covering all 26 letters of the English alphabet
	const PAIRS: [string, string][] = [
		['f', 'j'],
		['d', 'k'],
		['s', 'l'],
		['g', 'h'],
		['r', 'u'],
		['e', 'i'],
		['w', 'o'],
		['v', 'm'],
		['c', 'b'],
		['x', 'n'],
		['z', 'y'],
		['q', 'p'],
		['a', 't']
	];

	// Cache for generated keystroke patterns (signature string -> array of characters)
	const patternCache = new Map<string, string[]>();

	// Generate keys for each run
	const charMapping = new Array<string>(rawHitObjects.length);

	for (const run of runs) {
		if (run.length === 1) {
			// A single isolated note
			charMapping[run[0]] = 'f';
			continue;
		}

		// Calculate signature
		const intervals: number[] = [];
		for (let j = 1; j < run.length; j++) {
			const dt = rawHitObjects[run[j]].time - rawHitObjects[run[j - 1]].time;
			// Round to nearest 10ms to tolerate small mapper placement variations
			intervals.push(Math.round(dt / 10) * 10);
		}
		const sig = intervals.join(',');

		// Get or generate key pattern
		let keysForRun = patternCache.get(sig);
		if (!keysForRun) {
			const hash = getHashCode(sig);
			let pairIdx = hash % PAIRS.length;
			const runKeys: string[] = [];

			let lastHand: 'left' | 'right' = 'left';
			runKeys.push(PAIRS[pairIdx][0]); // Start with Left key of the pair

			let notesInCurrentPair = 1;

			for (let j = 0; j < intervals.length; j++) {
				const dt = intervals[j];

				if (dt < 150) {
					// Very fast stream: alternate hands
					if (notesInCurrentPair >= 4) {
						// Switch to next pair for long streams (cascading roll)
						pairIdx = (pairIdx + 1) % PAIRS.length;
						notesInCurrentPair = 0;
					}
					lastHand = lastHand === 'left' ? 'right' : 'left';
					const char = lastHand === 'left' ? PAIRS[pairIdx][0] : PAIRS[pairIdx][1];
					runKeys.push(char);
					notesInCurrentPair++;
				} else if (dt < 300) {
					// Medium speed: alternate hands, switch pair every 2 notes
					if (notesInCurrentPair >= 2) {
						pairIdx = (pairIdx + 1) % PAIRS.length;
						notesInCurrentPair = 0;
					}
					lastHand = lastHand === 'left' ? 'right' : 'left';
					const char = lastHand === 'left' ? PAIRS[pairIdx][0] : PAIRS[pairIdx][1];
					runKeys.push(char);
					notesInCurrentPair++;
				} else {
					// Slow notes: single-tap (or same-hand tap) on the Left key of the current pair
					// but switch pair for variety after 2 slow notes
					if (notesInCurrentPair >= 2) {
						pairIdx = (pairIdx + 1) % PAIRS.length;
						notesInCurrentPair = 0;
					}
					lastHand = 'left';
					runKeys.push(PAIRS[pairIdx][0]);
					notesInCurrentPair++;
				}
			}
			keysForRun = runKeys;
			patternCache.set(sig, keysForRun);
		}

		// Assign characters to this run
		for (let j = 0; j < run.length; j++) {
			charMapping[run[j]] = keysForRun[j];
		}
	}

	const hitObjects: HitObject[] = rawHitObjects.map((ho, idx) => ({
		time: ho.time,
		char: charMapping[idx] || 'f',
		type: ho.type
	}));

	return {
		title,
		artist,
		mapper,
		version,
		bpm: bpm || 120,
		audioFilename,
		bgFilename,
		mode,
		hitObjects,
		filename
	};
}

/**
 * Analyse une archive ZIP .osz et extrait l'ensemble des difficultés, de l'audio et des fonds d'écran.
 *
 * @param fileOrBuffer Fichier ou ArrayBuffer de l'archive .osz
 * @returns Package .osz analysé
 */
export async function parseOszFile(fileOrBuffer: File | ArrayBuffer): Promise<ParsedOszPackage> {
	const zip = await JSZip.loadAsync(fileOrBuffer);
	const osuFiles = zip.file(/\.osu$/i);

	if (osuFiles.length === 0) {
		throw new Error('Aucun fichier .osu trouvé dans cette archive .osz');
	}

	const difficulties: OszDifficultyItem[] = [];
	let mainAudioFilename = '';
	let mainTitle = '';
	let mainArtist = '';
	let mainMapper = '';
	let mainBgFilename = '';

	for (const osuFile of osuFiles) {
		const text = await osuFile.async('text');
		const parsed = parseOsuFile(text, osuFile.name);
		difficulties.push({
			filename: osuFile.name,
			version: parsed.version,
			parsed
		});

		if (!mainAudioFilename) mainAudioFilename = parsed.audioFilename;
		if (!mainTitle) mainTitle = parsed.title;
		if (!mainArtist) mainArtist = parsed.artist;
		if (!mainMapper) mainMapper = parsed.mapper;
		if (!mainBgFilename && parsed.bgFilename) mainBgFilename = parsed.bgFilename;
	}

	// Trouver l'audio dans le ZIP
	let audioBlob: Blob | undefined;
	let audioZipEntry = mainAudioFilename ? zip.file(new RegExp(mainAudioFilename, 'i'))[0] : null;
	if (!audioZipEntry) {
		audioZipEntry = zip.file(/\.(mp3|ogg|wav)$/i)[0];
	}
	if (audioZipEntry) {
		audioBlob = await audioZipEntry.async('blob');
	}

	// Trouver l'image de fond dans le ZIP
	let bgBlob: Blob | undefined;
	let bgZipEntry = mainBgFilename ? zip.file(new RegExp(mainBgFilename, 'i'))[0] : null;
	if (!bgZipEntry) {
		bgZipEntry = zip.file(/\.(jpg|jpeg|png)$/i)[0];
	}
	if (bgZipEntry) {
		bgBlob = await bgZipEntry.async('blob');
	}

	return {
		title: mainTitle,
		artist: mainArtist,
		mapper: mainMapper,
		audioFilename: mainAudioFilename,
		audioBlob,
		bgBlob,
		difficulties
	};
}

/**
 * Mappe le nom de difficulté d'un fichier osu! (e.g. Kantan, Futsuu, Muzukashii, Oni)
 * vers une des 4 difficultés TapInTime ('easy' | 'normal' | 'hard' | 'expert').
 *
 * @param version Nom de la version/difficulté osu!
 */
export function mapOsuDifficultyToTitm(version: string): 'easy' | 'normal' | 'hard' | 'expert' {
	const lower = version.toLowerCase();
	if (lower.includes('kantan') || lower.includes('easy') || lower.includes('facile')) return 'easy';
	if (lower.includes('futsuu') || lower.includes('normal') || lower.includes('moyen')) return 'normal';
	if (lower.includes('muzukashii') || lower.includes('hard') || lower.includes('difficile')) return 'hard';
	return 'expert';
}
