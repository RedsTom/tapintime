<script lang="ts">
	import { Globe, ArrowRight, Check } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import { setLanguage, _ } from '$lib/i18n';
	import type { UserSettings } from '$lib/settings';

	let {
		settings = $bindable(),
		onNext
	}: {
		settings: UserSettings;
		onNext: () => void;
	} = $props();

	let selectedLanguage = $state<'fr' | 'en'>(settings.language || 'fr');

	function selectLang(lang: 'fr' | 'en') {
		selectedLanguage = lang;
		settings.language = lang;
		setLanguage(lang, settings);
	}

	function handleNext() {
		onNext();
	}
</script>

<div class="flex flex-col gap-6 text-left select-none">
	<div class="flex flex-col gap-1.5 border-b-2 border-secondary pb-3">
		<h2 class="text-lg md:text-xl font-black uppercase tracking-wider text-primary flex items-center gap-2">
			<Globe class="w-6 h-6 text-primary" /> {$_('onboarding.language.title')}
		</h2>
		<p class="text-xs font-bold text-text-dim uppercase tracking-wider">
			{$_('onboarding.language.subtitle')}
		</p>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
		<!-- French Card -->
		<button
			type="button"
			onclick={() => selectLang('fr')}
			class="
				relative border-4 border-secondary p-5 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none
				{selectedLanguage === 'fr'
					? 'bg-primary text-secondary shadow-[4px_4px_0px_0px_#0B0014] translate-x-[-2px] translate-y-[-2px]'
					: 'bg-secondary/35 text-white hover:bg-secondary/50 shadow-none'
				}
			"
		>
			<div class="text-4xl mb-2">🇫🇷</div>
			<span class="font-black text-xl tracking-wider uppercase leading-none">{$_('onboarding.language.fr')}</span>
			<span class="text-[10px] font-black uppercase mt-1 leading-tight {selectedLanguage === 'fr' ? 'text-secondary/80' : 'text-text-dim'}">
				{$_('onboarding.language.fr_desc')}
			</span>
			{#if selectedLanguage === 'fr'}
				<div class="absolute top-2 right-2 bg-secondary text-primary p-1 rounded-full border border-secondary">
					<Check class="w-4 h-4" />
				</div>
			{/if}
		</button>

		<!-- English Card -->
		<button
			type="button"
			onclick={() => selectLang('en')}
			class="
				relative border-4 border-secondary p-5 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none
				{selectedLanguage === 'en'
					? 'bg-primary text-secondary shadow-[4px_4px_0px_0px_#0B0014] translate-x-[-2px] translate-y-[-2px]'
					: 'bg-secondary/35 text-white hover:bg-secondary/50 shadow-none'
				}
			"
		>
			<div class="text-4xl mb-2">🇬🇧</div>
			<span class="font-black text-xl tracking-wider uppercase leading-none">{$_('onboarding.language.en')}</span>
			<span class="text-[10px] font-black uppercase mt-1 leading-tight {selectedLanguage === 'en' ? 'text-secondary/80' : 'text-text-dim'}">
				{$_('onboarding.language.en_desc')}
			</span>
			{#if selectedLanguage === 'en'}
				<div class="absolute top-2 right-2 bg-secondary text-primary p-1 rounded-full border border-secondary">
					<Check class="w-4 h-4" />
				</div>
			{/if}
		</button>
	</div>

	<div class="flex justify-end border-t-4 border-secondary pt-6 mt-4">
		<Button onclick={handleNext} shortcut="ENTER">
			<span>
				{$_('common.next')} <ArrowRight class="inline w-5 h-5 ml-1" />
			</span>
		</Button>
	</div>
</div>
