**DOUBLLE**

Product Requirements Document

# Referral Module

*An in-product growth loop turning every Doublle user into a distribution node — powering inbound deal flow with self-serve referrals, configurable revenue-share rewards, and operator-grade controls.*

- **Version:** 1.0 (Draft)
- **Date:** May 2026
- **Owner:** Growth + Platform
- **Audience:** Engineering, Design, Growth, Finance, Legal
- **Status:** For review
- **MVP target:** 6–8 weeks from kickoff

## 1. Executive Summary

***The Doublle Referral Module is a new in-product growth surface that lets every Doublle user — paying or not — invite others using a personal referral link and code. When a referred user signs up and converts to a paying customer, the referrer earns a recurring reward equal to a configurable percentage of the referee’s net Doublle revenue for a configurable number of months.***

***The default proposed parameters for the standard program are 5% of referee net revenue for 12 months. The MVP supports logged-in referrers with credit-only payouts and an admin console for configuration, fraud review, and reporting. Phase 2 extends the system to cash payouts (with KYC and tax handling), partner/affiliate programs, and public influencer codes.***

***The strategic objective is to establish a high-quality, low-CAC inbound channel that compounds with each new customer Doublle wins, complementing existing outbound and content motions.***

## 2. Background & Strategic Context

***Doublle’s revenue model combines subscription, usage-based, and services components, producing high-LTV accounts where small acquisition cost reductions translate into outsized payback. Today’s acquisition relies primarily on direct outbound and content marketing.***

***A referral program adds a third loop: every customer becomes a distribution node motivated by a recurring revenue share. Industry benchmarks for B2B SaaS referral programs typically show meaningfully lower CAC and higher LTV-to-CAC ratios versus paid acquisition. We assume Doublle can capture 8–15% of net new ARR through referrals within six months of launch, with strong upside from partner and influencer extensions in Phase 2.***

## 3. Goals & Non-Goals

### 3.1 Goals

- **G1.** Increase inbound qualified deal flow by at least 15% within six months of GA.
- **G2.** Lower blended customer acquisition cost by at least 10% within nine months of GA.
- **G3.** Provide a frictionless, self-serve referrer experience inside the existing Doublle dashboard.
- **G4.** Enable Growth Operations to launch and tune programs without engineering changes.
- **G5.** Protect unit economics with built-in caps, holds, clawbacks, and fraud controls.

### 3.2 Non-Goals (MVP)

- Cash payouts to referrers — deferred to Phase 2 (requires KYC, W-9/W-8, 1099-NEC).
- Public/influencer codes that do not require a Doublle account — deferred to Phase 2.
- A dedicated partner / affiliate program with custom commercial terms — deferred to Phase 2.
- Multi-level / 2nd-degree referrals — explicitly out of scope (not on roadmap).
- Mobile SDK — web-first only at MVP.
- Gamification leaderboards — deferred to Phase 3.

## 4. Success Metrics

***The program is judged primarily on attributable revenue created, with secondary KPIs across the funnel and explicit guardrails for unit economics and fraud.***

### 4.1 North Star

- **Referral-attributed New ARR per quarter.**

### 4.2 Primary KPIs

- Referrer activation rate (% of users who copy or share their link within 30 days).
- Click-to-signup conversion via referral link or code.
- Referee-to-paid conversion rate.
- Share of new ARR attributed to referrals.
- Average commission paid per active referrer.

### 4.3 Guardrails

- Self-referral and abuse rate held below 0.5% of total referrals.
- Cash-equivalent paid per dollar of referred revenue ≤ 7% (blended).
- Referral-related support tickets below 2% of program participants per month.
- Refund-triggered clawback rate transparent and stable across cohorts.

## 5. Personas & Roles

| **Role** | **Description** | **MVP / Phase** |
| --- | --- | --- |
| Referrer (Standard) | Any signed-up Doublle user (free, trial, or paid) who shares their link/code with their network. | MVP |
| Referee | A net-new user who lands on Doublle through a referral link or applies a code at signup. | MVP |
| Growth Operator (Admin) | Internal user who configures programs, reviews fraud queue, runs campaigns, monitors metrics. | MVP |
| Finance Reviewer | Internal role responsible for commission ledger reconciliation, clawbacks, and (Phase 2) payouts and tax reporting. | MVP |
| Partner / Affiliate | External entity (agency, content creator, reseller) operating under custom commercial terms with cash payouts. | Phase 2 |
| Public Code Holder | Influencer or creator who is issued a vanity code without holding a Doublle account. | Phase 2 |

