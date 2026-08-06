import { Controller, Get, Query, RequirePlan } from "../../../src";

@Controller('/reports')
export class ReportController {

	// Today's totals — core POS reporting, available on every plan.
	@Get('/today')
	todaySummary() {
		return { totalSales: 1520.5, orders: 42 };
	}

	// Historical/per-staff sales breakdowns — Pro and Enterprise only.
	@RequirePlan('pro', 'enterprise')
	@Get('/sales')
	salesReport(@Query('range') range: string) {
		return {
			range: range || 'week',
			totalSales: 8420.75,
			byStaff: [
				{ name: 'Alex', sales: 3120 },
				{ name: 'Sam', sales: 5300.75 }
			]
		};
	}
}

// Class-level @RequirePlan: every route on this controller needs it, since
// managing multiple store locations is an Enterprise-only capability.
@RequirePlan('enterprise')
@Controller('/stores')
export class StoreController {

	@Get()
	listStores() {
		return [
			{ id: 'store-1', name: 'Downtown' },
			{ id: 'store-2', name: 'Uptown' }
		];
	}
}
