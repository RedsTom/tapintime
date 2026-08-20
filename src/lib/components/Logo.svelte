<script lang="ts">
	import { COLORS } from '$lib/tokens';

	let { scale = 1.0 } = $props<{ scale?: number }>();
</script>

<div class="flex items-center gap-3 select-none" style="transform: scale({scale}); transform-origin: left center;">
	<div class="w-10 h-10 bg-primary text-secondary border-4 border-secondary rounded-lg flex items-center justify-center font-black text-2xl shadow-[3px_3px_0px_0px_var(--color-secondary)]">
		T
	</div>
	<span class="text-white font-black tracking-widest text-lg md:text-xl font-sans uppercase">
		TAP<span class="text-accent">IN</span>TIME
	</span>
</div>
