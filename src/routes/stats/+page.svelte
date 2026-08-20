<script lang="ts">
	import { onMount } from 'svelte';
	import { COLORS, SHADOW, SPACING } from '$lib/tokens';
	import { FINGER_COLORS, FINGER_LABELS, getFingerColor } from '$lib/fingerColors';
	import { loadProgression, getPlayerLevel, type ProgressionData, type FingerStats } from '$lib/progression';
	import type { Finger } from '$lib/schemas/titl';
	import { BarChart2, Award, Trophy, Hand, Keyboard, Zap, Clock } from '@lucide/svelte';

	let progression = $state<ProgressionData | null>(null);

	const levelInfo = $derived(
		progression ? getPlayerLevel(progression.xp) : { level: 1, currentXp: 0, nextLevelXp: 100, progress: 0 }
	);

	// Ordre symétrique des 5 doigts pour chaque main (Auriculaire -> Pouce)
	const leftHandFingers: Finger[] = ['L_PINKY', 'L_RING', 'L_MIDDLE', 'L_INDEX', 'L_THUMB'];
	const rightHandFingers: Finger[] = ['R_PINKY', 'R_RING', 'R_MIDDLE', 'R_INDEX', 'R_THUMB'];

	onMount(async () => {
		progression = await loadProgression();
	});

	function getAccuracyForStats(stats?: FingerStats): number {
		if (!stats || stats.totalHits === 0) return 0;
		const successful = stats.perfect + stats.great * 0.8 + stats.good * 0.5;
		return (successful / stats.totalHits) * 100;
	}
</script>

