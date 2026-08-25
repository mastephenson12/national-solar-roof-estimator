# National Solar & Roof Estimator ☀️🏠

This is a smart website helper that helps homeowners across the United States figure out:
1. How much solar energy their roof can catch.
2. If their roof needs to be repaired or refreshed before the solar panels go on.

## Secure lead handoff

The inspection request is proxied through `/api/leads`, so the Make webhook is not shipped to browsers.
Create the webhook with Make's native API-key protection. Set `MAKE_WEBHOOK_URL` and
`MAKE_WEBHOOK_API_KEY` in Vercel, then redeploy. The server sends the key in the `x-make-apikey` header.

## How it works:
- Step 1: Takes the homeowner's address.
- Step 2: Shows them a satellite map of their house.
- Step 3: Checks what their roof is made of (Tile, Shingle, or Foam).
