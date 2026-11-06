/** The default page size across the app's lists. */
export const PAGE_SIZE = 8;

/** The slice of `items` that page `page` shows. */
export function pageOf<T>(items: T[], page: number, perPage: number = PAGE_SIZE): T[] {
	return items.slice((page - 1) * perPage, page * perPage);
}
