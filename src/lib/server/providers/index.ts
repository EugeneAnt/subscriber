import { env as privateEnv } from '$env/dynamic/private';

import type { ProviderCode } from './types';

const serverEnvCredentials: Record<ProviderCode, string> = {
	openai: 'OPENAI_ADMIN_KEY'
};

export function credentialNameForProvider(provider: ProviderCode): string {
	return serverEnvCredentials[provider];
}

export function resolveServerEnvCredential(
	provider: ProviderCode,
	credentialName: string
): string | null {
	const expectedName = credentialNameForProvider(provider);
	if (credentialName !== expectedName) {
		return null;
	}

	const value = privateEnv[expectedName]?.trim();
	return value ? value : null;
}
