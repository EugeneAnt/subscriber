import { describe, expect, it } from 'vitest';

import { isUuid } from './ids';

describe('isUuid', () => {
	it('accepts standard UUID strings', () => {
		expect(isUuid('2de2de45-558e-4e81-843a-11c16c62772f')).toBe(true);
		expect(isUuid('018f3a2b-9c4d-7e11-8a2b-1c3d4e5f6789')).toBe(true);
	});

	it('rejects malformed UUID strings', () => {
		expect(isUuid('not-a-uuid')).toBe(false);
		expect(isUuid('2de2de45-558e-4e81-843a11c16c62772f')).toBe(false);
		expect(isUuid('2de2de45-558e-4e81-843a-11c16c62772f-extra')).toBe(false);
	});
});
