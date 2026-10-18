type Base = {
	userId?: string;
	timestamp?: string;
	objectId?: string;
	objectType?: string;
};

export type Tag = Base & {
	name: string;
	colorHex: string;
};

export type Set = Base & {
	setType: 'working' | 'warmup';
	weight: number;
	weightUnit: 'kg' | 'lbs';
	reps: number;
	notes: string;
	exerciseJoinId: string;
};

export type Exercise = Base & {
	name: string;
	description: string;
	sets?: Set[];
	joinId?: string;
	workoutId?: string;
	tags?: Tag[];
};

export type WorkoutInfo = Base & {
	workoutDate: string;
	title: string;
	notes: string;
	tags?: Tag[];
};

export type Template = Base & {
	name: string;
	description: string;
};

/** Always kilograms -- unlike a set, a weigh-in carries no unit. */
export type BodyWeight = Base & {
	entryDate: string;
	weight: number;
	notes: string;
};

/**
 * The shapes the backend actually returns, in its own snake_case naming.
 *
 * The /api/* server routes translate these into the camelCase types above, so
 * these only ever appear inside those routes. Every field is required: the
 * backend populates all of them on every item.
 */
export type RawBase = {
	user_id: string;
	timestamp: string;
	object_id: string;
	object_type: string;
};

export type RawTag = RawBase & {
	name: string;
	color_hex: string;
};

export type RawSet = RawBase & {
	set_type: 'working' | 'warmup';
	weight: number;
	unit: 'kg' | 'lbs';
	reps: number;
	notes: string;
	exercise_join_id: string;
};

export type RawExerciseJoin = RawBase & {
	workout_id: string;
	exercise_id: string;
};

export type RawBodyWeight = RawBase & {
	entry_date: string;
	weight: number;
	notes: string;
};
