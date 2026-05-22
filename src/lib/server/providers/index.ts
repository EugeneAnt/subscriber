import { env as privateEnv } from '$env/dynamic/private';

import { anthropicProvider } from './anthropic';
import { openaiProvider } from './openai';
import type { ProviderCode, ProviderDefinition } from './types';
import { xaiProvider } from './xai';

type EnvLike = Record<string, string | undefined>;

export const providerDefinitions = {
	openai: openaiProvider,
	anthropic: anthropicProvider,
	xai: xaiProvider
} satisfies Record<ProviderCode, ProviderDefinition>;

export function providerCodes(): ProviderCode[] {
	return Object.keys(providerDefinitions) as ProviderCode[];
}

export function isProviderCode(value: string): value is ProviderCode {
	return value in providerDefinitions;
}

export function providerDefinition(provider: ProviderCode): ProviderDefinition {
	return providerDefinitions[provider];
}

export function credentialNameForProvider(provider: ProviderCode): string {
	return providerDefinition(provider).credentialName;
}

export function resolveServerEnvCredential(
	provider: ProviderCode,
	credentialName: string,
	env: EnvLike = privateEnv
): string | null {
	const expectedName = credentialNameForProvider(provider);
	if (credentialName !== expectedName) {
		return null;
	}

	const value = env[expectedName]?.trim();
	return value ? value : null;
}

export function configuredProviderDefinitions(env: EnvLike = privateEnv): ProviderDefinition[] {
	return providerCodes().flatMap((provider) => {
		const definition = providerDefinition(provider);
		const value = env[definition.credentialName]?.trim();
		return value ? [definition] : [];
	});
}
