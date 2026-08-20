import JSZip from 'jszip';
import { ManifestSchema } from './schemas/titm';
import type { Manifest } from './schemas/titm';

export interface TitmFile {
	manifest: Manifest;
	audioBlob: Blob;
	backgroundBlob: Blob | null;
}

export async function parseTitm(buffer: ArrayBuffer): Promise<TitmFile> {
	const zip = await JSZip.loadAsync(buffer);

	const manifestFile = zip.file('manifest.json');
	if (!manifestFile) throw new Error('manifest.json missing from .titm');

	const manifestRaw = JSON.parse(await manifestFile.async('text'));
	const manifest = ManifestSchema.parse(manifestRaw);

	const audioFile = zip.file('audio.mp3') ?? zip.file('audio.ogg');
	if (!audioFile) throw new Error('audio file missing from .titm');
	const audioBlob = await audioFile.async('blob');

	const bgFile = zip.file('bg.jpg');
	const backgroundBlob = bgFile ? await bgFile.async('blob') : null;

	return { manifest, audioBlob, backgroundBlob };
}
