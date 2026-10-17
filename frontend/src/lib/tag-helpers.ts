import { env } from '$env/dynamic/private';
import { type Tag } from '$lib/types';

export const getTags = async (profileId: string, objectId: string) => {
	console.log(`Getting tags for ${objectId}`);
	if (!profileId) {
		console.log('No profile selected');
		return;
	}
	const response = await fetch(`${env.HARD_API}/tags?target=${objectId}`, {
		headers: { 'X-Profile-Id': profileId }
	});
	const tags = await response.json();
	const outputTags: Tag[] = [];
	for (const tag of tags) {
		outputTags.push({
			name: tag.name,
			colorHex: tag.color_hex
		});
	}
	return outputTags;
};

export const postTags = async (profileId: string, targetId: string, tags: Tag[]) => {
	console.log(`Posting tags for ${targetId}`);
	if (!profileId) {
		console.log('No profile selected');
		return;
	}
	const failedTags: Tag[] = [];
	for (const tag of tags) {
		console.log(`Tagging ${targetId} with ${tag.name}`);
		const res = await fetch(`${env.HARD_API}/tag-joins`, {
			method: 'POST',
			headers: { 'X-Profile-Id': profileId },
			body: JSON.stringify({
				timestamp: new Date().toISOString(),
				target_id: targetId,
				tag_id: tag.objectId
			})
		});
		if (!res.ok) {
			failedTags.push(tag);
		}
	}
	if (failedTags.length > 0) {
		console.log(`Failed to tag ${targetId} with ${failedTags.map((tag) => tag.name).join(', ')}`);
		return failedTags;
	}
};

export const putTags = async (profileId: string, tags: Tag[]) => {
	console.log(`Updating tags`);
	if (!profileId) {
		console.log('No profile selected');
		return;
	}
	const failedTags: Tag[] = [];
	for (const tag of tags) {
		console.log(`Updating ${tag.name} instance (${tag.objectId})`);
		const res = await fetch(`${env.HARD_API}/tag-joins/${tag.objectId}`, {
			method: 'PUT',
			headers: { 'X-Profile-Id': profileId },
			body: JSON.stringify(tag)
		});
		if (!res.ok) {
			failedTags.push(tag);
		}
	}
	if (failedTags.length > 0) {
		console.log(
			`Failed to update tag(s) with id(s): ${failedTags.map((tag) => tag.objectId).join(', ')}`
		);
		return failedTags;
	}
};

export const deleteTags = async (profileId: string, tags: Tag[]) => {
	console.log(`Deleting tags`);
	if (!profileId) {
		console.log('No profile selected');
		return;
	}
	const failedTags: Tag[] = [];
	for (const tag of tags) {
		console.log(`Deleting ${tag.name} instance (${tag.objectId})`);
		const res = await fetch(`${env.HARD_API}/tag-joins/${tag.objectId}`, {
			method: 'DELETE',
			headers: { 'X-Profile-Id': profileId }
		});
		if (!res.ok) {
			failedTags.push(tag);
		}
	}
	if (failedTags.length > 0) {
		console.log(
			`Failed to delete tag(s) with id(s): ${failedTags.map((tag) => tag.objectId).join(', ')}`
		);
		return failedTags;
	}
};
