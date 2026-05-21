import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';

import { classifyError } from '$lib/server/errors';
import {
	setFormError,
	trackedItemFormAdapter,
	trackedItemFormFromRow
} from '$lib/server/tracked-item-form';
import { deleteItem, getById, updateItem } from '$lib/server/tracked-items';
import type { Actions, PageServerLoad } from './$types';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!uuidPattern.test(params.id)) {
		error(404, 'Not found');
	}

	try {
		const [row, { data: codes, error: codesError }] = await Promise.all([
			getById(locals.supabase, params.id),
			locals.supabase.from('currency_codes').select('code').order('code')
		]);

		if (codesError) {
			throw codesError;
		}

		return {
			row,
			currencies: (codes ?? []).map((code) => code.code),
			form: await trackedItemFormFromRow(row)
		};
	} catch (caught) {
		const kind = classifyError(caught);
		if (kind === 'not_found' || kind === 'rls') {
			error(404, 'Not found');
		}

		throw caught;
	}
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!uuidPattern.test(params.id)) {
			error(404, 'Not found');
		}

		const formData = await request.formData();
		const updatedAtToken = String(formData.get('updated_at') ?? '');
		formData.delete('updated_at');

		const form = await superValidate(formData, trackedItemFormAdapter);

		if (!form.valid) {
			return fail(400, { form });
		}

		if (!updatedAtToken) {
			return setFormError(form, 'Reload this item before saving.', 409);
		}

		try {
			const result = await updateItem(locals.supabase, params.id, form.data, updatedAtToken);

			if (result.status === 'conflict') {
				return setFormError(form, 'This item changed elsewhere. Reload and try again.', 409);
			}
		} catch (caught) {
			const kind = classifyError(caught);

			if (kind === 'constraint') {
				return setFormError(form, 'Database rejected the submitted values.');
			}

			if (kind === 'not_found' || kind === 'rls') {
				error(404, 'Not found');
			}

			throw caught;
		}

		throw redirect(303, `/items/${params.id}`);
	},

	delete: async ({ params, locals }) => {
		if (!uuidPattern.test(params.id)) {
			error(404, 'Not found');
		}

		await deleteItem(locals.supabase, params.id);
		throw redirect(303, '/');
	}
};
