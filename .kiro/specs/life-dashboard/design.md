# Design Document — Life Dashboard

## Overview

The Life Dashboard is a zero-dependency, single-page web application that renders four utility widgets on one screen. It is built with HTML, CSS, and Vanilla JavaScript only — no build tools, no frameworks, no server. All persistent state lives in `localStorage`. The entire application is three files:

```
index.html        — markup skeleton and widget containers
css/style.css     — all visual styling (light/dark via CSS custom properties)
js/app.js         — all application logic
```

---

## Architecture

The application follows a simple module pattern inside `js/app.js`. Each widget is an independent module (plain JS object/closure) that owns its DOM references, its state, and its storage key. A thin bootstrap section at the bottom calls each module's `init()` function when the DOM is ready.

```
app.js
├── StorageService       — wrapper around localStorage with error handling
├── ThemeManager         — light/dark mode toggle and OS preference detection
├── GreetingWidget       — time/date display, greeting logic, custom name
├── FocusTimerWidget     — countdown timer state machine, configurable duration
├── TodoWidget           — task CRUD, duplicate prevention, sort, persistence
├── QuickLinksWidget     — links CRUD and persistence
└── bootstrap            — calls init() on all modules
```

No global variables are shared between widgets except through the StorageService.

---

## Components

### StorageService

Wraps `localStorage.getItem` and `localStorage.setItem` with try/catch. Returns `null` on read failure and `false` on write failure, rather than throwing. Callers check the return value and display inline error messages when writes fail.

```js
const StorageService = {
  read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }
};
```

**Storage keys used across all modules:**
| Key | Module | Value |
|-----|--------|-------|
| `"life_dashboard_todos"` | TodoWidget | `Task[]` |
| `"life_dashboard_links"` | QuickLinksWidget | `Link[]` |
| `"life_dashboard_theme"` | ThemeManager | `"light"` \| `"dark"` |
| `"life_dashboard_name"` | GreetingWidget | `string` |
| `"life_dashboard_pomodoro_minutes"` | FocusTimerWidget | `number` (1–99) |
| `"life_dashboard_sort_order"` | TodoWidget | `"manual"` \| `"alpha"` \| `"completed-last"` |

---

### ThemeManager

**Responsibilities:** Apply and persist the user's chosen colour scheme (light or dark). Reads OS preference as fallback.

**Logic:**
- On `init()`: read `"life_dashboard_theme"` from storage. If absent, read `window.matchMedia('(prefers-color-scheme: dark)').matches`. Apply the resolved theme by toggling a `data-theme="dark"` attribute on `<html>`.
- On toggle: flip the theme, update `data-theme`, persist to storage.
- CSS custom properties on `:root` and `[data-theme="dark"]` drive all colour changes — no JS-side colour manipulation.

**Key DOM elements:**
- `#theme-toggle` — button that switches between light and dark

---

### GreetingWidget

**Responsibilities:** Display current time (HH:MM, 12-hour with AM/PM), current date (e.g., "Monday, June 9"), a contextual greeting, and the user's Custom Name. Refresh every 60 seconds.

**Greeting mapping (pure function):**

```
getGreeting(hour):
  05 – 11  →  "Good morning"
  12 – 17  →  "Good afternoon"
  18 – 21  →  "Good evening"
  22 – 04  →  "Good night"
```

**Name logic:** If `customName` is non-empty, greeting reads `"Good morning, Alex"`. If empty, greeting reads `"Good morning"`.

**Persisted state:** `"life_dashboard_name"` — string (may be empty).

**Key DOM elements:**
- `#greeting-text` — greeting message + optional name
- `#current-time` — HH:MM AM/PM
- `#current-date` — full date string
- `#name-input` — text input for the custom name
- `#name-save-btn` — saves the name to storage and re-renders the greeting

---

### FocusTimerWidget

**Responsibilities:** Manage a configurable countdown timer (default 25 minutes) with Start, Stop, Reset controls and a duration setting input.

**State machine:**

```
IDLE  ──[start]──►  RUNNING
RUNNING  ──[stop]──►  PAUSED
PAUSED  ──[start]──►  RUNNING
RUNNING / PAUSED  ──[reset]──►  IDLE (remaining = durationSeconds)
RUNNING  ──[tick reaches 0]──►  DONE
DONE  ──[reset]──►  IDLE
```