## 6. Program Structure

***The system is built around a first-class `Program` entity. Each Program defines its own reward percentage, duration, cookie window, referee benefit, caps, and eligibility rules. Multiple Programs can run concurrently. The MVP ships with a single live program (Standard); the data model supports the additional program types listed below from day one to avoid Phase 2 migrations.***

### 6.1 Standard Program (MVP)

- **Eligibility (referrer):** Any signed-up Doublle user (free, trial, or paying).
- **Default rule:** 5% of referee net revenue for 12 months.
- **Referee benefit:** Free trial extension or bonus credits (Growth Ops configurable).
- **Payout:** Doublle account credit applied to next invoice.
- **Termination:** Reward stream stops if the referrer’s account is deleted, terminated for fraud, or the program is sunset.

### 6.2 Partner Program (Phase 2)

- Custom percentage and duration negotiated per partner.
- Minimum performance gates and contractual SLAs.
- Cash payouts via Stripe Connect or equivalent payout partner.
- Mandatory KYC and W-9 / W-8 collection.
- Per-partner reporting and contract artifacts.

### 6.3 Public Influencer Codes (Phase 2)

- Vanity codes issued by Admin (e.g., JANEDOE10) bound to a payout entity.
- No requirement to hold a Doublle account.
- Codes can be linked to a custom landing page with creator branding.
- Custom percentage, duration, and caps per code.

## 7. Reward Mechanics

### 7.1 Default Parameters (Standard Program)

| **Parameter** | **Default** | **Configurable by Admin** |
| --- | --- | --- |
| Referrer reward | 5% of referee Net Revenue | Yes |
| Reward duration | 12 months from referee’s first paid invoice | Yes |
| Referee benefit | Trial extension OR credit (configurable) | Yes |
| Cookie window | 30 days | Yes |
| Attribution rule | First-touch with code-at-signup override | Yes |
| Hold period | 30 days post-invoice payment | Yes |
| Payout method (MVP) | Doublle account credit only | No (MVP) |
| Per-referrer monthly cap | $5,000 | Yes |
| Referee minimum spend | $50 within first 60 days | Yes |

### 7.2 Net Revenue Definition

***Net Revenue is the basis on which commission accrues. It is computed per paid invoice and excludes amounts that should not produce commission.***

***Net Revenue = Gross invoice amount paid − refunds − chargebacks − taxes − third-party pass-throughs (e.g., payment processor fees, marketplace cuts where applicable).***

***Sales-assisted services revenue is included by default in MVP (open question — see Section 23). Multi-currency is settled at the invoice currency in MVP; FX harmonization is a Phase 3 decision.***

### 7.3 Commission Lifecycle

| **State** | **Trigger** | **Description** |
| --- | --- | --- |
| Pending | Referee invoice paid | Commission calculated and accrued; awaits hold expiry. |
| Earned | Hold period (30 days) expires without refund | Commission becomes available for redemption. |
| Paid | Credit applied to next invoice (or payout issued, Phase 2) | Commission is committed to the referrer. |
| Clawed Back | Refund or chargeback within hold or after payment | Reversal recorded; if previously paid, deducted from future earnings. |

### 7.4 Caps, Limits, and Single-Stream Rule

- **Per-referrer monthly cap.** Default $5,000; admin configurable; commission accrues but is held above the cap (rolls forward when capacity allows) or is hard-capped (admin choice per program).
- **Per-program lifetime cap.** Off by default; available for time-bound campaigns.
- **Referee minimum spend gate.** Default $50 within the first 60 days; commission is accrued from the first qualifying invoice but payable only once the gate is met.
- **Single referrer per referee.** A referee can only ever generate commission for one referrer; subsequent attribution attempts are ignored.
- **Single-level only.** No 2nd-degree or multi-level commissions in any phase of the roadmap.

## 8. User Stories

### 8.1 Referrer

