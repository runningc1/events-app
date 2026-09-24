# Events app

Front end for the rf-json-server events API. React 19, TypeScript, Vite, react-router 7. No backend code in this repo; every CRUD operation goes to `https://rf-json-server.herokuapp.com/events`.

## Run locally

Requires Node 22.12 or newer (`node --version`; `.nvmrc` says 22).

```sh
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```sh
npm test               # unit and integration tests (vitest, jsdom, msw)
npm run test:watch
npm run test:coverage
npm run typecheck      # tsc
npm run lint           # oxlint
npm run format         # prettier
npm run build          # production build to dist/
npm run preview        # serve dist/ locally
```

To point at a different endpoint (there are five identical ones, `/events` through `/events-5`):

```sh
VITE_API_BASE=https://rf-json-server.herokuapp.com/events-2 npm run dev
```

## Run on CodeSandbox

Import the repository (Create > Import from GitHub) or upload the folder. `.devcontainer/devcontainer.json` pins Node 22 for the devbox. The start task is `npm run dev`.

## Layout

```
src/
  api/eventsApi.ts          fetch wrapper: getAll, getOne, create, update, remove
  hooks/useEvents.ts        loads the list, sorts by company, refetches after add/delete
  hooks/useEvent.ts         loads one event for the modal and the edit page
  utils/validate.ts         validateEvent: required fields, length, CSS named color
  utils/colors.ts           the 148 CSS named colors
  utils/sort.ts             sortByCompany
  utils/events.ts           normalizeValues, buildNewEvent (POST body)
  components/EventList.tsx  table: name (link to detail), description, company, color, edit, delete
  components/EventForm.tsx  shared by add and edit; validates on submit
  components/EventDetailModal.tsx  routed <dialog> at /events/:id
  components/ErrorBanner.tsx
  pages/EventsPage.tsx      /            list + add form; hosts the modal route
  pages/EditEventPage.tsx   /events/:id/edit
  App.tsx                   routes
  test/                     msw server, helpers, and one test file per requirement
docs/
  architecture.md           module map, routes, data flow per operation, error handling, validation
  *.svg                     the same diagrams rendered
```

## Requirements and where each one lives

| Requirement                                                      | Diagram (docs/) | Code                                                         | Tests                                           |
| ---------------------------------------------------------------- | --------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| List events with name, description, company                      | 3               | `EventList.tsx`                                              | `test/requirements/1-list.test.tsx`             |
| Add form saving name, description, company, color; list updates  | 4               | `EventForm.tsx`, `useEvents.add`                             | `2-add.test.tsx`                                |
| Delete button; list updates                                      | 5               | `EventList.tsx`, `useEvents.remove`                          | `3-delete.test.tsx`                             |
| Error handling for API failures                                  | 8               | `eventsApi.ts` (`ApiError`), `ErrorBanner.tsx`, every caller | `4-errors.test.tsx`, `api/eventsApi.test.ts`    |
| Sort by company after loading                                    | 3               | `utils/sort.ts`, called in `useEvents.reload`                | `5-sort.test.tsx`, `utils/sort.test.ts`         |
| Update name, description, company, color                         | 6               | `EditEventPage.tsx`, `useEvent`                              | `6-update.test.tsx`                             |
| Individual event (name, description) in a modal via react-router | 2, 7            | `EventDetailModal.tsx`, route `/events/:id`                  | `7-detail.test.tsx`                             |
| Validate inputs                                                  | 9               | `utils/validate.ts`, `EventForm.tsx`                         | `8-validate.test.tsx`, `utils/validate.test.ts` |

## Decisions worth knowing

- The modal is opened and closed by the URL (`/events/:id`), not by local state. Back button and direct links work.
- After add or delete the list is refetched from the server rather than patched locally, so "update the list" is true by construction.
- POST never sends `id`. PUT sends the full record because json-server PUT replaces the record; a partial PUT wipes the other fields (verified against the live server).
- POST and PUT send `Content-Type: application/json`; without it the server stores the raw JSON string as a field name. GET and DELETE do not send it, which keeps them free of a CORS preflight.
- Refetches carry a request token; a response that is no longer the latest is ignored. A row's Delete button is disabled while its request is in flight. A 404 on a mutation triggers a refetch because the server changed underneath the UI.
- Status codes the tests mock match the live server: GET 200, missing id 404 with `{}`, POST 201, PUT 200, DELETE 200 with `{}`, malformed JSON 500.
- `fetch` does not reject on 4xx/5xx, so `res.ok` is checked explicitly and every failure becomes an `ApiError` with a status (0 for network failures).
- Seed data links images on placeimg.com, which shut down in 2023. The modal shows "Image not found" when an image fails to load.
- The color field is free text with a `<datalist>` of the 148 CSS named colors, so typing "steel" offers steelblue. Anything not on that list (including "Test 2 steelblue") is rejected on submit.
- Styling is deliberately minimal.
