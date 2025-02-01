import { useState, useEffect } from "react";
import "../styles/global.css";

interface TaxSlab {
	limit: number;
	rate: number;
}

interface TaxResult {
	slabwiseTax: Array<{
		slab: string;
		rate: string;
		amount: number;
	}>;
	baseTax: number;
	rebate87A: number;
	taxAfterRebate: number;
	surcharge: number;
	cess: number;
	totalTax: number;
	effectiveRate: number;
	taxableIncome: number;
	standardDeduction: number;
}

interface ComparisonResult {
	current: TaxResult;
	proposed: TaxResult;
}

// Current Regime Tax Slabs (No changes)
const CURRENT_TAX_SLABS: TaxSlab[] = [
	{ limit: 300000, rate: 0 },
	{ limit: 600000, rate: 0.05 },
	{ limit: 900000, rate: 0.1 },
	{ limit: 1200000, rate: 0.15 },
	{ limit: 1500000, rate: 0.2 },
	{ limit: Number.POSITIVE_INFINITY, rate: 0.3 },
];

// Proposed Regime Tax Slabs (Budget 2025)
const PROPOSED_TAX_SLABS: TaxSlab[] = [
	{ limit: 400000, rate: 0 },
	{ limit: 800000, rate: 0.05 },
	{ limit: 1200000, rate: 0.1 },
	{ limit: 1600000, rate: 0.15 },
	{ limit: 2000000, rate: 0.2 },
	{ limit: 2400000, rate: 0.25 },
	{ limit: Number.POSITIVE_INFINITY, rate: 0.3 },
];

const SURCHARGE_SLABS: TaxSlab[] = [
	{ limit: 5000000, rate: 0 },
	{ limit: 10000000, rate: 0.1 },
	{ limit: 20000000, rate: 0.15 },
	{ limit: 50000000, rate: 0.25 },
	{ limit: Number.POSITIVE_INFINITY, rate: 0.37 },
];

const CESS_RATE = 0.04;
const STANDARD_DEDUCTION = 50000;
const REBATE_87A_LIMIT_CURRENT = 700000;
const MAX_REBATE_87A_CURRENT = 25000;
const REBATE_87A_LIMIT_PROPOSED = 1200000; // Increased limit for proposed regime
const MAX_REBATE_87A_PROPOSED = 60000; // Increased rebate for proposed regime

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	}).format(amount);