- As a logged-in user, I can find my referral link and code in a clearly visible place in the dashboard.
- As a referrer, I can copy my link or code with one click and share to email, X, LinkedIn, and WhatsApp.
- As a referrer, I see how many people clicked my link, signed up, converted, and how much I have earned.
- As a referrer, I can see commission state per referee (pending, earned, paid, clawed back).
- As a referrer, my earned credit is automatically applied to my next invoice.
- As a referrer, I must accept the Program Terms once before generating my link or code.
- As a referrer, I receive transactional emails for key events (first referee, first earned, payout, clawback).

### 8.2 Referee

- As a referee landing on Doublle via a referral link, I see a clear acknowledgment such as “Invited by Sam — your trial is extended” on the signup page.
- As a referee, I can manually enter a referral code during signup if I did not click a link.
- As a referee, my benefit is applied automatically once my account is created and verified.
- As a referee, I can find the policy that explains how the referral was applied to my account.

### 8.3 Admin (Growth Ops & Finance)

- As Growth Ops, I can create, edit, and disable a Program with full parameter control (%, duration, cookie, caps, referee benefit, terms version).
- As Growth Ops, I can issue custom partner or influencer codes (Phase 2) tied to specific commercial terms.
- As Growth Ops, I can view a dashboard of program-level performance and drill into individual referrers and referees.
- As Growth Ops, I can override commission state — approve a flagged referral, reject a fraudulent one, or post a manual adjustment with audit trail.
- As Finance, I can export the commission ledger to CSV for reconciliation, and (Phase 2) reconcile cash payouts and tax forms.

## 9. End-to-End Flows

### 9.1 Flow A — Referrer generates and shares a link

- User logs into the Doublle dashboard.
- User clicks **Refer & Earn** in primary navigation.
- On first visit, a modal presents the Program Terms; the user must accept (versioned, logged) to proceed.
- The Refer & Earn page renders: personalized link (e.g., doublle.ai/?ref=sam-abcd), short code (e.g., SAM-ABCD), share buttons, and a stats card.
- User copies or shares.

### 9.2 Flow B — Referred user signs up

- Visitor clicks doublle.ai/?ref=sam-abcd.
- App drops a first-party cookie (TTL 30 days) capturing referral code, source, timestamp, IP, and user agent.
- Landing page renders normally with a small banner: “Invited by Sam — get an extended trial”.
- Visitor signs up. The referral code field is pre-filled with the cookie value. If the visitor manually enters a different code, that code wins (override rule).
- On account creation, a referral record is created linking referrer to referee with full attribution metadata.
- The referee benefit is applied automatically (e.g., trial extension or credits).
- The referrer is notified (in-app + email).

### 9.3 Flow C — Referee converts and commission is earned

- Referee pays an invoice (subscription, usage, or services).
- Stripe webhook (invoice.paid) is consumed by the referral service.
- Service computes net revenue, creates a commission record in **Pending** state, and starts the 30-day hold timer.
- After 30 days with no refund or chargeback, the record transitions to **Earned**.
- MVP: earned amount is auto-applied as account credit on the referrer’s next invoice. Phase 2: queued for cash payout per the referrer’s preference.
- Referrer dashboard updates; transactional email is sent.

### 9.4 Flow D — Admin reviews a flagged referral

- Fraud signals (IP overlap, payment-method match, velocity) flag a referral above the configured threshold.
- The case appears in the Admin review queue with attribution chain and evidence panel.
- Admin chooses Approve, Reject, or Request More Info; an audit log entry is written.
- If Rejected: commission state moves to **Clawed Back** (or never accrues if pre-pay); referrer is notified.
- If Approved: state proceeds normally.

### 9.5 Flow E — Refund-driven clawback

- Stripe webhook (invoice.refunded) is consumed.
- Service identifies all commission records sourced from the refunded invoice.
- If state is Pending or Earned: commission is reversed.
- If state is Paid: the equivalent amount is deducted from the referrer’s next earned commissions; if no future commissions exist, a negative balance is recorded and surfaced to the referrer with explanation.
- Audit log entry written; referrer notified.

## 10. Functional Requirements

***Numbered for traceability to QA and acceptance testing.***

