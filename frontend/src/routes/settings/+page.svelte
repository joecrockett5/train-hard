<script lang="ts">
	import Card from '$ui/Card.svelte';
	import Button from '$ui/Button.svelte';
	import Field from '$ui/Field.svelte';
	import TextInput from '$ui/TextInput.svelte';
	import SegmentedControl from '$ui/SegmentedControl.svelte';
	import Icon from '$ui/Icon.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import { preferences } from '$lib/preferences.svelte';
	import { toast } from '$ui/toast.svelte';
	import { t } from '$lib/i18n';
	import type { WeightUnit } from '$lib/units';
	import type { PageData } from './$types';

	/**
	 * Everything about this profile, in one place.
	 *
	 * This replaces the two unlabelled icon buttons in the old nav sheet. Each
	 * setting now appears exactly once, under a heading that says what it
	 * governs, with helper text where the behaviour is not obvious -- the unit
	 * one especially, because "kg/lbs" looks like it might convert the data
	 * and does not.
	 *
	 * Everything saves as it is changed, with a confirmation, rather than
	 * behind a Save button. The exception is the name, which is typed: saving
	 * on every keystroke would write a profile called "J", then "Jo", then
	 * "Joe".
	 */
	let { data }: { data: PageData } = $props();

	const prefs = preferences();

	let name = $state('');
	let renaming = $state(false);
	let nameError = $state<string | null>(null);

	// Taken when the profile resolves, and again if it is renamed elsewhere.
	$effect(() => {
		name = prefs.name;
	});

	const renamed = $derived(name.trim() !== prefs.name && name.trim().length > 0);

	async function rename() {
		const trimmed = name.trim();

		if (!trimmed) {
			nameError = t.settings.nameRequired;
			return;
		}

		if (trimmed === prefs.name) {
			return;
		}

		nameError = null;
		renaming = true;

		if (await prefs.save({ name: trimmed })) {
			toast(t.settings.renamed);
		} else {
			nameError = t.settings.renameFailed;
		}

		renaming = false;
	}

	async function setTheme(value: 'light' | 'dark') {
		if (await prefs.save({ darkMode: value === 'dark' })) {
			toast(t.common.saved);
		}
	}

	async function setUnit(value: WeightUnit) {
		if (await prefs.save({ weightUnit: value })) {
			toast(t.common.saved);
		}
	}

	const theme = $derived<'light' | 'dark'>(prefs.darkMode ? 'dark' : 'light');
</script>

<svelte:head>
	<title>{t.app.name} · {t.settings.title}</title>
</svelte:head>

<header class="screen-head">
	<Avatar name={prefs.name} size={3} />
	<div>
		<h1>{prefs.name}</h1>
		<p>{t.settings.subtitle}</p>
	</div>
</header>

<!-- ---- profile --------------------------------------------------------- -->
<section>
	<h2>{t.settings.identity}</h2>

	<Card>
		<div class="group">
			<Field
				id="profile-name"
				label={t.settings.displayName}
				help={nameError ? undefined : t.settings.identityHelp}
				error={nameError ?? undefined}
			>
				{#snippet children({ id, describedBy })}
					<div class="inline">
						<TextInput
							{id}
							{describedBy}
							bind:value={name}
							invalid={nameError !== null}
							enterkeyhint="done"
							onkeydown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									rename();
								}
							}}
						/>
						<Button
							variant={renamed ? 'primary' : 'secondary'}
							disabled={!renamed}
							busy={renaming}
							onclick={rename}
						>
							{t.settings.rename}
						</Button>
					</div>
				{/snippet}
			</Field>

			<hr />

			<form method="POST" action="/profiles?/switch" class="row-form">
				<button type="submit" class="row">
					<Icon name="switchProfile" size={1.2} />
					<span class="row-text">
						<strong>{t.settings.switchProfile}</strong>
						<small>{t.settings.switchProfileHelp}</small>
					</span>
					<Icon name="chevronRight" size={1.05} class="caret" />
				</button>
			</form>

			<a href="/profiles" class="row">
				<Icon name="plus" size={1.2} />
				<span class="row-text">
					<strong>{t.settings.createProfile}</strong>
					<small>{t.settings.createProfileHelp}</small>
				</span>
				<Icon name="chevronRight" size={1.05} class="caret" />
			</a>
		</div>
	</Card>
</section>

<!-- ---- appearance ------------------------------------------------------ -->
<section>
	<h2>{t.settings.appearance}</h2>

	<Card>
		<div class="group">
			<div class="setting">
				<SegmentedControl
					name="theme"
					legend={t.settings.theme}
					hideLegend={false}
					value={theme}
					disabled={prefs.saving}
					options={[
						{ value: 'light', label: t.settings.light, icon: 'sun' },
						{ value: 'dark', label: t.settings.dark, icon: 'moon' }
					]}
					onchange={setTheme}
				/>
				<p class="help">{t.settings.appearanceHelp}</p>
				<!--
					Why there is no "System": the preference is a boolean on the
					profile, so a third value is a backend change. Said here
					rather than left as a gap somebody has to wonder about.
				-->
				<p class="help">{t.settings.themeSystemNote}</p>
			</div>
		</div>
	</Card>
</section>

<!-- ---- units ----------------------------------------------------------- -->
<section>
	<h2>{t.settings.units}</h2>

	<Card>
		<div class="group">
			<div class="setting">
				<SegmentedControl
					name="weight-unit"
					legend={t.settings.weightUnit}
					hideLegend={false}
					value={prefs.weightUnit}
					disabled={prefs.saving}
					options={[
						{ value: 'kg', label: t.settings.kilograms },
						{ value: 'lbs', label: t.settings.pounds }
					]}
					onchange={setUnit}
				/>
				<p class="help">{t.settings.unitsHelp}</p>
			</div>
		</div>
	</Card>
</section>

<!-- ---- about ----------------------------------------------------------- -->
<section>
	<h2>{t.settings.about}</h2>

	<Card>
		<div class="group">
			<div class="setting">
				<p class="label">{t.settings.aboutData}</p>
				<p class="help tnum">{t.settings.aboutDataHelp(data.counts)}</p>
			</div>
			<hr />
			<div class="setting">
				<p class="label">{t.settings.installTitle}</p>
				<p class="help">{t.settings.installHelp}</p>
			</div>
		</div>
	</Card>
</section>

<style>
	.screen-head {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	h1 {
		font-size: var(--text-2xl);
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: var(--leading-tight);
	}

	.screen-head p {
		font-size: var(--text-sm);
		color: var(--ink-muted);
	}

	section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	h2 {
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-subtle);
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.setting {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.label {
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.help {
		font-size: var(--text-xs);
		line-height: var(--leading-snug);
		color: var(--ink-subtle);
	}

	.inline {
		display: flex;
		gap: var(--space-2);
	}

	hr {
		border: none;
		border-top: 1px solid var(--line);
	}

	.row-form {
		display: contents;
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		min-height: var(--touch);
		padding: var(--space-2) 0;
		color: var(--ink);
		text-align: left;
	}

	.row-text {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.row-text strong {
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.row-text small {
		font-size: var(--text-xs);
		color: var(--ink-subtle);
	}

	.row :global(.caret) {
		color: var(--ink-subtle);
	}
</style>
