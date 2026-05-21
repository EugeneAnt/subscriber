import * as v from 'valibot';

import type { Database } from '$lib/types/database';

type BillingCycle = Database['public']['Enums']['billing_cycle'];
type TrackedItemStatus = Database['public']['Enums']['tracked_item_status'];
type TrackedItemType = Database['public']['Enums']['tracked_item_type'];

const billingCycles = [
	'weekly',
	'monthly',
	'quarterly',
	'yearly',
	'custom_days'
] as const satisfies readonly BillingCycle[];
const statuses = ['active', 'paused', 'cancelled'] as const satisfies readonly TrackedItemStatus[];
const trackedItemTypes = [
	'subscription',
	'expiry',
	'hybrid'
] as const satisfies readonly TrackedItemType[];

const maxAmount = 9_999_999_999.99;
const minDate = '1900-01-01';
const maxDate = '2100-12-31';
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const billingCycleSchema = v.picklist(billingCycles);
const statusSchema = v.picklist(statuses);
const trackedItemTypeSchema = v.picklist(trackedItemTypes);

function isValidDate(value: string): boolean {
	const match = datePattern.exec(value);

	if (!match) {
		return false;
	}

	const [, yearInput, monthInput, dayInput] = match;
	const year = Number(yearInput);
	const month = Number(monthInput);
	const day = Number(dayInput);
	const date = new Date(Date.UTC(year, month - 1, day));

	return (
		value >= minDate &&
		value <= maxDate &&
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

function toNullableNumber(value: unknown): number | null {
	if (typeof value === 'number') {
		return value;
	}

	const trimmed = typeof value === 'string' ? value.trim() : '';
	return trimmed === '' ? null : Number(trimmed);
}

const dateString = v.pipe(
	v.string(),
	v.trim(),
	v.regex(datePattern, 'Use YYYY-MM-DD.'),
	v.check(isValidDate, `Date must be between ${minDate} and ${maxDate}.`)
);

const nullableDate = v.pipe(
	v.nullish(v.string(), ''),
	v.trim(),
	v.union([v.literal(''), dateString]),
	v.transform((value) => (value === '' ? null : value))
);

const nullableText = (maxLength: number) =>
	v.pipe(
		v.nullish(v.string(), ''),
		v.trim(),
		v.maxLength(maxLength),
		// Nullable DB text columns should receive null instead of a blank string.
		v.transform((value) => (value === '' ? null : value))
	);

const amount = v.pipe(
	v.any(),
	v.transform(toNullableNumber),
	v.nullable(v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(maxAmount)))
);

const customCycleDays = v.pipe(
	v.any(),
	v.transform(toNullableNumber),
	v.nullable(v.pipe(v.number(), v.finite(), v.integer(), v.minValue(1), v.maxValue(3650)))
);

const currency = v.pipe(
	v.nullish(v.string(), ''),
	v.trim(),
	v.toUpperCase(),
	v.union([v.literal(''), v.pipe(v.string(), v.regex(/^[A-Z]{3}$/))]),
	v.transform((value) => (value === '' ? null : value))
);

const nullableBillingCycle = v.pipe(
	v.nullish(v.union([billingCycleSchema, v.literal('')]), ''),
	v.transform((value) => (value === '' ? null : value))
);

export const trackedItemSchema = v.pipe(
	v.object({
		name: v.pipe(v.string(), v.trim(), v.nonEmpty('Name is required.'), v.maxLength(200)),
		type: trackedItemTypeSchema,
		billing_cycle: nullableBillingCycle,
		custom_cycle_days: customCycleDays,
		billing_anchor_date: nullableDate,
		amount,
		currency,
		expiry_date: nullableDate,
		status: v.optional(statusSchema, 'active'),
		category: nullableText(200),
		provider: nullableText(200),
		notes: nullableText(5000)
	}),
	v.forward(
		v.check(
			(item) => item.type === 'expiry' || item.billing_cycle !== null,
			'Billing cycle is required for subscriptions and hybrid items.'
		),
		['billing_cycle']
	),
	v.forward(
		v.check(
			(item) => item.billing_cycle === null || item.billing_anchor_date !== null,
			'Billing anchor date is required when billing cycle is set.'
		),
		['billing_anchor_date']
	),
	v.forward(
		v.check(
			(item) => item.type === 'subscription' || item.expiry_date !== null,
			'Expiry date is required for expiry and hybrid items.'
		),
		['expiry_date']
	),
	v.forward(
		v.check(
			(item) => item.billing_cycle !== 'custom_days' || item.custom_cycle_days !== null,
			'Custom cycle days is required when billing cycle is custom days.'
		),
		['custom_cycle_days']
	),
	v.forward(
		v.check(
			(item) => (item.amount === null) === (item.currency === null),
			'Amount and currency must be set together.'
		),
		['amount']
	)
);

export type TrackedItemInput = v.InferOutput<typeof trackedItemSchema>;
