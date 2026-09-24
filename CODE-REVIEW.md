# Code review: events-app

Reviewed 2026-09-24 against the working tree at `~/coding/events-app` (no git history; the folder is not a repository). Reviewed without the assignment PDF; judged on coding practice, reuse, and test quality only.

## Verification run

Run on the Mac with node 26.8.2, npm 11.19.1.

| Check | Result |
| --- | --- |
| `npx vitest run` | 12 files, 122 tests, all pass, 3.8 s |
| `npx tsc -b` | clean |
| `npx oxlint` | 0 warnings, 0 errors on 33 files |
| `npx vite build` | ok, 268 kB JS (85 kB gzip) |
| `npx vitest run --coverage` | 100% statements, lines, functions; 98.55% branches (one branch in EventDetailModal line 21) |
| `npx prettier --check` | clean (prettier is not a devDependency; npx fetched it) |

One warning in the normal run: `7-detail.test.tsx > closing the dialog natively (Escape)` logs "An update to MemoryRouter inside a test was not wrapped in act(...)". Passing, but noisy.

The edge-case findings below marked (probe) were confirmed by a throwaway test file run against the real code and then deleted. Nothing in the project was modified.

## Overall

The code is small, readable, and consistent. Layering is right: one `request()` wrapper, one hook that owns list state, one form component shared by add and edit, pure utils with unit tests, and integration tests that render the real router. Documentation (README, architecture.md) matches the code. This is better than most take-home submissions.

The problems are almost all in concurrency and in trusting the server's data shape. None of them are caught by the current suite because the suite only ever runs one request at a time and only feeds well-formed records.

## Findings, most severe first

### 1. Backdrop click closes the modal when the user clicks the dialog's own padding (bug)

`EventDetailModal.tsx:35`

```tsx
onClick={(e) => e.target === dialogRef.current && close()}
```

`index.css` sets `dialog { max-width: 400px }` and nothing else, so the browser's default `padding: 1em` stays. The padding region is inside the visible white box but its event target is the `<dialog>` itself, so clicking there navigates away. Users will hit this when clicking near the edge of the modal. jsdom cannot see layout, so the existing test `clicking the backdrop closes the modal, clicking inside does not` passes and proves nothing about this.

Fix options: set `dialog { padding: 0 }` and put all padding on `.dialog-body`; or compare `e.clientX/Y` against `dialog.getBoundingClientRect()`; or listen for clicks on a full-size inner wrapper and treat only clicks that reach the dialog with no wrapper ancestor as backdrop clicks.

### 2. Double-click on Delete reports a 404 for a delete that succeeded (probe, bug)

`EventList.tsx:35`, `useEvents.ts:48`

The submit button is disabled while in flight; the Delete buttons are not. A double-click sends two `DELETE /events/2`. The second returns 404, so `mutate` sets "Could not delete event. Request failed with status 404" even though the row is gone and the list refetch from the first call already removed it. The user sees an error for an operation that worked.

Fix: track in-flight ids in `useEvents` (a `Set<number>`) and disable that row's button, or ignore a delete for an id that is already pending.

### 3. Overlapping reloads: last response wins, not last request (probe, bug)

`useEvents.ts:12-42`

`reload()` has no request identity. Two mutations in quick succession issue two `GET /events`; if the first response arrives after the second, `setEvents` is called with the stale list. Reproduced: delete Event 1, delete Event 2, the server ends up with `[3]`, the UI shows Event 2 still present. Same pattern exists in `EventDetailModal` and `EditEventPage` (`getOne` with no cancellation; a late response for a previous id would overwrite the current one when `id` changes without unmount).

Fix: a monotonically increasing request counter or an `AbortController` per call, and drop results whose token is no longer current. For the modal and edit page, return an abort from the `useEffect` cleanup.

### 4. A malformed record from the server hangs the page on "Loading..." with no error (probe, bug)

`hooks/useEvents.ts:14-20`, `utils/sort.ts:6`

`sortByCompany` calls `a.company.localeCompare`. `?? ''` guards `null`/`undefined` only; a number or object throws (`(a.company ?? "").localeCompare is not a function`, confirmed for `[{company:'a'},{company:42}]`). The throw happens inside the success callback of `.then(onOk, onErr)`, so `onErr` does not see it; `reload()` rejects, `useEffect` does `void reload()`, and the rejection is unhandled. `events` stays `null`, `error` stays `null`, the page shows "Loading..." forever. The README says this is a shared, writable json-server that other people POST arbitrary bodies to, so bad shapes are a realistic input, not a hypothetical.

Fix: use `.then(...).catch(...)` (or try/await) so a failure anywhere in the success path reaches `setError`; and coerce in the comparator: `String(a.company ?? '')`. Better still, validate the response shape at the API boundary (a small type guard in `eventsApi.ts`) so components never see a non-conforming record.

### 5. Reload failure after a successful POST clears the form and hides the new row (probe, design flaw)