| **#** | **Requirement** |
| --- | --- |
| FR-1 | Every signed-up user has exactly one personal referral link and one code, generated lazily on first visit to the Refer & Earn page. |
| FR-2 | Referral codes are human-friendly (e.g., 6–8 alphanumeric chars), case-insensitive, and globally unique. |
| FR-3 | Acceptance of Program Terms is a hard gate to receive a link/code; acceptance records version, timestamp, and IP. |
| FR-4 | Referral cookie has a 30-day TTL by default and is first-party, secure, HttpOnly where possible, and SameSite=Lax. |
| FR-5 | Signup flow accepts a referral code via querystring and via manual entry; code-at-signup overrides cookie attribution. |
| FR-6 | Self-referral is hard-blocked when email, payment-method fingerprint, or primary IP match the referrer. |
| FR-7 | Commission is computed per paid invoice based on the referee’s net revenue using the program’s percentage. |
| FR-8 | Commission has four states: Pending, Earned, Paid, Clawed Back; transitions are logged with timestamps. |
| FR-9 | Earned commission is auto-applied as Doublle account credit at the next invoice in MVP. |
| FR-10 | Refunds and chargebacks trigger clawbacks across all relevant commission states. |
| FR-11 | Per-referrer monthly cap is enforced; behavior at cap is admin-configurable (roll-forward or hard-stop). |
| FR-12 | Referee minimum spend gate is enforced before any commission becomes payable. |
| FR-13 | Admin can create, edit, and disable Programs with full parameter control. |
| FR-14 | Admin can search referrals by referrer, referee, code, status, and date range. |
| FR-15 | Admin can manually approve, reject, or adjust any commission with mandatory note and audit trail. |
| FR-16 | Cookie banner is updated to disclose referral cookie usage; referrer Terms include data processing notice. |
| FR-17 | Right-to-delete redacts PII fields from referral records but preserves financial linkage for accounting. |
| FR-18 | Transactional emails are queued via the existing Doublle email service with rate limits and unsubscribe support. |
| FR-19 | Commission ledger is exportable to CSV (filtered by date range, program, status) for finance reconciliation. |
| FR-20 | All admin actions and state transitions are written to an immutable audit log with actor, action, target, and payload. |

## 11. UX Surfaces

### 11.1 Referrer Dashboard (in-app)

- **Hero card** with personal link, copy button, and code; clear messaging on the program (“Earn 5% of what they pay, for 12 months”).
- **Share row**: email, X, LinkedIn, WhatsApp — each opens a pre-filled message; copying tracked as an event.
- **Stats strip**: clicks, signups, paid conversions, total earned, pending, paid this month.
- **Referees table**: each referee with status (signed up / paid / churned), commission stream state, and amount earned to date.
- **Transactions panel**: chronological commission events (pending, earned, applied, clawed back).
- **Help & Terms** link prominently visible.

### 11.2 Signup Flow

- Visible banner indicating a referral is active and the referee benefit being applied.
- Pre-filled referral code field, editable; manual entry validates against the code service in real time.
- Clear privacy notice for the cookie; consent banner adjusted to reflect referral cookie.

### 11.3 Admin Console

- **Programs:** list, create, edit, disable; full parameter control with version history.
- **Referrals inspector:** searchable table with attribution chain visualization per record.
- **Fraud review queue:** prioritized cases with evidence panel and one-click decisions.
- **Reports:** funnel, cohort, top referrers, ARR attributed, refund/clawback rates.
- **Codes (Phase 2):** issue and manage custom partner / influencer codes.

## 12. Data Model (Logical)

***All entities are versioned, soft-deletable where applicable, and append-only for state transitions. Full schemas to be finalized during design week.***

