<script lang="ts">
	import { onMount } from 'svelte';
	import { COLORS } from '$lib/tokens';

	let mouseX = $state(0);
	let mouseY = $state(0);
	let targetX = 0;
	let targetY = 0;

	function handleMouseMove(e: MouseEvent) {
		const cx = window.innerWidth / 2;
		const cy = window.innerHeight / 2;
		targetX = (e.clientX - cx) / cx;
		targetY = (e.clientY - cy) / cy;
	}

	onMount(() => {
		let animId: number;
		function loop() {
			mouseX += (targetX - mouseX) * 0.05;
			mouseY += (targetY - mouseY) * 0.05;
			animId = requestAnimationFrame(loop);
		}
		loop();

		return () => cancelAnimationFrame(animId);
	});
</script>

<svelte:window onmousemove={handleMouseMove} />

<div class="fixed inset-0 w-full h-full pointer-events-none z-[-5] bg-bg overflow-hidden select-none">
	<!-- Deep ambient radial glow -->
	<div 
		class="absolute w-[80vw] h-[80vw] rounded-full bg-accent/5 blur-[120px] transition-transform duration-300 ease-out"
		style="
			transform: translate3d({mouseX * -25}px, {mouseY * -25}px, 0); 
			left: 10%; 
			top: 5%;
		"
	></div>
	
	<div 
		class="absolute w-[60vw] h-[60vw] rounded-full bg-primary/5 blur-[100px] transition-transform duration-300 ease-out"
		style="
			transform: translate3d({mouseX * 35}px, {mouseY * 35}px, 0); 
			right: 15%; 
			bottom: 10%;
		"
	></div>

	<!-- Brutalist Dotted Grid Layer -->
	<div 
		class="absolute inset-[-4%] w-[108%] h-[108%] transition-transform duration-75 ease-out"
		style="
			background-image: radial-gradient(#0B0014 2.5px, transparent 2.5px);
			background-size: 36px 36px;
			transform: translate3d({mouseX * 15}px, {mouseY * 15}px, 0);
			opacity: 0.6;
		"
	></div>
</div>
