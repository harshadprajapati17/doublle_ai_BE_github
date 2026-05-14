import swaggerJsdoc from "swagger-jsdoc";

const port = Number(process.env.PORT) || 3000;
const clean = (v) => (v || "").trim().replace(/\/$/, "");
const serverUrl =
  clean(process.env.PUBLIC_API_URL) ||
  clean(process.env.RENDER_EXTERNAL_URL) ||
  `http://localhost:${port}`;

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Doublle AI Backend API",
      version: "1.0.0",
      description:
        "Auto-generated OpenAPI docs for the Doublle AI backend (health, payment, admin programs, referral).",
    },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            'Admin HS256 JWT. Payload must include role="admin" and sub=adminId. Signed with ADMIN_JWT_SECRET, ADMIN_JWT_SECRET_2, or ADMIN_JWT_SECRET_3 (when set).',
        },
        userBearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            'User HS256 JWT. Payload must include role="user" and sub=userId. Signed with USER_JWT_SECRET, USER_JWT_SECRET_2, or USER_JWT_SECRET_3 (when set).',
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string" },
                details: {},
              },
            },
          },
        },
        ProgramStatus: {
          type: "string",
          enum: ["DRAFT", "ACTIVE", "DISABLED"],
        },
        AttributionRule: {
          type: "string",
          enum: ["FIRST_TOUCH", "FIRST_TOUCH_CODE_OVERRIDE", "LAST_TOUCH"],
        },
        CapBehavior: {
          type: "string",
          enum: ["ROLL_FORWARD", "HARD_STOP"],
        },
        Program: {
          type: "object",
          example: {
            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            name: "Standard Referral",
            status: "DRAFT",
            referrerRewardPct: 5,
            referrerRewardDurationMonths: 12,
            cookieDays: 30,
            attributionRule: "FIRST_TOUCH_CODE_OVERRIDE",
            refereeBenefitValue: null,
            holdPeriodDays: 30,
            monthlyCap: null,
            lifetimeCap: null,
            capBehavior: "ROLL_FORWARD",
            currency: "USD",
            termsVersion: "v1",
            currentVersion: 1,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            disabledAt: null,
          },
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            status: { $ref: "#/components/schemas/ProgramStatus" },
            referrerRewardPct: { type: "number", example: 5 },
            referrerRewardDurationMonths: { type: "integer", example: 12 },
            cookieDays: { type: "integer", example: 30 },
            attributionRule: { $ref: "#/components/schemas/AttributionRule" },
            refereeBenefitValue: { type: "number", nullable: true },
            holdPeriodDays: { type: "integer", example: 30 },
            monthlyCap: { type: "number", nullable: true },
            lifetimeCap: { type: "number", nullable: true },
            capBehavior: { $ref: "#/components/schemas/CapBehavior" },
            currency: { type: "string", example: "USD" },
            termsVersion: { type: "string", example: "v1" },
            currentVersion: { type: "integer", example: 1 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            disabledAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        ProgramCreate: {
          type: "object",
          example: {
            name: "Standard Referral",
            referrerRewardPct: 5,
            referrerRewardDurationMonths: 12,
            cookieDays: 30,
            attributionRule: "FIRST_TOUCH_CODE_OVERRIDE",
            refereeBenefitValue: null,
            holdPeriodDays: 30,
            capBehavior: "ROLL_FORWARD",
            termsVersion: "v1",
            currency: "USD",
          },
          required: [
            "name",
            "referrerRewardPct",
            "referrerRewardDurationMonths",
            "cookieDays",
            "attributionRule",
            "refereeBenefitValue",
            "holdPeriodDays",
            "capBehavior",
            "termsVersion",
          ],
          properties: {
            name: { type: "string", maxLength: 255 },
            referrerRewardPct: { type: "number", minimum: 0, maximum: 100 },
            referrerRewardDurationMonths: {
              type: "integer",
              minimum: 1,
              maximum: 240,
            },
            cookieDays: { type: "integer", minimum: 1, maximum: 365 },
            attributionRule: { $ref: "#/components/schemas/AttributionRule" },
            refereeBenefitValue: { type: "number", minimum: 0, nullable: true },
            holdPeriodDays: { type: "integer", minimum: 0, maximum: 365 },
            monthlyCap: { type: "number", minimum: 0, nullable: true },
            lifetimeCap: { type: "number", minimum: 0, nullable: true },
            capBehavior: { $ref: "#/components/schemas/CapBehavior" },
            currency: {
              type: "string",
              minLength: 3,
              maxLength: 3,
              default: "USD",
            },
            termsVersion: { type: "string", maxLength: 64 },
          },
        },
        ProgramUpdate: {
          type: "object",
          description: "All fields optional, but at least one must be present.",
          example: {
            name: "Standard Referral Pro",
            referrerRewardPct: 7.5,
            termsVersion: "v2",
          },
          properties: {
            name: { type: "string", maxLength: 255 },
            referrerRewardPct: { type: "number", minimum: 0, maximum: 100 },
            referrerRewardDurationMonths: {
              type: "integer",
              minimum: 1,
              maximum: 240,
            },
            cookieDays: { type: "integer", minimum: 1, maximum: 365 },
            attributionRule: { $ref: "#/components/schemas/AttributionRule" },
            refereeBenefitValue: { type: "number", minimum: 0, nullable: true },
            holdPeriodDays: { type: "integer", minimum: 0, maximum: 365 },
            monthlyCap: { type: "number", minimum: 0, nullable: true },
            lifetimeCap: { type: "number", minimum: 0, nullable: true },
            capBehavior: { $ref: "#/components/schemas/CapBehavior" },
            currency: { type: "string", minLength: 3, maxLength: 3 },
            termsVersion: { type: "string", maxLength: 64 },
          },
        },
        Plan: {
          type: "object",
          required: [
            "commitment",
            "mode",
            "requests",
            "monthly",
            "months",
            "total",
          ],
          properties: {
            commitment: { type: "string", example: "annual" },
            mode: { type: "string", example: "subscription" },
            requests: { type: "integer", minimum: 1, example: 1000 },
            monthly: { type: "integer", minimum: 1, example: 200 },
            months: { type: "integer", minimum: 1, example: 12 },
            total: { type: "integer", minimum: 1, example: 2400 },
          },
        },
        CreateOrderRequest: {
          type: "object",
          example: {
            amount: 1999,
            currency: "USD",
            plan: {
              commitment: "annual",
              mode: "subscription",
              requests: 10000,
              monthly: 199,
              months: 12,
              total: 1999,
            },
          },
          required: ["amount", "currency"],
          properties: {
            amount: {
              type: "integer",
              minimum: 1,
              description:
                "Positive integer in major currency units (e.g., 2000 for $2000).",
            },
            currency: {
              type: "string",
              minLength: 3,
              maxLength: 3,
              example: "USD",
            },
            plan: { $ref: "#/components/schemas/Plan" },
          },
        },
        VerifyPaymentRequest: {
          type: "object",
          example: {
            razorpay_order_id: "order_NnNnNnNnNnNnNn",
            razorpay_payment_id: "pay_NnNnNnNnNnNnNn",
            razorpay_signature:
              "9b1e8c6e4f2a3d5e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
          },
          required: [
            "razorpay_order_id",
            "razorpay_payment_id",
            "razorpay_signature",
          ],
          properties: {
            razorpay_order_id: { type: "string" },
            razorpay_payment_id: { type: "string" },
            razorpay_signature: { type: "string" },
          },
        },
      },
    },
    tags: [
      { name: "Health", description: "Service health checks" },
      { name: "Payment", description: "Razorpay order + verification" },
      { name: "Admin · Programs", description: "Referral program admin APIs" },
      {
        name: "Referral",
        description:
          "Referral program: public signup-time code validation; authenticated link, terms, and stats",
      },
    ],
  },
  apis: ["./routes/**/*.js"],
};

const spec = swaggerJsdoc(options);

/**
 * Swagger UI often ignores `example` that lives only on a *referenced* component
 * schema when `requestBody.content.*.schema` is a bare `$ref`. Copy schema-level
 * `example` onto the media type so "Example Value" / Try it out match config.
 */
function attachRequestBodyExamplesFromComponentSchemas(openapi) {
  const schemas = openapi.components?.schemas;
  if (!schemas || !openapi.paths) return;

  for (const pathItem of Object.values(openapi.paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const op of Object.values(pathItem)) {
      if (!op || typeof op !== "object" || !op.requestBody?.content) continue;
      for (const media of Object.values(op.requestBody.content)) {
        if (!media || typeof media !== "object") continue;
        const ref = media.schema?.$ref;
        if (typeof ref !== "string" || !ref.startsWith("#/components/schemas/"))
          continue;
        const name = ref.slice("#/components/schemas/".length);
        const component = schemas[name];
        const ex = component?.example;
        if (
          ex !== undefined &&
          media.example === undefined &&
          media.examples === undefined
        ) {
          media.example = structuredClone(ex);
        }
      }
    }
  }
}

attachRequestBodyExamplesFromComponentSchemas(spec);

export const swaggerSpec = spec;
