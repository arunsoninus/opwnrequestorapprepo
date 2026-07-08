# OPWN Request — Data Integrity Fixes (ported from CWS/NED Requestor App)

## Background

`opwrequest` is built from the same original codebase as the CWS/NED Requestor app
(`cwsnedrequestorapp`) — controller/utility file names, the `AppModel`/`AppConstant` plumbing, and
even internal path names like `/cwsRequest/createCWSRequest` are carried over unchanged. Two bugs
found and fixed in that app were verified to be present here too (same code, same root cause), and
one CWS fix does **not** apply here. This document was written by porting
`CWS_REQUEST_DATA_INTEGRITY_FIXES.md` and `NEW_REQUEST_MODEL_REFACTOR_PLAN.md` from
`cwsnedrequestorapp`, checking each finding against this app's actual code before changing anything.

---

## 1. New Request dialog fields sharing the detail view's working node

**Symptom (present, unmitigated):** The New Request dialog's fields (Type, Staff, Start/End Date,
Duration, **Amount Payable to Staff**) were bound directly to
`AppModel>/cwsRequest/createCWSRequest/*` — the same node `OpwDetailView` uses for its own
create/edit form. `OpwDetailView._fnInitializeAppModel()` replaces `AppModel` wholesale on every
detail-route match, which fires immediately after the dialog navigates with `project: "NEW"`, so
`_fnHandleNewRequest()` was reading `STAFF_ID`/`CONCURRENT_STAFF_ID` off a `createCWSRequest` that
had already been wiped. Unlike `cwsnedrequestorapp`, there was no partial/WIP snapshot-restore hack
in place at all — this app was at an earlier, more exposed baseline.

OPW-specific fields not present in the CWS version: **`AMOUNT`** (Amount Payable to Staff) and
**`LEAVING_DATE`** (set via the staff value-help, used by `Validation.validateLeavingDate`).

**Fix — same staging-node pattern as CWS:**

- `webapp/utils/appconstant.js` — added `/cwsRequest/newRequest` (written only by the dialog, read
  by nothing else), sized for this app's actual fields: `TYPE`, `FULL_NM`, `STAFF_ID`,
  `STAFF_NUSNET_ID`, `CONCURRENT_STAFF_ID`, `START_DATE`, `END_DATE`, `DURATION_DAYS`, `AMOUNT`,
  `LEAVING_DATE`, `SingleSubRadioSelected`, `massUploadRadioSelected`.
- `webapp/view/fragments/NewRequestTypeSelectionDialog.fragment.xml` — all active field bindings
  (and the commented-out legacy `CWSExtMultiInput` block, so it doesn't reference a stale path if
  ever re-enabled) repointed from `createCWSRequest` to `newRequest`.
- `webapp/controller/OpwRequestHistory.controller.js`:
  - `onPressCreateOpwnRequest()` — resets `/cwsRequest/newRequest` instead of blanking
    `createCWSRequest`.
  - `onChangeNewRequestParams()`, `onPressProceedToCreate()`, `_payrollCheck()`,
    `initializeNewOpwnRequest()`, `_fnRequestType()`, `onPressMassUploadTemplate()` — all read/write
    paths updated to `/cwsRequest/newRequest/*`.
  - `requestTypeSelection()` / `closeNewRequestTypeDialog()` — added the `if (!this.newRequestTypeDialog)`
    reuse guard and nulled the reference on close, matching the CWS hardening (this app had neither;
    the fragment was recreated on every open with no cleanup, risking fixed-control-ID collisions).