<div class="max-w-4xl mx-auto px-6 py-6 md:py-8 flex flex-col gap-8 text-left select-none">
	<!-- Page Header -->
	<div class="flex flex-col gap-1.5 border-b-4 border-secondary pb-4">
		<h1 class="text-2xl md:text-3xl font-black uppercase tracking-wider text-primary flex items-center gap-2">
			<BarChart2 class="w-7 h-7" /> PROGRESSION & STATISTIQUES
		</h1>
		<p class="text-xs md:text-sm font-bold text-text-dim uppercase tracking-wider">
			Analysez votre vitesse de frappe, la précision de chaque doigt et l'historique de vos parties.
		</p>
	</div>

	{#if progression}
		<!-- Level & Global XP Banner -->
		<div class="bg-surface border-4 border-secondary p-6 rounded-xl shadow-[6px_6px_0px_0px_#f9564f] flex flex-col lg:flex-row items-center justify-between gap-6 w-full">
			<div class="flex items-center gap-5 w-full lg:w-auto">
				<!-- Big Level Badge -->
				<div class="flex flex-col items-center justify-center w-16 h-16 bg-accent border-4 border-secondary text-secondary rounded-lg shadow-[3px_3px_0px_0px_#ffc145] select-none">
					<span class="text-[10px] font-black uppercase tracking-wider leading-none">NIV</span>
					<span class="text-3xl font-black leading-none mt-0.5">{levelInfo.level}</span>
				</div>

				<div class="flex flex-col gap-1 text-left flex-1">
					<h2 class="text-base md:text-lg font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
						<Zap class="w-5 h-5 fill-primary text-primary" /> XP TOTALE : {progression.xp} PTS
					</h2>
					<span class="text-[10px] font-black text-text-dim uppercase tracking-wider">
						{levelInfo.currentXp} / {levelInfo.nextLevelXp} XP jusqu'au prochain niveau
					</span>
					<div class="w-full sm:w-64 h-3.5 bg-bg border-2 border-secondary rounded overflow-hidden mt-1.5">
						<div 
							class="h-full bg-primary rounded-sm transition-all duration-300"
							style="width: {levelInfo.progress * 100}%"
						></div>
					</div>
				</div>
			</div>

			<!-- Quick Global Stats -->
			<div class="grid grid-cols-3 gap-3 w-full lg:w-auto select-none">
				<div class="bg-secondary/45 border-4 border-secondary px-4 py-3 rounded-lg flex flex-col justify-center items-center text-center">
					<span class="text-[9px] font-black uppercase tracking-wider text-text-dim flex items-center gap-1 mb-1">
						<Award class="w-3.5 h-3.5" /> MAPS
					</span>
					<div class="text-xl font-black text-white leading-none">
						{progression.mapsCompleted.length}
					</div>
				</div>

				<div class="bg-secondary/45 border-4 border-secondary px-4 py-3 rounded-lg flex flex-col justify-center items-center text-center">
					<span class="text-[9px] font-black uppercase tracking-wider text-text-dim flex items-center gap-1 mb-1">
						<Trophy class="w-3.5 h-3.5 fill-primary text-primary" /> RECORDS
					</span>
					<div class="text-xl font-black text-white leading-none">
						{Object.keys(progression.mapScores).length}
					</div>
				</div>

				<div class="bg-secondary/45 border-4 border-secondary px-4 py-3 rounded-lg flex flex-col justify-center items-center text-center">
					<span class="text-[9px] font-black uppercase tracking-wider text-text-dim flex items-center gap-1 mb-1">
						<Clock class="w-3.5 h-3.5 text-accent" /> LATENCE
					</span>
					<div class="text-xl font-black text-accent font-mono leading-none">
						{progression.averageLatencyMs ? (progression.averageLatencyMs > 0 ? `+${progression.averageLatencyMs}` : progression.averageLatencyMs) : 0} ms
					</div>
				</div>
			</div>
		</div>

		<!-- Finger Accuracy Breakdown (Alignement parfait des mains Gauche & Droite) -->
		<div class="bg-surface border-4 border-secondary p-6 rounded-xl shadow-[6px_6px_0px_0px_#ffc145] flex flex-col gap-4 text-left">
			<h2 class="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2 border-b-2 border-secondary pb-2">
				<Hand class="w-5 h-5" /> Précision par Doigt (10 Doigts)
			</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
				<!-- Main Gauche (Auriculaire -> Pouce) -->
				<div class="flex flex-col gap-3">
					<h3 class="text-xs font-black uppercase tracking-wider text-text-dim border-b border-secondary/20 pb-1">
						Main Gauche
					</h3>
					{#each leftHandFingers as fingerKey}
						{@const label = FINGER_LABELS[fingerKey]}
						{@const stats = progression.fingerStats[fingerKey]}
						{@const acc = getAccuracyForStats(stats)}
						{@const color = getFingerColor(fingerKey)}

						<div class="border-2 border-secondary bg-secondary/15 p-3.5 rounded-lg flex flex-col gap-2">
							<div class="flex justify-between items-center">
								<div class="flex items-center gap-2.5">
									<div class="w-3 h-3 rounded-full border-2 border-secondary" style="background-color: {color}"></div>
									<div class="flex flex-col text-left">
										<span class="text-xs font-black uppercase tracking-wider leading-none text-text">{label}</span>
										<span class="text-[9px] font-black uppercase tracking-wider text-text-dim mt-1">{stats?.totalHits ?? 0} frappes</span>
									</div>
								</div>

								<span class="font-mono font-black text-xs md:text-sm" style="color: {acc > 0 ? color : 'var(--color-text-dim)'}">
									{acc > 0 ? acc.toFixed(1) + '%' : 'N/A'}
								</span>
							</div>

							{#if acc > 0}
								<div class="w-full h-2.5 bg-bg border-2 border-secondary rounded overflow-hidden mt-0.5 relative">
									<div 
										class="h-full rounded-sm transition-all duration-350"
										style="width: {acc}%; background-color: {color};"
									></div>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Main Droite (Mirroire symétrique: Auriculaire -> Pouce) -->
				<div class="flex flex-col gap-3">
					<h3 class="text-xs font-black uppercase tracking-wider text-text-dim border-b border-secondary/20 pb-1">
						Main Droite
					</h3>
					{#each rightHandFingers as fingerKey}
						{@const label = FINGER_LABELS[fingerKey]}
						{@const stats = progression.fingerStats[fingerKey]}
						{@const acc = getAccuracyForStats(stats)}
						{@const color = getFingerColor(fingerKey)}

						<div class="border-2 border-secondary bg-secondary/15 p-3.5 rounded-lg flex flex-col gap-2">
							<div class="flex justify-between items-center">
								<div class="flex items-center gap-2.5">
									<div class="w-3 h-3 rounded-full border-2 border-secondary" style="background-color: {color}"></div>
									<div class="flex flex-col text-left">
										<span class="text-xs font-black uppercase tracking-wider leading-none text-text">{label}</span>
										<span class="text-[9px] font-black uppercase tracking-wider text-text-dim mt-1">{stats?.totalHits ?? 0} frappes</span>
									</div>
								</div>

								<span class="font-mono font-black text-xs md:text-sm" style="color: {acc > 0 ? color : 'var(--color-text-dim)'}">
									{acc > 0 ? acc.toFixed(1) + '%' : 'N/A'}
								</span>
							</div>

							{#if acc > 0}
								<div class="w-full h-2.5 bg-bg border-2 border-secondary rounded overflow-hidden mt-0.5 relative">
									<div 
										class="h-full rounded-sm transition-all duration-350"
										style="width: {acc}%; background-color: {color};"
									></div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Key Heatmap & Breakdown -->
		<div class="bg-surface border-4 border-secondary p-6 rounded-xl shadow-[6px_6px_0px_0px_#ffc145] flex flex-col gap-4 text-left">
			<h2 class="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2 border-b-2 border-secondary pb-2">
				<Keyboard class="w-5 h-5" /> Précision par Touche
			</h2>

			{#if Object.keys(progression.keyStats).length === 0}
				<div class="border-2 border-dashed border-secondary/50 bg-secondary/15 py-8 rounded-lg text-center font-black text-text-dim text-xs uppercase tracking-wider">
					Jouez des parties pour débloquer les statistiques individuelles des touches
				</div>
			{:else}
				<div class="flex flex-wrap gap-2.5 mt-2 select-none justify-start">
					{#each Object.entries(progression.keyStats) as [keyChar, stats]}
						{@const acc = getAccuracyForStats(stats)}
						<div 
							class="
								px-3 py-2 border-2 border-secondary rounded-lg flex items-center gap-2 font-mono font-black text-xs md:text-sm uppercase transition-transform select-none
								{acc >= 95 
									? 'bg-primary text-secondary shadow-[3px_3px_0px_0px_#f9564f]' 
									: acc >= 85 
										? 'bg-good text-secondary shadow-[3px_3px_0px_0px_#ffc145]'
										: acc >= 70
											? 'bg-accent text-secondary shadow-[3px_3px_0px_0px_#ffc145]'
											: 'bg-secondary text-text-dim border-dashed shadow-none opacity-70'
								}
							"
							title="{stats.totalHits} frappes sur la touche {keyChar.toUpperCase()}"
						>
							<span>{keyChar}</span>
							<span class="opacity-75">{acc.toFixed(0)}%</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
