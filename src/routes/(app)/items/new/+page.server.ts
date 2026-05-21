import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';

import { classifyError } from '$lib/server/errors';
import {
	newTrackedItemForm,
	setFormError,
	trackedItemFormAdapter
} from '$lib/server/tracked-item-form';
import { createItem } from '$lib/server/tracked-items';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [{ data: codes, error }, form] = await Promise.all([
		locals.supabase.from('currency_codes').select('code').order('code'),
		newTrackedItemForm()
	]);

	if (error) {
		throw error;
	}

	return {
		currencies: (codes ?? []).map((code) => code.code),
		form
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, trackedItemFormAdapter);

		if (!form.valid) {
			return fail(400, { form });
		}

		const { user } = await locals.safeGetSession();

		if (!user) {
			throw redirect(303, '/login');
		}

		let id: string;
		try {
			id = await createItem(locals.supabase, { ...form.data, user_id: user.id });
		} catch (error) {
			if (classifyError(error) === 'constraint') {
				return setFormError(form, 'Database rejected the submitted values.');
			}

			throw error;
		}

		throw redirect(303, `/items/${id}`);
	}
};
