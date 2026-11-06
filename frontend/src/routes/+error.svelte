<script lang="ts">
	import { page } from '$app/state';
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import EmptyState from '$ui/EmptyState.svelte';
	import { t } from '$lib/i18n';

	/**
	 * What a failed load shows.
	 *
	 * The status and the message, and a way back -- rather than SvelteKit's
	 * default, which is the status code on a blank page with no navigation on
	 * it at all.
	 */
</script>

<svelte:head>
	<title>{t.app.name} · {page.status}</title>
</svelte:head>

<Card>
	<EmptyState
		icon="alert"
		tone="error"
		title={page.error?.message ?? t.errors.generic}
		body={String(page.status)}
	>
		{#snippet action()}
			<Button variant="primary" href="/">{t.nav.dashboard}</Button>
		{/snippet}
	</EmptyState>
</Card>
