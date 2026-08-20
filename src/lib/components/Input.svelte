<script lang="ts">
	let {
		value = $bindable(''),
		label = '',
		type = 'text',
		placeholder = '',
		disabled = false,
		oninput,
		onchange
	}: {
		value?: string | number;
		label?: string;
		type?: string;
		placeholder?: string;
		disabled?: boolean;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
	} = $props();

	const inputId = `input-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="flex flex-col gap-1.5 w-full text-left">
	{#if label}
		<label for={inputId} class="text-xs font-black uppercase tracking-wider text-text-dim">
			{label}
		</label>
	{/if}
	<div class="relative group">
		<input
			id={inputId}
			{type}
			bind:value
			{placeholder}
			{disabled}
			{oninput}
			{onchange}
			class="
				w-full bg-surface border-4 border-secondary rounded-lg px-4 py-2.5 
				text-text font-black text-sm uppercase tracking-wider placeholder:text-text-dim/60 
				focus:outline-none focus:border-primary shadow-[3px_3px_0px_0px_#1a0033] 
				disabled:opacity-50 disabled:cursor-not-allowed transition-all
			"
		/>
	</div>
</div>
