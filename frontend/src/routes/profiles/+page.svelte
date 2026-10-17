<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { enhance } from '$app/forms';

	export let data;
	export let form;

	let newName = '';
</script>

<svelte:head>
	<title>ハード：プロフィール</title>
</svelte:head>

<img src="/hard-logo.png" alt="Hard Logo" class="mx-auto mt-12 mb-6 h-32 w-32 rounded-xl" />

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title>プロフィールを選ぶ</Card.Title>
		<Card.Description>Pick a profile, or make a new one.</Card.Description>
	</Card.Header>

	<Card.Content class="flex flex-col gap-4">
		{#if data.error}
			<p class="text-destructive text-sm">
				Could not reach the API: {data.error}
			</p>
		{/if}

		{#if form?.message}
			<p class="text-destructive text-sm">{form.message}</p>
		{/if}

		{#if data.profiles.length > 0}
			<div class="flex flex-col gap-2">
				{#each data.profiles as profile (profile.objectId)}
					<form method="POST" action="?/select" use:enhance>
						<input type="hidden" name="profileId" value={profile.objectId} />
						<input type="hidden" name="redirectTo" value={data.redirectTo} />
						<Button
							type="submit"
							variant={profile.objectId === data.activeProfileId ? 'default' : 'secondary'}
							class="w-full justify-start"
						>
							{profile.name}
						</Button>
					</form>
				{/each}
			</div>

			<div class="border-border border-t pt-4" />
		{:else if !data.error}
			<p class="text-muted-foreground text-sm">No profiles yet. Make the first one.</p>
		{/if}

		<form method="POST" action="?/create" use:enhance class="flex flex-col gap-2">
			<input type="hidden" name="redirectTo" value={data.redirectTo} />
			<label for="name" class="text-sm font-semibold">新しいプロフィール</label>
			<Input id="name" name="name" placeholder="名前" bind:value={newName} autocomplete="off" />
			<Button type="submit" disabled={!newName.trim()}>作成</Button>
		</form>
	</Card.Content>
</Card.Root>
