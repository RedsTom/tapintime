import { Application } from 'pixi.js';

let app: Application | null = null;

export async function initPixi(canvas: HTMLCanvasElement): Promise<Application> {
	if (app) return app;

	app = new Application();
	await app.init({
		canvas,
		resizeTo: canvas.parentElement ?? window,
		backgroundAlpha: 0,
		antialias: true,
		resolution: window.devicePixelRatio,
		autoDensity: true
	});

	return app;
}

export function getPixiApp(): Application | null {
	return app;
}

export function destroyPixi(): void {
	if (app) {
		app.destroy(true);
		app = null;
	}
}
