import localforage from 'localforage';
import type { Layout } from './schemas/titl';
import type { Manifest } from './schemas/titm';

export interface CustomLayoutItem {
	id: string;
	name: string;
	description: string;
	layout: Layout;
	createdAt: number;
}

export interface CustomBeatmapItem {
	id: string;
	title: string;
	artist: string;
	bpm: number;
	difficulty: 'easy' | 'normal' | 'hard' | 'expert';
	manifest: Manifest;
	audioBlob?: Blob;
	bgBlob?: Blob;
	coverBlob?: Blob;
	isVideo?: boolean;
	createdAt: number;
}

const LAYOUTS_KEY = 'tapintime_custom_layouts';
const BEATMAPS_KEY = 'tapintime_custom_beatmaps';

// --- LAYOUT STORAGE ---

export async function getCustomLayouts(): Promise<CustomLayoutItem[]> {
	try {
		const items = await localforage.getItem<CustomLayoutItem[]>(LAYOUTS_KEY);
		return items || [];
	} catch {
		return [];
	}
}

export async function getCustomLayout(id: string): Promise<CustomLayoutItem | null> {
	const layouts = await getCustomLayouts();
	return layouts.find(l => l.id === id) || null;
}

export async function saveCustomLayout(item: CustomLayoutItem): Promise<void> {
	const layouts = await getCustomLayouts();
	const index = layouts.findIndex(l => l.id === item.id);
	if (index >= 0) {
		layouts[index] = item;
	} else {
		layouts.push(item);
	}
	await localforage.setItem(LAYOUTS_KEY, layouts);
}

export async function deleteCustomLayout(id: string): Promise<void> {
	const layouts = await getCustomLayouts();
	const filtered = layouts.filter(l => l.id !== id);
	await localforage.setItem(LAYOUTS_KEY, filtered);
}

// --- BEATMAP STORAGE ---

export async function getCustomBeatmaps(): Promise<CustomBeatmapItem[]> {
	try {
		const items = await localforage.getItem<CustomBeatmapItem[]>(BEATMAPS_KEY);
		return items || [];
	} catch {
		return [];
	}
}

export async function getCustomBeatmap(id: string): Promise<CustomBeatmapItem | null> {
	const maps = await getCustomBeatmaps();
	return maps.find(m => m.id === id) || null;
}

export async function saveCustomBeatmap(item: CustomBeatmapItem): Promise<void> {
	const maps = await getCustomBeatmaps();
	const index = maps.findIndex(m => m.id === item.id);
	if (index >= 0) {
		maps[index] = item;
	} else {
		maps.push(item);
	}
	await localforage.setItem(BEATMAPS_KEY, maps);
}

export async function deleteCustomBeatmap(id: string): Promise<void> {
	const maps = await getCustomBeatmaps();
	const filtered = maps.filter(m => m.id !== id);
	await localforage.setItem(BEATMAPS_KEY, filtered);
}

/** Helper function to load layout (from static or custom localforage) */
export async function loadLayoutByNameOrId(idOrName: string): Promise<Layout> {
	// First check localforage custom layouts
	const custom = await getCustomLayout(idOrName);
	if (custom) {
		return custom.layout;
	}

	// Fallback to static fetch
	const res = await fetch(`/layouts/${idOrName}.titl`);
	if (!res.ok) throw new Error(`Layout "${idOrName}" introuvable.`);
	return await res.json();
}
