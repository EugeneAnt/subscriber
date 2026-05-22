import { redactProviderSecrets } from './shared';

export type ProviderErrorKind =
	| 'not_configured'
	| 'unauthorized'
	| 'rate_limited'
	| 'network'
	| 'bad_response'
	| 'unsupported_currency'
	| 'unsupported_filter';

export class ProviderSyncError extends Error {
	readonly kind: ProviderErrorKind;
	readonly status?: number;

	constructor(kind: ProviderErrorKind, message: string, options: { status?: number } = {}) {
		super(message);
		this.name = 'ProviderSyncError';
		this.kind = kind;
		this.status = options.status;
	}
}

export function safeProviderErrorMessage(error: unknown): string {
	if (error instanceof ProviderSyncError) {
		return error.message;
	}

	if (error instanceof Error) {
		return redactProviderSecrets(error.message);
	}

	return 'Provider sync failed.';
}
