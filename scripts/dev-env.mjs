import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

const environments = {
	local: {
		file: '.env',
		label: 'local Supabase'
	},
	remote: {
		file: '.env.production.local',
		label: 'remote Supabase'
	},
	hosted: {
		file: '.env.production.local',
		label: 'remote Supabase'
	},
	production: {
		file: '.env.production.local',
		label: 'remote Supabase'
	}
};

const [target = 'local', ...viteArgs] = process.argv.slice(2);
const config = environments[target];

if (!config) {
	console.error('Usage: npm run dev:env -- <local|remote> [vite args]');
	process.exit(1);
}

if (!existsSync(config.file)) {
	console.error(`Missing ${config.file}.`);
	process.exit(1);
}

const fileEnv = parseEnv(readFileSync(config.file, 'utf8'));
const env = { ...process.env, ...fileEnv };

if (!env.SUPABASE_URL) {
	console.error(`${config.file} is missing SUPABASE_URL.`);
	process.exit(1);
}

if (!env.SUPABASE_ANON_KEY) {
	console.error(`${config.file} is missing SUPABASE_ANON_KEY.`);
	process.exit(1);
}

console.log(`Starting dev server with ${config.file} (${config.label})`);
console.log(`SUPABASE_URL=${env.SUPABASE_URL}`);

const vite = spawn(
	process.execPath,
	[resolve('node_modules/vite/bin/vite.js'), 'dev', ...viteArgs],
	{
		env,
		stdio: 'inherit'
	}
);

vite.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}

	process.exit(code ?? 0);
});
