# CarbonLite Legal Hold Owner Approval Record

**Status:** Prepared for owner and legal/privacy review; no approval recorded

**Checklist version:** v0.3-p0-01-readiness

**Prepared:** November 6, 2026

**Policy version to approve:** ____________________

**Effective date:** ____________________

**Next review date:** ____________________
**Decision scope:** Manual legal-hold process and minimum technical enforcement for controlled paid pilot

No signature, approval, assignment, or evidence completion is implied. Fill only after review with synthetic evidence and approved restricted references. The proposed assignments below are recommendations for review, not appointments.

**Independent Business Reviewer candidate status:** The founder reports that her husband has verbally agreed to be considered. The repository records no name or contact information. Formal appointment, identity verification, conflict disposition, training, individual access, and operational approval are `PENDING`; the role is not active. See `carbonlite-independent-reviewer-appointment.md`.

## 1. Proposed RACI and separation of duties

R = Responsible, A = Accountable/approving authority, C = Consulted, I = Informed.

| Activity | Business Policy Owner | Legal/Privacy Reviewer | Hold Request Intake Owner | Technical Operator | Independent Release Reviewer | Backup Operator |
| --- | --- | --- | --- | --- | --- | --- |
| Policy and operating-scope decision | A | C | I | C | I | C |
| Request intake and requester verification | I | C | R | I | I | I |
| Legal basis, scope, and release authority | I | A | C | I | C | C |
| Emergency provisional freeze | A | C | R | R | I | I |
| Technical activation and verification | I | C | C | R | C | I |
| Periodic hold review | A | A | R | C | C | C |
| Release request and retention recalculation | A | A | R | R | C | C |
| Independent release review | I | C | I | C | A/R | C |
| Technical release | I | C | I | R | A | I |
| Backup and restore reconciliation | I | C | I | C | A | R |
| Final real-data operational decision | A | A | I | C | C | C |

### Proposed assignments for owner review

| Role | Proposed assignment | Required authority and boundary | Backup/delegation and separation rule |
| --- | --- | --- | --- |
| Business Policy Owner | Founder | May approve business policy, resources, provisional freeze, and final business GO/NO-GO. Cannot substitute for legal/privacy review or independently approve their own release action. | Delegation must be dated, scoped, and recorded. A delegate cannot collapse required independent review. |
| Legal/Privacy Reviewer | Independent qualified reviewer — name not assigned | Must have documented authority to decide legal basis, scope, review cadence, communications, and release. | Backup must be comparably qualified and independently authorized. Founder/Technical Operator cannot self-designate as legal approver. |
| Hold Request Intake Owner | To be assigned | May receive requests, verify identity/authority through an approved channel, create minimized case records, and initiate provisional freeze escalation. Cannot approve legal basis or release. | Named backup must use the same minimized intake and escalation process. |
| Technical Operator | Founder | May execute approved activation, release-request, and technical-release steps using least-privilege access. Cannot claim another person's approval or perform every release role. | Backup operator must have separately issued access. Technical release must remain separate from requester and release reviewer. |
| Independent Release Reviewer | Proposed Independent Business Reviewer candidate — founder's husband; name withheld from repository; verbal willingness reported only | If formally appointed, may review the business/operational evidence packet after a separate qualified legal/privacy authority decides release basis and scope. Must verify exact case/scope, recalculated deadlines, deletion plan, recovery points, and evidence. | Formal appointment, identity, conflict review, training, access, and operational approval are `PENDING`. Cannot be the release requester, legal/privacy authority, or technical release operator. This is internal separation, not presumed external/legal independence. If the role cannot be validly staffed, the workflow is `BLOCKED`. |
| Backup Operator | To be assigned | May inventory paired recovery points and perform approved isolated reconciliation. Cannot authorize hold release or customer access alone. | Must have a named backup; restore release requires infrastructure and independent review. |

**Staffing gate:** [ ] Independent Legal/Privacy Reviewer assigned  [ ] Independent Release Reviewer assigned  [ ] Backup coverage assigned. Until all applicable boxes are completed with evidence, operational use is **BLOCKED**.

## 2. Assigned authorities

| Responsibility | Name / role | Authority reference | Date assigned | Backup |
| --- | --- | --- | --- | --- |
| Policy owner | ____________________ | ____________________ | __________ | ____________________ |
| Legal/privacy hold approver | ____________________ | ____________________ | __________ | ____________________ |
| Hold release approver | ____________________ | ____________________ | __________ | ____________________ |
| Emergency provisional-freeze authority | ____________________ | ____________________ | __________ | ____________________ |
| Operations owner | ____________________ | ____________________ | __________ | ____________________ |
| Backup operator | ____________________ | ____________________ | __________ | ____________________ |
| Independent reviewer | ____________________ | ____________________ | __________ | ____________________ |
| Infrastructure owner | ____________________ | ____________________ | __________ | ____________________ |
| Security/incident lead | ____________________ | ____________________ | __________ | ____________________ |

