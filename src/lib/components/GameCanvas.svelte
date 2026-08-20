<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { setRenderContext } from '$lib/context';
	import { initPixi, destroyPixi } from '$lib/pixi';

	let { children }: { children?: any } = $props();

	setRenderContext('canvas');

	let canvasEl: HTMLCanvasElement | undefined = $state();

	onMount(async () => {
		if (canvasEl) {
			await initPixi(canvasEl);
		}
	});

	onDestroy(() => {
		destroyPixi();
	});
</script>

<div>
	<canvas bind:this={canvasEl}></canvas>
	{@render children?.()}
</div>