| **Entity** | **Key Fields** | **Notes** |
| --- | --- | --- |
| Program | id, name, status, reward\_pct, reward\_duration\_months, cookie\_days, referee\_benefit\_type, referee\_benefit\_value, monthly\_cap, lifetime\_cap, terms\_version, attribution\_rule | MVP ships with one active Program; data model supports many. |
| ReferralCode | id, code, owner\_user\_id (nullable for Phase 2 influencer codes), program\_id, type (user|partner|influencer), is\_active, created\_at | Globally unique; soft-delete on disable. |
| Referral | id, referrer\_user\_id, referee\_user\_id, program\_id, code\_used, attribution\_source (link|code|both), cookie\_data (json), ip, user\_agent, created\_at, status | Status: active, terminated, fraud\_rejected. |
| Commission | id, referral\_id, source\_invoice\_id, gross\_amount, net\_amount, commission\_amount, currency, state, accrued\_at, payable\_at, paid\_at, clawback\_reason | Append-only state transitions; reversed by negative-amount entries. |
| Payout (Phase 2) | id, user\_id, method, amount, currency, status, external\_ref, tax\_form\_status, country | Tied to KYC and tax form lifecycle. |
| TermsAcceptance | id, user\_id, program\_id, version, accepted\_at, ip | Hard gate for link/code generation. |
| FraudSignal | id, referral\_id, type, score, payload, created\_at | Used by review queue and auto-block rules. |
| AdminAuditLog | id, actor\_id, action, target\_type, target\_id, payload, timestamp | Immutable; surfaced in admin UI per record. |

## 13. APIs & Events

### 13.1 Public / Authenticated Endpoints

| **Method** | **Path** | **Description** |
| --- | --- | --- |
| POST | /v1/referral/links/generate | Creates (idempotent) the calling user’s link/code; requires accepted Terms. |
| GET | /v1/referral/me | Returns current user’s link, code, and aggregate stats. |
| GET | /v1/referral/me/referees | Paginated list of referees and per-referee commission state. |
| GET | /v1/referral/me/transactions | Paginated commission events (pending/earned/paid/clawed back). |
| POST | /v1/referral/code/validate | Validates a code at signup; returns referee benefit if applicable. |
| POST | /v1/referral/attribute | Internal endpoint called by the signup flow to bind a referee to a referrer. |

### 13.2 Admin Endpoints

| **Method** | **Path** | **Description** |
| --- | --- | --- |
| GET / POST / PATCH / DELETE | /v1/admin/programs | CRUD for Programs. |
| GET | /v1/admin/referrals | Search referrals by referrer, referee, code, status, date range. |
| POST | /v1/admin/referrals/:id/decision | Approve, reject, or adjust a referral; mandatory note. |
| POST | /v1/admin/codes | Issue custom partner / influencer codes (Phase 2). |
| GET | /v1/admin/reports/\* | Funnel, cohort, top referrers, ARR attributed, clawback rates. |

### 13.3 Webhooks Consumed (Stripe)

- **invoice.paid** → commission accrual.
- **invoice.refunded / charge.refunded** → clawback evaluation.
- **customer.created** → cross-check signup attribution.
- **charge.dispute.created** → hold suspension and review.

### 13.4 Internal Events Emitted

- **referral.created**, **referral.attributed**, **referral.flagged**, **referral.terminated**.
- **commission.pending.created**, **commission.earned**, **commission.paid**, **commission.clawed\_back**.
- **program.created**, **program.updated**, **program.disabled**.

## 14. Integrations

### 14.1 Doublle Auth & Dashboard

- New top-level navigation entry **Refer & Earn** behind authenticated user session.
- User identity propagated from existing SSO/session context; no new auth surface.
- Account credit applied through the existing billing UI; referrer-side credits surfaced in invoice details.

### 14.2 Stripe (Billing)

- Webhook subscriptions for invoice.paid, invoice.refunded, charge.refunded, customer.created, charge.dispute.created.
- Idempotent event processing keyed on Stripe event id.
- Credits applied via Stripe credit notes or balance transactions, depending on operating model.
- Net revenue computed as paid amount minus tax minus refunded amount minus pass-throughs for the relevant invoice.

## 15. Anti-Fraud Controls

### 15.1 Hard Blocks (MVP)

- Self-referral by exact match on email, primary payment method fingerprint, or primary IP.
- Disposable email domain blocklist applied at signup attribution.
- Repeated identical device fingerprint with rapid signups in short windows.

### 15.2 Review-Queue Triggers (MVP)

- More than five signups from the same /24 subnet in 24 hours.
- Device fingerprint, UA, and /24 IP overlap above similarity threshold without exact match.
- Single referrer onboarding more than N referees within 24 hours (configurable).
- Any commission record above $1,000 or aggregate fraud score above 0.6.

### 15.3 Deferred (Phase 2 / 3)

