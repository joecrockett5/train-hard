/**
 * The English catalogue.
 *
 * Its shape is the contract every other locale has to satisfy -- `Strings` in
 * ./index.ts is `typeof en`, so a catalogue missing a key, or carrying a
 * string where this has a function, fails the type check rather than
 * rendering `undefined` at the top of someone's screen.
 *
 * Anything that varies -- a count, a name, a date -- is a function, never a
 * template assembled by the caller. Word order differs between languages and
 * concatenation at the call site is exactly what cannot be translated.
 */

export const en = {
	meta: {
		/** For `Intl`, and for the document's `lang`. */
		tag: 'en-GB',
		name: 'English'
	},

	app: {
		name: 'train hard',
		tagline: 'Workout tracking'
	},

	nav: {
		dashboard: 'Home',
		workouts: 'Workouts',
		exercises: 'Exercises',
		templates: 'Templates',
		bodyWeight: 'Weight',
		settings: 'Profile',
		primary: 'Main',
		openSettings: (name: string) => `${name} — profile and settings`,
		skipToContent: 'Skip to content'
	},

	common: {
		add: 'Add',
		save: 'Save',
		saving: 'Saving…',
		saved: 'Saved',
		cancel: 'Cancel',
		close: 'Close',
		edit: 'Edit',
		remove: 'Remove',
		delete: 'Delete',
		done: 'Done',
		back: 'Back',
		clear: 'Clear',
		search: 'Search',
		notes: 'Notes',
		name: 'Name',
		title: 'Title',
		date: 'Date',
		description: 'Description',
		loading: 'Loading…',
		retry: 'Try again',
		tags: 'Tags',
		more: 'More',
		optional: 'Optional'
	},

	confirm: {
		irreversible: 'This cannot be undone.',
		deleteWorkout: (title: string) => `Delete “${title}”?`,
		deleteWorkoutBody: 'The workout, its exercises and all of their sets go with it.',
		deleteExercise: (name: string) => `Delete “${name}”?`,
		deleteExerciseBody: 'It is removed from every workout it appears in.',
		deleteTemplate: (name: string) => `Delete “${name}”?`,
		deleteTemplateBody: 'Workouts started from it are not affected.',
		deleteSet: 'Delete this set?',
		deleteWeighIn: 'Delete this weigh-in?',
		deleteWeighInBody: 'Its photos are deleted with it.',
		removeFromWorkout: (name: string) => `Remove “${name}” from this workout?`,
		removeFromWorkoutBody: 'Its sets in this workout go with it. The exercise itself is kept.',
		removeFromTemplate: (name: string) => `Remove “${name}” from this template?`,
		removeFromTemplateBody: 'The exercise itself is kept.',
		removePhoto: 'Remove this photo?'
	},

	errors: {
		generic: 'Something went wrong. Try again.',
		offline: 'Cannot reach the app, and no copy of this page is stored on this device.',
		loadFailed: 'Could not load this just now.',
		saveFailed: 'Could not save that. Try again.',
		deleteFailed: 'Could not delete that. Try again.',
		createWorkout: 'Could not start the workout. Try again.',
		createExercise: 'Could not create the exercise. Try again.',
		createTemplate: 'Could not create the template. Try again.',
		createTag: 'Could not create the tag. Try again.',
		logSet: 'Could not log that set. Try again.',
		logWeighIn: 'Could not log that weigh-in. Try again.',
		uploadPhoto: 'Could not upload that photo.',
		photoUnavailable: 'Photo unavailable'
	},

	profiles: {
		title: 'Choose a profile',
		subtitle: 'Pick a profile, or make a new one.',
		none: 'No profiles yet. Make the first one.',
		newProfile: 'New profile',
		namePlaceholder: 'Name',
		create: 'Create',
		creating: 'Creating…',
		needName: 'Give the profile a name',
		needChoice: 'Pick a profile',
		createFailed: (status: number) => `Could not create the profile (${status})`,
		unreachable: (reason: string) => `Could not reach the API: ${reason}`,
		active: 'Currently signed in',
		noPasswords: 'There are no passwords. A profile just decides whose data you are looking at.'
	},

	settings: {
		title: 'Profile',
		subtitle: 'Everything about this profile, and how the app looks.',

		identity: 'Profile',
		identityHelp: 'The name this profile is listed under.',
		displayName: 'Display name',
		rename: 'Rename',
		renamed: 'Name saved',
		renameFailed: 'Could not rename the profile. Try again.',
		nameUnchanged: 'That is already the name.',
		nameRequired: 'A profile needs a name.',
		switchProfile: 'Switch profile',
		switchProfileHelp: 'Sign out of this profile and pick another.',
		createProfile: 'Create a profile',
		createProfileHelp: 'Start a separate set of workouts, exercises and weigh-ins.',

		appearance: 'Appearance',
		appearanceHelp: 'Stored on this profile, so it follows you to any device.',
		theme: 'Theme',
		light: 'Light',
		dark: 'Dark',
		themeSystemNote:
			'Matching the device automatically needs a third setting on the profile, which the backend does not store yet.',

		units: 'Units',
		unitsHelp:
			'Every weight is stored in kilograms. This only changes how they are shown and how a number you type is read.',
		weightUnit: 'Weight unit',
		kilograms: 'Kilograms',
		pounds: 'Pounds',
		kg: 'kg',
		lbs: 'lbs',

		about: 'About',
		aboutData: 'Data',
		aboutDataHelp: (counts: { workouts: number; exercises: number; weighIns: number }) =>
			`${counts.workouts} workouts · ${counts.exercises} exercises · ${counts.weighIns} weigh-ins`,
		installTitle: 'Install on your phone',
		installHelp:
			'Add this to your Home Screen from the browser menu and it opens without browser chrome.'
	},

	dashboard: {
		title: 'Home',
		greeting: (name: string) => name,
		startWorkout: "Start today's workout",
		starting: 'Starting…',
		start: 'Start',
		newWorkout: 'New workout',
		continueWorkout: 'Carry on',
		todaysWorkouts: 'Today',
		todaysWorkoutsEmpty: 'Nothing logged today yet.',
		recentWorkouts: 'Recent workouts',
		recentWorkoutsEmpty: 'Your workouts will show up here once you log one.',
		seeAllWorkouts: 'All workouts',
		progress: 'Progress',
		progressUnavailable: 'Could not load your weigh-ins just now.',
		latestWeight: 'Latest weight',
		noWeighIns: 'No weigh-ins yet. Add one and it will be graphed here.',
		addWeighIn: 'Add a weigh-in',
		frequentExercises: 'Most logged',
		frequentExercisesEmpty: 'Exercises you log show up here.',
		frequentExerciseSessions: (count: number) => (count === 1 ? 'Once' : `${count} times`),
		firstRun: 'Welcome',
		firstRunBody:
			'Nothing logged yet. Start a workout and add exercises to it, or add a weigh-in to start the graph.',
		thisWeek: 'This week',
		thisWeekWorkouts: (count: number) => (count === 1 ? '1 workout' : `${count} workouts`),
		lastSevenDays: 'In the last 7 days',
		streakNone: 'No workouts in the last 7 days.'
	},

	workouts: {
		title: 'Workouts',
		onDate: (date: string) => `Workouts on ${date}`,
		noneOnDate: 'Nothing logged on this day.',
		newWorkout: 'New workout',
		addWorkout: 'Add workout',
		titlePlaceholder: 'Push day',
		notesPlaceholder: 'How it went',
		previousDay: 'Previous day',
		nextDay: 'Next day',
		today: 'Today',
		swipeHint: 'Swipe left or right to change day',
		openWorkout: (title: string) => `Open ${title}`,
		workoutOn: (date: string) => `Workout on ${date}`,
		editWorkout: 'Edit workout',
		backToDay: 'Back to this day',
		exerciseCount: (count: number) => (count === 1 ? '1 exercise' : `${count} exercises`),
		setCount: (count: number) => (count === 1 ? '1 set' : `${count} sets`),
		noExercises: 'No exercises yet. Add the first one.',
		addExercise: 'Add an exercise',
		addExerciseTo: (title: string) => `Add an exercise to “${title}”`,
		searchPlaceholder: 'Name or description',
		noExercisesMatch: 'No exercises match.',
		allAlreadyAdded: 'Every exercise you have is already in this workout.'
	},

	exercises: {
		title: 'Exercises',
		all: 'All exercises',
		matching: (shown: number, total: number) => `${shown} of ${total} exercises`,
		none: 'No exercises match.',
		noneAtAll: 'No exercises yet. Make the first one.',
		newExercise: 'New exercise',
		addExercise: 'Add exercise',
		adding: 'Adding…',
		namePlaceholder: 'Bench press',
		descriptionPlaceholder: 'Barbell, flat bench',
		editExercise: (name: string) => `Edit ${name}`,
		measuredIn: 'Measured in',
		measuredInHelp: 'Timed exercises log minutes instead of reps at a weight.',
		kindReps: 'Reps',
		kindTime: 'Time',
		lastDone: (date: string) => `Last done ${date}`,
		neverDone: 'Not logged yet'
	},

	templates: {
		title: 'Templates',
		subtitle: 'Start a workout from a list you have already made',
		matching: (shown: number, total: number) => `${shown} of ${total} templates`,
		none: 'No templates match.',
		noneAtAll: 'No templates yet. Make one and it will show up here.',
		newTemplate: 'New template',
		addTemplate: 'Add template',
		namePlaceholder: 'Push day',
		exercisesAddedLater: 'Exercises are added once it exists.',
		exerciseCount: (count: number) => (count === 1 ? '1 exercise' : `${count} exercises`),
		editTemplate: (name: string) => `Edit ${name}`,
		empty: 'No exercises yet. Add the ones this template should pull in.',
		addExerciseTo: (name: string) => `Add an exercise to “${name}”`,

		importLabel: 'Import a template',
		importHelp: 'Its exercises are added to this workout.',
		importHelpDeferred: 'Its exercises are added once the workout is made.',
		importNone: 'No templates yet. Make one on the Templates screen.',
		importedFrom: (name: string) => `From ${name}`,

		saveAs: 'Save as a template',
		saveAsTitle: 'Save as a template',
		saveAsEmpty: 'This workout has no exercises yet.',
		saveAsBody: (count: number) =>
			count === 1
				? 'Its 1 exercise is kept. Sets are not.'
				: `Its ${count} exercises are kept. Sets are not.`,
		saved: (name: string) => `Saved ${name}`,
		savedBody: (count: number) =>
			count === 1 ? '1 exercise from this workout.' : `${count} exercises from this workout.`,
		stayHere: 'Stay here',
		openTemplate: 'Open the template'
	},

	sets: {
		warmup: 'Warm-up',
		warmupSets: 'Warm-up sets',
		working: 'Working sets',
		intervals: 'Intervals',
		newWarmup: 'Add a warm-up set',
		newWorking: 'Add a set',
		newInterval: 'Add an interval',
		editSet: 'Edit set',
		reps: 'Reps',
		repsShort: 'reps',
		weight: 'Weight',
		minutes: 'Minutes',
		minutesShort: 'min',
		at: 'at',
		none: 'No sets logged yet.',
		repsAt: (reps: number, weight: string) => `${reps} reps at ${weight}`,
		forMinutes: (minutes: string) => `${minutes} min`,
		history: 'Recent sessions',
		historyNone: 'First time logging this one.',
		historyOn: (date: string) => `Session on ${date}`,
		better: 'Up on last time',
		worse: 'Down on last time',
		same: 'Same as last time',
		expand: (name: string) => `Open ${name}`,
		collapse: (name: string) => `Close ${name}`
	},

	tags: {
		title: 'Tags',
		none: 'No tags yet. Make the first one below.',
		newTag: 'New tag',
		duplicate: (name: string) => `“${name}” already exists.`,
		filterBy: (name: string) => `Filter by ${name}`,
		stopFilteringBy: (name: string) => `Stop filtering by ${name}`,
		addTag: (name: string) => `Add tag ${name}`,
		removeTag: (name: string) => `Remove tag ${name}`,
		filterHelp: 'Picking more than one shows anything carrying any of them.',
		clearFilter: 'Clear filter'
	},

	bodyWeight: {
		title: 'Weight',
		subtitle: 'Every weigh-in for this profile',
		newWeighIn: 'Add a weigh-in',
		addWeighIn: 'Add weigh-in',
		editWeighIn: 'Edit weigh-in',
		weightLabel: (unit: string) => `Weight (${unit})`,
		weightPlaceholder: 'Weight',
		notesPlaceholder: 'After breakfast',
		none: 'No weigh-ins yet. Add one and it will be graphed here.',
		chartTitle: 'Progress',
		chartLabel: (unit: string) => `Body weight over time, in ${unit}`,
		chartSummary: (weight: string, date: string) => `${weight} on ${date}`,
		chartChange: (change: string) => `${change} since the first entry`,
		chartOverTime: 'Weight over time',
		comparePhotos: 'Compare photos',
		compareTitle: 'Compare',
		compareSubtitle: "Two dates' progress photos, side by side",
		compareEmpty:
			'Two weigh-ins need photos before there is anything to compare. Add them from the weight screen.',
		earlier: 'Earlier',
		later: 'Later',
		linked: 'Both sides follow',
		unlinked: 'Each side on its own',
		showPhoto: (index: number) => `Show photo ${index}`,
		backToWeighIns: 'Back to weigh-ins'
	},

	photos: {
		add: 'Add photos',
		addCount: (count: number) => (count === 1 ? 'Add photos (1)' : `Add photos (${count})`),
		count: (count: number) => (count === 1 ? '1 photo' : `${count} photos`),
		view: 'View full size',
		viewTitle: 'Progress photo',
		removeOne: (index: number) => `Remove photo ${index}`,
		fromDate: (date: string) => `Progress photo from ${date}`
	},

	pager: {
		label: 'Pages',
		previous: 'Previous page',
		next: 'Next page',
		page: (page: number) => `Page ${page}`,
		position: (page: number, pages: number) => `Page ${page} of ${pages}`
	},

	calendar: {
		previousMonth: 'Previous month',
		nextMonth: 'Next month',
		/** Narrow weekday initials, Sunday first, for the month grid's header. */
		weekdaysNarrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
		/** The accessible names behind those initials. */
		weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		hasWorkouts: 'Has workouts'
	}
} as const;