**Internal state:**
```js
{
  durationMinutes: 25,     // persisted; 1–99
  remaining: 1500,         // seconds left (= durationMinutes * 60 on init/reset)
  status: 'idle',          // 'idle' | 'running' | 'paused' | 'done'
  intervalId: null         // setInterval handle
}
```

**`formatTime(seconds)` — pure function:**
```
input: 0 ≤ seconds ≤ 5940 (99 min * 60)
output: "MM:SS" string, both parts always zero-padded to 2 digits
examples: 1500 → "25:00", 90 → "01:30", 5 → "00:05"
```

**Duration save logic:** Validate input is an integer in range [1, 99]. On valid save: persist, reset timer to new duration, re-render. On invalid: show inline error, leave duration unchanged.

**Completion behavior:** When `remaining` reaches 0, call `clearInterval`, set `status = 'done'`, update display to "00:00", trigger `window.alert("Focus session complete!")`.

**Key DOM elements:**
- `#timer-display` — MM:SS readout
- `#timer-start` — start/resume button
- `#timer-stop` — pause button
- `#timer-reset` — reset button
- `#timer-duration-input` — numeric input (1–99 minutes)
- `#timer-duration-save` — saves the new duration

---

### TodoWidget

**Responsibilities:** Full CRUD for tasks, duplicate prevention, and sort ordering. Each Task is a plain object:

```js
{
  id: string,          // crypto.randomUUID() or Date.now().toString()
  text: string,        // non-empty, trimmed description
  done: boolean        // completion state
}
```

**Storage keys:** `"life_dashboard_todos"`, `"life_dashboard_sort_order"`

**Validation rules:**
- Task text after `.trim()` must have length ≥ 1.
- The trimmed, lowercased text must not match any existing task's trimmed, lowercased text (duplicate check applies to both add and edit).

**Duplicate detection:**
```js
isDuplicate(text, excludeId = null):
  tasks.filter(t => t.id !== excludeId)
       .some(t => t.text.trim().toLowerCase() === text.trim().toLowerCase())
```

**Sort orders:**
| Value | Behaviour |
|---|---|
| `"manual"` | Insertion order (default) |
| `"alpha"` | `text.localeCompare` ascending, case-insensitive |
| `"completed-last"` | Incomplete tasks first, completed tasks last; within each group, insertion order |

**Operations:**
- `addTask(text)` — validate non-empty + non-duplicate, create Task, append, persist, re-render
- `editTask(id, newText)` — validate non-empty + non-duplicate (excluding self), update, persist, re-render
- `toggleTask(id)` — flip `done`, persist, re-render
- `deleteTask(id)` — remove by id, persist, re-render
- `setSortOrder(order)` — persist order, re-render
- `getSortedTasks()` — returns a sorted copy of `tasks` per current `sortOrder`

**Rendering:** Full re-render of `#todo-list` on every mutation using `getSortedTasks()`. Each task item shows:
- Checkbox (reflects `done` state)
- Task text (strikethrough when `done`)
- Edit button
- Delete button

A `#todo-sort-select` `<select>` element above the list controls the sort order.

**Key DOM elements:**
- `#todo-input` — text input
- `#todo-add-btn` — add button
- `#todo-list` — `<ul>` container
- `#todo-sort-select` — sort order dropdown
- `#todo-duplicate-warning` — inline warning shown on duplicate submission

---

### QuickLinksWidget

**Responsibilities:** Store and display user-defined URL shortcuts. Each Link is:

```js
{
  id: string,    // crypto.randomUUID() or Date.now().toString()
  title: string, // display label, non-empty trimmed
  url: string    // non-empty trimmed; opened in new tab on click
}
```

**Storage key:** `"life_dashboard_links"`

**Validation rule:** Both `title.trim()` and `url.trim()` must have length ≥ 1.

**Operations:**
- `addLink(title, url)` — creates Link, appends to array, persists, re-renders
- `deleteLink(id)` — removes Link by id, persists, re-renders

**Key DOM elements:**
- `#link-title-input` — title text input
- `#link-url-input` — URL text input
- `#link-add-btn` — add button
- `#links-list` — container for rendered links

---

## Data Models

### Task (TodoWidget)
| Field | Type    | Constraints                  |
|-------|---------|------------------------------|
| id    | string  | unique, non-empty            |
| text  | string  | non-empty after trim; unique case-insensitively |
| done  | boolean | true = complete, false = not |

