import type { RequestHandler } from './$types';

import { refreshProviderCostResponse } from '../payload';

export const POST: RequestHandler = refreshProviderCostResponse;
