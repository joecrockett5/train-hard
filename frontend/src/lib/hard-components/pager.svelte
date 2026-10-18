<script lang="ts" context="module">
	/** The default page size across the app's lists. */
	export const PAGE_SIZE = 8;
</script>

<script lang="ts">
	import * as Pagination from '$lib/components/ui/pagination';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';

	/** How many items there are in total, across every page. */
	export let count: number;
	/** The page being shown. Bound, so the caller slices on it. */
	export let page = 1;
	export let perPage = PAGE_SIZE;
	let className: string = 'mt-4';
	export { className as class };

	$: lastPage = Math.max(1, Math.ceil(count / perPage));

	// A list can shrink under the reader -- a filter narrowing it, an entry
	// deleted -- leaving them on a page that no longer exists, where the
	// caller's slice starts past the end and shows nothing at all. Clamping
	// here covers every caller rather than each remembering to.
	$: if (page > lastPage) {
		page = lastPage;
	}

	// One page has nothing to move between, so the control is only noise.
	$: show = count > perPage;
</script>

{#if show}
	<Pagination.Root class={className} {count} {perPage} let:pages let:currentPage bind:page>
		<Pagination.Content>
			<Pagination.Item>
				<Pagination.PrevButton>
					<ChevronLeft class="h-4 w-4" />
				</Pagination.PrevButton>
			</Pagination.Item>
			{#each pages as entry (entry.key)}
				{#if entry.type === 'ellipsis'}
					<Pagination.Item>
						<Pagination.Ellipsis />
					</Pagination.Item>
				{:else}
					<Pagination.Item>
						<Pagination.Link page={entry} isActive={currentPage == entry.value}>
							{entry.value}
						</Pagination.Link>
					</Pagination.Item>
				{/if}
			{/each}
			<Pagination.Item>
				<Pagination.NextButton>
					<ChevronRight class="h-4 w-4" />
				</Pagination.NextButton>
			</Pagination.Item>
		</Pagination.Content>
	</Pagination.Root>
{/if}