`useEvents.ts:30-42`

`mutate` returns `true` whenever `action()` succeeded, regardless of the refetch. `reload` swallows its own error into `setError('Could not load events...')`. Net effect when POST succeeds but the following GET fails: form clears (data gone from the screen), the banner says "Could not load events", the list does not contain the event that was just added. The user has no way to tell the add worked short of clicking Retry.

Either return `false` from `mutate` when the reload failed (keep the form contents) or patch the list locally with the POST response as a fallback. The README's "refetch rather than patch" decision is fine; it just needs an honest return value.

### 6. 404 on delete leaves a row that no longer exists (probe, minor)

`useEvents.ts:34-37`

When `remove` fails, the list is not refetched. For a 404 the correct recovery is to reload, because the server state has changed underneath the UI. The test `reports 404 when the event was already deleted elsewhere` asserts the banner text and stops; it should also assert what the list shows afterwards, which would have surfaced this.

### 7. Error state is never cleared when the route parameter changes (minor)

`EventDetailModal.tsx:24-28`, `EditEventPage.tsx:15-19`

Both effects depend on `[id]` but neither resets `error`/`event` when `id` changes. Navigating from a failed `/events/999` to `/events/1` without unmounting would show the old error above the new content. In the current route table the modal always unmounts between ids, so this is latent, but the effect is written as if it handles id changes and does not.

### 8. `Content-Type: application/json` on GET and DELETE forces a CORS preflight (minor, performance)

`eventsApi.ts:22`

The header is required for POST/PUT (README explains why). On GET and DELETE it carries no body and only makes the request non-simple under CORS, so every list load is two round trips to Heroku instead of one. Send the header only when `init?.body` is present. Also, the spread `{ ...init, headers: {...} }` silently discards any `init.headers` a caller passes; merge them instead or drop the parameter from the signature.

### 9. `remove` requires a JSON body; a 204 would be reported as an error (probe, brittleness)

`eventsApi.ts:27-31, 46`

`request<T>` always calls `res.json()`. DELETE on the live server returns `200 {}` today; a 204 (which json-server and most REST servers return) becomes `ApiError('Response was not valid JSON', 204)`. Check `res.status === 204` or `content-length: 0` and return `undefined` for `T = void`.

### 10. Untrusted server string used as an inline CSS value (probe, low)

`EventList.tsx:31`

`style={{ background: e.color }}` with whatever the shared server holds. `background: url(https://...)` renders and fetches the URL. React does not sanitize style strings. The app already has `isNamedColor`; use it: render the swatch only when the value is a named color, otherwise render nothing or a "?" swatch.

## Code reuse and structure

Good:

- `request()` is the single place for headers, `res.ok`, JSON parse, and error shape. Every API function is one line.
- `mutate` factors add and delete into one path.
- `EventForm` is shared by add and edit with different `initial`, `submitLabel`, `onSubmit`, `onCancel`.
- `validateEvent` is the single rule set; `EventForm` calls it for both pages.
- `trimValues` is shared by `buildNewEvent` and `applyEdits`.

Should be tightened:

- Trimming happens in three places: `validate.ts:11` trims to validate, `colors.ts` trims and lowercases in `isNamedColor`, `events.ts:30` trims again to save. `EventForm` passes the raw, untrimmed `values` to `onSubmit`, so the contract "callers must normalize" is implicit and easy to break (a third caller that forgets `trimValues` would store padded strings). Normalize once in `EventForm.handleSubmit` and pass the normalized values to both `validateEvent` and `onSubmit`; `validateEvent` then does not need to trim.
- The field list `['name', 'description', 'company', 'color'] as const` is declared twice (`validate.ts:10`, `EventForm.tsx:19`) and a third time implicitly in `toFormValues`, `trimValues`, and the `EMPTY` constant. Export one `EVENT_FORM_FIELDS` from `types.ts` and derive the rest.
- `EventForm` decides whether to clear on success with `initial === EMPTY` (line 42), an object-identity check on a default parameter. It works only because `EditEventPage` always passes a fresh object. A caller that passes `initial={{...}}` with empty strings for a "new" form would not get the reset. Replace with an explicit prop such as `resetOnSuccess`.
- `EventForm` hard-codes `id={field}` and `id="color-options"`. Two forms on one page would produce duplicate ids and a broken `<label for>`. Use `useId()`.
- `getOne(id: number | string)` but `update(id: number)` and `remove(id: number)`. Pick one. `useParams` returns strings, so either accept `string` everywhere or parse and validate once at the page boundary (`Number(id)`, reject NaN, redirect to `/`). Today `/events/abc` sends `GET /events/abc` to the server and shows the 404 message, which is acceptable but accidental.
- `setSubmitting(false)` after `await onSubmit(values)` runs after `EditEventPage` has navigated away and unmounted the form. React 19 does not warn, but it is a signal the form is doing work it should not own; let the parent unmount it or have `save` navigate after returning.
- `buildNewEvent` sets `date` and `time` from `toISOString()`, so they are UTC. A user in Utah adding an event at 7 pm local on the 24th stores date `2026-09-25`. The seed data's `createdOn` is `2020-09-05T03:56:56 +06:00` (with a space, not ISO), so the app's `createdOn` format also differs from the data it lives next to. Decide whether these fields mean anything; if not, do not fabricate them.
- Field labels are the raw keys (`name`, `description`) with CSS `text-transform: capitalize`. Tests then depend on `getByLabelText('name')` matching the lowercase DOM text. Fine for now, but a label map (`{ name: 'Name', ... }`) is the usual shape and removes the CSS dependency.
- `aria-labelledby="event-title"` on the dialog points at an element that does not exist while loading or on error.
- Focus is not returned to the triggering link after the modal closes (native `<dialog>` handles this only when the dialog element persists; here it unmounts).