### Link (QuickLinksWidget)
| Field | Type   | Constraints          |
|-------|--------|----------------------|
| id    | string | unique, non-empty    |
| title | string | non-empty after trim |
| url   | string | non-empty after trim |

### Settings (various modules)
| Key | Type | Default |
|-----|------|---------|
| `life_dashboard_theme` | `"light"` \| `"dark"` | OS preference |
| `life_dashboard_name` | string | `""` |
| `life_dashboard_pomodoro_minutes` | number (1–99) | `25` |
| `life_dashboard_sort_order` | `"manual"` \| `"alpha"` \| `"completed-last"` | `"manual"` |

---

## Layout

Single-column or 2×2 grid layout depending on viewport width.

```
┌────────────────────────────────────────────────┐
│   [☀/🌙]           Greeting Widget             │
│        "Good morning, Alex — 09:14 AM"        │
│              Monday, June 9, 2025              │
│        [Name: ______] [Save]                   │
├──────────────────────┬─────────────────────────┤
│    Focus Timer       │       Quick Links        │
│      25:00           │  [+ Add Link]            │
│  [Start][Stop][Reset]│  [Google][x] [GitHub][x]│
│  Duration: [25] [Set]│                          │
├──────────────────────┴─────────────────────────┤
│              To-Do List                        │
│  [Add task input...]  [Add]   Sort: [▾]       │
│  ○ Buy groceries                  [Edit][Del] │
│  ✓ ~~Read book~~                  [Edit][Del] │
└────────────────────────────────────────────────┘
```

On viewports < 768px, all sections stack vertically in a single column.

---

## Theme Implementation

All colours are defined as CSS custom properties:

```css
:root {
  --bg: #ffffff;
  --surface: #f5f5f5;
  --text: #1a1a1a;
  --accent: #4f8ef7;
  /* ... */
}
[data-theme="dark"] {
  --bg: #1a1a2e;
  --surface: #16213e;
  --text: #e0e0e0;
  --accent: #7eb8f7;
  /* ... */
}
```

The `ThemeManager` only toggles `document.documentElement.setAttribute('data-theme', 'dark')` or removes it. No other JS-side colour manipulation is needed.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `localStorage` read throws | `StorageService.read` returns `null`; widget initializes with empty/default state |
| `localStorage` write throws | `StorageService.write` returns `false`; widget shows inline `<p class="error">Could not save data.</p>` |
| User submits empty task | Input rejected silently; input field stays focused |
| User submits duplicate task | `#todo-duplicate-warning` shown with message "A task with this name already exists." |
| User submits link with missing field | Input rejected silently; first invalid field gets focus |
| Invalid Pomodoro duration | Inline error shown next to duration input; duration unchanged |

---

## File Structure

```
index.html          — semantic HTML, widget containers, no inline JS/CSS
css/
  style.css         — all styles: light/dark themes, layout, typography, widgets, responsive
js/
  app.js            — StorageService + ThemeManager + all widget modules + bootstrap
```

---

## Components and Interfaces

All modules are plain JavaScript objects defined in `js/app.js`. They communicate only through the `StorageService` — no direct cross-module calls.

### Public interfaces

**StorageService**
```js
StorageService.read(key: string): any | null
StorageService.write(key: string, value: any): boolean
```

**ThemeManager**
```js
ThemeManager.init(): void   // reads storage/OS preference, applies theme
ThemeManager.toggle(): void // flips theme, persists
```

**GreetingWidget**
```js
GreetingWidget.init(): void // renders once, starts 60s interval
```

**FocusTimerWidget**
```js
FocusTimerWidget.init(): void // loads duration, renders idle state
```

**TodoWidget**
```js
TodoWidget.init(): void // loads tasks + sort order, renders
```

**QuickLinksWidget**
```js
QuickLinksWidget.init(): void // loads links, renders
```

No module exposes methods intended to be called by other modules at runtime.

## Testing Strategy

No automated test framework is required (NFR-1). Correctness is verified through:

1. **Manual browser testing** at each checkpoint task (Tasks 5, 8, 11) — open `index.html` directly in Chrome, Firefox, Edge, and Safari and exercise each widget.
2. **Optional property-based tests** (Task 12, marked `*`) — pure functions (`getGreeting`, `formatTime`, `isDuplicate`, `getSortedTasks`) can be tested in isolation by extracting them into a test script and running assertions against a large range of inputs.
3. **Cross-browser check** (Task 10.2) — verify `crypto.randomUUID` fallback and no console errors in all target browsers.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Greeting maps every hour to a correct message

