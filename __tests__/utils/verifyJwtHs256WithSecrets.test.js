import jwt from "jsonwebtoken";
import {
  secretsFromEnv,
  verifyJwtHs256WithSecrets,
} from "../../utils/verifyJwtHs256WithSecrets.js";

describe("verifyJwtHs256WithSecrets", () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  test("verifies when token was signed with a later secret in the list", () => {
    const secrets = ["aaa", "bbb", "ccc"];
    const token = jwt.sign({ sub: "u1", role: "user" }, "ccc", { algorithm: "HS256" });
    const payload = verifyJwtHs256WithSecrets(token, secrets);
    expect(payload.sub).toBe("u1");
  });

  test("throws JsonWebTokenError when no secret matches", () => {
    const token = jwt.sign({ sub: "u1", role: "user" }, "other", { algorithm: "HS256" });
    expect(() => verifyJwtHs256WithSecrets(token, ["a", "b"])).toThrow(jwt.JsonWebTokenError);
  });

  test("throws TokenExpiredError once a matching secret verifies an expired token", () => {
    const secrets = ["wrong", "right-one"];
    const token = jwt.sign({ sub: "u1", role: "user" }, "right-one", {
      algorithm: "HS256",
      expiresIn: "-10s",
    });
    expect(() => verifyJwtHs256WithSecrets(token, secrets)).toThrow(jwt.TokenExpiredError);
  });
});

describe("secretsFromEnv", () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  test("returns only non-empty values in order", () => {
    process.env.FOO_A = "  x  ";
    process.env.FOO_B = "";
    process.env.FOO_C = "y";
    expect(secretsFromEnv(["FOO_A", "FOO_B", "FOO_C"])).toEqual(["x", "y"]);
  });
});
