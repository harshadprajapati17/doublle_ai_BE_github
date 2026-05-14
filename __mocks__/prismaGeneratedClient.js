// Stub for the Prisma 7 generated TypeScript client used during Jest runs.
// Tests mock data/prismaClient.js directly, so the real generated client is
// never exercised; this stub just lets Jest parse the dependency graph
// without invoking its TypeScript runtime support.

export class PrismaClient {}

class Decimal {
  constructor(value) {
    this.value = String(value);
  }
  toString() {
    return this.value;
  }
}

export const Prisma = { Decimal };
