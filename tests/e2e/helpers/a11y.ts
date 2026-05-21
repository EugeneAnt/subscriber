import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Fail only on critical axe findings; lower-impact findings are review input, not a blocker. */
export async function expectNoCriticalA11yViolations(page: Page): Promise<void> {
	const results = await new AxeBuilder({ page }).analyze();
	const critical = results.violations.filter((violation) => violation.impact === 'critical');

	expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
}
