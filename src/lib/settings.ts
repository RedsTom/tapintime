import localforage from 'localforage';

export interface UserSettings {
	showKeyboard: boolean;
	keyboardScale: number;
	masterVolume: number;
	effectsVolume: number;
	noteSpeed: number;
	activeLayout: string;
	backgroundParallax: boolean;
	showLevelBackground: boolean;
	backgroundDim: number;
	username: string;
	onboardingCompleted: boolean;
	audioOffsetMs: number;
	visualOffsetMs: number;
	leniencyMode: 'strict' | 'normal' | 'facile';
	layoutFamiliarity: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
	showKeyboard: true,
	keyboardScale: 1.0,
	masterVolume: 80,
	effectsVolume: 80,
	noteSpeed: 400,
	activeLayout: 'azerty',
	backgroundParallax: true,
	showLevelBackground: true,
	backgroundDim: 50,
	username: '',
	onboardingCompleted: false,
	audioOffsetMs: 0,
	visualOffsetMs: 0,
	leniencyMode: 'normal',
	layoutFamiliarity: 1
};

const SETTINGS_KEY = 'user_settings';

export async function loadSettings(): Promise<UserSettings> {
	try {
		const saved = await localforage.getItem<UserSettings>(SETTINGS_KEY);
		return { ...DEFAULT_SETTINGS, ...saved };
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export async function saveSettings(settings: UserSettings): Promise<void> {
	try {
		const plainSettings = JSON.parse(JSON.stringify(settings));
		await localforage.setItem(SETTINGS_KEY, plainSettings);
	} catch (e) {
		console.error('Failed to save settings:', e);
	}
}
