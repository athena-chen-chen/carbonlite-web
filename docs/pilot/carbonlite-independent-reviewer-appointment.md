# CarbonLite Independent Business Reviewer Appointment Record

**Organization:** Kach Canada Ltd. / CarbonLite
**Role:** Independent Business Reviewer
**Record status:** `PROPOSED_CANDIDATE — FORMAL_APPOINTMENT_PENDING`
**Prepared:** November 6, 2026
**Related Master TODO:** `OWN-001`

This record prepares a possible appointment. The founder reports that her husband has verbally agreed to serve. That report is evidence of willingness to continue the appointment process only. It is not a signature, appointment, identity verification, training completion, access authorization, operational approval, legal qualification, or authority to approve or execute a deletion.

Repository visibility has not been verified. The candidate's name, contact information, signature, identity evidence, and other personal information must therefore remain in an approved restricted record, not this repository or the public website.

## 1. Proposed appointment

| Field | Proposed or required value | Status / evidence |
| --- | --- | --- |
| Legal entity | Kach Canada Ltd. / CarbonLite | Prepared; owner confirmation pending |
| Role | Independent Business Reviewer | Prepared; appointment pending |
| Proposed candidate | Founder's husband; legal name withheld from repository | Verbal willingness reported by founder; identity verification `PENDING` |
| Relationship disclosure | Candidate is related to the founder by marriage | Disclosed; conflict review `PENDING` |
| Proposed initial term | Three months from the actual effective date | Effective date and expiry/review date `PENDING` |
| Appointing authorized officer | Restricted appointment record only | `PENDING` |
| Role scope | Sections 2–4 below | Owner confirmation `PENDING` |
| Effective date | Restricted appointment record only | `PENDING` |
| Expiry/review date | Effective date plus three months, unless earlier replacement or resignation | `PENDING` |
| Reviewer acknowledgement | Signed restricted record | `PENDING` |
| Confidentiality acknowledgement | Signed restricted record | `PENDING` |
| Conflict-of-interest disclosure | Relationship, financial interests, affected organizations, and recusal conditions | `PENDING` |
| Training completion | Checklist, quick guide, Legal Hold, deletion, erasure, evidence, and confidentiality training | `PENDING` |
| Approval/signature evidence | Individually attributable signed/e-signed restricted record | `PENDING` |
| Access provisioning reference | Individual identity and least-privilege approval-record access; no shared account | `PENDING` |
| Operational status | May act on real requests only after every appointment and control gate passes | `PENDING / NOT ACTIVE` |

No blank or `PENDING` field may be interpreted as completed.

## 2. Responsibilities

If formally appointed and activated, the Independent Business Reviewer is responsible for:

1. independently reviewing customer deletion requests;
2. reviewing proposed organization erasure against the exact dry-run inventory;
3. reviewing Legal Hold release evidence after the qualified legal/privacy authority has decided release authority and scope;
4. approving, rejecting, or requesting more information for the exact business-operation packet;
5. reviewing post-execution evidence against the approved scope; and
6. escalating unresolved privacy or legal questions to a qualified advisor.

The reviewer must use `carbonlite-independent-reviewer-checklist.md` for each decision and must not infer facts from the founder's or operator's statements when the packet lacks evidence.

## 3. Explicit exclusions

The appointment does not grant or imply:

- application development responsibilities;
- production database, Neon, Render, AWS, shell, filesystem, or provider access;
- authority to execute customer-data deletion or organization erasure;
- unilateral Legal Hold activation, release, override, or bypass;
- authority to bypass technical safeguards, retention rules, reconciliation, or STOP conditions;
- authority to make legal/privacy determinations reserved for a qualified reviewer;
- legal-counsel, privacy-officer, or regulatory-certification status;
- authority to approve the reviewer's own actions or an operation performed using their credentials; or
- authority to represent that CarbonLite is production-ready or may accept real customer data.

Approval is a bounded business-control decision. It does not execute deletion.

## 4. Independence boundary and conflicts

Because the proposed candidate is the founder's husband, the role may provide internal separation of duties only when the reviewer uses a separate attributable identity, reviews independently, has no operator credentials, can reject without retaliation, and is not the requester or technical operator. The relationship means this appointment must not be described as external independence or presumed to satisfy any legal, contractual, auditor, insurer, customer, or regulatory independence standard.

Before activation, the appointing officer and reviewer must record in restricted storage:

- the family relationship and any financial or operational interests;
- whether the reviewer can make an independent decision for the requested scope;
- required recusals and the replacement reviewer process;
- organizations or matters for which the reviewer must not act; and
- the qualified advisor to whom legal/privacy questions are escalated.

Any unresolved conflict, unavailable replacement, or required external-independence standard is a STOP condition.

## 5. Minimum viable manual approval process

This process is proposed and not yet approved or operational:

1. The Assigned Owner creates an opaque Request ID in the minimized register and stores identity, authority, legal, and customer material only in the approved restricted case store.
2. The Technical Operator produces a read-only packet binding the Request ID, exact organization reference, scope, current Legal Hold result, retention/exception result, dry-run deletion inventory, environment, method, affected recovery points, and evidence digest.
3. A qualified legal/privacy authority resolves any Legal Hold, statutory, contractual, or privacy question. The Independent Business Reviewer cannot replace that decision.
4. The reviewer signs in with an individually attributable identity, compares the packet with the checklist, and records `APPROVE`, `REJECT`, or `REQUEST MORE INFORMATION`, reason, UTC timestamp, and exact evidence reference.
5. The approval is stored separately from operator execution in an approved restricted store with access control, version history or append-only evidence, retention, and administrator/audit protections. The operator must not be able to alter or delete the authoritative approval unilaterally.
6. The approval binds the exact Request ID, organization, scope, inventory digest, environment, method, expiry, and reviewer identity. Any change invalidates it and requires a new review.
7. Only after a valid approval and every other gate passes may a different Technical Operator execute the supported workflow. The operator records the approval reference but cannot create or edit it.
8. The reviewer compares post-execution evidence to the approved packet and records exceptions, backup-expiry status, customer-notification status, and required follow-up.
9. Historical approvals remain attributable after replacement. They are not rewritten to the new reviewer's identity.
10. At resignation, expiry, replacement, or revocation, reviewer access is disabled promptly, active sessions and signing authority are revoked, pending cases are reassigned, and the revocation evidence is retained.

An Excel cell, ordinary email, chat message, or verbal statement alone is not cryptographic approval and does not prevent bypass. Until an approved protected evidence store and fail-closed production control exist, the manual process may be used only for synthetic training and review.

## 6. Technical enforcement gap

The current workspace-erasure workflow checks platform-admin authority and exact organization confirmations, but it does not require an independently signed second-person approval token bound to the operation. Direct provider/operator bypass controls are also unverified.

Until an approved technical enforcement or equivalent fail-closed production control exists and is independently tested, real-data organization erasure remains **NO-GO**.

## 7. Activation checklist

The role remains `NOT ACTIVE` until all items are complete with restricted evidence:

- [ ] Legal name and identity verified.
- [ ] Authorized officer signs the exact appointment and scope.
- [ ] Effective and expiry/review dates recorded.
- [ ] Reviewer acknowledgement signed.
- [ ] Confidentiality acknowledgement signed.
- [ ] Relationship and conflict disclosure reviewed; recusal/replacement rules accepted.
- [ ] Training and synthetic tabletop completed and evidenced.
- [ ] Individual identity provisioned with MFA and only approved evidence-record access.
- [ ] No production database, provider, customer-data, or operator credential granted.
- [ ] Protected approval/evidence store approved and tested.
- [ ] Technical operator and reviewer are distinct people and identities.
- [ ] Legal/privacy escalation authority is named separately.
- [ ] Workspace-erasure two-person enforcement or approved equivalent fail-closed control is implemented and tested before real-data erasure.
- [ ] Access-revocation and replacement procedure tested.
- [ ] Owner records role status as active in restricted evidence and updates `OWN-001` without exposing personal data.

## 8. Appointment and acknowledgement fields — restricted record only

Do not complete these fields in a public or visibility-unknown repository.

| Required restricted field | Value |
| --- | --- |
| Reviewer's legal name | `PENDING — RESTRICTED` |
| Appointing authorized officer | `PENDING — RESTRICTED` |
| Effective date/time and timezone | `PENDING — RESTRICTED` |
| Expiry/review date | `PENDING — RESTRICTED` |
| Reviewer acknowledgement/signature reference | `PENDING — RESTRICTED` |
| Confidentiality acknowledgement reference | `PENDING — RESTRICTED` |
| Conflict disclosure and disposition reference | `PENDING — RESTRICTED` |
| Training evidence reference | `PENDING — RESTRICTED` |
| Access provisioning reference | `PENDING — RESTRICTED` |
| Appointing officer signature evidence | `PENDING — RESTRICTED` |
