# Events app

Front end for the rf-json-server events API. React 19, JavaScript, Vite, react-router 7. No backend code in this repo; every CRUD operation goes to `https://rf-json-server.herokuapp.com/events`.

Live: https://runningc1.github.io/events-app/ (GitHub Pages, deployed by `.github/workflows/deploy.yml` on every push to main).

## Run locally

Requires Node 20.12 or newer (`node --version`; `.nvmrc` says 20). Pinned to Vite 6 and vitest 3 so it runs on the Node 20 that CodeSandbox Devboxes ship with.

```sh
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```sh
npm test               # unit and integration tests (vitest, jsdom, msw)
npm run test:watch
npm run test:coverage
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

CodeSandbox no longer imports repositories directly. Create a React Devbox from the template, then in its terminal: `git clone https://github.com/runningc1/events-app.git /tmp/src && find . -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} + && cp -a /tmp/src/. . && npm install && npm test`. `.codesandbox/tasks.json` runs `npm run dev` on port 5173.

## Layout

```
src/
  api/eventsApi.js          axios calls: getAll, getOne, create, update, remove
  hooks/useEvents.js        loads the list, sorts by company, refetches after add/delete
  hooks/useEvent.js         loads one event for the modal and the edit page
  utils/validate.js         validateEvent: required fields, length, CSS named color
  utils/colors.js           the 148 CSS named colors
  utils/sort.js             sortByCompany
  utils/events.js           normalizeValues, buildNewEvent (POST body)
  components/EventList.jsx  table: name (link to detail), description, company, color, edit, delete
  components/EventForm.jsx  shared by add and edit; validates on submit
  components/EventDetailModal.jsx  routed <dialog> at /events/:id
  components/ErrorBanner.jsx
  pages/EventsPage.jsx      /            list + add form; hosts the modal route
  pages/EditEventPage.jsx   /events/:id/edit
  App.jsx                   routes
  test/                     msw server, helpers, and one test file per requirement
docs/
  architecture.md           module map, routes, data flow per operation, error handling, validation
  *.svg                     the same diagrams rendered
```

## Requirements and where each one lives

| Requirement                                                      | Diagram (docs/) | Code                                                                       | Tests                                           |
| ---------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| List events with name, description, company                      | 3               | `EventList.jsx`                                                            | `test/requirements/1-list.test.jsx`             |
| Add form saving name, description, company, color; list updates  | 4               | `EventForm.jsx`, `useEvents.add`                                           | `2-add.test.jsx`                                |
| Delete button; list updates                                      | 5               | `EventList.jsx`, `useEvents.remove`                                        | `3-delete.test.jsx`                             |
| Error handling for API failures                                  | 8               | `eventsApi.js` (axios rejects on non-2xx), `ErrorBanner.jsx`, every caller | `4-errors.test.jsx`, `api/eventsApi.test.js`    |
| Sort by company after loading                                    | 3               | `utils/sort.js`, called in `useEvents.reload`                              | `5-sort.test.jsx`, `utils/sort.test.js`         |
| Update name, description, company, color                         | 6               | `EditEventPage.jsx`, `useEvent`                                            | `6-update.test.jsx`                             |
| Individual event (name, description) in a modal via react-router | 2, 7            | `EventDetailModal.jsx`, route `/events/:id`                                | `7-detail.test.jsx`                             |
| Validate inputs                                                  | 9               | `utils/validate.js`, `EventForm.jsx`                                       | `8-validate.test.jsx`, `utils/validate.test.js` |

## Decisions worth knowing

- The modal is opened and closed by the URL (`/events/:id`), not by local state. Back button and direct links work.
- After add or delete the list is refetched from the server rather than patched locally, so "update the list" is true by construction.
- POST never sends `id`. PUT sends the full record because json-server PUT replaces the record; a partial PUT wipes the other fields (verified against the live server).
- POST and PUT send `Content-Type: application/json`; without it the server stores the raw JSON string as a field name. GET and DELETE do not send it, which keeps them free of a CORS preflight.
- Refetches carry a request token; a response that is no longer the latest is ignored. A row's Delete button is disabled while its request is in flight. A 404 on a mutation triggers a refetch because the server changed underneath the UI.
- Status codes the tests mock match the live server: GET 200, missing id 404 with `{}`, POST 201, PUT 200, DELETE 200 with `{}`, malformed JSON 500.
- HTTP goes through axios, which rejects on any non-2xx status and on network failure; callers read `err.response?.status` when they need the code (the 404 refetch in `useEvents`).
- Seed data links images on placeimg.com, which shut down in 2023. The modal shows "Image not found" when an image fails to load.
- The color field is free text with a `<datalist>` of the 148 CSS named colors, so typing "steel" offers steelblue. Anything not on that list (including "Test 2 steelblue") is rejected on submit.
- Styling is deliberately minimal.
