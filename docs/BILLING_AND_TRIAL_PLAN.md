# Billing and Trial Plan

TenderMate AI now has a billing foundation, but live payments are not enabled yet.

## Trial Rule

Each new user receives 5 free AI tender analyses.

The defaults live on `public.app_users`:

- `free_analysis_credits = 5`
- `plan_name = 'free'`
- `subscription_status = 'trial'`

## Credit Deduction Rules

- A user can run AI analysis when `free_analysis_credits > 0` or `subscription_status = 'active'`.
- The future AI analysis endpoint should call `require_analysis_credit` before starting paid work.
- A free credit must be deducted only after analysis succeeds and the result is safely persisted.
- Failed uploads, failed PDF extraction, failed Gemini calls, and failed persistence must not deduct a credit.
- Credits must never go below 0.
- Usage events should be written to `public.user_usage_events` for successful analyses.

## Current API Behavior

- `GET /api/v1/billing/usage` returns the user's credits, plan, subscription status, and usage counts.
- `GET /api/v1/billing/plans` returns the MVP plan list.
- `POST /api/v1/billing/create-checkout` returns: `Payments are coming soon. Your free trial is active.`

No Razorpay checkout, orders, webhooks, or live payment capture are connected in this foundation step.

## MVP Plans

- Free: 5 AI analyses, ₹0
- Starter: 25 analyses/month, ₹199/month, coming soon
- Pro: 100 analyses/month, ₹499/month, coming soon
- Business: 300 analyses/month, ₹999/month, coming soon

## Future Razorpay Integration Plan

When payments are enabled later:

- Create Razorpay orders only on the backend.
- Store order/payment references in `public.payments`.
- Verify payment signatures on the backend before activating a plan.
- Keep Razorpay keys and webhook secrets in backend environment variables only.
- Update `app_users.plan_name` and `app_users.subscription_status` after verified payment success.
- Add plan-specific monthly analysis limits or credit grants before charging users.

## Future Webhook Plan

Razorpay webhooks should be handled by a backend endpoint that:

- Validates the webhook signature.
- Deduplicates events by provider event/payment IDs.
- Updates `public.payments.status`.
- Activates, renews, cancels, or marks subscriptions past due based on verified provider events.
- Records operational metadata in JSON only, without storing sensitive payment instruments.

## Admin Manual Credit Adjustment

A future admin workflow can add or remove credits manually for support cases.

Recommended rules:

- Require an admin role.
- Record every adjustment in `public.user_usage_events`.
- Store a reason in event metadata.
- Never allow adjustments that make credits negative.

## Security Notes

- Never store card numbers, CVV, UPI handles, bank account details, or payment instrument data.
- Never expose Razorpay secret keys or webhook secrets to the frontend.
- Do not put payment secrets in `NEXT_PUBLIC_*` variables.
- Treat `public.payments.metadata` as operational metadata only.
- Use backend-side signature verification before trusting any payment status.
