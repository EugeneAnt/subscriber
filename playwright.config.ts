import { defineConfig, devices } from '@playwright/test';

for (const file of ['.env', '.env.test']) {
	try {
		process.loadEnvFile(file);
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code !== 'ENOENT') {
			throw error;
		}
	}
}

const port = process.env.E2E_PORT ?? '5173';
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	reporter: 'list',
	use: {
		baseURL,
		trace: 'on-first-retry'
	},
	projects: [
		{ name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'webkit-mobile', use: { ...devices['iPhone 14 Pro'] } }
	],
	webServer: {
		command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			...process.env,
			NODE_ENV: 'production'
		}
	}
});
