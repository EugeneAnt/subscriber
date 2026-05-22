import { error, json } from '@sveltejs/kit';

import {
	getProviderConnection,
	listLatestProviderCostLines,
	normalizeBudgetInput,
	refreshProviderCost,
	updateProviderBudget
} from '$lib/server/provider-costs';
import { isUuid } from '$lib/server/ids';
import { safeProviderErrorMessage } from '$lib/server/providers/errors';

type ProviderCostEvent = {
	params: { id: string };
	request: Request;
	url: URL;
	locals: App.Locals;
};

function assertSameOrigin(request: Request, url: URL): void {
	const origin = request.headers.get('origin');
	// SvelteKit protects form actions; these JSON endpoints keep the same explicit guard
	// because they mutate provider state outside the form-action pipeline.
	if (origin && origin !== url.origin) {
		error(403, 'Cross-site provider cost requests are forbidden.');
	}
}

async function currentUserId(locals: App.Locals): Promise<string> {
	const { user } = await locals.safeGetSession();
	if (!user) error(401, 'Sign in required.');
	return user.id;
}

async function providerPayload(locals: App.Locals, connectionId: string) {
	const connection = await getProviderConnection(locals.supabase, connectionId);
	if (!connection) error(404, 'Provider connection not found.');

	const linesByConnection = await listLatestProviderCostLines(locals.supabase, [connectionId]);
	return {
		connection,
		lines: linesByConnection[connectionId] ?? []
	};
}

function validateConnectionId(connectionId: string): void {
	if (!isUuid(connectionId)) {
		error(404, 'Provider connection not found.');
	}
}

export async function refreshProviderCostResponse(event: ProviderCostEvent): Promise<Response> {
	const connectionId = event.params.id;
	validateConnectionId(connectionId);
	assertSameOrigin(event.request, event.url);

	try {
		await refreshProviderCost(
			event.locals.supabase,
			await currentUserId(event.locals),
			connectionId
		);
	} catch (providerError) {
		return json({ message: safeProviderErrorMessage(providerError) }, { status: 400 });
	}

	return json(await providerPayload(event.locals, connectionId));
}

export async function updateProviderBudgetResponse(event: ProviderCostEvent): Promise<Response> {
	const connectionId = event.params.id;
	validateConnectionId(connectionId);
	assertSameOrigin(event.request, event.url);
	await currentUserId(event.locals);

	const formData = await event.request.formData();
	try {
		await updateProviderBudget(
			event.locals.supabase,
			connectionId,
			normalizeBudgetInput({
				monthly_budget: String(formData.get('monthly_budget') ?? ''),
				warning_remaining_amount: String(formData.get('warning_remaining_amount') ?? ''),
				critical_remaining_amount: String(formData.get('critical_remaining_amount') ?? '')
			})
		);
	} catch (validationError) {
		return json(
			{
				message:
					validationError instanceof Error ? validationError.message : 'Invalid budget settings.'
			},
			{ status: 400 }
		);
	}

	return json(await providerPayload(event.locals, connectionId));
}
