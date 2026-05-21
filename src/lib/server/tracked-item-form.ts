import {
	setError,
	superValidate,
	type Infer,
	type InferIn,
	type SuperValidated
} from 'sveltekit-superforms/server';
import { valibot } from 'sveltekit-superforms/adapters';

import { trackedItemSchema, type TrackedItemInput } from '$lib/schemas/tracked-item';
import type { Database } from '$lib/types/database';

type TrackedItemRow = Database['public']['Tables']['tracked_items']['Row'];

export type TrackedItemForm = SuperValidated<
	Infer<typeof trackedItemSchema, 'valibot'>,
	unknown,
	InferIn<typeof trackedItemSchema, 'valibot'>
>;

export const trackedItemFormAdapter = valibot(trackedItemSchema);

export const newTrackedItemDefaults: TrackedItemInput = {
	name: '',
	type: 'subscription',
	billing_cycle: 'monthly',
	custom_cycle_days: null,
	billing_anchor_date: null,
	amount: null,
	currency: null,
	expiry_date: null,
	status: 'active',
	category: null,
	provider: null,
	notes: null
};

export function trackedItemDataFromRow(
	row: Pick<
		TrackedItemRow,
		| 'name'
		| 'type'
		| 'billing_cycle'
		| 'custom_cycle_days'
		| 'billing_anchor_date'
		| 'amount'
		| 'currency'
		| 'expiry_date'
		| 'status'
		| 'category'
		| 'provider'
		| 'notes'
	>
): TrackedItemInput {
	return {
		name: row.name,
		type: row.type,
		billing_cycle: row.billing_cycle,
		custom_cycle_days: row.custom_cycle_days,
		billing_anchor_date: row.billing_anchor_date,
		amount: row.amount,
		currency: row.currency,
		expiry_date: row.expiry_date,
		status: row.status,
		category: row.category,
		provider: row.provider,
		notes: row.notes
	};
}

export async function newTrackedItemForm(): Promise<TrackedItemForm> {
	return superValidate(newTrackedItemDefaults, trackedItemFormAdapter, { errors: false });
}

export async function trackedItemFormFromRow(row: TrackedItemRow): Promise<TrackedItemForm> {
	return superValidate(trackedItemDataFromRow(row), trackedItemFormAdapter, { errors: false });
}

export function setFormError(form: TrackedItemForm, message: string, status: 400 | 409 = 400) {
	return setError(form, message, { status });
}
