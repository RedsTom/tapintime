<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { BeatmapEditorState } from '$lib/features/editor/beatmapEditorState.svelte';
	import EditorHeader from '$lib/features/editor/components/EditorHeader.svelte';
	import EditorTimeline from '$lib/features/editor/components/EditorTimeline.svelte';
	import EditorTrackPreview from '$lib/features/editor/components/EditorTrackPreview.svelte';
	import EditorKeyboardPreview from '$lib/features/editor/components/EditorKeyboardPreview.svelte';
	import EditorNoteInspector from '$lib/features/editor/components/EditorNoteInspector.svelte';
	import EditorLayoutPreviewPanel from '$lib/features/editor/components/EditorLayoutPreviewPanel.svelte';
	import EditorBottomBar from '$lib/features/editor/components/EditorBottomBar.svelte';
	import Input from '$lib/components/Input.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { getCustomBeatmap } from '$lib/storage';
	import { parseOsuFile, parseOszFile, mapOsuDifficultyToTitm } from '$lib/features/beatmap/parsers/osuParser';
	import type { OszDifficultyItem } from '$lib/features/beatmap/types';
	import { Upload, ChevronRight, Check, HelpCircle, FileMusic, Sliders } from '@lucide/svelte';
	import { _ } from '$lib/i18n';

	const editor = new BeatmapEditorState();

	onMount(() => {
		async function checkEditMap() {
			const urlParams = new URLSearchParams(window.location.search);
			const editId = urlParams.get('edit');
			if (editId) {
				const customMap = await getCustomBeatmap(editId);
				if (customMap) {
					editor.mapId = customMap.id;
					editor.title = customMap.title;
					editor.artist = customMap.artist;
					editor.bpm = customMap.bpm;
					editor.difficulty = customMap.difficulty;
					editor.audioOffset = customMap.manifest.audioOffset || 0;
					editor.hitObjects = [...customMap.manifest.hitObjects];
					if (customMap.audioBlob) {
						editor.setAudioTrack(customMap.audioBlob, 'Piste Audio Enregistrée');
					}
					if (customMap.bgBlob) {
						editor.bgFile = customMap.bgBlob;
						editor.isVideo = !!customMap.isVideo;
						editor.bgFileName = customMap.isVideo ? 'Vidéo de Fond' : 'Image de Fond';
					}
					if (customMap.coverBlob) {
						editor.coverFile = customMap.coverBlob;
						editor.coverFileName = 'Miniature Carrée';
					}
				}
			}
		}
		checkEditMap();

		let animFrameId: number;
		const updateLoop = () => {
			if (editor.audioElement && !editor.audioElement.paused) {
				const audioTime = editor.audioElement.currentTime;
				if (Math.abs(editor.currentTime - audioTime) > 0.01) {
					editor.currentTime = audioTime;
				}
			}
			animFrameId = requestAnimationFrame(updateLoop);
		};
		animFrameId = requestAnimationFrame(updateLoop);

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			cancelAnimationFrame(animFrameId);
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;

		if (e.code === 'Space') {
			e.preventDefault();
			editor.togglePlay();
		} else if (e.code === 'KeyN') {
			e.preventDefault();
			editor.addNoteAtCurrentTime();
		} else if (e.code === 'Delete' || e.code === 'Backspace') {
			e.preventDefault();
			editor.deleteNote();
		} else if (e.code === 'ArrowLeft') {
			e.preventDefault();
			if (e.shiftKey) {
				editor.stepPlayhead(-1);
			} else {
				editor.selectNextNote(-1);
			}
		} else if (e.code === 'ArrowRight') {
			e.preventDefault();
			if (e.shiftKey) {
				editor.stepPlayhead(1);
			} else {
				editor.selectNextNote(1);
			}
		} else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			editor.undo();
		} else if (e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			editor.redo();
		} else if (e.code === 'F5') {
			e.preventDefault();
			handleTestMap();
		} else if (/^Key[A-Z]$/.test(e.code)) {
			const char = e.key.toLowerCase();
			editor.changeSelectedNoteChar(char);
		}
	}

	function handleAudioUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		editor.setAudioTrack(file, file.name);
	}

	function handleBgMediaUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|avi|mkv)$/i.test(file.name);
		editor.bgFile = file;
		editor.bgFileName = file.name;
		editor.isVideo = isVideo;
	}

	function handleCoverUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		editor.coverFile = file;
		editor.coverFileName = file.name;
	}

	async function handleOsuOrOszImport(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		const fileNameLower = file.name.toLowerCase();

		try {
			if (fileNameLower.endsWith('.osz')) {
				const pkg = await parseOszFile(file);
				if (pkg.audioBlob) {
					editor.setAudioTrack(pkg.audioBlob, pkg.audioFilename || 'audio.mp3');
				}
				if (pkg.bgBlob) {
					editor.bgFile = pkg.bgBlob;
					editor.isVideo = !!pkg.isVideo;
					editor.bgFileName = pkg.isVideo ? 'Vidéo osu!' : 'Image de Fond osu!';
				}
				if (pkg.coverBlob) {
					editor.coverFile = pkg.coverBlob;
					editor.coverFileName = 'Miniature osu!';
				}
				if (pkg.difficulties.length === 1) {
					loadOszDifficulty(pkg.difficulties[0]);
				} else {
					editor.oszPackage = pkg;
					editor.isOszModalOpen = true;
				}
			} else {
				const text = await file.text();
				const parsed = parseOsuFile(text, file.name);
				editor.title = parsed.title;
				editor.artist = parsed.artist;
				editor.bpm = parsed.bpm;
				editor.difficulty = mapOsuDifficultyToTitm(parsed.version);
				editor.hitObjects = parsed.hitObjects;
				editor.saveSuccess = `Fichier .osu importé ! ${parsed.hitObjects.length} notes chargées.`;
				setTimeout(() => (editor.saveSuccess = null), 4000);
			}
		} catch (err) {
			alert('Erreur lors de la lecture du fichier osu: ' + String(err));
		}
	}

	function loadOszDifficulty(diffItem: OszDifficultyItem) {
		const parsed = diffItem.parsed;
		editor.title = `${parsed.title} [${parsed.version}]`;
		editor.artist = parsed.artist;
		editor.bpm = parsed.bpm;
		editor.difficulty = mapOsuDifficultyToTitm(parsed.version);
		editor.hitObjects = parsed.hitObjects;

		editor.isOszModalOpen = false;
		editor.saveSuccess = `Difficulté "${parsed.version}" chargée (${parsed.hitObjects.length} notes) !`;
		setTimeout(() => (editor.saveSuccess = null), 4000);
	}

	async function handleTestMap() {
		await editor.saveBeatmap();
		goto(`/play?map=${editor.mapId}&layout=azerty`);
	}
