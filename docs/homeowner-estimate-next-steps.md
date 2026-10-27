# Homeowner estimate and next steps

The result now explains what the low/high endpoints mean, adds condition-specific factors to confirm, and gives a practical next-step checklist before the optional MidSizeAI contact form.

## Homeowner value

- The estimate, explanation, checklist and contractor conversation brief appear without a name, email, phone or consent submission.
- A reported active leak changes the first action: seek professional assessment directly rather than wait for a MidSizeAI introduction.
- Tile reuse, solar and known decking generate relevant scope questions. The tool does not diagnose repair versus replacement or change the existing pricing model.
- The brief uses the selected ZIP, home size, estimated roof area, system, age and project conditions. Contact fields are excluded. It prompts the homeowner to add their concern, timeframe and contact details only when they choose to send it.
- Copy and text-download actions are local. They do not call the lead API or send messages. Analytics events contain a tool/action name, not the brief or project values.
- Printable report includes a separate text rendering of the full brief so textarea scrolling does not clip it in print.

## Optional review request

Existing consent, contact preference and no-assigned-roofer wording remain. Client success now requires the API's `{ok:true}` receipt, then shows pending MidSizeAI review, no roofer assigned, homeowner permission before contact sharing and no guaranteed coverage/response time. Backend Make/GHL routing is unchanged. There are no new customer communications or contractor assignments.

## Sources

[FTC home-improvement consumer guidance](https://consumer.ftc.gov/articles/how-avoid-home-improvement-scam) supports checking applicable licensing/insurance and obtaining comparable written scopes. No state-specific legal claim, deposit limit or current price is introduced.

## Verification

- All 8 automated tests pass, including existing mocked API/security tests and new condition-specific report/brief tests.
- JavaScript syntax checks and diff checks pass; this is a static site with no production build command.
- Browser: ZIP 85392, 2,000 sq ft, one story, simple tile reuse and removal retained the existing $19,000–$32,500 range. New report and brief appeared with contact fields empty.
- Browser copy action confirmed the brief was copied; active-leak selection changed the first action and brief conditions.
- No live CRM request, contractor message, email or SMS was sent. The new post-submit receipt was not tested against a live account.
- Prepared for review; not published in this implementation batch.
