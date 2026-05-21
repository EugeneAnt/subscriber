const fallbackPath = '/';
const maxRedirectPathLength = 2048;
const sameOriginPathPattern = /^\/(?!\/)[A-Za-z0-9/._~!$&'()*+,;=:@%?#-]*$/;

export function safeRedirectPath(value: string | null | undefined) {
	if (!value || value.length > maxRedirectPathLength || !sameOriginPathPattern.test(value)) {
		return fallbackPath;
	}

	return value;
}
