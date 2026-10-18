import { describe, expect, it } from 'vitest';
import {
	fromBodyWeight,
	fromExerciseJoin,
	fromSet,
	fromWorkout,
	toBodyWeight,
	toExercise,
	toExerciseJoin,
	toExerciseWithSets,
	toSet,
	toTag,
	toWorkoutInfo,
	type RawExercise,
	type RawExerciseWithSets,
	type RawWorkout
} from './mapping';
import type { RawBodyWeight, RawExerciseJoin, RawSet, RawTag } from './types';

const base = {
	user_id: 'profile-1',
	timestamp: '2026-10-17T10:00:00',
	object_id: 'object-1',
	object_type: 'Thing'
};

describe('toWorkoutInfo', () => {
	it('renames every field', () => {
		const raw: RawWorkout = {
			...base,
			object_type: 'Workout',
			workout_date: '2026-10-17',
			title: 'Push day',
			notes: 'felt strong'
		};

		expect(toWorkoutInfo(raw)).toEqual({
			userId: 'profile-1',
			timestamp: '2026-10-17T10:00:00',
			objectType: 'Workout',
			objectId: 'object-1',
			workoutDate: '2026-10-17',
			title: 'Push day',
			notes: 'felt strong'
		});
	});
});

describe('toSet', () => {
	const raw: RawSet = {
		...base,
		object_type: 'Set',
		set_type: 'working',
		weight: 82.5,
		unit: 'kg',
		reps: 5,
		notes: 'solid',
		exercise_join_id: 'join-1'
	};

	it('reads the weight unit from `unit`', () => {
		// A route used to read set.weight_unit, which does not exist, so every
		// set came back with an undefined unit.
		expect(toSet(raw).weightUnit).toBe('kg');
	});

	it('keeps weight and reps numeric', () => {
		const mapped = toSet(raw);

		expect(typeof mapped.weight).toBe('number');
		expect(typeof mapped.reps).toBe('number');
	});

	it('maps the remaining fields', () => {
		expect(toSet(raw)).toEqual({
			userId: 'profile-1',
			timestamp: '2026-10-17T10:00:00',
			objectType: 'Set',
			objectId: 'object-1',
			setType: 'working',
			weight: 82.5,
			weightUnit: 'kg',
			reps: 5,
			notes: 'solid',
			exerciseJoinId: 'join-1'
		});
	});
});

describe('toExercise', () => {
	it('turns a null description into an empty string', () => {
		const raw: RawExercise = {
			...base,
			object_type: 'Exercise',
			name: 'Bench',
			description: null
		};

		expect(toExercise(raw).description).toBe('');
	});
});

describe('toExerciseWithSets', () => {
	it('carries the join and its sets', () => {
		const raw: RawExerciseWithSets = {
			...base,
			object_type: 'Exercise',
			name: 'Bench',
			description: 'flat',
			join_id: 'join-1',
			workout_id: 'workout-1',
			sets: [
				{
					...base,
					object_id: 'set-1',
					object_type: 'Set',
					set_type: 'warmup',
					weight: 40,
					unit: 'kg',
					reps: 10,
					notes: '',
					exercise_join_id: 'join-1'
				}
			]
		};

		const mapped = toExerciseWithSets(raw);

		expect(mapped.joinId).toBe('join-1');
		expect(mapped.workoutId).toBe('workout-1');
		expect(mapped.sets).toHaveLength(1);
		expect(mapped.sets?.[0].weightUnit).toBe('kg');
	});

	it('tolerates a missing sets array', () => {
		const raw = {
			...base,
			object_type: 'Exercise',
			name: 'Bench',
			description: '',
			join_id: null,
			workout_id: null
		} as RawExerciseWithSets;

		expect(toExerciseWithSets(raw).sets).toEqual([]);
	});
});

describe('toExerciseJoin and toTag', () => {
	it('maps a join', () => {
		const raw: RawExerciseJoin = {
			...base,
			object_type: 'ExerciseJoin',
			workout_id: 'workout-1',
			exercise_id: 'exercise-1'
		};

		expect(toExerciseJoin(raw)).toMatchObject({
			workoutId: 'workout-1',
			exerciseId: 'exercise-1'
		});
	});

	it('maps color_hex to colorHex', () => {
		const raw: RawTag = { ...base, object_type: 'Tag', name: 'Heavy', color_hex: '#ff0000' };

		expect(toTag(raw).colorHex).toBe('#ff0000');
	});
});

