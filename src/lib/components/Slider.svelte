<script lang="ts">
	let {
		value = $bindable(50),
		min = 0,
		max = 100,
		step = 1,
		disabled = false,
		label,
		onchange
	}: {
		value: number;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		label?: string;
		onchange?: () => void;
	} = $props();
</script>

<div class="flex flex-col gap-2 w-full select-none">
	{#if label}
		<div class="flex justify-between items-center text-sm md:text-base font-black uppercase tracking-wider">
			<span class="text-text-dim">{label}</span>
			<span class="text-primary font-black bg-secondary border-2 border-secondary px-2 py-0.5 rounded">{value}</span>
		</div>
	{/if}
	<div class="relative flex h-8 w-full items-center {disabled ? 'opacity-50' : ''}">
		<!-- Track background -->
		<div class="absolute w-full h-4 rounded-full bg-secondary/80 border-4 border-secondary overflow-hidden pointer-events-none top-2">
			<!-- Track fill (accent) -->
			<div 
				class="absolute h-full bg-accent left-0 top-0 bottom-0 pointer-events-none" 
				style="width: {((value - min) / (max - min)) * 100}%"
			></div>
		</div>
		<!-- Native range input -->
		<input 
			type="range" 
			{min} 
			{max} 
			{step} 
			bind:value 
			{disabled} 
			onchange={onchange}
			class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10 m-0 p-0" 
		/>
		<!-- Custom thumb element (visually follows the input) -->
		<div 
			class="absolute h-7 w-7 rounded-md border-4 border-secondary bg-primary pointer-events-none top-0.5"
			style="left: calc({((value - min) / (max - min)) * 100}% - 14px);"
		></div>
	</div>
</div>