</script>

<!-- Élément Audio Invisible -->
{#if editor.audioUrl}
	<audio
		src={editor.audioUrl}
		bind:this={editor.audioElement}
		onloadedmetadata={() => (editor.duration = editor.audioElement?.duration || 0)}
		onended={() => (editor.isPlaying = false)}
	></audio>
{/if}

<div class="max-w-[1600px] mx-auto px-4 py-4 flex flex-col gap-4 text-left select-none pb-28 min-h-screen">
	<!-- En-tête -->
	<EditorHeader {editor} />

	{#if editor.saveSuccess}
		<div class="bg-primary/20 border-4 border-primary p-3 rounded-lg text-primary font-black text-xs uppercase tracking-wider flex items-center gap-2">
			<Check class="w-4 h-4" /> {editor.saveSuccess}
		</div>
	{/if}

	<!-- DISPOSITION EN 3 ZONES (COLONNES FIXES ET ZONE D'ÉDITION CENTRALE) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1">
		
		<!-- COLONNE 1 (GAUCHE - Configuration, Fichiers & Raccourcis) -->
		<div class="lg:col-span-3 flex flex-col gap-4">
			<!-- Métadonnées de la carte -->
			<div class="bg-surface border-4 border-secondary p-4 rounded-xl shadow-[5px_5px_0px_#1a0033] flex flex-col gap-3">
				<h3 class="text-xs font-black uppercase tracking-wider text-primary border-b-2 border-secondary pb-1 flex items-center gap-1.5">
					<Sliders class="w-3.5 h-3.5" />
					{$_('beatmap_editor.metadata')}
				</h3>
				<Input label={$_('beatmap_editor.song_title')} bind:value={editor.title} />
				<Input label={$_('beatmap_editor.artist')} bind:value={editor.artist} />
				<div class="grid grid-cols-2 gap-2">
					<Input label={$_('beatmap_editor.bpm')} type="number" bind:value={editor.bpm} />
					<Input label={$_('beatmap_editor.audio_offset')} type="number" bind:value={editor.audioOffset} />
				</div>
				<div class="flex flex-col gap-1">
					<label for="difficulty-select" class="text-[10px] font-black uppercase tracking-wider text-text-dim">{$_('beatmap_editor.difficulty')}</label>
					<select
						id="difficulty-select"
						bind:value={editor.difficulty}
						class="w-full bg-surface border-4 border-secondary rounded-lg px-2.5 py-1.5 text-text font-black text-xs uppercase tracking-wider focus:outline-none focus:border-primary shadow-[2px_2px_0px_#1a0033]"
					>
						<option value="easy">{$_('settings.controls_section.leniency_easy')} (Easy)</option>
						<option value="normal">{$_('settings.controls_section.leniency_normal')}</option>
						<option value="hard">{$_('home.sort_difficulty')} (Hard)</option>
						<option value="expert">Expert</option>
					</select>
				</div>
			</div>

			<!-- Fichiers Audio & Médias -->
			<div class="bg-surface border-4 border-secondary p-4 rounded-xl shadow-[5px_5px_0px_#ff3366] flex flex-col gap-2.5">
				<h3 class="text-xs font-black uppercase tracking-wider text-accent border-b-2 border-secondary pb-1 flex items-center gap-1.5">
					<FileMusic class="w-3.5 h-3.5" />
					{$_('beatmap_editor.audio_media_files')}
				</h3>

				<div class="flex flex-col gap-1">
					<span class="text-[10px] font-black uppercase tracking-wider text-text-dim">{$_('beatmap_editor.audio_track')}</span>
					<label class="border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 p-2 rounded-lg flex items-center justify-center gap-2 text-xs font-black uppercase cursor-pointer transition-all">
						<Upload class="w-3.5 h-3.5" /> {editor.audioFileName ? editor.audioFileName : $_('beatmap_editor.audio_track')}
						<input type="file" accept="audio/*" onchange={handleAudioUpload} class="sr-only" />
					</label>
				</div>

				<div class="flex flex-col gap-1">
					<span class="text-[10px] font-black uppercase tracking-wider text-text-dim">{$_('beatmap_editor.bg_media')}</span>
					<label class="border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 p-2 rounded-lg flex items-center justify-center gap-2 text-xs font-black uppercase cursor-pointer transition-all">
						<Upload class="w-3.5 h-3.5" /> {editor.bgFileName ? editor.bgFileName : $_('beatmap_editor.bg_image')}
						<input type="file" accept="image/*,video/*" onchange={handleBgMediaUpload} class="sr-only" />
					</label>
				</div>

				<div class="flex flex-col gap-1">
					<span class="text-[10px] font-black uppercase tracking-wider text-text-dim">{$_('beatmap_editor.cover_thumb')}</span>
					<label class="border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 p-2 rounded-lg flex items-center justify-center gap-2 text-xs font-black uppercase cursor-pointer transition-all">
						<Upload class="w-3.5 h-3.5" /> {editor.coverFileName ? editor.coverFileName : $_('beatmap_editor.cover_square')}
						<input type="file" accept="image/*" onchange={handleCoverUpload} class="sr-only" />
					</label>
				</div>

				<div class="flex flex-col gap-1 pt-1.5 border-t border-secondary/20">
					<span class="text-[10px] font-black uppercase tracking-wider text-text-dim">{$_('beatmap_editor.import_osu_osz')}</span>
					<label class="border-2 border-secondary bg-primary/20 hover:bg-primary/30 p-2 rounded-lg flex items-center justify-center gap-2 text-xs font-black uppercase text-primary cursor-pointer transition-all">
						<Upload class="w-3.5 h-3.5" /> {$_('beatmap_editor.import_osu_card')}
						<input type="file" accept=".osz,.osu" onchange={handleOsuOrOszImport} class="sr-only" />
					</label>
				</div>
			</div>

			<!-- Aide Raccourcis Clavier -->
			<div class="bg-surface border-4 border-secondary p-4 rounded-xl shadow-[5px_5px_0px_#1a0033] flex flex-col gap-2">
				<h3 class="text-xs font-black uppercase text-text-dim tracking-wider border-b-2 border-secondary pb-1 flex items-center gap-1.5">
					<HelpCircle class="w-3.5 h-3.5" />
					{$_('beatmap_editor.shortcuts')}
				</h3>
				<div class="flex flex-col gap-1 text-[11px] font-bold text-text uppercase">
					<div class="flex justify-between border-b border-secondary/15 pb-0.5">
						<span class="text-text-dim">{$_('beatmap_editor.space')}</span>
						<span class="text-primary font-black">{$_('beatmap_editor.play_pause')}</span>
					</div>
					<div class="flex justify-between border-b border-secondary/15 pb-0.5">
						<span class="text-text-dim">A - Z</span>
						<span class="text-primary font-black">Touche Note</span>
					</div>
					<div class="flex justify-between border-b border-secondary/15 pb-0.5">
						<span class="text-text-dim">← / →</span>
						<span class="text-primary font-black">Changer Note</span>
					</div>
					<div class="flex justify-between border-b border-secondary/15 pb-0.5">
						<span class="text-text-dim">Shift + ← / →</span>
						<span class="text-primary font-black">Pas Snap</span>
					</div>
					<div class="flex justify-between border-b border-secondary/15 pb-0.5">
						<span class="text-text-dim">Suppr</span>
						<span class="text-accent font-black">{$_('common.delete')}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-text-dim">F5</span>
						<span class="text-primary font-black">{$_('beatmap_editor.test_map')}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- COLONNE 2 (CENTRE - ZONE D'ÉDITION PRINCIPALE SUR TOUTE LA HAUTEUR) -->
		<div class="lg:col-span-6 flex flex-col gap-4 w-full">
			<!-- Canvas Preview de la Piste -->
			<EditorTrackPreview {editor} />

			<!-- Grande Timeline Zoomable & Grille Rythmique -->
			<EditorTimeline {editor} />

			<!-- Clavier Virtuel Dynamique sous la Timeline -->
			<EditorKeyboardPreview {editor} />
		</div>

		<!-- COLONNE 3 (DROITE - INSPECTEUR & PRÉVISUALISATION LAYOUT) -->
		<div class="lg:col-span-3 flex flex-col gap-4">
			<EditorNoteInspector {editor} />
			<EditorLayoutPreviewPanel {editor} />
		</div>
	</div>
</div>

<!-- Barre de Contrôle Inférieure Fixe (Sans aucun bougé de layout) -->
<EditorBottomBar {editor} onTestMap={handleTestMap} />

<!-- Modal Choix de Difficulté OSZ -->
{#if editor.isOszModalOpen && editor.oszPackage}
	<Modal title="CHOISIR UNE DIFFICULTÉ À ÉDITER" close={() => (editor.isOszModalOpen = false)}>
		<div class="flex flex-col gap-4 text-left p-1">
			<div class="flex flex-col gap-1 border-b-2 border-secondary pb-2">
				<h4 class="text-base font-black uppercase text-primary leading-tight">{editor.oszPackage.title}</h4>
				<span class="text-xs font-bold text-text-dim uppercase">{editor.oszPackage.artist} · Mapper: {editor.oszPackage.mapper}</span>
			</div>

			<p class="text-xs font-black uppercase tracking-wider text-text-dim">
				Sélectionnez la difficulté à charger dans l'éditeur :
			</p>

			<div class="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
				{#each editor.oszPackage.difficulties as diff}
					<button
						onclick={() => loadOszDifficulty(diff)}
						class="flex items-center justify-between p-3 border-2 border-secondary rounded-lg bg-secondary/20 hover:bg-primary/20 hover:border-primary transition-all cursor-pointer text-left group"
					>
						<div class="flex flex-col">
							<span class="text-sm font-black uppercase text-text group-hover:text-primary transition-colors">
								{diff.version}
							</span>
							<span class="text-[10px] font-mono text-text-dim">
								{diff.parsed.hitObjects.length} notes · {diff.parsed.bpm} BPM
							</span>
						</div>
						<ChevronRight class="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
					</button>
				{/each}
			</div>
		</div>
	</Modal>
{/if}
