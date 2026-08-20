<script lang="ts">
	import { User, Keyboard, ArrowRight } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';

	let {
		username = $bindable(),
		activeLayout = $bindable(),
		onNext
	} = $props();

	const layouts = [
		{ id: 'azerty', name: 'AZERTY', desc: 'Standard FR' },
		{ id: 'qwerty', name: 'QWERTY', desc: 'Standard EN' },
		{ id: 'ergo-l', name: 'Ergo-L', desc: 'Ergonomique FR' }
	];

	function handleNext() {
		if (!username.trim()) {
			alert('Veuillez entrer un pseudo pour commencer !');
			return;
		}
		onNext();
	}
</script>

<div class="flex flex-col gap-6 text-left">
	<div class="flex flex-col gap-2">
		<label for="username-input" class="text-sm md:text-base font-black uppercase tracking-wider text-text flex items-center gap-2">
			<User class="w-5 h-5 text-primary" /> Quel est votre pseudo ?
		</label>
		<div class="relative w-full">
			<input 
				id="username-input" 
				type="text" 
				bind:value={username} 
				placeholder="Ex: RhythmMaster99" 
				maxlength="20" 
				class="w-full px-4 py-3 bg-secondary/35 border-4 border-secondary text-text font-black rounded-lg focus:outline-none focus:border-primary placeholder:text-text-dim text-lg tracking-wide"
			/>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<label class="text-sm md:text-base font-black uppercase tracking-wider text-text flex items-center gap-2">
			<Keyboard class="w-5 h-5 text-primary" /> Quelle disposition souhaitez-vous apprendre ?
		</label>
		
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
			{#each layouts as layout}
				{@const selected = activeLayout === layout.id}
				<div class="relative flex flex-col w-full h-full select-none cursor-pointer">
					<div class="absolute inset-0 bg-secondary border-4 border-secondary rounded-lg translate-x-[4px] translate-y-[4px]"></div>
					<button 
						onclick={() => activeLayout = layout.id}
						class="
							relative border-4 border-secondary p-3 rounded-lg flex flex-col items-center justify-center text-center transition-all w-full
							{selected 
								? 'bg-primary text-secondary translate-x-[2px] translate-y-[2px]' 
								: 'bg-secondary/35 text-white hover:bg-secondary/50 hover:translate-x-[1px] hover:translate-y-[1px]'
							}
						"
					>
						<span class="font-black text-lg tracking-wider uppercase leading-none">{layout.name}</span>
						<span class="text-[10px] font-black uppercase mt-1 leading-tight {selected ? 'text-secondary/70' : 'text-text-dim'}">
							{layout.desc}
						</span>
					</button>
				</div>
			{/each}
		</div>
	</div>

	<div class="flex justify-end border-t-4 border-secondary pt-6 mt-4">
		<Button onclick={handleNext} disabled={!username.trim()} shortcut="ENTER">
			<span>
				SUIVANT <ArrowRight class="inline w-5 h-5 ml-1" />
			</span>
		</Button>
	</div>
</div>
