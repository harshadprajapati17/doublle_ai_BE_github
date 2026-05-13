"use strict";

const prisma = {
  program: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  programVersion: {
    create: jest.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" }),
  },
  adminAuditLog: {
    create: jest.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000002" }),
  },
  $transaction: jest.fn(),
};

prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

module.exports = { prisma };