- `webapp/controller/BaseController.js`:
  - `handleConfirmStaff()` — the five (six, including `LEAVING_DATE`) fields it sets now write to
    `/cwsRequest/newRequest/*`. Confirmed by search this handler is only reachable from the New
    Request dialog's staff value-help (`StaffValueHelpDialog.fragment.xml`), not from `OpwDetailView`.
  - `fnPaymentAmount(key, model, filter, sBasePath)` — **new finding, not part of the CWS fix**: this
    function is shared between the dialog's pre-navigation payroll check (`_payrollCheck` →
    `fnPaymentAmount('N')`) and the detail view's edit flows, but hardcoded
    `/cwsRequest/createCWSRequest/*`. Once the dialog's fields moved to `/cwsRequest/newRequest`,
    the dialog's payroll check would have silently read whatever an *unrelated, previously-viewed*
    request still sitting in `createCWSRequest` (STAFF_ID, dates, amount) instead of the value just
    entered in the dialog. Added an optional `sBasePath` parameter (defaults to
    `/cwsRequest/createCWSRequest`, so all detail-view call sites are unchanged); `_payrollCheck`
    passes `/cwsRequest/newRequest` explicitly.
- `webapp/utils/validation.js` — `validateDatesNDuration()` takes an optional `sBasePath` (same
  pattern as CWS); the dialog's two call sites in `OpwRequestHistory.controller.js` pass
  `/cwsRequest/newRequest` explicitly. Detail-view call sites (`OpwDetailView.controller.js`)
  unchanged.
- `webapp/controller/OpwDetailView.controller.js`:
  - `_onProjectMatched()` — calls a new `_fnCapturePendingNewRequestValues()` (snapshots the whole
    `/cwsRequest/newRequest` node) before `_fnInitializeAppModel()` replaces `AppModel`, only when
    `this._project === "NEW"`.
  - `_fnHandleNewRequest()` — transfers the captured snapshot onto the freshly-reset
    `createCWSRequest` field-by-field (including `TYPE`, falling back to
    `this.getI18n("CwsRequest.Internal")` only if the dialog never set one), then resets
    `/cwsRequest/newRequest` back to a pristine clone so it can't leak into the next New Request
    cycle.
