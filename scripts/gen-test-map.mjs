import JSZip from 'jszip';
import { writeFileSync, mkdirSync } from 'fs';

const manifest = {
	title: "Tutorial",
	artist: "TapInTime",
	bpm: 120,
	audioOffset: 0,
	difficulty: "easy",
	hitObjects: [
		{ time: 2000, char: "a", type: "normal" },
		{ time: 2500, char: "s", type: "normal" },
		{ time: 3000, char: "d", type: "normal" },
		{ time: 3500, char: "f", type: "normal" },
		{ time: 4000, char: "j", type: "normal" },
		{ time: 4500, char: "k", type: "normal" },
		{ time: 5000, char: "l", type: "normal" },
		{ time: 5500, char: ";", type: "normal" },
		{ time: 6500, char: "f", type: "normal" },
		{ time: 7000, char: "j", type: "normal" },
		{ time: 7500, char: "d", type: "normal" },
		{ time: 8000, char: "k", type: "normal" },
		{ time: 8500, char: "s", type: "normal" },
		{ time: 9000, char: "l", type: "normal" },
		{ time: 9500, char: "a", type: "normal" },
		{ time: 10000, char: ";", type: "normal" },
		{ time: 11000, char: "f", type: "normal" },
		{ time: 11250, char: "j", type: "normal" },
		{ time: 11500, char: "f", type: "normal" },
		{ time: 11750, char: "j", type: "normal" },
		{ time: 12000, char: "d", type: "normal" },
		{ time: 12250, char: "k", type: "normal" },
		{ time: 12500, char: "d", type: "normal" },
		{ time: 12750, char: "k", type: "normal" },
		{ time: 13500, char: "s", type: "normal" },
		{ time: 14000, char: "l", type: "normal" },
		{ time: 14500, char: "a", type: "normal" },
		{ time: 15000, char: ";", type: "normal" }
	]
};

async function gen() {
	const zip = new JSZip();
	zip.file('manifest.json', JSON.stringify(manifest, null, 2));

	// Generate a silent audio file (1 second of silence using a minimal WAV)
	// This is just for testing — real maps would have actual audio
	const sampleRate = 44100;
	const duration = 16; // seconds
	const numSamples = sampleRate * duration;
	const buffer = Buffer.alloc(44 + numSamples * 2);

	// WAV header
	buffer.write('RIFF', 0);
	buffer.writeUInt32LE(36 + numSamples * 2, 4);
	buffer.write('WAVE', 8);
	buffer.write('fmt ', 12);
	buffer.writeUInt32LE(16, 16);
	buffer.writeUInt16LE(1, 20); // PCM
	buffer.writeUInt16LE(1, 22); // mono
	buffer.writeUInt32LE(sampleRate, 24);
	buffer.writeUInt32LE(sampleRate * 2, 28);
	buffer.writeUInt16LE(2, 32);
	buffer.writeUInt16LE(16, 34);
	buffer.write('data', 36);
	buffer.writeUInt32LE(numSamples * 2, 40);

	// Fill with very quiet tone (sine wave at 440Hz)
	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const sample = Math.sin(2 * Math.PI * 440 * t) * 0.01;
		buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
	}

	zip.file('audio.mp3', buffer); // WAV but named .mp3 for testing — decoder handles it

	const content = await zip.generateAsync({ type: 'nodebuffer' });
	mkdirSync('static/maps', { recursive: true });
	writeFileSync('static/maps/tutorial.titm', content);
	console.log('Generated static/maps/tutorial.titm');
}

gen();
