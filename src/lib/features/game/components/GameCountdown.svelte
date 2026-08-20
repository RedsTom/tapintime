<script lang="ts">
	let { countdown }: { countdown: number | 'GO!' | null } = $props();
</script>

{#if countdown !== null}
	{@const isGo = countdown === 'GO!'}
	<div class="absolute inset-0 z-15 pointer-events-none flex items-center justify-center">
		<div
			class="font-black uppercase tracking-widest select-none transition-all duration-150"
			style="
				font-size: clamp(5rem, 15vw, 10rem);
				color: {isGo ? '#ffc145' : '#f9564f'};
				text-shadow: 6px 6px 0px #0B0014;
				animation: countdown-pop 0.15s ease-out;
			"
		>
			{countdown}
		</div>
	</div>
{/if}
