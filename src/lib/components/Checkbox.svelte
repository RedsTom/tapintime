<script lang="ts">
	let {
		checked = $bindable(false),
		disabled = false,
		label,
		onchange
	}: {
		checked: boolean;
		disabled?: boolean;
		label?: string;
		onchange?: () => void;
	} = $props();
</script>

<label class="flex items-center gap-3 select-none {disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'}">
	<div
		class="
			w-7 h-7 border-4 border-secondary rounded-md text-secondary
			flex items-center justify-center font-black text-lg transition-all
			{checked ? 'bg-primary text-secondary' : 'bg-secondary/40 group-hover:bg-secondary/60'}
		"
	>
		{#if checked}
			✓
		{/if}
	</div>
	<input type="checkbox" bind:checked {disabled} onchange={onchange} class="sr-only" />
	{#if label}
		<span class="text-sm md:text-base font-black uppercase tracking-wider text-text select-none">
			{label}
		</span>
	{/if}
</label>
