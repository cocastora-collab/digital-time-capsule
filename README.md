# The Digital Time Capsule

A Next.js application for a ₹10 message-submission project opening on 1 January 2030.

## Important launch blocker

This repository is a deployable application foundation, **not a live production service**. The payment verification route intentionally refuses to accept a paid submission until durable pending-submission storage is implemented. Do not switch Razorpay to live mode until that is completed, tested, and reviewed. This prevents taking money while silently losing the message.

## Stack

- Next.js App Router
- Supabase Postgres
- Razorpay Checkout (INR 10)
- Vercel hosting

## Setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Create a Razorpay account and use test keys first.
4. Copy `.env.example` to `.env.local` and fill in the values.
5. Install and run:

   ```bash
   npm install
   npm run dev
   ```

6. Deploy the repository to Vercel and add the same environment variables in Project Settings.

## Required production work before taking real payments

Pending submissions are stored in Supabase before checkout. After checkout, the server verifies the Razorpay signature and confirms the payment is captured for exactly ₹10 before inserting the message. The insert is idempotent by unique payment ID. Before public launch, add rate limiting, CAPTCHA, a moderation/admin interface, legally reviewed privacy policy and terms, support contact, backups, and a Razorpay webhook for asynchronous payment reconciliation. Test the entire flow with Razorpay test credentials first.

## Security notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET` to the browser.
- Keep RLS enabled and do not create public policies for message contents.
- The public counter must reveal aggregate counts only.
- Do not promise permanent preservation without funded hosting, backups, and a succession plan through 2030.
- Get legal/accounting advice on Indian consumer, privacy, tax, payment-provider, and advertising requirements before public launch.