The release approver and release operator must be different people. Delegation and absence coverage require documented authority.

## 3. Policy and legal/privacy review

- [ ] Draft policy reviewed for legitimate trigger, narrow scope, confidentiality, communications, review cadence, and non-indefinite retention.
- [ ] Alberta/Canadian counsel or designated legal reviewer confirms applicable authority and does not rely on this draft as legal advice.
- [ ] Privacy reviewer approves minimized register fields, access, customer request handling, and disclosure exceptions.
- [ ] Contract, Privacy Policy, Terms, retention policy, and deletion-request process are aligned.
- [ ] No legal obligation, legal approval, signature, or customer commitment is fabricated.
- [ ] Stale statements in the policy draft and retention-register `Read Me` that say no persistent Legal Hold model exists are corrected through authorized document maintenance before approval.

Evidence references: ________________________________________________________________

## 4. Hold authority, scope, review, and escalation decisions

- **Requesters allowed to seek review:** ______________________________________________
- **Legal/privacy authority allowed to approve basis and scope:** ______________________
- **Emergency provisional-freeze authority:** ________________________________________
- **Technical activation operator(s):** ______________________________________________
- **Release requester(s):** __________________________________________________________
- **Independent release reviewer(s):** _______________________________________________
- **Technical release operator(s):** _________________________________________________
- **Permitted scope:** [ ] Organization  [ ] Document, only with complete dependency coverage
- **Preservation criteria / included data classes:** __________________________________
- **Ordinary operating review frequency:** [ ] Weekly  [ ] Other: ______________________
- **Formal necessity/scope review frequency:** [ ] At least every 90 days  [ ] Earlier: ___
- **Emergency freeze escalation deadline:** __________________________________________
- **Approved restricted authority/evidence store:** ___________________________________

Activation requires an authenticated platform-admin approver different from the requester. Release remains blocking until an independently authenticated reviewer approves the exact release, and the technical release operator must differ from both requester and reviewer. Legal/privacy authority exists outside the API role and must be evidenced here.

## 5. Deletion-path coverage evidence

| Path | Backend hold guard evidence | Synthetic test evidence | Owner result |
| --- | --- | --- | --- |
| Individual document deletion and physical storage | `carbonlite-p0-01-legal-hold-readiness-report.md` | 5 Legal Hold E2E plus 7 recoverable-deletion E2E passed 2026-11-06 | [ ] Accept [ ] Reject |
| Individual activity deletion | `carbonlite-p0-01-legal-hold-readiness-report.md` | Legal Hold E2E passed 2026-11-06 | [ ] Accept [ ] Reject |
| Both bulk activity endpoints | `carbonlite-p0-01-legal-hold-readiness-report.md` | Both POST and DELETE verbs blocked atomically | [ ] Accept [ ] Reject |
| Organization activity clear | `carbonlite-p0-01-legal-hold-readiness-report.md` | Legal Hold E2E passed 2026-11-06 | [ ] Accept [ ] Reject |
| Report row and artifact deletion | `carbonlite-p0-01-legal-hold-readiness-report.md` | Legal Hold and recoverable-deletion E2E passed | [ ] Accept [ ] Reject |
| Workspace erasure and retry | `carbonlite-p0-01-legal-hold-readiness-report.md` | E2E hold denial and unit failure/retry checks passed | [ ] Accept [ ] Reject |
| Provisioning/sample cleanup and demo reset boundary | `carbonlite-p0-01-legal-hold-readiness-report.md` | Cleanup E2E passed; demo reset has unit/code evidence only and must remain disabled for paid pilot | [ ] Accept [ ] Reject |
| Custom factors and destructive recalculation | `carbonlite-p0-01-legal-hold-readiness-report.md` | Dependent custom-factor deletion E2E passed; projection replacement/global sources remain scoped limitations | [ ] Accept [ ] Reject |
| Background/provider/operator jobs | Provider/operator inventory still required | Repository retry paths reviewed; external jobs and direct access unverified | [ ] Accept [ ] Reject |
| Backup restore and post-restore reconciliation | `REC-005` through `REC-007` remain open | No provider rehearsal or authoritative external ledger | [ ] Accept [ ] Reject |

No path may be marked protected based only on a workbook flag, frontend disabled control, operator statement, or endpoint role check.

## 6. Required technical safeguards

- [ ] Persistent organization/document hold state in PostgreSQL.
- [ ] Shared service-layer fail-closed guard across all destructive paths.
- [ ] Organization-scoped transaction/concurrency control used by activation, release, and deletion.
- [ ] Physical storage deletion race addressed by approved serialization/quarantine design.
- [ ] Bulk requests fail atomically when any target is held.
- [ ] Platform-admin, cleanup, retry, and internal helpers cannot bypass the guard.
- [ ] Emergency provisional freeze blocks immediately and has review/escalation limits.
- [ ] Hold administration uses least privilege and independent release approval.
- [ ] Audit evidence is minimized and does not contain customer content or privileged narrative.
- [ ] Architecture/regression control identifies new destructive paths.

