import { jest } from "@jest/globals";

class Decimal {
  constructor(value) {
    this.value = String(value);
  }
  toString() {
    return this.value;
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
    create: jest.fn(),
  },
  referralCode: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

export { prisma, Decimal };
