import { setContext, getContext } from 'svelte';

export type RenderContext = 'dom' | 'canvas';

const CONTEXT_KEY = 'render-context';

export function setRenderContext(context: RenderContext): void {
	setContext(CONTEXT_KEY, context);
}

export function getRenderContext(): RenderContext {
	return getContext<RenderContext>(CONTEXT_KEY) ?? 'dom';
}
