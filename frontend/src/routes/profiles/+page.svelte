<script lang="ts">
	import { enhance } from '$app/forms';
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import Field from '$ui/Field.svelte';
	import TextInput from '$ui/TextInput.svelte';
	import Logo from '$ui/Logo.svelte';
	import Icon from '$ui/Icon.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import { t } from '$lib/i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let newName = $state('');
	let creating = $state(false);

	/**
	 * The form's failure, as a sentence.
	 *
	 * The action returns a key rather than a message, so the wording lives in
	 * the catalogue with everything else and the server does not need a
	 * locale.
	 */
	const message = $derived.by(() => {
		if (!form?.message) {
			return null;
		}

		if (form.message === 'needName') return t.profiles.needName;
		if (form.message === 'needChoice') return t.profiles.needChoice;
		return t.profiles.createFailed(Number(form.status ?? 0));
	});
</script>

<svelte:head>
	<title>{t.app.name} · {t.profiles.title}</title>
</svelte:head>

<div class="brand">
	<Logo size={3.5} />
	<h1>{t.app.name}</h1>
	<p>{t.app.tagline}</p>
</div>

<Card>
	<div class="stack">
		<header>
			<h2>{t.profiles.title}</h2>
			<p>{t.profiles.subtitle}</p>
		</header>

		{#if data.error}
			<p class="error" role="alert">{t.profiles.unreachable(data.error)}</p>
		{/if}

		{#if message}
			<p class="error" role="alert">{message}</p>
		{/if}

		{#if data.profiles.length > 0}
			<ul>
				{#each data.profiles as profile (profile.objectId)}
					<li>
						<form method="POST" action="?/select" use:enhance>
							<input type="hidden" name="profileId" value={profile.objectId} />
							<input type="hidden" name="redirectTo" value={data.redirectTo} />
							<button
								type="submit"
								class="profile"
								class:active={profile.objectId === data.activeProfileId}
							>
								<Avatar name={profile.name} size={2.25} />
								<span class="name">{profile.name}</span>
								{#if profile.objectId === data.activeProfileId}
									<span class="current">{t.profiles.active}</span>
								{/if}
								<Icon name="chevronRight" size={1.1} class="caret" />
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{:else if !data.error}
			<p class="none">{t.profiles.none}</p>
		{/if}

		<form
			method="POST"
			action="?/create"
			class="create"
			use:enhance={() => {
				creating = true;
				return async ({ update }) => {
					await update();
					creating = false;
				};
			}}
		>
			<input type="hidden" name="redirectTo" value={data.redirectTo} />
			<Field id="new-profile" label={t.profiles.newProfile} help={t.profiles.noPasswords}>
				{#snippet children({ id, describedBy })}
					<TextInput
						{id}
						{describedBy}
						name="name"
						bind:value={newName}
						placeholder={t.profiles.namePlaceholder}
						enterkeyhint="go"
					/>
				{/snippet}
			</Field>
			<Button
				type="submit"
				variant="primary"
				full
				busy={creating}
				disabled={!newName.trim()}
				icon="plus"
			>
				{t.profiles.create}
			</Button>
		</form>
	</div>
</Card>

<style>
	.brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.brand h1 {
		font-size: var(--text-xl);
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.brand p {
		font-size: var(--text-sm);
		color: var(--ink-subtle);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	header h2 {
		font-size: var(--text-lg);
	}

	header p {
		margin-top: 2px;
		font-size: var(--text-sm);
		color: var(--ink-muted);
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.profile {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		min-height: var(--touch);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--line);
		border-radius: var(--radius-md);
		text-align: left;
		transition:
			border-color var(--dur-fast) var(--ease),
			background-color var(--dur-fast) var(--ease);
	}

	.profile:hover {
		background: var(--surface-hover);
		border-color: var(--line-strong);
	}

	.profile.active {
		border-color: var(--brand);
	}

	.name {
		flex: 1;
		min-width: 0;
		font-size: var(--text-sm);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.current {
		font-size: var(--text-2xs);
		font-weight: 600;
		color: var(--brand);
	}

	.profile :global(.caret) {
		color: var(--ink-subtle);
	}

	.create {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-top: var(--space-4);
		border-top: 1px solid var(--line);
	}

	.none {
		font-size: var(--text-sm);
		color: var(--ink-muted);
	}

	.error {
		font-size: var(--text-sm);
		color: var(--danger);
	}
</style>
