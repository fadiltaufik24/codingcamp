# Implementation Plan: Life Dashboard

## Overview

Build a single-page Life Dashboard using HTML, CSS, and Vanilla JavaScript. The application consists of three files: `index.html`, `css/style.css`, and `js/app.js`. Modules: StorageService, ThemeManager, GreetingWidget (with custom name), FocusTimerWidget (configurable duration), TodoWidget (duplicate prevention + sort), QuickLinksWidget. All user settings and data persist in `localStorage`.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1. Create the HTML skeleton and file structure"] },
    { "wave": 2, "tasks": ["2.1 Implement the `StorageService` module in `js/app.js`"] },
    { "wave": 3, "tasks": ["3.1 Implement the `GreetingWidget` module", "4.1 Implement the `FocusTimerWidget` module"] },
    { "wave": 4, "tasks": ["5. Checkpoint — Ensure greeting, name, and timer work correctly"] },
    { "wave": 5, "tasks": ["6.1 Implement the `TodoWidget` data model and CRUD operations", "7.1 Implement the `QuickLinksWidget` data model and CRUD operations"] },
    { "wave": 6, "tasks": ["6.2 Implement `TodoWidget.render()` — DOM output", "7.2 Implement `QuickLinksWidget.render()` — DOM output"] },
    { "wave": 7, "tasks": ["8. Checkpoint — Ensure to-do and quick links work correctly"] },
    { "wave": 8, "tasks": ["9.1 Implement base styles and typography in `css/style.css`"] },
    { "wave": 9, "tasks": ["9.2 Implement widget grid layout"] },
    { "wave": 10, "tasks": ["9.3 Implement responsive layout for narrow viewports"] },
    { "wave": 11, "tasks": ["9.4 Style individual widgets and interactive states"] },
    { "wave": 12, "tasks": ["10.1 Implement `ThemeManager` and add full bootstrap block"] },
    { "wave": 13, "tasks": ["10.2 Cross-browser verification pass"] },
    { "wave": 14, "tasks": ["11. Final checkpoint — Full integration review"] },
    { "wave": 15, "tasks": ["12.1 Write property tests for core pure functions"] },
    { "wave": 16, "tasks": ["12.2 Write property tests for data operations"] }
  ]
}
```

## Tasks

- [x] 1. Create the HTML skeleton and file structure
  - Create `index.html` at the project root with semantic markup and four widget containers: `#greeting`, `#focus-timer`, `#todo`, `#quick-links`
  - Create empty `css/style.css` and `js/app.js` files linked from `index.html`
  - Add `#theme-toggle` button in the page header
  - Add all required DOM ids: `#greeting-text`, `#current-time`, `#current-date`, `#name-input`, `#name-save-btn`, `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#timer-duration-input`, `#timer-duration-save`, `#todo-input`, `#todo-add-btn`, `#todo-list`, `#todo-sort-select`, `#todo-duplicate-warning`, `#link-title-input`, `#link-url-input`, `#link-add-btn`, `#links-list`
  - _Requirements: 1.10, 2.8, 3.11, 5.2, 5.3, 7.1_

- [x] 2. Implement StorageService and data persistence layer
  - [x] 2.1 Implement the `StorageService` module in `js/app.js`
    - Write `StorageService.read(key)` — wraps `localStorage.getItem` + `JSON.parse` in try/catch; returns `null` on failure
    - Write `StorageService.write(key, value)` — wraps `JSON.stringify` + `localStorage.setItem` in try/catch; returns `true` on success, `false` on failure
    - Define all storage key constants: `"life_dashboard_todos"`, `"life_dashboard_links"`, `"life_dashboard_theme"`, `"life_dashboard_name"`, `"life_dashboard_pomodoro_minutes"`, `"life_dashboard_sort_order"`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Implement GreetingWidget with custom name
  - [x] 3.1 Implement the `GreetingWidget` module
    - Write `getGreeting(hour)` pure function mapping hour 0–23 to the correct greeting string
    - Write `formatTime(date)` → HH:MM AM/PM string; `formatDate(date)` → "Weekday, Month Day, Year"
    - Load `customName` from `StorageService.read("life_dashboard_name")` on init
    - Write `render()` — builds greeting as `"Good morning, Alex"` when name is set, `"Good morning"` when empty; updates `#greeting-text`, `#current-time`, `#current-date`; pre-fills `#name-input` with saved name
    - Wire `#name-save-btn` click: trim input value, persist via `StorageService.write`, update `customName`, call `render()`; if value is empty string, remove name from storage
    - Call `render()` once on init then `setInterval(render, 60000)`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12_