- `webapp/utils/utility.js` — `_clearModelBeforeNavigationToCWDetailView()` (preview/copy-of-an-
  existing-request flow) now clones from `AppConstant.pristineCreateCWSRequest` instead of assigning
  `AppConstant.cwsRequest.createCWSRequest` directly (this version didn't even clone — see fix #2).

**Dead code found, left untouched (matches the equivalent CWS finding):**
- `BaseController.js`: `lookupValueHelp()` / `manageServiceUrlToInvoke()` / `setValuesFromLookup()` —
  their `/cwsRequest/createCWSRequest/FULL_NM` case is only reachable from the commented-out legacy
  `CWSExtMultiInput` block in the fragment.
- `utils/massuploadhelper.js`: `_onPressMassUploadTemplate()` — references a `fileUploader` id
  (`massClaimsUploadId`) that doesn't exist in this app's fragment (which uses
  `massRequestsOpwnFileUploaderId`) and is never called from any controller. The active mass-upload
  handler is the inline `onPressMassUploadTemplate()` in `OpwRequestHistory.controller.js`, which
  **was** updated (its `TYPE` read now points at `/cwsRequest/newRequest/TYPE`).

---

## 2. `AppConstant` reference-sharing corrupting "reset to defaults"

**Symptom (present, same root cause as CWS):** `sap.ui.model.json.JSONModel#setData` doesn't
clone — `oAppModel.setData(AppConstant)` (in `OpwRequestHistory.controller.js:initializeModel` and
`OpwDetailView.controller.js:_fnInitializeAppModel`) makes the model's live data tree literally
*be* the `AppConstant` module singleton. Any `setProperty` call against `/cwsRequest/newRequest/*`
or `/cwsRequest/createCWSRequest/*` therefore mutates `AppConstant` itself, so a later "reset by
cloning from `AppConstant.cwsRequest.*`" just clones the already-corrupted live data. This is the
same bug independently found and fixed in `cwsnedrequestorapp` (see
`CWS_REQUEST_DATA_INTEGRITY_FIXES.md` §1) — introducing the new staging node from fix #1 without
this fix would have reproduced it fresh here.

**Fix:** `appconstant.js` now takes two one-time, deep-cloned, **frozen** snapshots —
`AppConstant.pristineNewRequest` and `AppConstant.pristineCreateCWSRequest` — kept outside
`AppConstant.cwsRequest`, so no `AppModel.setProperty()` call can ever reach them. All reset call
sites (listed in fix #1) clone from these, never from `AppConstant.cwsRequest.newRequest` /
`.createCWSRequest`, which remain live/mutable by design and are not safe to reset from.

Note: unlike the first (wrong) attempt in `cwsnedrequestorapp`, this was implemented directly with
the detached-snapshot approach from the start — no `/cwsRequest`-level cloning was added to
`initializeModel`/`_fnInitializeAppModel`, so whatever this app's equivalent of `isDepartmentAdmin`
/ role-derived flags rely on the existing (fragile but relied-upon) `setData(AppConstant)` sharing
behavior is left completely undisturbed.

---

## 3. Cancel not recomputing dependent options lists (Sub-Type / Request Type)

**Symptom (present, same shape as CWS §3):** `OpwDetailView.controller.js` has the identical
`onSelectRequestType` → `Utility.retrieveSubTypes(this)` pattern (only fires when the user picks a
different Request Type) and `Utility.retrieveRequestTypes()` populates `/requestTypes` similarly.
`onPressCancel` restored `createCWSRequest` (including `REQUEST_TYPE`/`SUB_TYPE`) and called
`AppModel.refresh(true)`, but never recomputed `/subTypes` / `/requestTypes` — so if a user changed
Request Type mid-edit and then clicked Cancel, the Sub-Type/Request-Type controls would be stuck
showing the mid-edit type's option list, unable to display the restored value even though the
underlying model property was correct.

**Fix:** `onPressCancel` now calls `Utility.retrieveSubTypes(this)` and
`Utility.retrieveRequestTypes(this, true, ...)` right after restoring `createCWSRequest`, before
`AppModel.refresh(true)`.

**Note:** this app has no levy/property-usage feature, so there is no synchronous equivalent to
CWS's `filterLevyList` reorder fix (§2 in the CWS doc) to port — `retrieveSubTypes`/
`retrieveRequestTypes` are asynchronous OData calls, so unlike CWS's synchronous levy-list filter,
there's an unavoidable brief delay before these two lists catch up after Cancel. Not yet verified
against a live combined-edit repro in the browser.

---

## Not ported from the CWS fixes — confirmed not applicable

- **`filterLevyList` / Property Usage 1-July-2026 levy rule (CWS doc §2):** `opwrequest` has no
  levy, property-usage, or effective-date feature at all (no `filterLevyList`, `levyListFull`,
  `levyEffDate` anywhere in this codebase). Nothing to port.
- **Staff-ID-visibility regression from an over-broad first attempt (CWS doc §1 "Regression
  caught"):** that was a detour specific to how the CWS fix was first (incorrectly) implemented,
  not a separate bug. Implemented the correct (detached-snapshot) version directly here, so this
  detour doesn't apply.

---

## Files touched

- `webapp/utils/appconstant.js`
- `webapp/controller/OpwRequestHistory.controller.js`
- `webapp/controller/OpwDetailView.controller.js`
- `webapp/controller/BaseController.js`
- `webapp/utils/utility.js`
- `webapp/utils/validation.js`
- `webapp/view/fragments/NewRequestTypeSelectionDialog.fragment.xml`

## Testing checklist (not yet run against a live app in this session)

- [ ] Create request #1, then #2 back-to-back without reload — fields no longer bleed across.
- [ ] Cancel the New Request dialog after partially filling it, reopen — fields are blank.
- [ ] New Request dialog's payroll-eligibility check (`_payrollCheck`) uses the staff/dates just
      entered in the dialog, not a stale previously-viewed request's data.
- [ ] Staff value-help still populates Staff ID/Name/dates/Leaving Date correctly (now writing to
      `/cwsRequest/newRequest`).
- [ ] Existing-request edit/preview/copy flows in `OpwDetailView` are unaffected (still reading/
      writing `/cwsRequest/createCWSRequest` exclusively).
- [ ] Mass upload flow (dialog "Upload" button) still works — `Request_key`/`noOfHeaderRows` paths
      untouched.
- [ ] Edit an approved request, change Request Type/Sub-Type, click Cancel — both revert to their
      original values and display correctly (not just in the model, but in the UI controls).