Technical reviewer: ____________________  Date: __________  Evidence: ____________________

## 7. Backup and restoration dependencies

- [ ] Actual Neon plan/configuration, backup/PITR retention, access, and restore capability verified.
- [ ] Actual Render durable storage backup/snapshot mechanism, retention, access, and restore capability verified.
- [ ] Database and document recovery points are paired with checksums/manifests.
- [ ] External hold/deletion ledger survives database restore and is access controlled.
- [ ] Isolated synthetic restore from before hold activation reapplies the hold.
- [ ] Isolated synthetic restore after a later deletion replays deletion before access.
- [ ] Recovery environment remains inaccessible until tenant, hold, deletion, and artifact reconciliation pass.

Infrastructure reviewer: ____________________  Date: __________  Evidence: ____________________

## 8. Synthetic rehearsal

- [ ] Verified request intake and provisional freeze.
- [ ] Ambiguous scope STOP and organization-wide temporary freeze.
- [ ] Failed delete through every matrix path.
- [ ] Mixed held/unheld bulk request deletes nothing.
- [ ] Concurrent hold activation/delete test.
- [ ] Unapproved release STOP.
- [ ] Authorized release, deadline recalculation, and independent review.
- [ ] Restore/reconciliation exercise.
- [ ] Incident escalation for inconsistent enforcement.
- [ ] No real customer data or sensitive legal narrative used.

Rehearsal date: **2026-11-06 (local synthetic technical rehearsal only)**

Participants: **Codex execution; human owner/legal/reviewer participation pending**
Evidence: `carbonlite-p0-01-legal-hold-readiness-report.md`

## 9. Approval evidence checklist

- [ ] Named authorities, delegations, and separation-of-duties checks completed.
- [ ] Exact policy version, effective date, review dates, and approved scope recorded.
- [ ] Legal/privacy reviewer supplies a dated disposition and restricted evidence reference.
- [ ] Technical reviewer accepts the local rehearsal and recorded limitations.
- [ ] Provider/operator bypass inventory and least-privilege evidence completed.
- [ ] Backup/restore dependencies and external authority evidence completed.
- [ ] Production release/migration approval identifies exact SHAs and migrations.
- [ ] Production-safe synthetic verification is independently reviewed after deployment.
- [ ] Decision Log entry records the explicit decision; no checklist preparation is treated as approval.

## 10. Outstanding blockers

### P0

- Local Phase 3E code now has persistent hold state, centralized guards, and synthetic PostgreSQL tests, but no owner/legal/privacy approval or deployment evidence exists.
- Provider/operator bypass inventory and an architecture control for future direct Prisma/storage deletion paths remain incomplete.
- Physical source deletion is serialized with hold activation but is not transactionally atomic with database deletion; quarantine/versioned recovery and reconciliation evidence remain incomplete.
- Production Neon/Render backup configuration, recovery-point retention, provider/operator access, and restore reconciliation are unverified.
- No tested external hold/deletion ledger ensures that restore reapplies later holds and deletions.
- Legal/privacy, business-owner, technical, security, and infrastructure authorities are unassigned/unapproved.

### P1

- Verify no external cron, provider lifecycle, or operator script deletes data.
- Add review reminders, provisional-freeze escalation, and evidence-expiry controls.
- Decide preservation behavior for global factor sources and destructive metric projection replacement.
- Resolve individual report-artifact lifecycle and orphan prevention.

## 11. Decision

### Local synthetic readiness

- [x] **GO for continued local synthetic rehearsal and owner review only** — focused local tests passed and limitations are recorded.
- [x] **NO-GO for operational use** — named legal/privacy and independent release authorities, human tabletop participation, and explicit approval are incomplete.

Decision rationale and evidence references: ___________________________________________

Business owner: ____________________  Date: __________

### Real-data pilot

- [ ] **GO** — every P0 item is closed with evidence, Option B is implemented/tested, legal/privacy review is complete, and backup/restore reconciliation passes.
- [x] **NO-GO (current documented state)** — local technical enforcement exists, but required authority approvals, provider controls, and recovery reconciliation remain unverified.

This checked current state records the evidence-based readiness conclusion, not an approval signature. It must be revisited after P0 closure.

Final approvers when eligible:

| Approval | Name | Decision | Date | Evidence reference |
| --- | --- | --- | --- | --- |
| Business owner | ____________________ | ____________________ | __________ | ____________________ |
| Legal/privacy | ____________________ | ____________________ | __________ | ____________________ |
| Security/technical | ____________________ | ____________________ | __________ | ____________________ |
| Infrastructure | ____________________ | ____________________ | __________ | ____________________ |
