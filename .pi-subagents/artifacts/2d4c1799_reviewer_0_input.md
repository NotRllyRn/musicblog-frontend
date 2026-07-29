# Task for reviewer

Read-only finish review of a UI prototype. Original request: replace bins/channels/lanes with nine visually unseparated, independently vertical-scrolling groups of free-floating album covers; centered cover should feel like a dimensional vinyl sleeve viewed from above, while off-center covers collapse to top portions above/behind or below/out of the way; no metadata may cover the full album image, and hover metadata must be a separate slightly translucent floating box near it. Produce five new variants that primarily differ in scrolling/flip mechanics, keep D-like human misalignment, B-like digital depth, and C-like simplicity. Inspect app/_catalog-prototype/, PRODUCT.md, README.md and screenshots /tmp/musicblog-v2-final/A.png through E.png. Check request fidelity, distinct mechanics, image visibility, accessibility, and obvious defects. Do not edit. Return only material issues, or clean.

## Acceptance Contract
Acceptance level: attested
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Return concrete findings with file paths and severity when applicable

Required evidence: review-findings, residual-risks

Finish with a fenced JSON block tagged `acceptance-report` in this shape:
Use empty arrays when no items apply; array fields contain strings unless object entries are shown.
`criteriaSatisfied[].status` must be exactly one of: satisfied, not-satisfied, not-applicable.
`commandsRun[].result` must be exactly one of: passed, failed, not-run.
`manualNotes` and `notes` are optional strings; an empty string means no note and does not satisfy `manual-notes` evidence.
```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "specific proof"
    }
  ],
  "changedFiles": [
    "src/file.ts"
  ],
  "testsAddedOrUpdated": [
    "test/file.test.ts"
  ],
  "commandsRun": [
    {
      "command": "command",
      "result": "passed",
      "summary": "short result"
    }
  ],
  "validationOutput": [
    "validation output or concise summary"
  ],
  "residualRisks": [
    "none"
  ],
  "noStagedFiles": true,
  "diffSummary": "short description of the diff",
  "reviewFindings": [
    "blocker: file.ts:12 - issue found, or no blockers"
  ],
  "manualNotes": "anything else the parent should know"
}
```