# Attachment Endpoints — OAuth Migration (ported from CWS/NED app)

## Background

`cwsnedrequestorapp` has already migrated its attachment-related backend endpoints to OAuth-secured
variants (config values suffixed `OAuth`). `opwrequest` was left on the pre-migration endpoint names
for three of the four attachment operations, with one (`uploadAttachment`) already switched over as
a prior in-progress edit. Migrating the config value alone is not sufficient — the handlers that
unwrap OData function-import responses key off the **exact** function-import name, so two call
sites needed matching code changes, not just a config edit.

## Config changes — `webapp/utils/configuration.js`

| Key | Before | After |
|---|---|---|
| `uploadAttachment` | `/cwUploadAttachment` | `/cwUploadAttachmentOAuth` *(already changed prior to this session)* |
| `deleteAttachment` | `/deleteAttachment` | `/deleteAttachmentOAuth` |
| `deleteMassAttachment` | `/deleteAttachmentById` | `/deleteAttachmentByIdOAuth` |
| `massUploadAttach` | `/uploadZipAttachment` | `/uploadZipAttachmentOAuth` |
| `fetchAttachment` | `/fetchAttachment` | unchanged — CWS doesn't OAuth-suffix this one either |
| `syncAttachment` | `/syncAttachmentsForRequest` | unchanged |

## Handler fixes required by the config change

Everywhere `Config.dbOperations.X` is used to build a raw AJAX upload URL
(`AttachmentSrvModel.sServiceUrl + Config.dbOperations.uploadAttachment` /
`...massUploadAttach`), the handler is unaffected by the rename — it just POSTs to a different path.
`onUploadChange` (upload attachment) and `onUploadZip` (mass zip upload) needed **no** code changes;
confirmed by checking every call site goes through `Config.dbOperations.*`, never a hardcoded path.

Two places call `Services._readDataUsingOdataModel`, which returns the *raw* OData function-import
response — an object keyed by the function-import name itself (e.g. `{ deleteAttachment: { status:
"S", ... } }`). Renaming the config value to `deleteAttachmentOAuth` renames that response key too
(the backend function import is `deleteAttachmentOAuth`, not `deleteAttachment`). Both of these were
hardcoding the **old** key name, which CWS had already fixed by deriving the key from config instead:

1. **`webapp/controller/OpwDetailView.controller.js:handleDeleteAttachment`** — was
   `response.deleteAttachment`. Changed to `var apiEntity = Config.dbOperations.deleteAttachment.substring(1); response[apiEntity]`,
   matching CWS's `handleDeleteAttachment` exactly. Left as `response.deleteAttachment`, this would
   have silently failed (`response[apiEntity]` always `undefined` → always hits the "Attachment
   Failed to Delete" error path) the moment the config value changed.

2. **`webapp/utils/services.js:deleteZipAttachmentOnCancel`** — was `callBackFx(response.deleteAttachmentById)`,
   reading off `UtilitySrvModel`. CWS's version had already migrated this specific call to
   `AttachmentSrvModel` (with the `UtilitySrvModel` line commented out, not deleted — a deliberate,
   visible migration marker) and derived the key dynamically the same way. Ported both changes:
   switched the model and changed to `var apiEntity = Config.dbOperations.deleteMassAttachment.substring(1); response[apiEntity]`.
   Left as-is, the caller (`OpwRequestHistory.controller.js:_fnDeleteAttachment`, which does
   `deleteResponse.status === "S"`) would have received `undefined` and thrown
   `Cannot read properties of undefined` the moment a user deleted a mass-upload attachment after
   the config change — this is a live, reachable flow (`onUploadZip` / `handleDeleteMassAttachment`
   in the mass-upload response fragment), not dead code.

Verified `AttachmentSrvModel` is configured identically in this app's `manifest.json` (same
`attachmentService` dataSource as `UtilitySrvModel`'s `utilService`), so the model switch is safe.

## Unrelated bug found while auditing `MassUploadResponse.fragment.xml`

While confirming every handler this fragment references actually exists (to make sure the
attachment/mass-upload flow is fully wired after the changes above), found:
`fileSizeExceed="handlefilesizeExceed"` on the zip `FileUploader` (`zipFileUploaderOpwnId`) pointed
at a function that was never defined anywhere — `OpwRequestHistory.controller.js` (the controller
this fragment actually runs under) has no `handlefilesizeExceed`, only an unrelated, differently
-cased `handleFileSizeExceed` on `OpwDetailView.controller.js`, which isn't the controller in scope
for this fragment. Selecting a zip file over the 150 MB limit would have thrown
`handlefilesizeExceed is not a function`.

**This is a pre-existing defect in `cwsnedrequestorapp` too** (identical dangling reference, same
fragment, same casing) — not something introduced here, and not something to "port a fix from CWS"
since CWS has the same gap. Fixed only in this app for now:
- Added `handlefilesizeExceed` to `OpwRequestHistory.controller.js`, mirroring the sibling
  `handlefilezipTypemismatch` handler's style.
- Added a new i18n key `CwsRequest.MassUpload.MaxSizeExceed` (the existing
  `CwsRequest.Upload.MaxSize` says "5 MB", which is the *single-attachment* limit, not the 150 MB
  zip limit — reusing it would have shown the wrong number).

Flag for a separate decision: whether to port the same two-line fix into `cwsnedrequestorapp`.

## Not changed

- `fetchAttachment` / `syncAttachment` handlers — config values unchanged, so their response-key
  handling (`response.fetchAttachment`, `response.syncAttachmentsForRequest`) is still correct.
- `webapp/controller/OpwDetailView.controller.js:onUploadDocument` — reads
  `Config.dbOperations.uploadAttachment` into a local variable but never uses it (dead stub, empty
  loop body, no AJAX call). Left untouched; the config rename doesn't affect unreachable code.
- `webapp/utils/massuploadhelper.js:_onPressMassUploadTemplate` — already flagged as dead/unreferenced
  code in `OPWN_REQUEST_DATA_INTEGRITY_FIXES.md`; not touched here either.

## Files touched

- `webapp/utils/configuration.js`
- `webapp/controller/OpwDetailView.controller.js`
- `webapp/controller/OpwRequestHistory.controller.js`
- `webapp/utils/services.js`
- `webapp/i18n/i18n.properties`

## Testing checklist (not yet run against a live app)

- [ ] Upload a single attachment on a draft/edit request — succeeds against the OAuth endpoint.
- [ ] Delete a single attachment — succeeds, `_fnRefreshAttachment()` fires (previously would have
      silently no-op'd once the config changed, without this fix).
- [ ] Mass-upload a zip file — succeeds against the OAuth endpoint.
- [ ] Delete a mass-upload zip attachment (`handleDeleteMassAttachment`) — succeeds without a
      `Cannot read properties of undefined` error (previously would have thrown once the config
      changed, without this fix).