## Tests

Strengths: one msw server shared by every file, seeded per test, with helpers (`failWith`, `slow`, `failNetwork`, `captureRequests`) that read well. Integration tests render the real `App` with `MemoryRouter`, so routing is exercised. Unit tests for the pure utils cover the rule edges (whitespace, length boundary at exactly 200, case). The `onUnhandledRequest: 'error'` setting is the right default. Coverage is complete at the line level.

Weaknesses:

- Every integration test is single-request. There is no test where two requests are in flight at once, which is why findings 2 and 3 are invisible. Add tests for double-click, rapid consecutive deletes, and a slow first response overtaken by a fast second one.
- No test feeds a malformed record. `1-list` covers missing fields but not wrong types. Finding 4 is a one-line test.
- `captureRequests` registers a listener on `server.events` and never removes it. Listeners accumulate for the whole file (every earlier test's array keeps receiving clones of every later request). Harmless today, a leak in a longer suite. Add `server.events.removeAllListeners()` to `afterEach` in `setup.ts`, or return an unsubscribe.
- `7-detail > shows the image when it loads and a placeholder when it fails or is missing` renders the app twice in one test and then indexes `dialogs[1]`. Split it into two tests; the second render in the same test is what forces the `[1]`.
- `7-detail > closing the dialog natively` calls `dialog.close()` outside `act`, producing the warning in the run output. Wrap it in `act(() => ...)`.
- `4-errors > reports 404 when the event was already deleted elsewhere` and the update equivalent assert the banner and stop. Assert the list/form state after the error too (finding 6).
- `sort.test.ts > puts records with a missing or empty company first` uses `undefined as unknown as string`. That is the right way to test bad input, so extend it to a number and an object; both currently throw.
- `eventsApi.test.ts > sends Content-Type on every request` passes but codifies finding 8. Once GET/DELETE stop sending it, this test needs to change to "sends it on requests with a body".
- `vite.config.ts` excludes `src/**/*.live.test.ts` and the comment says to run it with `npm run test:live`. There is no such file and no such script. Either add the live test or delete the config and comment.
- `validate.test.ts > knows all 148 CSS named colors` checks `NAMED_COLORS.size === 148` and that each member passes `isNamedColor`. That is circular (the set validates itself). One hard-coded spot check against a source you trust (`rebeccapurple`, `lightgoldenrodyellow`) is already present in another test; the size check is the only real assertion here and it would not catch a typo that keeps the count.

## Housekeeping

- Not a git repository. There is no history, no way to bisect, and `.gitignore` is doing nothing. `git init` before anything else.
- `.gitignore` does not list `coverage/` (created by `npm run test:coverage`). I deleted the one my run produced.
- `.DS_Store` files are present at root and in `src/`; they are ignored but only once the repo exists.
- `.prettierrc` exists but `prettier` is not in `devDependencies` and there is no `format` script, so formatting depends on whatever `npx` fetches (3.9.9 today).
- `package.json` `engines.node >= 22.12`; `.devcontainer` pins Node 22; the Mac ran it on Node 26.8.2. All fine, but there is no `.nvmrc`/`.node-version`, so local runs are not pinned.
- `oxlint` config enables only two rules beyond defaults. `react-hooks/exhaustive-deps` is not on; it would not fire on this code today, but it is the rule that catches the `[id]`-effect problem class in finding 7.
- README table and `docs/architecture.md` section 10 duplicate the same requirement-to-file mapping. Keep one.

## Suggested order of work

1. Findings 1, 2, 3 (user-visible bugs, small fixes).
2. Finding 4 plus a response-shape guard in `eventsApi.ts`.
3. Findings 5 and 6 (mutate return value and reload-on-404).
4. Tests for concurrency and malformed data; fix the `act` warning; unsubscribe in `captureRequests`.
5. Normalize once in `EventForm`; single field list; `useId`; `resetOnSuccess` prop.
6. `git init`, add `coverage/` to `.gitignore`, add prettier as a devDependency.
