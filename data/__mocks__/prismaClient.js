import { jest } from "@jest/globals";

class Decimal {
  constructor(value) {
    this.value = String(value);
    this.n = Number(this.value);
  }
  toString() {
    return this.value;
  }
  mul(other) {
    const o = other && typeof other === "object" ? other.n : Number(other);
    return new Decimal(String(this.n * o));
  }
  div(other) {
    const o = other && typeof other === "object" ? other.n : Number(other);
    return new Decimal(String(this.n / o));
  }
}

const prisma = {
  program: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  programVersion: {
    create: jest.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" }),
  },
  adminAuditLog: {
    create: jest.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000002" }),
  },
  referralTermsAcceptance: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
  },
  referralCode: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  referral: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  fraudSignal: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  billingCustomer: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  billingPlan: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  subscriptionPayment: {
    upsert: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  commission: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
    updateMany: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  webhookEvent: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  demoUser: {
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  demoAdmin: {
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

export { prisma, Decimal };
