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

## Inspection request timeframe

The optional introduction form now sends timeline with the existing estimate and preferred contact method to Make. Values: researching, within-7-days, within-30-days, within-3-months. Older clients default to researching. Map this field into the CRM follow-up task or opportunity so the roofer knows the homeowner's intended timeframe. It is not a booked appointment or a response-time promise. The existing recorded:true CRM receipt requirement remains in place.

## Before roofers join

Requests are for MidSizeAI review, not an automatic match or inspection booking. The payload includes routingStatus=pending-midsize-review, rooferAssigned=false, and the consent text/version. Configure Make to create an internal MidSizeAI review task only; do not forward requests to roofers or enroll them in outreach workflows. Obtain homeowner permission before sharing their contact details. Update this wording and routing when service coverage is established.
