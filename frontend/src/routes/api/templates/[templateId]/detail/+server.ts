import { type RequestHandler } from '@sveltejs/kit';
import { handle, backendJson } from '$lib/server/backend';
import {
	toExercise,
	toExerciseInTemplate,
	toTemplate,
	type RawExercise,
	type RawExerciseInTemplate,
	type RawTemplate
} from '$lib/mapping';

type RawTemplateDetail = {
	template: RawTemplate;
	exercises: RawExerciseInTemplate[];
	all_exercises: RawExercise[];
};

/**
 * The whole template page in one request, as /workouts/{id}/detail is.
 *
 * `allExercises` backs the picker, which offers every exercise the profile
 * has rather than the ones already listed.
 */
export const GET: RequestHandler = ({ params, locals }) =>
	handle(locals, async (profileId) => {
		const raw = await backendJson<RawTemplateDetail>(
			profileId,
			`/templates/${params.templateId}/detail`
		);

		return {
			template: toTemplate(raw.template),
			exercises: raw.exercises.map(toExerciseInTemplate),
			allExercises: raw.all_exercises.map(toExercise)
		};
	});
