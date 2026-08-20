<script lang="ts">
	import { X } from '@lucide/svelte';

	let {
		isOpen = true,
		title = '',
		children,
		onClose,
		close: closeProp
	}: {
		isOpen?: boolean;
		title?: string;
		children?: any;
		onClose?: () => void;
		close?: () => void;
	} = $props();

	function close() {
		isOpen = false;
		if (closeProp) closeProp();
		if (onClose) onClose();
	}
</script>

{#if isOpen}
	<div 
		class="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
		onclick={close}
		role="presentation"
	>
		<div 
			class="bg-surface border-4 border-secondary rounded-xl p-6 shadow-[8px_8px_0px_0px_#1a0033] max-w-lg w-full flex flex-col gap-4 relative overflow-hidden"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
		>
			<div class="flex items-center justify-between border-b-4 border-secondary pb-3">
				<h3 class="text-xl font-black uppercase tracking-wider text-primary">{title}</h3>
				<button 
					onclick={close} 
					class="p-1 rounded-lg border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 text-text cursor-pointer transition-all"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<div class="w-full">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
