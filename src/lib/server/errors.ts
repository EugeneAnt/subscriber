import { isAuthError } from '@supabase/supabase-js';

export type ErrorClass =
	| 'validation'
	| 'constraint'
	| 'auth'
	| 'rls'
	| 'not_found'
	| 'conflict'
	| 'network'
	| 'unexpected';

const constraintCodes = new Set(['23502', '23503', '23505', '23514']);
const networkCodes = new Set(['PGRST000', 'PGRST001', 'PGRST002', 'PGRST003']);
const networkRuntimeCodes = new Set(['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT']);
const networkMessagePattern =
	/(?:fetch failed|failed to fetch|network|econnrefused|econnreset|enotfound|etimedout)/i;

function getStringProperty(error: Record<string, unknown>, key: string): string | undefined {
	const value = error[key];
	return typeof value === 'string' ? value : undefined;
}

function isRecord(error: unknown): error is Record<string, unknown> {
	return typeof error === 'object' && error !== null;
}

function isNetworkCode(code: string): boolean {
	return networkCodes.has(code) || code.startsWith('08') || networkRuntimeCodes.has(code);
}

function isNetworkRuntimeError(error: Record<string, unknown>): boolean {
	const name = getStringProperty(error, 'name');
	const message = getStringProperty(error, 'message');

	return name === 'TypeError' && message !== undefined && networkMessagePattern.test(message);
}

export function classifyError(error: unknown): ErrorClass {
	if (isAuthError(error)) {
		return 'auth';
	}

	if (!isRecord(error)) {
		return 'unexpected';
	}

	const code = getStringProperty(error, 'code');

	if (code !== undefined) {
		if (constraintCodes.has(code)) {
			return 'constraint';
		}

		if (isNetworkCode(code)) {
			return 'network';
		}

		if (code === '42501') {
			return 'rls';
		}

		if (code === 'PGRST116') {
			return 'not_found';
		}
	}

	return isNetworkRuntimeError(error) ? 'network' : 'unexpected';
}
