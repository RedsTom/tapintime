<script lang="ts">
	let {
		onclick,
		variant = 'primary',
		size = 'large',
		disabled = false,
		shortcut,
		className = '',
		title,
		children
	}: {
		onclick?: (e: MouseEvent) => void;
		variant?: 'primary' | 'secondary' | 'accent' | 'danger';
		size?: 'small' | 'md' | 'lg' | 'large';
		disabled?: boolean;
		shortcut?: string;
		className?: string;
		title?: string;
		children?: any;
	} = $props();
</script>

<button
	{onclick}
	{disabled}
	{title}
	class="
		font-black uppercase tracking-wider inline-flex items-center justify-center 
		transition-all duration-100 ease-out border-4 border-secondary rounded-lg 
		cursor-pointer focus:outline-none relative select-none
		disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
		{variant === 'primary' ? 'bg-primary text-secondary shadow-yellow-pink hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-yellow-pink-hover active:translate-x-[6px] active:translate-y-[6px] active:shadow-yellow-pink-active' : ''}
		{variant === 'accent' ? 'bg-accent text-secondary shadow-pink-yellow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-pink-yellow-hover active:translate-x-[6px] active:translate-y-[6px] active:shadow-pink-yellow-active' : ''}
		{variant === 'secondary' ? 'bg-secondary text-white shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-hover active:translate-x-[6px] active:translate-y-[6px] active:shadow-neo-active' : ''}
		{variant === 'danger' ? 'bg-accent text-white shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px]' : ''}
		{size === 'small' ? 'px-4 py-1.5 text-sm' : size === 'md' ? 'px-5 py-2 text-sm' : 'px-6 py-3 text-base md:text-lg'}
		{className}
	"
>
	<div class="flex items-center gap-2">
		{@render children?.()}
		{#if shortcut}
			<kbd class="ml-2 px-2 py-0.5 text-xs bg-bg text-text-dim border-2 border-secondary rounded font-mono uppercase font-black">
				{shortcut}
			</kbd>
		{/if}
	</div>
</button>