- [x] 4. Implement FocusTimerWidget with configurable duration
  - [x] 4.1 Implement the `FocusTimerWidget` module
    - Write `formatTime(seconds)` pure function: zero-padded MM:SS for 0–5940 seconds
    - Load `durationMinutes` from storage on init (default 25); set `remaining = durationMinutes * 60`
    - Implement state machine: idle → running → paused → idle/done; wire `#timer-start`, `#timer-stop`, `#timer-reset`
    - On completion: `clearInterval`, `status = 'done'`, display "00:00", `window.alert("Focus session complete!")`
    - Wire `#timer-duration-save` click: parse `#timer-duration-input` as integer; validate range [1, 99]; if valid persist + reset timer + re-render; if invalid show inline error
    - Write `init()`: load duration, render initial display
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [x] 5. Checkpoint — Ensure greeting, name, and timer work correctly
  - Open `index.html` in a browser; verify time/date/greeting display; test custom name save and clear; test timer start/pause/reset; test saving a new duration (e.g., 10 min) and verify timer resets to 10:00. Ask the user if questions arise.

- [x] 6. Implement TodoWidget with duplicate prevention and sort
  - [x] 6.1 Implement the `TodoWidget` data model and CRUD operations
    - Define `Task` shape: `{ id, text, done }`; load tasks and sortOrder from storage on init
    - Write `isDuplicate(text, excludeId)`: returns `true` if any task (excluding `excludeId`) has matching trimmed lowercase text
    - Write `addTask(text)`: reject empty; reject duplicate (show `#todo-duplicate-warning`); else create, push, persist, re-render
    - Write `editTask(id, newText)`: reject empty; reject duplicate excluding self (show warning); else update, persist, re-render
    - Write `toggleTask(id)`: flip `done`, persist, re-render
    - Write `deleteTask(id)`: remove by id, persist, re-render
    - Write `setSortOrder(order)`: persist order to `"life_dashboard_sort_order"`, re-render
    - Write `getSortedTasks()`: returns sorted copy per `sortOrder` — `"manual"` = insertion order; `"alpha"` = `localeCompare` ascending; `"completed-last"` = incomplete first then complete, preserving relative order within each group
    - Write `persist()`: `StorageService.write`; show `.error` if fails
    - _Requirements: 3.1, 3.2, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13_

  - [x] 6.2 Implement `TodoWidget.render()` — DOM output
    - Replace `#todo-list` innerHTML using `getSortedTasks()`
    - Each item: checkbox → `toggleTask`; text span (strikethrough when done); Edit button; Delete button
    - Edit button: replace text span with inline `<input>` pre-filled with current text; save on Enter or blur (validate + call `editTask`); Escape cancels
    - Wire `#todo-add-btn` click and `#todo-input` Enter to `addTask`; clear `#todo-duplicate-warning` on new input
    - Wire `#todo-sort-select` change to `setSortOrder`; set `<select>` value to current `sortOrder` on render
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.9, 3.10, 3.11, 3.12_

- [x] 7. Implement QuickLinksWidget
  - [x] 7.1 Implement the `QuickLinksWidget` data model and CRUD operations
    - Define `Link` shape: `{ id, title, url }`
    - Write `addLink(title, url)`: validate both non-empty; create, push, persist, re-render
    - Write `deleteLink(id)`: filter, persist, re-render
    - Write `persist()`: `StorageService.write`; show `.error` if fails
    - Write `init()`: load from storage, re-render
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6_

  - [x] 7.2 Implement `QuickLinksWidget.render()` — DOM output
    - Replace `#links-list` innerHTML on every mutation
    - Each link: `<a target="_blank" rel="noopener noreferrer">` with title; Delete button
    - Wire `#link-add-btn` click to `addLink`; clear inputs on successful add
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 8. Checkpoint — Ensure to-do and quick links work correctly
  - Verify: duplicate tasks are rejected with a warning; sort orders (manual, A→Z, completed-last) work correctly; sort order persists on reload; tasks persist across reloads; links open in new tabs; empty link inputs are rejected. Ask the user if questions arise.

