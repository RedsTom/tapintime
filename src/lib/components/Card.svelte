<script lang="ts">
	let {
		title = '',
		subtitle = '',
		children
	}: {
		title?: string;
		subtitle?: string;
		children?: any;
	} = $props();
</script>

<div class="bg-surface border-4 border-secondary p-6 rounded-lg shadow-neo text-left relative overflow-hidden flex flex-col gap-2">
	{#if title}
		<h3 class="text-lg md:text-xl font-black uppercase text-primary tracking-wider">{title}</h3>
	{/if}
	{#if subtitle}
		<p class="text-xs md:text-sm font-bold text-text-dim tracking-wide uppercase -mt-1">{subtitle}</p>
	{/if}
	<div class="w-full">
		{@render children?.()}
	</div>
</div>