- Machine-learning fraud scoring trained on labeled history.
- Third-party verification (Sift, Persona) and IP intelligence (MaxMind, IPQS).
- Behavioral biometrics or device-attestation-grade anti-fraud.

## 16. Compliance & Legal

### 16.1 Tax

- **MVP:** Credit-only payouts. Doublle credits are treated as a discount/reduction of price for accounting; no 1099-NEC obligation in the United States.
- **Phase 2 (cash payouts):** Collect W-9 (US) or W-8 (non-US) before any disbursement. Issue 1099-NEC for US recipients earning at least $600 in a calendar year. Use a payout partner (e.g., Stripe Connect, Tipalti) to automate form collection and 1099 issuance.
- **Region restrictions** for cash payouts excluding sanctioned countries; partner with payout provider for screening.

### 16.2 Privacy (GDPR / CCPA)

- Cookie banner updated to disclose the referral cookie’s purpose, lifetime, and data captured.
- Program Terms acceptance surface includes a data-processing notice.
- Right-to-delete redacts PII (name, email, IP) from referral records while preserving financial linkages required for accounting integrity.
- Data minimization: cookie payload stores only opaque code and timestamp; never PII.

### 16.3 Program Terms

- Versioned terms; users must accept the current version before generating a link or code.
- Terms govern: commission calculation, hold period, clawback rights, eligibility, fraud, termination, and dispute process.
- Acceptance is logged with version, IP, and timestamp.

## 17. Admin / Operator Tools

- **Program editor** with parameterized fields and preview of impact (e.g., projected commission cost for current MRR cohort).
- **Referral inspector** with full attribution chain, fraud signals, and per-record audit log.
- **Bulk actions** for clawbacks tied to a billing event or refund batch.
- **Custom code issuer** (Phase 2) for partner and influencer codes with unique commercial terms.
- **Reporting dashboard:** funnel, cohort, top referrers, ARR attributed, refund/clawback rates, time-to-first-commission.
- **CSV / data warehouse export** of commission ledger and referral records, daily or on demand.

## 18. Notifications

### 18.1 Transactional Email (MVP)

| **Template** | **Trigger** | **Audience** |
| --- | --- | --- |
| welcome\_to\_referral | User accepts Program Terms. | Referrer |
| first\_referral\_signed\_up | First referee signs up. | Referrer |
| commission\_earned | First commission earned (clears hold). | Referrer |
| credit\_applied | Earned credit applied to invoice. | Referrer |
| clawback\_notice | Refund or chargeback triggers reversal. | Referrer |
| under\_review | Referral flagged and queued for admin review. | Referrer |
| referee\_benefit\_applied | Referee benefit (trial extension or credit) applied. | Referee |

### 18.2 In-App

- Toast confirmation on first link copy.
- Dashboard badge when a new referee signs up or commission becomes payable.
- Persistent banner explaining any negative balance after a clawback.

## 19. Reporting & Analytics

- **Funnel:** link clicks → signups → activations → paid → commissionable, broken down by program and source.
- **Cohort views** by signup month, by referrer segment, by referee plan.
- **Top referrers** by referee count, by ARR attributed, by commission paid.
- **Refund / clawback rate** trended weekly.
- **Time-to-first-commission** distribution (median and p90).
- **Daily warehouse export** of referrals, commissions, and programs to BI tooling.

## 20. Phasing

### 20.1 MVP (Weeks 1–8)

- Standard program (logged-in users only).
- Default 5% / 12 months — admin parameterizable.
- First-touch attribution with code-at-signup override; 30-day cookie.
- Referee benefit: trial extension or credits (configurable).
- Payout: Doublle account credit only.
- Anti-fraud: self-referral hard block, velocity flagging, manual review queue.
- Admin: program config, referral inspector, manual approve/reject/clawback, reporting dashboard.
- Compliance: ToS gate, cookie disclosure update.
- Notifications: 6 transactional email templates.

### 20.2 Phase 2

- Cash payouts via Stripe Connect (KYC, W-9 / W-8, 1099-NEC).
- Gift card / Tremendous integration; referrer chooses payout method at redemption.
- Partner program (custom rules per partner).
- Public/influencer codes that do not require a Doublle account.
- Multiple concurrent programs and per-program landing pages.

