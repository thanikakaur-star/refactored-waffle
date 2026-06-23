# Panjabi Colouring Book — Automated Fulfillment Platform

## Architecture

Express/TypeScript server handling Stripe webhooks to automate:
- **Digital fulfillment**: secure time-expiring download links + email delivery via Resend
- **Physical fulfillment**: print-on-demand via Lulu Express API (zero inventory)
- **Lead generation**: embeddable AI chatbot widget (Anthropic Claude) that captures emails into ConvertKit

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server with hot reload (tsx watch)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled server
npm run bundle:widget # Bundle chatbot widget for embedding (tsup → public/)
npm test             # Run tests (vitest)
npm run typecheck    # Type-check without emitting
```

## Environment Variables

Copy `.env.example` to `.env` and fill in all values. Required:

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint signing secret |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender email address |
| `LULU_API_KEY` / `LULU_API_SECRET` | Lulu Express print-on-demand credentials |
| `ANTHROPIC_API_KEY` | Claude API for chatbot |
| `CONVERTKIT_API_KEY` / `CONVERTKIT_FORM_ID` | Email marketing lead capture |
| `DOWNLOAD_BASE_URL` | Base URL for secure download links |
| `DOWNLOAD_LINK_EXPIRY_HOURS` | Link expiry (default 48) |

## Project Layout

- `src/server.ts` — Express entry point
- `src/webhooks/stripe.ts` — Stripe webhook routing (digital vs physical)
- `src/fulfillment/digital.ts` — Download link generation + email
- `src/fulfillment/physical.ts` — Lulu Express print API integration
- `src/email/sender.ts` — Resend email wrapper
- `src/chatbot/` — AI cultural guide widget + lead capture
- `assets/pdf/` — Master coloring book PDF + free sample pack
- `assets/email-templates/` — HTML email templates
- `tests/` — Mock Stripe payloads + integration tests

## Conventions

- All env access goes through `src/utils/config.ts`
- Use structured JSON logging via `src/utils/logger.ts`
- Stripe webhook payloads must be verified with signature before processing
- Never store customer PII in logs
