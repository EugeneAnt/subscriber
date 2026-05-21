import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			expect: {
				requireAssertions: true
			},
			projects: [
				{
					extends: true,
					test: {
						name: 'unit',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						environment: 'node'
					}
				},
				{
					extends: true,
					test: {
						name: 'integration',
						include: ['tests/integration/**/*.test.ts'],
						environment: 'node',
						fileParallelism: false,
						testTimeout: 15_000
					}
				}
			]
		}
	})
);
