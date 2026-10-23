# PAYW-01B receipt review UI

Checkout for courses and membership shares `BankTransferCheckout` and the receipt panel. QR/account/amount/reference come from the Backend response. There is no bank receiver in production UI source. The test fixtures use an unmistakable synthetic account only. GDS is visibly disabled because the repository has TMI points, not a money ledger/balance/transaction system. PayOS/VNPay choices remain server-controlled.

Receipt upload accepts PNG/JPEG up to5MiB locally; Backend remains authoritative for real decode, ownership,3-per-order cap and replay controls. Upload retry retains its operation key. Owned receipt/access reads recover state after reload; membership has an existing-order continuation link and stable retry key. OCR results render beneath the private image. Full access and revoked-source notices remain distinct from bank-paid state. API images require bearer/no-store and object URLs are revoked on cleanup; the existing service worker excludes `/api/` and protected requests from cache.

Admin entry: `/admin/dashboard/receipt-review` (`Kiểm tra QR`). Queue/detail show buyer, course/membership, amount, order, private image, OCR/warnings, bank matching facts and immutable access history. Financial approval uses a separately recorded bank-source evidence object with exact fields and digest; buyer OCR is never promoted into that object. Missing bank evidence disables the button. A reason, explicit bank-source attestation and confirmation dialog precede an approval request; the server still requires two distinct currently authorized Admins. Revoke/restore require reason, confirmation, expected generation and stable retry key. Existing support route remains available to the buyer.

Stitch references: project18116946755394055085, checkout d4b5c0fc57c24ea9aa6e17379968d3ea, Admin2d7844baf0b949a79fee93d0f561b95b, mobilefed6efa819294a7199a333e88adcc5f8. Generated24h auto-revoke and unimplemented bank integrations were rejected; source uses actual state and existing EduAI tokens/components.

## Safe website review without money

Run from this Frontend repository:

```powershell
npm ci
npx playwright install chromium
npx playwright test --config playwright.payw.config.ts
```

This dedicated config starts only the local Frontend on127.0.0.1:5174. It does not load dotenv, start a Backend, or contact a bank; all API records/images/actions are explicitly synthetic browser fixtures.22 Chromium scenarios cover course/membership/Admin at320,375,390,412,768,1024,1440, private blob images, OCR placement, no horizontal overflow,44px buttons and confirmation controls. Screenshots: `test-results/payw-01b/` (ignored locally; CI artifact). Browser console/network guard remains strict.

To inspect the website interactively, step through a single scenario:

```powershell
npx playwright test --config playwright.payw.config.ts --headed --debug --grep "Admin confirms exact revocation"
```

Use the local browser opened by the test/inspector. It demonstrates UI behavior only; it does not establish database entitlement or genuine bank payment. Separate Backend actual PostgreSQL races and OCR smoke evidence establish their respective boundaries. For an integrated Backend environment, use only an isolated synthetic database, apply reviewed additive migrations there, set the documented default-OFF test flags and explicit synthetic buyer/seller/Admin allowlists, and use synthetic images matching that test order. Never transfer to the displayed synthetic account. The public production website is not updated by these source changes.

Observed local validation for E:98files/389unit checks PASS before wallet-specific additions, build PASS,22new browser checks PASS and28existing PayOS/VNPay/bank/membership browser regressions PASS. PR/main CI evidence is tracked in Workspace rather than inferred from this document. Production remains NO-GO; no new deployment, real wallet, bank feed or one-operator approval is enabled.