For any integer hour value in the range 0–23, the `getGreeting(hour)` function SHALL return exactly one of "Good morning", "Good afternoon", "Good evening", or "Good night", with no gaps and no overlaps.

**Validates: Requirements 1.4, 1.5, 1.6, 1.7**

---

### Property 2: Timer format is always valid MM:SS

For any integer number of seconds in the range 0–5940, the `formatTime(seconds)` function SHALL return a string matching the pattern `MM:SS` where both MM and SS are zero-padded to exactly two digits and SS is in the range 00–59.

**Validates: Requirements 2.7**

---

### Property 3: Timer reset always returns to initial state

For any Focus Timer state, calling reset SHALL set `remaining` to exactly `durationMinutes * 60` and `status` to `'idle'`.

**Validates: Requirements 2.5**

---

### Property 4: Adding a valid task grows the list by one

For any task list and any non-empty, non-duplicate task description, calling `addTask(text)` SHALL increase the task array length by exactly 1 and the new task SHALL contain the trimmed input text.

**Validates: Requirements 3.1**

---

### Property 5: Whitespace-only task descriptions are rejected

For any string whose trimmed length equals 0, calling `addTask(text)` SHALL leave the task array unchanged.

**Validates: Requirements 3.2**

---

### Property 6: Toggle completion is a round trip

For any Task, calling `toggleTask(id)` twice in succession SHALL return the Task's `done` field to its original value.

**Validates: Requirements 3.3, 3.4**

---

### Property 7: Task edit updates only the target text

For any task list and any valid non-duplicate new description, calling `editTask(id, newText)` SHALL update exactly the Task with the matching id, leave all other Tasks unchanged, and set that Task's text to `newText.trim()`.

**Validates: Requirements 3.5**

---

### Property 8: Task deletion removes exactly one item

For any task list containing a Task with a given id, calling `deleteTask(id)` SHALL reduce the list length by exactly 1 and the deleted Task's id SHALL no longer appear in the list.

**Validates: Requirements 3.6**

---

### Property 9: Task list Local Storage round trip

For any array of Task objects, serializing via `StorageService.write` and reading back via `StorageService.read` SHALL return an array structurally equivalent to the original.

**Validates: Requirements 3.7, 3.8, 6.1**

---

### Property 10: Adding a valid link grows the links list by one

For any links list and any link where both title and url are non-empty after trimming, calling `addLink(title, url)` SHALL increase the links array length by exactly 1.

**Validates: Requirements 4.1**

---

### Property 11: Invalid link input is rejected

For any link where `title.trim()` is empty OR `url.trim()` is empty, calling `addLink(title, url)` SHALL leave the links array unchanged.

**Validates: Requirements 4.2**

---

### Property 12: Link deletion removes exactly one item

For any links list containing a Link with a given id, calling `deleteLink(id)` SHALL reduce the list length by exactly 1 and the deleted id SHALL no longer appear in the list.

**Validates: Requirements 4.4**

---

### Property 13: Links list Local Storage round trip

For any array of Link objects, serializing via `StorageService.write` and reading back via `StorageService.read` SHALL return an array structurally equivalent to the original.

**Validates: Requirements 4.5, 4.6, 6.2**

---

### Property 14: Duplicate task detection is case-insensitive

For any task list containing a task with text T, calling `isDuplicate(text)` with any string whose `trim().toLowerCase()` equals `T.trim().toLowerCase()` SHALL return `true`, regardless of the original casing.

**Validates: Requirements 3.9, 3.10**

---

### Property 15: Sort order — completed-last groups correctly

For any task list with a mix of done and not-done tasks, `getSortedTasks('completed-last')` SHALL return all tasks where `done === false` before all tasks where `done === true`, with relative insertion order preserved within each group.

**Validates: Requirements 3.11, 3.12**

---

### Property 16: Valid Pomodoro duration is accepted and persisted

For any integer N in the range 1–99, saving N as the Pomodoro duration SHALL set `durationMinutes` to N, set `remaining` to N * 60, and persist N to Local Storage.

**Validates: Requirements 2.8, 2.9**

---

### Property 17: Invalid Pomodoro duration is rejected

For any value outside the range 1–99, saving it as the Pomodoro duration SHALL leave `durationMinutes` unchanged.

**Validates: Requirements 2.10**
