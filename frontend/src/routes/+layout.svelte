<script lang="ts">
	import '../app.css';

	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import RedPlus from '$lib/svg/red-plus.svelte';

	export let data;
</script>

{#if data.profile}
	<Sheet.Root>
		<Sheet.Trigger asChild let:builder>
			<Button builders={[builder]} variant="ghost" size="icon" class="fixed right-4 bottom-4 z-50">
				<RedPlus />
			</Button>
		</Sheet.Trigger>
		<Sheet.Content side="bottom">
			<Sheet.Header>
				<Sheet.Close>
					<Sheet.Title><a href="/">hard</a></Sheet.Title>
					<Sheet.Description>Training app</Sheet.Description>
				</Sheet.Close>
			</Sheet.Header>
			<Sheet.Close class="w-full">
				<div class="grid gap-2 py-4">
					<div class="grid grid-cols-2 items-center gap-4">
						<Button href="/workouts" variant="secondary" class="h-20">Workouts</Button>
						<Button href="/exercises" variant="secondary" class="h-20">Exercises</Button>
						<Button href="/body-weight" variant="secondary" class="col-span-2 h-20"
							>Body Weight</Button
						>
					</div>
				</div>
			</Sheet.Close>
			<form method="POST" action="/profiles?/switch">
				<Button type="submit" variant="ghost" class="w-full">
					{data.profile.name} · Switch profile
				</Button>
			</form>
		</Sheet.Content>
	</Sheet.Root>
{/if}

<div class="mx-4 mb-4">
	<ScrollArea>
		<slot />
	</ScrollArea>
</div>
