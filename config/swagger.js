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
        "Auto-generated OpenAPI docs for the Doublle AI backend (health, payment, billing subscriptions, admin programs, referral, optional DB-backed demo user auth).",
    },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            'Admin HS256 JWT. Payload must include role="admin" and sub=adminId. Signed with ADMIN_JWT_SECRET, ADMIN_JWT_SECRET_2, or ADMIN_JWT_SECRET_3 (when set). Alternatively, the same JWT may be sent in the HttpOnly `doublle_admin_access_token` cookie (name overridable with ADMIN_ACCESS_TOKEN_COOKIE_NAME) after POST /api/v1/auth/demo-admin.',
        },
        userBearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            'User HS256 JWT. Payload must include role="user" and sub=userId. Signed with USER_JWT_SECRET, USER_JWT_SECRET_2, or USER_JWT_SECRET_3 (when set). Alternatively, the same JWT may be sent in the HttpOnly `doublle_access_token` cookie (name overridable with USER_ACCESS_TOKEN_COOKIE_NAME) after POST /api/v1/auth/demo.',
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
        DemoAuthLoginRequest: {
          type: "object",
          additionalProperties: false,
          required: ["email"],
          properties: {
            email: { type: "string", format: "email", example: "testuser1@test.com" },
            password: {
              type: "string",
              description:
                "Required when `DEMO_AUTH_PASSWORD` is set; ignored otherwise.",
            },
          },
          example: { email: "testuser1@test.com" },
        },
        DemoAuthLoginSuccess: {
          type: "object",
          required: ["data"],
          properties: {
            data: {
              type: "object",
              required: ["accessToken", "tokenType", "expiresInSeconds"],
              properties: {
                accessToken: { type: "string" },
                tokenType: { type: "string", example: "Bearer" },
                expiresInSeconds: { type: "integer", example: 86400 },
              },
            },
          },
        },
        DemoUser: {
          type: "object",
          required: ["id", "sub", "email", "isEnabled", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            sub: { type: "string", example: "demo-user-1" },
            email: { type: "string", format: "email", example: "testuser1@test.com" },
            name: { type: "string", nullable: true },
            isEnabled: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        DemoUserCreate: {
          type: "object",
          additionalProperties: false,
          required: ["sub", "email"],
          example: { sub: "demo-user-1", email: "testuser1@test.com", name: "Demo One" },
          properties: {
            sub: { type: "string", minLength: 1, maxLength: 256 },
            email: { type: "string", format: "email" },
            name: { type: "string", minLength: 1, maxLength: 200 },
          },
        },
        DemoUserPatch: {
          type: "object",
          additionalProperties: false,
          example: { isEnabled: false },
          properties: {
            sub: { type: "string", minLength: 1, maxLength: 256 },
            email: { type: "string", format: "email" },
            name: { type: "string", nullable: true, minLength: 1, maxLength: 200 },
            isEnabled: { type: "boolean" },
          },
        },
        DemoAdmin: {
          type: "object",
          required: ["id", "sub", "email", "isEnabled", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            sub: { type: "string", example: "demo-admin-1" },
            email: { type: "string", format: "email", example: "admin1@test.com" },
            name: { type: "string", nullable: true },
            isEnabled: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        DemoAdminCreate: {
          type: "object",
          additionalProperties: false,
          required: ["sub", "email"],
          example: { sub: "demo-admin-1", email: "admin1@test.com", name: "Demo Admin" },
          properties: {
            sub: { type: "string", minLength: 1, maxLength: 256 },
            email: { type: "string", format: "email" },
            name: { type: "string", minLength: 1, maxLength: 200 },
          },
        },
        DemoAdminPatch: {
          type: "object",
          additionalProperties: false,
          example: { isEnabled: false },
          properties: {
            sub: { type: "string", minLength: 1, maxLength: 256 },
            email: { type: "string", format: "email" },
            name: { type: "string", nullable: true, minLength: 1, maxLength: 200 },
            isEnabled: { type: "boolean" },
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
        RefereeBenefitType: {
          type: "string",
          enum: ["NONE", "TRIAL_EXTENSION", "CREDIT"],
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
            refereeBenefitType: "NONE",
            refereeBenefitValue: null,
            refereeBenefitTrialDays: null,
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
            refereeBenefitType: { $ref: "#/components/schemas/RefereeBenefitType" },
            refereeBenefitValue: { type: "number", nullable: true },
            refereeBenefitTrialDays: { type: "integer", nullable: true },
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
        ReferralProgram: {
          type: "object",
          description:
            "Active referral program as returned to authenticated users (no admin-only fields).",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            status: { $ref: "#/components/schemas/ProgramStatus" },
            referrerRewardPct: { type: "string", example: "5" },
            referrerRewardDurationMonths: { type: "integer", example: 12 },
            cookieDays: { type: "integer", example: 30 },
            attributionRule: { $ref: "#/components/schemas/AttributionRule" },
            refereeBenefitType: { $ref: "#/components/schemas/RefereeBenefitType" },
            refereeBenefitValue: { type: "string", nullable: true },
            refereeBenefitTrialDays: { type: "integer", nullable: true },
            holdPeriodDays: { type: "integer", example: 30 },
            monthlyCap: { type: "string", nullable: true },
            lifetimeCap: { type: "string", nullable: true },
            capBehavior: { $ref: "#/components/schemas/CapBehavior" },
            currency: { type: "string", example: "USD" },
            termsVersion: { type: "string", example: "v1" },
            currentVersion: { type: "integer", example: 1 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            disabledAt: { type: "string", format: "date-time", nullable: true },
            refereeBenefit: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["NONE", "TRIAL_EXTENSION", "CREDIT"],
                },
                value: { type: "string", nullable: true },
                currency: { type: "string" },
                trialDays: { type: "integer", nullable: true },
              },
            },
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
            refereeBenefitType: "NONE",
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
            refereeBenefitType: {
              $ref: "#/components/schemas/RefereeBenefitType",
              default: "NONE",
            },
            refereeBenefitValue: { type: "number", minimum: 0, nullable: true },
            refereeBenefitTrialDays: {
              type: "integer",
              minimum: 1,
              maximum: 365,
              nullable: true,
            },
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
            refereeBenefitType: { $ref: "#/components/schemas/RefereeBenefitType" },
            refereeBenefitValue: { type: "number", minimum: 0, nullable: true },
            refereeBenefitTrialDays: {
              type: "integer",
              minimum: 1,
              maximum: 365,
              nullable: true,
            },
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
        BillingFrequency: {
          type: "string",
          enum: ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"],
        },
        CreateSubscriptionRequest: {
          type: "object",
          additionalProperties: false,
          required: ["amount", "currency", "frequency"],
          example: {
            amount: 2500,
            currency: "INR",
            frequency: "QUARTERLY",
          },
          properties: {
            amount: {
              type: "integer",
              minimum: 1,
              description: "Billing amount per cycle in major currency units (e.g. 2500 INR).",
            },
            currency: { type: "string", minLength: 3, maxLength: 3, example: "INR" },
            frequency: { $ref: "#/components/schemas/BillingFrequency" },
          },
        },
        CancelSubscriptionRequest: {
          type: "object",
          additionalProperties: false,
          required: ["cancelAtCycleEnd"],
          example: { cancelAtCycleEnd: false },
          properties: {
            cancelAtCycleEnd: {
              type: "boolean",
              description: "If true, cancel at end of current billing period.",
            },
          },
        },
      },
    },
    tags: [
      { name: "Health", description: "Service health checks" },
      { name: "Payment", description: "Razorpay order + verification" },
      {
        name: "Billing",
        description:
          "Custom recurring subscriptions (per-user amount and frequency) and Razorpay webhooks",
      },
      { name: "Admin · Programs", description: "Referral program admin APIs" },
      {
        name: "Admin · Demo users",
        description:
          "CRUD for `demo_users` rows used by passwordless demo login when `DEMO_AUTH_ENABLED` is on.",
      },
      {
        name: "Admin · Demo admins",
        description:
          "CRUD for `demo_admins` rows used by passwordless demo admin login when `DEMO_AUTH_ENABLED` is on.",
      },
      {
        name: "Referral",
        description:
          "Referral program: signup-time code validation and attribution; authenticated link, terms, and stats",
      },
      {
        name: "Auth · Demo",
        description:
          "Optional passwordless JWT mint for demo users (`demo_users`) and demo admins (`demo_admins`) when `DEMO_AUTH_ENABLED` is on. Not mounted in production unless `DEMO_AUTH_ALLOW_PRODUCTION=true`.",
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
