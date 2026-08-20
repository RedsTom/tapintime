<script lang="ts">
	let {
		width = 400,
		height = 300,
		children
	}: {
		width?: number;
		height?: number;
		children?: any;
	} = $props();
</script>

<div 
	class="border-4 border-secondary bg-surface shadow-neo rounded-lg flex flex-col p-6 relative overflow-hidden" 
	style="width: {width}px; height: {height}px;"
>
	{@render children?.()}
</div>
