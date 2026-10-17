<script lang="ts">
	import type { LayoutData } from './$types';

	export let data: LayoutData;
</script>

<svelte:head>
	<title>ハード：ホーム</title>
</svelte:head>

<img src="/hard-logo.png" alt="Hard Logo" class="mx-auto mt-12 mb-4 h-64 w-64 rounded-xl" />

{#if data.profile}
	<p class="mt-4 text-center">{data.profile.name}</p>
{/if}
