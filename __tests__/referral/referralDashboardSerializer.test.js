import {
  commissionStatusToDto,
  deriveCommissionDisplayStatus,
  totalsFromStateGroups,
} from "../../services/referralDashboardSerializer.js";

describe("deriveCommissionDisplayStatus", () => {
  const emptyTotals = totalsFromStateGroups([]);

  test("returns NOT_ACCRUED when referee has not paid and no commission rows", () => {
    expect(deriveCommissionDisplayStatus(emptyTotals, [], false)).toBe("NOT_ACCRUED");
    expect(commissionStatusToDto(emptyTotals, [], false).status).toBe("NOT_ACCRUED");
  });

  test("returns PENDING when commission rows exist in hold", () => {
    const commissions = [
      {
        state: "PENDING",
        accruedAt: "2026-05-18T06:00:00.000Z",
      },
    ];
    expect(deriveCommissionDisplayStatus(emptyTotals, commissions, true)).toBe("PENDING");
  });
});
