<script lang="ts">
	import { createCheckbox, melt } from '@melt-ui/svelte';

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

	// svelte-ignore state_referenced_locally
	const {
		elements: { root, input },
		states: { checked: meltChecked },
		helpers: { isChecked }
	} = createCheckbox({
		defaultChecked: checked,
		disabled
	});

	// One-way: melt internal state → bindable prop
	$effect(() => {
		const val = $meltChecked;
		if (typeof val === 'boolean' && checked !== val) {
			checked = val;
			onchange?.();
		}
	});

	const inputId = $props.id();
</script>

<div class="flex items-center gap-3 select-none">
	<button
		use:melt={$root}
		id={inputId}
		type="button"
		class="
			w-7 h-7 border-4 border-secondary rounded-md bg-secondary/40 text-secondary
			focus:outline-none flex items-center justify-center font-black text-lg transition-all
			hover:bg-secondary/60 cursor-pointer
			data-[state=checked]:bg-primary data-[state=checked]:text-secondary
			disabled:opacity-50 disabled:cursor-not-allowed
		"
	>
		{#if $isChecked}
			✓
		{/if}
	</button>
	<input use:melt={$input} class="sr-only" />
	{#if label}
		<label 
			for={inputId}
			class="text-sm md:text-base font-black uppercase tracking-wider text-text select-none cursor-pointer"
		>
			{label}
		</label>
	{/if}
</div>
