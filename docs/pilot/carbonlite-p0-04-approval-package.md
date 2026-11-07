# CarbonLite P0-04 Approval Package

**Status:** `READY_FOR_REVIEW` documentation package. No approvals recorded.
**Prepared:** November 6, 2026
**Decision tasks:** `COM-002`, `RET-002`
**Dependent tasks:** `COM-003`, `AI-001`, `LGL-002`, `DEL-002`, `FAC-001`, `INF-001`, `GOV-001`
**Evidence level:** `LOCAL_CODE_COMPLETE` for this documentation package; underlying deletion/hold controls have separate `LOCAL_TESTED` evidence
**Real customer data:** **NO-GO**

## 1. Executive summary

CarbonLite can now present one coherent package for founder and qualified legal/privacy review. Persistent Legal Holds, recoverable source deletion/quarantine, dry-run workspace erasure, and local recovery rehearsals exist. They are not production approved. Workspace erasure still lacks enforced signed second-person approval bound to the exact operation, and provider/independent backup recovery and expiry are not operationally verified.

The recommended first-pilot offer is four weeks, CAD 199 plus tax, one organization, up to 20 source documents, up to two users, one reviewed PDF/CSV package and revision, one feedback session, and best-effort email support. AI remains disabled for real customer data unless separately approved. This offer is a recommendation, not a decision or public commitment.

## 2. Documents prepared

- [Founder decision table](carbonlite-p0-04-founder-decisions.md)
- [Retention policy review draft](review/carbonlite-retention-policy-review-draft.md)
- [Paid pilot agreement review draft](review/carbonlite-paid-pilot-agreement-review-draft.md)
- [Privacy, Terms, and scope review notes](review/carbonlite-privacy-terms-review-notes.md)

Original policy and agreement drafts remain preserved.

## 3. Commercial offer comparison

| Term | Option A: bounded introductory pilot | Option B: current public presentation |
| --- | --- | --- |
| Duration | Four weeks | Typical 4–5 active days |
| Price | CAD 199 + applicable tax | CAD 500–1,500 |
| Included documents | 20 source documents; file/page/size limits still needed | “Limited dataset”; no numeric quota |
| Users/workspace | One organization, proposed two named users | One organization or controlled sample workspace |
| Support | Best-effort email in stated hours; one feedback session | One structured feedback session; support hours unspecified |
| Deliverables | One reviewed PDF/CSV package, one revision, gap summary | Workspace, reviewed records, PDF/CSV, gap summary |
| Refund/cancellation | Proposed full refund before substantive work if Kach cannot provision/cancels; otherwise no refund after intake/work starts, subject to law | Not stated |
| Intended segment | First invitation-only SME or consultant validation customer with a small, ready dataset | SMEs and sustainability consultants with variable complexity |
| Operational workload | Four-week access; bounded intake and one review cycle | Potentially intensive 4–5 day turnaround with variable review sessions |

**Recommendation:** Option A. It gives the first customer time to review while controlling document count and support cycles. The founder must confirm that CAD 199 covers acceptable manual workload. If not, retain the scope and approve a different price explicitly; do not mix the two offers.

## 4. Policy contradictions resolved or proposed

| Issue | Resolution in review package |
| --- | --- |
| “No persistent Legal Hold model” | Corrected: local persistent organization/document holds and guards exist; production approval and bypass control remain open. |
| Deletion described as permanent | Corrected: active deletion, quarantine, purge, provider deletion, backup expiry, and evidence expiry are separate. |
| Two-person erasure control | Corrected: manual runbook requires it, but the erasure API does not enforce a signed operation-bound second approval. |
| Backup/recovery numbers | Kept as proposals only; provider proof, restore, and expiry are open; no RTO selected. |
| Automatic scheduler assumption | Manual weekly/daily process recommended for 1–3 organizations; automation deferred until risk/volume justifies it. |
| Public/commercial offer | Conflict documented; no website change. One recommended offer is presented for decision. |
| Open-ended public retention | Replacement direction is class-based, but publication waits for approvals and control evidence. |

## 5. Agreement review — material open items

The contracting entity is correctly identified as Kach Canada Ltd. Scope, customer duties, AI disclosure, factor limitations, no-regulatory-compliance guarantee, customer data rights, retention/offboarding, Legal Holds, confidentiality, availability, and governing-law proposal are present.

The agreement is not ready for use because the following remain incomplete or unverified:

- exact corporate details and signatory authority;
- payment timing, file/page/size limits, user limits, acceptance criteria, support hours, and exact dates;
- verified subprocessors, locations, DPA terms, retention/deletion, and change notice;
- incident materiality and notice timing;
- liability cap, exclusions, carve-outs, indemnities, and non-excludable rights;
- cure and convenience periods, final refund rule, survival duration, notices, assignment, forum, and signatures;
- approved retention/deletion policy and complete export/artifact coverage; and
- factor/methodology approval and all real-data operational gates.