export default function TaxCalculator() {
	const [income, setIncome] = useState<string>("1500000");
	const [result, setResult] = useState<ComparisonResult | null>(null);

	const calculateTax = (income: number, slabs: TaxSlab[]) => {
		const taxableIncome = Math.max(0, income - STANDARD_DEDUCTION);
		let remainingIncome = taxableIncome;
		let baseTax = 0;
		const slabwiseTax = [];
		let previousLimit = 0;

		for (const slab of slabs) {
			const slabIncome = Math.min(
				Math.max(remainingIncome, 0),
				slab.limit - previousLimit,
			);
			const taxForSlab = slabIncome * slab.rate;

			if (slabIncome > 0) {
				slabwiseTax.push({
					slab: `${formatCurrency(previousLimit)} - ${
						slab.limit === Number.POSITIVE_INFINITY
							? "∞"
							: formatCurrency(slab.limit)
					}`,
					rate: `${slab.rate * 100}%`,
					amount: taxForSlab,
				});
			}

			baseTax += taxForSlab;
			remainingIncome -= slabIncome;
			previousLimit = slab.limit;

			if (remainingIncome <= 0) break;
		}

		// Calculate rebate under 87A
		let rebate87A = 0;
		if (
			slabs === CURRENT_TAX_SLABS &&
			taxableIncome <= REBATE_87A_LIMIT_CURRENT
		) {
			rebate87A = Math.min(baseTax, MAX_REBATE_87A_CURRENT);
		} else if (
			slabs === PROPOSED_TAX_SLABS &&
			taxableIncome <= REBATE_87A_LIMIT_PROPOSED
		) {
			rebate87A = Math.min(baseTax, MAX_REBATE_87A_PROPOSED);
		}

		const taxAfterRebate = baseTax - rebate87A;

		let surchargeRate = 0;
		for (const slab of SURCHARGE_SLABS) {
			if (income <= slab.limit) {
				surchargeRate = slab.rate;
				break;
			}
		}

		const surcharge = taxAfterRebate * surchargeRate;
		const cess = (taxAfterRebate + surcharge) * CESS_RATE;

		return {
			slabwiseTax,
			baseTax,
			rebate87A,
			taxAfterRebate,
			surcharge,
			cess,
			totalTax: taxAfterRebate + surcharge + cess,
			effectiveRate: ((taxAfterRebate + surcharge + cess) / income) * 100,
			taxableIncome,
			standardDeduction: STANDARD_DEDUCTION,
		};
	};

	useEffect(() => {
		const incomeValue = Number.parseFloat(income.replace(/,/g, "")) || 0;
		setResult({
			current: calculateTax(incomeValue, CURRENT_TAX_SLABS),
			proposed: calculateTax(incomeValue, PROPOSED_TAX_SLABS),
		});
	}, [income]);

	return (
		<div className="p-2 sm:p-6">
			<div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
				{/* Income Input */}
				<div className="mb-6 sm:mb-8">
					<label
						htmlFor="income"
						className="block text-xl sm:text-2xl font-medium text-gray-800 mb-3"
					>
						Annual Income
					</label>
					<div className="relative mt-2 rounded-md shadow-sm">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<span className="text-gray-500">₹</span>
						</div>
						<input
							type="text"
							name="income"
							id="income"
							value={income}
							onChange={(e) => setIncome(e.target.value.replace(/[^0-9]/g, ""))}
							className="block w-full pl-10 pr-12 text-lg border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							placeholder="0"
						/>
					</div>
				</div>

				{result && (
					<>
						{/* Tax Comparison */}
						<div className="mb-6 sm:mb-8">
							<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
								Tax Comparison
							</h2>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
								{/* Current Regime */}
								<div>
									<h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-3 sm:mb-4 border-b border-gray-200 pb-2">
										Current Regime
									</h3>
									<div className="space-y-2 sm:space-y-3">
										{result.current.slabwiseTax.map((slab, index) => (
											<div
												key={index}
												className="p-2 sm:p-3 bg-gray-50 rounded-md"
											>
												<div className="text-xs sm:text-sm text-gray-600 mb-1">
													{slab.slab}
												</div>
												<div className="flex items-center justify-between text-xs sm:text-sm">
													<span>{slab.rate}</span>
													<span className="font-medium">
														{formatCurrency(slab.amount)}
													</span>
												</div>
											</div>
										))}
									</div>
								</div>

								{/* Proposed Regime */}
								<div>
									<h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-3 sm:mb-4 border-b border-gray-200 pb-2">
										Proposed Regime (Budget 2025)
									</h3>
									<div className="space-y-2 sm:space-y-3">
										{result.proposed.slabwiseTax.map((slab, index) => (
											<div
												key={index}
												className="p-2 sm:p-3 bg-gray-50 rounded-md"
											>
												<div className="text-xs sm:text-sm text-gray-600 mb-1">
													{slab.slab}
												</div>
												<div className="flex items-center justify-between text-xs sm:text-sm">
													<span>{slab.rate}</span>
													<span className="font-medium">
														{formatCurrency(slab.amount)}
													</span>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>

						{/* Tax Calculation Summary */}
						<div className="border-t border-gray-200 pt-4 sm:pt-6">
							<div className="grid grid-cols-3 gap-2 sm:gap-4 text-gray-800 text-sm sm:text-base">
								<div className="pb-2 border-b border-gray-200 col-span-3" />
								<div className="py-2 font-semibold" />{" "}
								{/* Empty for alignment */}
								<div className="text-center font-semibold py-2">Current</div>
								<div className="text-center font-semibold py-2">Proposed</div>
								{/* Gross Income */}
								<div className="border-b border-gray-100 py-3 grid grid-cols-3 col-span-3">
									<div className="font-semibold">Gross Income</div>
									<div className="text-right">
										{formatCurrency(Number(income))}
									</div>
									<div className="text-right">
										{formatCurrency(Number(income))}
									</div>
								</div>
								{/* Standard Deduction */}
								<div className="border-b border-gray-100 py-3 grid grid-cols-3 col-span-3">
									<div className="text-gray-600 font-semibold">
										Standard Deduction (−)
									</div>
									<div className="text-right text-gray-600">
										{formatCurrency(STANDARD_DEDUCTION)}
									</div>
									<div className="text-right text-gray-600">
										{formatCurrency(STANDARD_DEDUCTION)}
									</div>
								</div>
								{/* Taxable Income */}
								<div className="border-b border-gray-100 py-3 grid grid-cols-3 col-span-3">
									<div className="font-semibold">Taxable Income</div>
									<div className="text-right">
										{formatCurrency(result.current.taxableIncome)}
									</div>
									<div className="text-right">
										{formatCurrency(result.proposed.taxableIncome)}
									</div>
								</div>
								{/* Base Tax */}
								<div className="border-b border-gray-100 py-3 grid grid-cols-3 col-span-3">
									<div className="font-semibold">Base Tax</div>
									<div className="text-right">
										{formatCurrency(result.current.baseTax)}
									</div>
									<div className="text-right flex items-center justify-end gap-2">
										{formatCurrency(result.proposed.baseTax)}
										{result.proposed.baseTax !== result.current.baseTax && (
											<span
												className={`${
													result.proposed.baseTax < result.current.baseTax
														? "text-green-500"
														: "text-red-500"
												} text-base`}
											>
												{result.proposed.baseTax < result.current.baseTax
													? "↓"
													: "↑"}
											</span>
										)}
									</div>
								</div>
								{/* Rebate 87A */}
								<div className="border-b border-gray-100 py-3 grid grid-cols-3 col-span-3">
									<div className="text-gray-600 font-semibold">
										Rebate under 87A (−)
									</div>
									<div className="text-right text-gray-600">
										{formatCurrency(result.current.rebate87A)}
									</div>
									<div className="text-right text-gray-600">
										{formatCurrency(result.proposed.rebate87A)}
									</div>
								</div>
								{/* Tax After Rebate */}
								<div className="border-b border-gray-100 py-3 grid grid-cols-3 col-span-3">
									<div className="font-semibold">Tax After Rebate</div>
									<div className="text-right">
										{formatCurrency(result.current.taxAfterRebate)}
									</div>
									<div className="text-right flex items-center justify-end gap-2">
										{formatCurrency(result.proposed.taxAfterRebate)}
										{result.proposed.taxAfterRebate !==
											result.current.taxAfterRebate && (
											<span
												className={`${
													result.proposed.taxAfterRebate <
													result.current.taxAfterRebate
														? "text-green-500"
														: "text-red-500"
												} text-base`}
											>
												{result.proposed.taxAfterRebate <
												result.current.taxAfterRebate
													? "↓"
													: "↑"}
											</span>
										)}
									</div>
								</div>
								{/* Surcharge */}
								<div className="border-b border-gray-100 py-3 grid grid-cols-3 col-span-3">
									<div className="font-semibold">Surcharge</div>
									<div className="text-right">
										{formatCurrency(result.current.surcharge)}
									</div>
									<div className="text-right flex items-center justify-end gap-2">
										{formatCurrency(result.proposed.surcharge)}
										{result.proposed.surcharge !== result.current.surcharge && (
											<span
												className={`${
													result.proposed.surcharge < result.current.surcharge
														? "text-green-500"
														: "text-red-500"
												} text-base`}
											>
												{result.proposed.surcharge < result.current.surcharge
													? "↓"
													: "↑"}
											</span>
										)}
									</div>
								</div>
								{/* Health & Education Cess */}
								<div className="border-b border-gray-100 py-3 grid grid-cols-3 col-span-3">
									<div className="font-semibold">Health & Education Cess</div>
									<div className="text-right">
										{formatCurrency(result.current.cess)}
									</div>
									<div className="text-right flex items-center justify-end gap-2">
										{formatCurrency(result.proposed.cess)}
										{result.proposed.cess !== result.current.cess && (
											<span
												className={`${
													result.proposed.cess < result.current.cess
														? "text-green-500"
														: "text-red-500"
												} text-base`}
											>
												{result.proposed.cess < result.current.cess ? "↓" : "↑"}
											</span>
										)}
									</div>
								</div>
								{/* Total Tax */}
								<div className="border-b border-gray-100 py-3 grid grid-cols-3 col-span-3">
									<div className="font-bold">Total Tax</div>
									<div className="text-right font-bold">
										{formatCurrency(result.current.totalTax)}
									</div>
									<div className="text-right flex items-center justify-end gap-2 font-bold">
										<span className="tabular-nums">
											{formatCurrency(result.proposed.totalTax)}
										</span>
										{result.proposed.totalTax !== result.current.totalTax && (
											<span
												className={`${
													result.proposed.totalTax < result.current.totalTax
														? "text-green-600"
														: "text-red-600"
												} text-base`}
											>
												{result.proposed.totalTax < result.current.totalTax
													? "↓"
													: "↑"}
											</span>
										)}
									</div>
								</div>
								{/* Effective Tax Rate */}
								<div className="py-3 grid grid-cols-3 col-span-3">
									<div className="font-semibold">Effective Tax Rate</div>
									<div className="text-right font-medium">
										{result.current.effectiveRate.toFixed(2)}%
									</div>
									<div className="text-right flex items-center justify-end gap-2 font-medium">
										<span>{result.proposed.effectiveRate.toFixed(2)}%</span>
										{result.proposed.effectiveRate !==
											result.current.effectiveRate && (
											<span
												className={`${
													result.proposed.effectiveRate <
													result.current.effectiveRate
														? "text-green-500"
														: "text-red-500"
												} text-base`}
											>
												{result.proposed.effectiveRate <
												result.current.effectiveRate
													? "↓"
													: "↑"}
											</span>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Savings/Loss */}
						<div className="mt-6 sm:mt-8 text-center">
							<p
								className={`text-lg sm:text-xl font-medium ${
									result.proposed.totalTax < result.current.totalTax
										? "text-green-600"
										: "text-red-600"
								}`}
							>
								{result.proposed.totalTax < result.current.totalTax ? (
									<>
										You save{" "}
										{formatCurrency(
											result.current.totalTax - result.proposed.totalTax,
										)}{" "}
										in the proposed regime
									</>
								) : (
									<>
										You pay{" "}
										{formatCurrency(
											result.proposed.totalTax - result.current.totalTax,
										)}{" "}
										more in the proposed regime
									</>
								)}
							</p>
						</div>

						{/* Info Note */}
						<div className="mt-4 p-4 bg-blue-50 rounded-lg">
							<p className="text-sm text-blue-700">
								Note: This calculation assumes that surcharges and cess rates
								remain the same in the proposed regime.
							</p>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
