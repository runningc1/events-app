# Architecture

Front end only. Every box below runs in the browser; the only external system is rf-json-server. Rendered SVGs of each diagram are next to this file.

## 1. Module map

Who imports whom. Arrows point from the importer to the module it uses.

```mermaid
flowchart TB
  main[main.tsx<br/>BrowserRouter] --> App[App.tsx<br/>route table]
  App --> EventsPage["EventsPage  /"]
  App --> EditEventPage["EditEventPage  /events/:id/edit"]
  App --> Modal["EventDetailModal  /events/:id<br/>(child of /)"]

  EventsPage --> useEvents[useEvents hook]
  EventsPage --> EventForm
  EventsPage --> EventList
  EventsPage --> ErrorBanner
  EditEventPage --> EventForm
  EditEventPage --> ErrorBanner
  EditEventPage --> useEvent[useEvent hook]
  EditEventPage --> api
  Modal --> useEvent
  useEvent --> api
  Modal --> EventImage
  Modal --> ErrorBanner

  useEvents --> api[api/eventsApi.ts<br/>getAll getOne create update remove]
  useEvents --> sort[utils/sort.ts]
  EventForm --> validate[utils/validate.ts]
  validate --> colors[utils/colors.ts]
  EventsPage --> events[utils/events.ts<br/>buildNewEvent]
  EditEventPage --> events

  api -->|fetch, Content-Type: application/json| Server[(rf-json-server<br/>/events)]
```

## 2. Routes

```mermaid
flowchart LR
  root["/  EventsPage<br/>list + add form"]
  detail["/events/:id  EventDetailModal<br/>rendered in EventsPage's Outlet,<br/>list stays underneath"]
  edit["/events/:id/edit  EditEventPage"]
  other["*  redirect to /"]

  root -->|click event name| detail
  detail -->|Close, Escape, backdrop| root
  root -->|click Edit| edit
  edit -->|Save or Cancel| root
```

## 3. Data flow: load and sort

```mermaid
sequenceDiagram
  participant U as User
  participant P as EventsPage
  participant H as useEvents
  participant A as eventsApi
  participant S as rf-json-server

  U->>P: open /
  P->>H: mount
  H->>A: getAll()
  A->>S: GET /events
  S-->>A: 200 [events in id order]
  A-->>H: EventRecord[]
  H->>H: sortByCompany()
  H-->>P: events (sorted)
  P-->>U: table: name, description, company, color
```

## 4. Data flow: add

```mermaid
sequenceDiagram
  participant U as User
  participant F as EventForm
  participant P as EventsPage
  participant H as useEvents
  participant A as eventsApi
  participant S as rf-json-server

  U->>F: fill name, description, company, color, then click Add
  F->>F: validateEvent(values)
  alt invalid
    F-->>U: inline errors, no request
  else valid
    F->>P: onSubmit(values)
    P->>H: add(buildNewEvent(values))
    H->>A: create(event)  (no id in body)
    A->>S: POST /events
    S-->>A: 201 {..., id}
    H->>A: getAll()
    A->>S: GET /events
    S-->>A: 200
    H-->>P: sorted events
    P-->>U: list updated, form cleared
  end
```

## 5. Data flow: delete

```mermaid
sequenceDiagram
  participant U as User
  participant L as EventList
  participant H as useEvents
  participant A as eventsApi
  participant S as rf-json-server

  U->>L: click Delete
  L->>H: remove(id)
  H->>A: remove(id)
  A->>S: DELETE /events/{id}
  S-->>A: 200 {}
  H->>A: getAll()
  A->>S: GET /events
  S-->>A: 200
  H-->>U: list updated (row gone)
```

## 6. Data flow: update

```mermaid
sequenceDiagram
  participant U as User
  participant E as EditEventPage
  participant F as EventForm
  participant A as eventsApi
  participant S as rf-json-server

  U->>E: open /events/{id}/edit
  E->>A: getOne(id)  (via useEvent)
  A->>S: GET /events/{id}
  S-->>A: 200 record
  E->>F: initial = the loaded record
  U->>F: change fields, click Save
  F->>F: validateEvent(values)
  F->>E: onSubmit(values)
  E->>E: merge values into the loaded record  (full record, id kept)
  E->>A: update(id, record)
  A->>S: PUT /events/{id}  (json-server PUT replaces the whole record)
  S-->>A: 200
  E->>U: navigate to /  (EventsPage mounts and refetches)
```

## 7. Data flow: view one event

```mermaid
sequenceDiagram
  participant U as User
  participant R as react-router
  participant M as EventDetailModal
  participant A as eventsApi
  participant S as rf-json-server

  U->>R: click event name (Link to /events/{id})
  R->>M: render in EventsPage's Outlet
  M->>M: dialog.showModal()
  M->>A: getOne(id)  (via useEvent)
  A->>S: GET /events/{id}
  S-->>A: 200 record
  M-->>U: name, description, image (or "Image not found")
  U->>M: Close / Escape / backdrop click
  M->>R: navigate("/")
  R->>M: unmount
```

## 8. Error handling

Every request goes through one `request()` function. `fetch` only rejects on network failure, so non-2xx responses are turned into errors by hand.

```mermaid
flowchart TB
  call[api call] --> fetch{fetch}
  fetch -->|throws| net["ApiError(status 0, 'Network error: ...')"]
  fetch -->|response| ok{res.ok?}
  ok -->|no| http["ApiError(status, 'Request failed with status N')"]
  ok -->|yes| json{res.json parses?}
  json -->|no| bad["ApiError(status, 'Response was not valid JSON')"]
  json -->|yes| data[typed data]

  net & http & bad --> caller{who called?}
  caller -->|useEvents.reload| e1["ErrorBanner 'Could not load events' + Retry"]
  caller -->|useEvents.add / remove| e2["ErrorBanner 'Could not add/delete event'<br/>form keeps its values, list unchanged"]
  caller -->|EventDetailModal| e3["ErrorBanner inside the dialog"]
  caller -->|EditEventPage| e4["ErrorBanner, stays on edit page,<br/>form keeps its values"]
```

## 9. Validation

Runs on submit, in both the add and edit forms. Same function, same rules.

```mermaid
flowchart LR
  values[name, description, company, color] --> trim[trim each]
  trim --> req{empty?}
  req -->|yes| r1[Required]
  req -->|no| len{"> 200 chars?"}
  len -->|yes| r2[Must be 200 characters or fewer]
  len -->|no| color{field is color?}
  color -->|no| pass[ok]
  color -->|yes| named{in the 148 CSS named colors?<br/>case-insensitive}
  named -->|no| r3[Must be a CSS named color]
  named -->|yes| pass
  r1 & r2 & r3 --> block[inline error under the field,<br/>aria-invalid, no request sent]
  pass --> submit[onSubmit]
```

The requirement-to-file trace is in the README.