describe('toBodyWeight', () => {
	const raw: RawBodyWeight = {
		...base,
		object_type: 'BodyWeight',
		entry_date: '2026-10-17',
		weight: 80.1,
		notes: 'morning'
	};

	it('renames every field', () => {
		expect(toBodyWeight(raw)).toEqual({
			userId: 'profile-1',
			timestamp: '2026-10-17T10:00:00',
			objectType: 'BodyWeight',
			objectId: 'object-1',
			entryDate: '2026-10-17',
			weight: 80.1,
			notes: 'morning'
		});
	});

	it('carries no unit -- a weigh-in is always kilograms', () => {
		expect(toBodyWeight(raw)).not.toHaveProperty('weightUnit');
	});

	it('keeps the weight numeric, so the chart can scale it', () => {
		expect(typeof toBodyWeight(raw).weight).toBe('number');
	});

	it('turns absent notes into an empty string', () => {
		expect(toBodyWeight({ ...raw, notes: null as unknown as string }).notes).toBe('');
	});
});

describe('create and update bodies', () => {
	const workout = {
		objectId: 'object-1',
		timestamp: '2026-10-17T10:00:00',
		workoutDate: '2026-10-17',
		title: 'Push day',
		notes: ''
	};

	it('omits identity on create so the backend assigns it', () => {
		const body = fromWorkout(workout);

		expect(body).not.toHaveProperty('object_id');
		expect(body).not.toHaveProperty('timestamp');
		expect(body.workout_date).toBe('2026-10-17');
	});

	it('includes identity on update, which the backend checks', () => {
		const body = fromWorkout(workout, { forUpdate: true });

		expect(body.object_id).toBe('object-1');
		expect(body.timestamp).toBe('2026-10-17T10:00:00');
	});

	it('sends the weight unit as `unit`', () => {
		const body = fromSet({ setType: 'working', weight: 80, weightUnit: 'kg', reps: 5 });

		expect(body.unit).toBe('kg');
		expect(body).not.toHaveProperty('weightUnit');
	});

	it('sends a weigh-in date as `entry_date`, with no unit', () => {
		const body = fromBodyWeight({ entryDate: '2026-10-17', weight: 80.1 });

		expect(body.entry_date).toBe('2026-10-17');
		expect(body).not.toHaveProperty('unit');
		expect(body).not.toHaveProperty('object_id');
	});

	it('maps a join body', () => {
		expect(fromExerciseJoin({ workoutId: 'w', exerciseId: 'e' })).toEqual({
			workout_id: 'w',
			exercise_id: 'e'
		});
	});
});

describe('round trip', () => {
	it('a weigh-in survives mapping out and back', () => {
		const raw: RawBodyWeight = {
			...base,
			object_type: 'BodyWeight',
			entry_date: '2026-10-17',
			weight: 80.1,
			notes: 'morning'
		};

		const body = fromBodyWeight(toBodyWeight(raw), { forUpdate: true });

		expect(body.entry_date).toBe(raw.entry_date);
		expect(body.weight).toBe(raw.weight);
		expect(body.notes).toBe(raw.notes);
		expect(body.object_id).toBe(raw.object_id);
	});

	it('a set survives mapping out and back', () => {
		const raw: RawSet = {
			...base,
			object_type: 'Set',
			set_type: 'working',
			weight: 77.3,
			unit: 'lbs',
			reps: 8,
			notes: 'n',
			exercise_join_id: 'join-1'
		};

		const body = fromSet(toSet(raw), { forUpdate: true });

		expect(body.set_type).toBe(raw.set_type);
		expect(body.weight).toBe(raw.weight);
		expect(body.unit).toBe(raw.unit);
		expect(body.reps).toBe(raw.reps);
		expect(body.exercise_join_id).toBe(raw.exercise_join_id);
	});
});