No legal sufficiency is asserted.

## 6. Founder decisions required

1. Approve, reject, or revise the four-week / CAD 199 / 20-document offer and manual support workload (`COM-002`).
2. Disposition all 15 rows in the founder decision table (`RET-002` and related tasks).
3. Decide whether real-data AI remains disabled or proceeds to provider/legal review (`AI-001`).
4. Assign qualified legal/privacy authority and separated operational reviewers (`OWN-001`).
5. Approve only after review: Legal Hold authority, deletion/offboarding workflow, factor boundary, incident approach, and final real-data GO/NO-GO.

Every current decision is `PENDING`; the Decision Log is unchanged.

## 7. Qualified legal/privacy questions

- Which privacy and commercial laws apply to the intended customer/data and what response/notice duties follow?
- What privacy roles and DPA terms apply, including cross-border processing and subprocessors?
- Are the proposed source, draft, log/evidence, offboarding, and backup-survival periods appropriate and defensible?
- What identity/authority evidence is proportionate for requests and erasure?
- What confidentiality, incident, liability, indemnity, termination, refund, governing-law, forum, and document-precedence terms are enforceable and suitable?
- What consent or authorization, if any, is required for AI processing and foreign access?
- What contract language accurately distinguishes active deletion, quarantine, backup expiry, Legal Hold, and retained evidence?

## 8. Evidence references

- P0-01 Legal Hold readiness: `carbonlite-p0-01-legal-hold-readiness-report.md`
- P0-02 deletion-request readiness: `carbonlite-p0-02-deletion-request-readiness-report.md`
- P0-03 organization-erasure readiness: `carbonlite-p0-03-organization-erasure-readiness-report.md`
- Existing owner checklist and manual process: `carbonlite-retention-owner-approval-checklist.md`, `carbonlite-retention-manual-runbook.md`
- Public source wording: `../../src/pages/PaidPilotScopePage.tsx`, `../../src/pages/PrivacyPolicyPage.tsx`, `../../src/pages/TermsOfUsePage.tsx`
- Local implementation sources: `../../../carbonlite-api/src/legal-holds/`, `../../../carbonlite-api/src/deletion-recovery/`, `../../../carbonlite-api/src/workspace-erasure/`, and `../../../carbonlite-api/prisma/schema.prisma`

## 9. Outstanding blockers

- `OWN-001`: qualified legal/privacy authority and all separated roles are not assigned.
- `COM-002` / `RET-002`: founder and legal/privacy decisions are not approved.
- `COM-003`: qualified counsel review and final versioned customer documents remain blocked.
- `AI-001`: provider, region, terms, minimization, retention, authorization, and fallback are not approved.
- `LGL-002` / `DEL-002`: operational authority, evidence custody, communications, and human rehearsal remain open.
- Workspace erasure has no enforced operation-bound second-person approval.
- Provider/direct-access bypass inventory, production release/deployment, paired backup operation, expiry proof, and provider restore rehearsal remain open.
- Public Privacy/Terms/Scope remain unchanged and inconsistent with the recommended offer.

## 10. Explicit approval checklist

- [ ] Founder dispositions recorded for all 15 decisions.
- [ ] Commercial scope, price, tax, payment, quota, support, acceptance, cancellation, and refund approved.
- [ ] Qualified legal/privacy review complete and evidenced.
- [ ] Verified subprocessor/DPA/cross-border schedule complete.
- [ ] Factor/methodology schedule approved.
- [ ] Named primary/backup operators and independent reviewers appointed and trained.
- [ ] Export package and customer communication templates tested synthetically.
- [ ] Workspace-erasure second-person control or approved equivalent implemented and rehearsed.
- [ ] Provider configuration, access/bypass, backup, restore, and expiry evidence complete.
- [ ] Public Privacy/Terms/Scope aligned in a separately reviewed change.
- [ ] Final customer agreement completed without blanks and signed by authorized representatives.
- [ ] `GOV-001` operational GO recorded after every P0 gate closes.

Blank boxes are intentional and are not approvals.

## 11. GO / NO-GO

| Decision | Result | Reason |
| --- | --- | --- |
| Founder and qualified legal/privacy review | **GO** | The package is coherent and preserves pending decisions and evidence limits. |
| Contract use, offer, or signature | **NO-GO** | Material commercial/legal blanks and operational dependencies remain. |
| Website publication | **NO-GO** | No approval or implementation authorization; public wording remains unchanged. |
| Production retention/deletion operations | **NO-GO** | Deployment, provider, roles, second-person erasure, backup, and evidence gates remain open. |
| Real-data paid pilot | **NO-GO** | Open P0 gates prevent customer-data authorization. |

## 12. STOP conditions

Do not accept real customer data, enable real-data AI, publish revised terms, offer or sign the agreement, execute customer deletion/erasure, alter provider retention, or claim backup/recovery capability without the exact authority and evidence required by the relevant Master TODO gate.
