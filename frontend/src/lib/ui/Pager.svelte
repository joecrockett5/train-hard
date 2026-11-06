<script lang="ts">
	import Button from './Button.svelte';
	import { t } from '$lib/i18n';
	import { PAGE_SIZE } from './paging';

	type Props = {
		/** How many items there are in total, across every page. */
		count: number;
		/** The page being shown. Bound, so the caller slices on it. */
		page?: number;
		perPage?: number;
		class?: string;
	};

	let { count, page = $bindable(1), perPage = PAGE_SIZE, class: className = '' }: Props = $props();

	const lastPage = $derived(Math.max(1, Math.ceil(count / perPage)));

	/**
	 * A list can shrink under the reader -- a filter narrowing it, an entry
	 * deleted -- leaving them on a page that no longer exists, where the
	 * caller's slice starts past the end and shows nothing at all. Clamping
	 * here covers every caller rather than each remembering to.
	 */
	$effect(() => {
		if (page > lastPage) {
			page = lastPage;
		}
	});

	/** Up to seven slots: first, last, the current one and its neighbours. */
	const pages = $derived.by(() => {
		if (lastPage <= 7) {
			return Array.from({ length: lastPage }, (_, index) => index + 1);
		}

		const around = [page - 1, page, page + 1].filter((n) => n > 1 && n < lastPage);
		const slots: (number | 'gap')[] = [1];

		if (around[0] > 2) {
			slots.push('gap');
		}

		slots.push(...around);

		if (around[around.length - 1] < lastPage - 1) {
			slots.push('gap');
		}

		slots.push(lastPage);
		return slots;
	});
</script>

<!-- One page has nothing to move between, so the control is only noise. -->
{#if count > perPage}
	<nav class="pager {className}" aria-label={t.pager.label}>
		<Button
			variant="ghost"
			iconOnly
			icon="chevronLeft"
			size="sm"
			label={t.pager.previous}
			disabled={page <= 1}
			onclick={() => (page = Math.max(1, page - 1))}
		/>

		<ul>
			{#each pages as slot, index (index)}
				<li>
					{#if slot === 'gap'}
						<span class="gap" aria-hidden="true">…</span>
					{:else}
						<button
							type="button"
							class="page"
							class:current={slot === page}
							aria-current={slot === page ? 'page' : undefined}
							aria-label={t.pager.page(slot)}
							onclick={() => (page = slot)}
						>
							{slot}
						</button>
					{/if}
				</li>
			{/each}
		</ul>

		<Button
			variant="ghost"
			iconOnly
			icon="chevronRight"
			size="sm"
			label={t.pager.next}
			disabled={page >= lastPage}
			onclick={() => (page = Math.min(lastPage, page + 1))}
		/>

		<p class="sr-only" aria-live="polite">{t.pager.position(page, lastPage)}</p>
	</nav>
{/if}

<style>
	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
	}

	ul {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.page,
	.gap {
		display: grid;
		place-items: center;
		/* A page number is a small glyph; the target around it is not. */
		min-width: var(--touch);
		min-height: var(--touch);
		padding-inline: var(--space-2);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--ink-muted);
	}

	.gap {
		min-width: 1.5rem;
		color: var(--ink-subtle);
	}

	.page:hover {
		background: var(--surface-hover);
		color: var(--ink);
	}

	.page.current {
		background: var(--brand-wash);
		color: var(--brand);
	}
</style>