### 20.3 Phase 3

- ML-based fraud scoring trained on labeled history.
- Mobile SDK and deep link support.
- Leaderboard / gamification (opt-in).
- Multi-currency commission settlement and FX harmonization.

## 21. Rollout Plan & Timeline (6–8 Weeks)

| **Week** | **Workstream** | **Outcome** |
| --- | --- | --- |
| 1 | Design finalize, data model approval, ToS draft. | Greenlit specs, signed-off schemas. |
| 2 | Backend: data model, Stripe webhook scaffolding. | Data layer in staging; ingest live test events. |
| 3 | Backend: attribution service + commission state machine. | End-to-end commission flow on synthetic data. |
| 4 | Frontend: referrer dashboard + signup flow integration. | Referrer-side feature complete; QA-ready. |
| 5 | Admin tools, fraud queue, analytics dashboard. | Operator-side feature complete. |
| 6 | QA, fraud test scenarios, end-to-end tests. | All P0 bugs closed. |
| 7 | Closed beta with internal team + ~50 customers. | Beta feedback synthesized; launch decision. |
| 8 | Public launch + co-marketing. | GA, KPI dashboard live, runbooks active. |

### 21.1 Launch Readiness Gates

- KPI dashboard live and reviewed.
- Fraud playbook documented; review queue staffed.
- Support runbook and macros ready.
- Legal sign-off on Program Terms and cookie disclosure.
- On-call rotation acknowledges Stripe webhook integration.

## 22. Risks & Mitigations

| **Risk** | **Likelihood** | **Impact** | **Mitigation** |
| --- | --- | --- | --- |
| Self-referral abuse | High | Medium | Hard blocks on email/payment/IP; review queue. |
| Unit economics deteriorate | Medium | High | Caps, 30-day hold, referee minimum spend gate. |
| Refund-driven clawback churn | Medium | Medium | Auto-clawback, transparent communication, negative-balance UI. |
| Tax / compliance exposure (cash payouts) | Medium | High | Defer cash payouts to Phase 2 with payout partner. |
| Low referrer activation | Medium | Medium | Lifecycle email series, dashboard nudges, share UX. |
| Stripe webhook delays / replays | Low | Medium | Idempotent processing, reconciliation job, replay tooling. |
| Data privacy challenge | Low | High | Cookie disclosure, right-to-delete redaction, minimization. |
| Cannibalization of paid acquisition | Low | Low | Channel attribution dashboard with overlap reporting. |

## 23. Open Questions

- **Referee benefit specifics:** trial extension days vs. flat-credit dollar amount — final value to confirm with Growth.
- **Caps:** confirm the per-referrer monthly cap and any per-program lifetime cap for the standard program.
- **Multi-currency:** settle commission in invoice currency or referrer currency? FX harmonization deferred to Phase 3?
- **Services revenue:** does sales-assisted services revenue qualify in MVP, or is it limited to self-serve subscription and usage?
- **Churn visibility:** should the referrer dashboard show that a referee has churned (and stop showing further commission)? Privacy versus transparency tradeoff.
- **Program Terms drafting owner:** Legal vs. Growth lead?
- **Payout partner selection (Phase 2):** Stripe Connect vs. Tipalti vs. hybrid — to be evaluated.

## 24. Appendix

### 24.1 Glossary

| **Term** | **Definition** |
| --- | --- |
| Referrer | Doublle user who shares a link or code. |
| Referee | New user who signs up via a referral link or code. |
| Net Revenue | Gross paid amount minus refunds, chargebacks, taxes, and pass-throughs. |
| Hold Period | Days post-payment during which commission cannot be paid out (default 30). |
| Clawback | Reversal of accrued or paid commission due to refund, chargeback, or fraud. |
| Program | A configured set of rules (%, duration, caps, benefit) governing a referral cohort. |
| Attribution | The mechanism that links a referee back to a specific referrer. |

### 24.2 Reference Links

Doublle product site: https://doublle.ai/

### 24.3 Competitive References (for benchmarking, not endorsement)

- PartnerStack, Rewardful, Friendbuy, FirstPromoter — reviewed for feature parity benchmarks; final selection of build vs. buy is out of scope for this PRD.
