import { init, addMessages, locale, _ } from 'svelte-i18n';
import fr from './locales/fr.json';
import en from './locales/en.json';
import { saveSettings, type UserSettings } from '$lib/settings';

export type Language = 'fr' | 'en';

addMessages('fr', fr);
addMessages('en', en);

init({
	fallbackLocale: 'fr',
	initialLocale: 'fr'
});

export async function setLanguage(lang: Language, settings?: UserSettings | null): Promise<void> {
	locale.set(lang);
	if (settings) {
		settings.language = lang;
		await saveSettings(settings);
	}
}

export { locale, _ as t, _ };
