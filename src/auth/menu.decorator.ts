import { SetMetadata } from '@nestjs/common';

export const MENU_SLUG_KEY = 'menuSlug';

// Accept either a single slug or multiple slugs.
// Usage:
//  @Menu('formulario')
//  @Menu('a','b')
export const Menu = (...slugs: string[]) => {
	const payload = slugs.length === 1 ? slugs[0] : slugs;
	return SetMetadata(MENU_SLUG_KEY, payload);
};