- [x] 9. Implement CSS layout and visual design with light/dark theme
  - [x] 9.1 Implement base styles and typography in `css/style.css`
    - Define CSS custom properties on `:root` for light mode: `--bg`, `--surface`, `--text`, `--accent`, `--border`, `--error`
    - Define overrides on `[data-theme="dark"]` for dark mode equivalents
    - Set base font family, line height, colour usage via custom properties only
    - _Requirements: 5.4, 5.5, 7.3, 7.4_

  - [x] 9.2 Implement widget grid layout
    - Greeting spans full width at top; Focus Timer and Quick Links side-by-side; To-Do List spans full width at bottom
    - All four widgets visible on 1280×800 without scrolling
    - _Requirements: 5.1_

  - [x] 9.3 Implement responsive layout for narrow viewports
    - Media query `max-width: 767px` stacks all widgets in a single column
    - No horizontal scrolling at any width
    - _Requirements: 5.6_

  - [x] 9.4 Style individual widgets and interactive states
    - Card containers, prominent timer display, strikethrough on done tasks, consistent buttons/inputs
    - Style `#theme-toggle` button with sun/moon icon or label
    - Style `#todo-duplicate-warning` in error colour (hidden by default, shown via `.visible` class or `display`)
    - Style `.error` class for storage failure messages
    - _Requirements: 3.3, 5.4, 5.5, 7.1, 7.2_

- [x] 10. Wire ThemeManager and final bootstrap
  - [x] 10.1 Implement `ThemeManager` and add full bootstrap block
    - Write `ThemeManager.init()`: read `"life_dashboard_theme"`; if absent use `window.matchMedia('(prefers-color-scheme: dark)').matches`; apply by setting/removing `data-theme="dark"` on `<html>`
    - Write `ThemeManager.toggle()`: flip theme, update attribute, persist
    - Wire `#theme-toggle` click to `ThemeManager.toggle()`
    - Call `ThemeManager.init()` as the very first line in the `DOMContentLoaded` listener to avoid theme flash
    - Call `GreetingWidget.init()`, `FocusTimerWidget.init()`, `TodoWidget.init()`, `QuickLinksWidget.init()` inside the same listener
    - _Requirements: 1.1, 2.1, 3.8, 4.6, 6.5, 7.1, 7.2, 7.5, 7.6, 7.7_

  - [x] 10.2 Cross-browser verification pass
    - Add fallback id generator if `crypto.randomUUID` is unavailable: `Date.now().toString() + Math.random().toString(36).slice(2)`
    - Verify no browser-specific issues in Chrome, Firefox, Edge, and Safari
    - _Requirements: 5.2, 5.3_

- [x] 11. Final checkpoint — Full integration review
  - Verify all five new features (light/dark toggle, custom name, configurable timer, duplicate prevention, sort) work end-to-end. Confirm all data persists across reloads. Ask the user if questions arise.

- [ ] 12. Implement optional property-based correctness tests
  - [ ]* 12.1 Write property tests for core pure functions
    - Property 1: `getGreeting(hour)` covers all 24 hours with no gaps or overlaps
    - Property 2: `formatTime(seconds)` always returns valid MM:SS for 0–5940
    - Property 3: timer reset always returns to `durationMinutes * 60`
    - Property 14: `isDuplicate` is case-insensitive
    - Property 16: valid Pomodoro duration (1–99) is accepted and persisted
    - Property 17: invalid Pomodoro duration is rejected
    - _Validates: Requirements 1.4–1.7, 2.7, 2.5, 2.8–2.10, 3.9, 3.10_

  - [ ]* 12.2 Write property tests for data operations
    - Property 4: adding a valid task grows list by one
    - Property 5: whitespace task rejected
    - Property 6: toggle is a round trip
    - Property 7: edit updates only target
    - Property 8: delete removes exactly one
    - Property 9: Task LocalStorage round trip
    - Property 10: adding a valid link grows list by one
    - Property 11: invalid link rejected
    - Property 12: link delete removes exactly one
    - Property 13: Link LocalStorage round trip
    - Property 15: completed-last sort groups correctly
    - _Validates: Requirements 3.1–3.13, 4.1–4.6, 6.1–6.2_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `ThemeManager.init()` must run before any other widget init to prevent a flash of the wrong theme
- `StorageService` is the only shared dependency — implement it first (Task 2.1)
- The Focus Timer's countdown state is intentionally not persisted; only `durationMinutes` is saved
- `isDuplicate` uses trimmed lowercase comparison so "Buy Milk" and "buy milk" are considered the same task
