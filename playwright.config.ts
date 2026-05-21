import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const env = { ...process.env };
for (const file of ['.env', '.env.test']) {
	if (!existsSync(file)) {
		continue;
	}

	const fileEnv = parseEnv(readFileSync(file, 'utf8'));
	Object.assign(env, fileEnv);

	// E2E uses the local Supabase stack by default. If .env contains a hosted
	// publishable key and .env.test contains local legacy keys, keep the app and
	// the test admin client on the same local JWT secret.
	if (file === '.env.test' && fileEnv.SUPABASE_ANON_KEY && !fileEnv.SUPABASE_PUBLISHABLE_KEY) {
		env.SUPABASE_PUBLISHABLE_KEY = fileEnv.SUPABASE_ANON_KEY;
	}
}

Object.assign(process.env, env);

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
			...env,
			NODE_ENV: 'production'
		}
	}
});
