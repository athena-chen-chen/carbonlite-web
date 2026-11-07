# CarbonLite One-Page Independent Business Reviewer Checklist

**Use:** One checklist per deletion, organization-erasure, or Legal Hold release review. Keep the completed record in the approved restricted evidence store. Do not place customer data, personal identity evidence, legal analysis, or secrets in this repository.

Approval is a review decision only. **It does not execute deletion, release a Legal Hold, or authorize bypass of any technical safeguard.**

## Request information

| Field | Entry |
| --- | --- |
| Request ID | ______________________________ |
| Request type | [ ] Document deletion  [ ] Organization erasure  [ ] Legal Hold release evidence  [ ] Other: __________ |
| Organization reference | ______________________________ |
| Requester authority verified? | [ ] Yes  [ ] No  Evidence reference: __________________ |
| Exact scope confirmed? | [ ] Yes  [ ] No  Scope/inventory reference: ______________ |

## Before approval

- [ ] Legal Hold checked and the result is current.
- [ ] Retention, contract, and other preservation obligations checked.
- [ ] Exact deletion or release inventory provided.
- [ ] Active-data, quarantine, backup, and restore impact explained.
- [ ] Technical Operator identified: ______________________________
- [ ] Reviewer is a different person and identity from the operator.
- [ ] Environment and supported technical method identified.
- [ ] Evidence digest/reference matches the packet being reviewed.
- [ ] Approval expiry and change conditions are stated.
- [ ] No unresolved legal/privacy concern remains within this reviewer's authority.

Unresolved legal/privacy question: [ ] None  [ ] Escalated to qualified advisor under reference: __________________

## Decision

Select exactly one:

- [ ] **APPROVE** the exact packet until its stated expiry.
- [ ] **REJECT** the packet.
- [ ] **REQUEST MORE INFORMATION**; no execution is authorized.

Reason:
______________________________________________________________________________
______________________________________________________________________________

| Decision evidence | Entry |
| --- | --- |
| Reviewer identity / individual account reference | ______________________________ |
| Decision date/time and timezone | ______________________________ |
| Exact packet/evidence reference and digest | ______________________________ |
| Approval expiry or conditions | ______________________________ |
| Protected approval-record reference | ______________________________ |

Reviewer acknowledgement/signature evidence: ______________________________

## After execution

- [ ] Result matches the approved organization, scope, inventory, and method.
- [ ] Active-system and tenant-isolation checks passed.
- [ ] Failures, retries, exceptions, or unsupported targets recorded: [ ] None  [ ] Yes — reference: __________
- [ ] Backup expiry remains pending: [ ] No  [ ] Yes — owner/date/reference: __________________
- [ ] Customer notification status recorded: [ ] Sent  [ ] Pending  [ ] Not applicable  Reference: __________
- [ ] Follow-up needed: [ ] No  [ ] Yes — owner/date/action: ______________________________________

Post-execution reviewer decision: [ ] Accept evidence  [ ] Escalate  [ ] Require corrective action

## Stop conditions

Stop and do not approve when any condition applies:

- requester identity or authority is unverified;
- deletion or release scope is ambiguous;
- a Legal Hold is active, pending, unresolved, or cannot be checked;
- retention, contract, or legal/privacy clearance is missing;
- required inventory, hashes, recovery-point impact, or other evidence is missing;
- the same person would approve and execute;
- a storage location or deletion target is unsupported;
- the packet, environment, inventory, or evidence changed after review;
- the reviewer has a conflict requiring recusal; or
- the approval store or required fail-closed technical control is unavailable.

Record the STOP reason and return the packet to the Assigned Owner. Never approve because a deadline is approaching.
