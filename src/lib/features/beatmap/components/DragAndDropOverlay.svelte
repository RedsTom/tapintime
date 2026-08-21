<script lang="ts">
	import { Upload } from '@lucide/svelte';
	import { _ } from '$lib/i18n';

	let { isDragging }: { isDragging: boolean } = $props();
</script>

{#if isDragging}
	<div
		class="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-center border-8 border-dashed border-primary transition-all pointer-events-none"
	>
		<div class="bg-surface border-4 border-secondary p-8 rounded-2xl shadow-[10px_10px_0px_#1a0033] flex flex-col items-center gap-4 text-center max-w-md animate-bounce">
			<div class="w-20 h-20 bg-primary/20 border-4 border-primary rounded-full flex items-center justify-center">
				<Upload class="w-10 h-10 text-primary" />
			</div>
			<h3 class="text-2xl font-black uppercase text-primary">{$_('drag_drop.title')}</h3>
			<p class="text-xs font-bold uppercase text-text-dim">
				{$_('drag_drop.accepted_files')}
			</p>
		</div>
	</div>
{/if}
