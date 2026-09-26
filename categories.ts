/**
 * Category dropdown dedupe helpers (v1.1.5).
 *
 * CEO report: the category filter dropdown showed "All categories" (the first
 * option, value "" = no filter, initially selected) AND the real category
 * "All" (Miniflux's built-in category holding every feed), which looked like a
 * duplicate. Requirement: keep ONE "All" option (the leading one, no filter)
 * and hide the real built-in "All" category from the dropdown.
 */

/** Label of the leading category filter option. value "" = no filter. */
export const ALL_CATEGORY_OPTION_LABEL = "All";

/** Title of Miniflux's built-in "All" category (typically id 2). */
export const MINIFLUX_ALL_CATEGORY_TITLE = "All";

export interface CategoryLike {
  id: number;
  title: string;
}

/**
 * Categories to show under the leading "All" option, in dropdown order.
 * Miniflux's built-in "All" category is excluded so the dropdown does not show
 * two "All" entries. Matching is exact (case-sensitive, whitespace-trimmed):
 * a user category literally named "all" survives.
 */
export function filterDropdownCategories(categories: CategoryLike[]): CategoryLike[] {
  return categories.filter(
    (category) => category.title.trim() !== MINIFLUX_ALL_CATEGORY_TITLE,
  );
}