# CarbonLite Privacy, Terms, and Scope — P0-04 Review Notes

**Status:** Review notes only. No public page was changed.
**Prepared:** November 6, 2026
**Sources:** `PrivacyPolicyPage.tsx`, `TermsOfUsePage.tsx`, `PaidPilotScopePage.tsx`, and the P0-04 review drafts
**Real customer data under current wording:** **NO-GO**

## Verified current public wording

- Privacy and Terms identify KACH CANADA LTD. as operator/owner, but use different named contacts for the same mailbox.
- Privacy states that OpenAI may receive document content, lists actual or contemplated providers together, and says some data may be processed outside Canada.
- Privacy uses open-ended “reasonably needed” retention and does not distinguish active systems, quarantine, confirmed records, downloaded exports, backups, Legal Holds, or deletion evidence.
- Terms disclaim permanent storage, recovery, and backup; they do not describe the proposed internal recovery design or post-restore deletion reconciliation.
- Paid Pilot Scope presents a typical 4–5 day sequence and CAD 500–1,500 range, with a limited dataset but no numeric quota.
- The scope acknowledgement covers report/reliance limitations. It is not a signed agreement, privacy consent, DPA, or authorization for real customer data.

## Required alignment before publication or contract use

| Area | Review-ready direction | Approval/evidence needed |
| --- | --- | --- |
| Operator and precedence | Use one verified legal entity style and state how signed pilot terms interact with public Privacy/Terms. | Legal review and corporate detail verification. |
| Contacts | Use approved role-based privacy/legal and support contacts; explain separate roles if different people remain. | Owner/legal decision and mailbox escalation evidence. |
| Prohibited/minimized data | Add explicit prohibited categories and require only Schedule A data. | Owner/legal approval; upload/support workflow alignment. |
| AI | State AI is enabled only when approved; require human review; disclose provider/configuration and CarbonLite/provider retention separately. | `AI-001`, DPA/region/retention evidence, customer authorization. |
| Providers/cross-border | Replace the mixed candidate list with a verified subprocessor register and change-notice process. | `INF-001`, legal/privacy, actual contracts/configuration. |
| Retention/deletion | Publish only approved class-based rules. Distinguish source, drafts, confirmed records, reports, quarantine, active systems, backups, holds, and evidence. | `RET-002`, `LGL-002`, `DEL-002`, provider/expiry evidence. |
| Security readiness | Do not imply local controls establish production or operational approval. State certifications only when evidenced. | Security/infrastructure and final `GOV-001`. |
| Commercial scope | Replace the 4–5 day / CAD 500–1,500 wording only after `COM-002`. Recommended review option is four weeks / CAD 199 / 20 documents. | Founder, finance/tax, legal, capacity evidence. |
| Supported calculations | Limit promises to approved factors/units/context; state location-based Scope 2 and “market-based not calculated.” | `FAC-001` and methodology review. |
| Acknowledgement | Rename as scope acknowledgement and state it is not contract, privacy consent, DPA, or real-data authorization. | Legal review and consent-record decision. |
| Termination/refund | Add a paid-pilot carve-out pointing to signed terms; access termination is not erasure. | Founder/legal approved rule. |
| Liability | Add a pilot carve-out; do not reuse the public clause as the negotiated allocation. | Qualified legal review. |
| Version/effective date | Issue a new version and effective date only after approval; preserve prior versions and communicate material changes. | Dated approvals and release evidence. |

## Stale or conflicting repository statements

1. The retention register `Read Me` and the retention manual runbook still state or imply that no persistent Legal Hold model exists. Persistent Legal Holds now exist locally; this task updates those factual summaries without claiming production approval.
2. The older Legal Hold policy draft says the register is not a technical lock and code has no Legal Hold state. It is superseded factually by the enforcement design and P0-01 readiness report, but remains an unapproved historical draft. Do not use it as current-state evidence.
3. The public offer (4–5 days, CAD 500–1,500) conflicts with the proposed agreement (four weeks, CAD 199). No website change is authorized by this package.
4. Prior recovery proposals conflict on four-hour versus two-business-day RTO. Neither is approved.

## Missing files

All files named in the P0-04 request were present. The requested `docs/pilot/review/` files did not exist before this task and are created as review-only copies.

## Publication gate

- **GO to owner and qualified legal/privacy review:** Yes.
- **GO to update the public website:** No.
- **GO to rely on the current pages for a real-data pilot:** No.
