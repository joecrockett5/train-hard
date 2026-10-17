/**
 * Translation between the backend's snake_case payloads and the camelCase
 * types the UI uses.
 *
 * This used to be written out by hand in each of the fourteen /api/* route
 * files. Two bugs lived in that duplication: one route read `set.weight_unit`
 * where the backend sends `unit`, and another referenced a variable that was
 * never declared. Naming each conversion once makes both impossible.
 */

import type {
	Exercise,
	RawExerciseJoin,
	RawSet,
	RawTag,
	Set,
	Tag,
	Template,
	WorkoutInfo
} from '$lib/types';

/** What the backend returns for a workout. */
export type RawWorkout = {
	user_id: string;
	timestamp: string;
	object_id: string;
	object_type: string;
	workout_date: string;
	title: string;
	notes: string;
};

export type RawExercise = {
	user_id: string;
	timestamp: string;
	object_id: string;
	object_type: string;
	name: string;
	description: string | null;
};

/** An exercise inside one workout, as /workouts/{id}/detail returns it. */
export type RawExerciseWithSets = RawExercise & {
	join_id: string | null;
	workout_id: string | null;
	sets: RawSet[];
};

export type RawTemplate = RawExercise;

export type ExerciseJoin = {
	userId: string;
	timestamp: string;
	objectType: string;
	objectId: string;
	exerciseId: string;
	workoutId: string;
};

// ---------------------------------------------------------------------------
// Backend -> UI
// ---------------------------------------------------------------------------

export function toWorkoutInfo(raw: RawWorkout): WorkoutInfo {
	return {
		userId: raw.user_id,
		timestamp: raw.timestamp,
		objectType: raw.object_type,
		objectId: raw.object_id,
		workoutDate: raw.workout_date,
		title: raw.title,
		notes: raw.notes
	};
}

export function toExercise(raw: RawExercise): Exercise {
	return {
		userId: raw.user_id,
		timestamp: raw.timestamp,
		objectType: raw.object_type,
		objectId: raw.object_id,
		name: raw.name,
		description: raw.description ?? ''
	};
}

export function toExerciseWithSets(raw: RawExerciseWithSets): Exercise {
	return {
		...toExercise(raw),
		joinId: raw.join_id ?? undefined,
		workoutId: raw.workout_id ?? undefined,
		sets: (raw.sets ?? []).map(toSet)
	};
}

export function toSet(raw: RawSet): Set {
	return {
		userId: raw.user_id,
		timestamp: raw.timestamp,
		objectType: raw.object_type,
		objectId: raw.object_id,
		setType: raw.set_type,
		weight: raw.weight,
		// The backend calls this `unit`.
		weightUnit: raw.unit,
		reps: raw.reps,
		notes: raw.notes,
		exerciseJoinId: raw.exercise_join_id
	};
}

export function toExerciseJoin(raw: RawExerciseJoin): ExerciseJoin {
	return {
		userId: raw.user_id,
		timestamp: raw.timestamp,
		objectType: raw.object_type,
		objectId: raw.object_id,
		exerciseId: raw.exercise_id,
		workoutId: raw.workout_id
	};
}

export function toTag(raw: RawTag): Tag {
	return {
		userId: raw.user_id,
		timestamp: raw.timestamp,
		objectType: raw.object_type,
		objectId: raw.object_id,
		name: raw.name,
		colorHex: raw.color_hex
	};
}

export function toTemplate(raw: RawTemplate): Template {
	return {
		userId: raw.user_id,
		timestamp: raw.timestamp,
		objectType: raw.object_type,
		objectId: raw.object_id,
		name: raw.name,
		description: raw.description ?? ''
	};
}

// ---------------------------------------------------------------------------
// UI -> backend
//
// Create bodies omit object_id and timestamp so the backend assigns them.
// Update bodies carry both, because it checks them against the stored item.
// ---------------------------------------------------------------------------

export function fromWorkout(body: Partial<WorkoutInfo>, { forUpdate = false } = {}) {
	return {
		...(forUpdate ? { timestamp: body.timestamp, object_id: body.objectId } : {}),
		workout_date: body.workoutDate,
		title: body.title,
		notes: body.notes
	};
}

export function fromExercise(body: Partial<Exercise>, { forUpdate = false } = {}) {
	return {
		...(forUpdate ? { timestamp: body.timestamp, object_id: body.objectId } : {}),
		name: body.name,
		description: body.description
	};
}

export function fromSet(body: Partial<Set>, { forUpdate = false } = {}) {
	return {
		...(forUpdate ? { timestamp: body.timestamp, object_id: body.objectId } : {}),
		set_type: body.setType,
		weight: body.weight,
		unit: body.weightUnit,
		reps: body.reps,
		notes: body.notes,
		exercise_join_id: body.exerciseJoinId
	};
}

export function fromExerciseJoin(body: { workoutId?: string; exerciseId?: string }) {
	return {
		workout_id: body.workoutId,
		exercise_id: body.exerciseId
	};
}

export function fromTemplate(body: Partial<Template>, { forUpdate = false } = {}) {
	return {
		...(forUpdate ? { timestamp: body.timestamp, object_id: body.objectId } : {}),
		name: body.name,
		description: body.description
	};
}
