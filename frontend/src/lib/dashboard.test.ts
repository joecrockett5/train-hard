import { describe, expect, it } from 'vitest';
import { frequentExercises, isFirstRun, newestFirst, summariseWorkouts } from './dashboard';
import type { Exercise, WorkoutInfo } from './types';
import type { ExerciseJoin } from './mapping';

function workout(
	objectId: string,
	workoutDate: string,
	timestamp = '2026-01-01T00:00:00'
): WorkoutInfo {
	return { objectId, workoutDate, timestamp, title: objectId, notes: '' };
}

function exercise(objectId: string, name = objectId): Exercise {
	return { objectId, name, description: '', kind: 'reps' };
}

function join(
	exerciseId: string,
	workoutId: string,
	timestamp = '2026-01-01T00:00:00'
): ExerciseJoin {
	return {
		userId: 'u',
		timestamp,
		objectType: 'ExerciseJoin',
		objectId: `${exerciseId}-${workoutId}`,
		exerciseId,
		workoutId
	};
}

describe('newestFirst', () => {
	it('orders by the day logged, not by when the row was written', () => {
		// The later workout was typed in first, which is what happens when a
		// week is caught up on in one sitting.
		const ordered = newestFirst([
			workout('older', '2026-03-01', '2026-03-10T10:00:00'),
			workout('newer', '2026-03-05', '2026-03-10T09:00:00')
		]);

		expect(ordered.map((each) => each.objectId)).toEqual(['newer', 'older']);
	});

	it('breaks a same-day tie on the row, newest first', () => {
		const ordered = newestFirst([
			workout('first', '2026-03-01', '2026-03-01T09:00:00'),
			workout('second', '2026-03-01', '2026-03-01T18:00:00')
		]);

		expect(ordered.map((each) => each.objectId)).toEqual(['second', 'first']);
	});

	it('does not mutate its argument', () => {
		const workouts = [workout('a', '2026-03-01'), workout('b', '2026-03-05')];
		newestFirst(workouts);

		expect(workouts[0].objectId).toBe('a');
	});
});

describe('summariseWorkouts', () => {
	const today = '2026-03-10';

	it("picks out today's, oldest first, which is the order they were done", () => {
		const summary = summariseWorkouts(
			[
				workout('evening', today, '2026-03-10T18:00:00'),
				workout('morning', today, '2026-03-10T07:00:00'),
				workout('earlier', '2026-03-08')
			],
			today
		);

		expect(summary.today.map((each) => each.objectId)).toEqual(['morning', 'evening']);
	});

	it("leaves today's out of recent, since they have a section of their own", () => {
		const summary = summariseWorkouts(
			[workout('today', today), workout('earlier', '2026-03-08')],
			today
		);

		expect(summary.recent.map((each) => each.objectId)).toEqual(['earlier']);
	});

	it('counts the last seven days, today included', () => {
		const summary = summariseWorkouts(
			[
				workout('today', today),
				workout('six-days', '2026-03-04'),
				// Seven days back is outside the window, not on its edge.
				workout('seven-days', '2026-03-03')
			],
			today
		);

		expect(summary.thisWeek).toBe(2);
	});

	it('ignores a future-dated workout rather than counting it', () => {
		const summary = summariseWorkouts([workout('tomorrow', '2026-03-11')], today);

		expect(summary.thisWeek).toBe(0);
	});

	it('caps the recent list', () => {
		const workouts = ['01', '02', '03', '04', '05', '06'].map((day) =>
			workout(day, `2026-03-${day}`)
		);

		expect(summariseWorkouts(workouts, today, 4).recent).toHaveLength(4);
	});
});

describe('frequentExercises', () => {
	const bench = exercise('bench', 'Bench press');
	const squat = exercise('squat', 'Back squat');
	const curl = exercise('curl', 'Curl');

	it('counts the workouts an exercise appears in', () => {
		const frequent = frequentExercises(
			[bench, squat],
			[join('bench', 'w1'), join('bench', 'w2'), join('squat', 'w1')]
		);

		expect(frequent.map((each) => [each.exercise.objectId, each.sessions])).toEqual([
			['bench', 2],
			['squat', 1]
		]);
	});

	it('leaves out an exercise that has never been logged', () => {
		const frequent = frequentExercises([bench, curl], [join('bench', 'w1')]);

		expect(frequent.map((each) => each.exercise.objectId)).toEqual(['bench']);
	});

	it("dates it by the workout's own day, not by when the join was written", () => {
		// Both rows written today; the sessions were weeks apart.
		const frequent = frequentExercises(
			[bench],
			[join('bench', 'w1', '2026-03-10T12:00:00'), join('bench', 'w2', '2026-03-10T12:00:01')],
			[workout('w1', '2026-02-01'), workout('w2', '2026-02-20')]
		);

		expect(frequent[0].lastDone).toBe('2026-02-20');
	});

	it('has no date to report when the workout is not among those given', () => {
		expect(frequentExercises([bench], [join('bench', 'gone')], [])[0].lastDone).toBeUndefined();
	});

	it('breaks a tie on the most recent', () => {
		const frequent = frequentExercises(
			[bench, squat],
			[join('bench', 'w1'), join('squat', 'w2')],
			[workout('w1', '2026-02-01'), workout('w2', '2026-02-20')]
		);

		expect(frequent[0].exercise.objectId).toBe('squat');
	});

	it('caps the list', () => {
		const exercises = ['a', 'b', 'c', 'd', 'e'].map((id) => exercise(id));
		const joins = exercises.map((each) => join(each.objectId ?? '', 'w1'));

		expect(frequentExercises(exercises, joins, [], 3)).toHaveLength(3);
	});
});

describe('isFirstRun', () => {
	it('is true only with nothing at all logged', () => {
		expect(isFirstRun({ workouts: 0, exercises: 0, weighIns: 0 })).toBe(true);
	});

	it('is false once anything exists, including only a weigh-in', () => {
		expect(isFirstRun({ workouts: 0, exercises: 0, weighIns: 1 })).toBe(false);
		expect(isFirstRun({ workouts: 0, exercises: 3, weighIns: 0 })).toBe(false);
	});
});
