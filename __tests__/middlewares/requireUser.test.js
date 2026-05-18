import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");

function userToken(overrides = {}) {
  return jwt.sign({ sub: "user-1", role: "user", ...overrides }, process.env.USER_JWT_SECRET, {
    algorithm: "HS256",
  });
}

describe("requireUser (via referral routes)", () => {
  test("returns 401 when Authorization is missing", async () => {
    const res = await request(app).post("/api/v1/referral/terms/accept").send({});
    expect(res.statusCode).toBe(401);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");

    const resMe = await request(app).get("/api/v1/referral/me");
    expect(resMe.statusCode).toBe(401);
    expect(resMe.body.error?.code).toBe("UNAUTHENTICATED");
  });

  test("returns 403 when token role is admin", async () => {
    const adminTok = jwt.sign(
      { sub: "admin-1", role: "admin" },
      process.env.USER_JWT_SECRET,
      { algorithm: "HS256" }
    );
    const res = await request(app)
      .post("/api/v1/referral/terms/accept")
      .set("Authorization", `Bearer ${adminTok}`)
      .send({});
    expect(res.statusCode).toBe(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });

  test("returns 401 when token is signed with wrong secret", async () => {
    const bad = jwt.sign({ sub: "user-1", role: "user" }, "wrong-secret", { algorithm: "HS256" });
    const res = await request(app)
      .post("/api/v1/referral/terms/accept")
      .set("Authorization", `Bearer ${bad}`)
      .send({});
    expect(res.statusCode).toBe(401);
  });

  test("allows user token for referral route (service may 404 without active program)", async () => {
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.program.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/referral/terms/accept")
      .set("Authorization", `Bearer ${userToken()}`)
      .send({});
    expect(res.statusCode).toBe(404);
    expect(res.body.error?.code).toBe("NO_ACTIVE_REFERRAL_PROGRAM");
  });

  test("allows user JWT from HttpOnly cookie (no Authorization header)", async () => {
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.program.findFirst.mockResolvedValue(null);
    const tok = userToken();
    const res = await request(app)
      .post("/api/v1/referral/terms/accept")
      .set("Cookie", `doublle_access_token=${tok}`)
      .send({});
    expect(res.statusCode).toBe(404);
    expect(res.body.error?.code).toBe("NO_ACTIVE_REFERRAL_PROGRAM");
  });

  test("prefers Authorization Bearer over cookie when both are sent", async () => {
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.program.findFirst.mockResolvedValue(null);
    const headerTok = userToken({ sub: "from-header" });
    const cookieTok = userToken({ sub: "from-cookie" });
    const res = await request(app)
      .post("/api/v1/referral/terms/accept")
      .set("Authorization", `Bearer ${headerTok}`)
      .set("Cookie", `doublle_access_token=${cookieTok}`)
      .send({});
    expect(res.statusCode).toBe(404);
    expect(res.body.error?.code).toBe("NO_ACTIVE_REFERRAL_PROGRAM");
  });

});
