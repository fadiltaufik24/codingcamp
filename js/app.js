// Life Dashboard — app.js
// Single-page dashboard: StorageService, ThemeManager, GreetingWidget,
// FocusTimerWidget, TodoWidget, QuickLinksWidget, and bootstrap.

// ---------------------------------------------------------------------------
// StorageService
// Wraps localStorage with JSON serialisation and error handling.
// Storage keys:
//   "life_dashboard_todos"           — Task[]
//   "life_dashboard_links"           — Link[]
//   "life_dashboard_theme"           — "light" | "dark"
//   "life_dashboard_name"            — string
//   "life_dashboard_pomodoro_minutes"— number (1–99)
//   "life_dashboard_sort_order"      — "manual" | "alpha" | "completed-last"
// ---------------------------------------------------------------------------
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
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }
};

// ---------------------------------------------------------------------------
// GreetingWidget
// Displays the current time, date, and a contextual greeting with optional
// custom name. Refreshes every 60 seconds.
// Storage key: "life_dashboard_name" — string
// ---------------------------------------------------------------------------
const GreetingWidget = {
  customName: '',

  /**
   * Maps an hour (0–23) to a greeting string.
   * @param {number} hour - Integer in range [0, 23]
   * @returns {string} Greeting string
   */
  getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good morning';
    if (hour >= 12 && hour <= 17) return 'Good afternoon';
    if (hour >= 18 && hour <= 21) return 'Good evening';
    return 'Good night'; // 22–23, 0–4
  },

  /**
   * Formats a Date object as "HH:MM AM/PM" (12-hour clock).
   * @param {Date} date
   * @returns {string} e.g. "09:14 AM"
   */
  formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    return `${hh}:${mm} ${period}`;
  },

  /**
   * Formats a Date object as "Weekday, Month Day, Year".
   * @param {Date} date
   * @returns {string} e.g. "Monday, June 9, 2025"
   */
  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * Renders time, date, and greeting into the DOM.
   */
  render() {
    const now = new Date();
    const hour = now.getHours();
    const greeting = this.getGreeting(hour);
    const greetingText = this.customName
      ? `${greeting}, ${this.customName}`
      : greeting;

    const greetingEl = document.getElementById('greeting-text');
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    const nameInput = document.getElementById('name-input');

    if (greetingEl) greetingEl.textContent = greetingText;
    if (timeEl) timeEl.textContent = this.formatTime(now);
    if (dateEl) dateEl.textContent = this.formatDate(now);
    if (nameInput) nameInput.value = this.customName;
  },

  /**
   * Initialises the widget: loads stored name, renders once, starts
   * a 60-second refresh interval, and wires the Save button.
   */
  init() {
    const stored = StorageService.read('life_dashboard_name');
    this.customName = (stored && typeof stored === 'string') ? stored : '';

    this.render();
    setInterval(() => this.render(), 60000);

    const saveBtn = document.getElementById('name-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('name-input');
        const trimmed = nameInput ? nameInput.value.trim() : '';
        if (trimmed) {
          StorageService.write('life_dashboard_name', trimmed);
          this.customName = trimmed;
        } else {
          // Empty — remove name from storage
          StorageService.remove('life_dashboard_name');
          this.customName = '';
        }
        this.render();
      });
    }
  }
};

// ---------------------------------------------------------------------------
// FocusTimerWidget
// Configurable countdown timer with Start / Stop / Reset controls.
// State machine: idle → running → paused → idle/done
// Storage key: "life_dashboard_pomodoro_minutes" — number (1–99)
// ---------------------------------------------------------------------------
const FocusTimerWidget = {
  durationMinutes: 25,
  remaining: 1500,
  status: 'idle', // 'idle' | 'running' | 'paused' | 'done'
  intervalId: null,

  /**
   * Pure function: converts seconds (0–5940) to zero-padded "MM:SS".
   * Examples: 1500 → "25:00", 90 → "01:30", 5 → "00:05"
   * @param {number} seconds - Integer in range [0, 5940]
   * @returns {string} e.g. "25:00"
   */
  formatTime(seconds) {
    const mm = Math.floor(seconds / 60);
    const ss = seconds % 60;
    return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  },

  /**
   * Updates #timer-display with the current remaining time.
   * Also clears any stale duration-error message.
   */
  render() {
    const display = document.getElementById('timer-display');
    if (display) {
      display.textContent = this.formatTime(this.remaining);
    }

    // Clear any previous inline duration error on render
    const errorEl = document.getElementById('timer-duration-error');
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }
  },

  /**
   * Loads persisted duration, renders the initial display, and wires
   * all timer control buttons and the duration-save button.
   */
  init() {
    // Load persisted duration (default 25 minutes)
    const stored = StorageService.read('life_dashboard_pomodoro_minutes');
    if (stored !== null && Number.isInteger(stored) && stored >= 1 && stored <= 99) {
      this.durationMinutes = stored;
    } else {
      this.durationMinutes = 25;
    }

    // Set remaining to full duration
    this.remaining = this.durationMinutes * 60;
    this.status = 'idle';
    this.intervalId = null;

    // Render initial display
    this.render();

    // Pre-fill duration input with current duration
    const durationInput = document.getElementById('timer-duration-input');
    if (durationInput) {
      durationInput.value = this.durationMinutes;
    }

    // --- Wire up Start button ---
    const startBtn = document.getElementById('timer-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (this.status === 'idle' || this.status === 'paused') {
          this.status = 'running';
          this.intervalId = setInterval(() => {
            this.remaining -= 1;
            if (this.remaining <= 0) {
              this.remaining = 0;
              clearInterval(this.intervalId);
              this.intervalId = null;
              this.status = 'done';
              this.render();
              window.alert('Focus session complete!');
            } else {
              this.render();
            }
          }, 1000);
        }
      });
    }

    // --- Wire up Stop (pause) button ---
    const stopBtn = document.getElementById('timer-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        if (this.status === 'running') {
          clearInterval(this.intervalId);
          this.intervalId = null;
          this.status = 'paused';
        }
      });
    }

    // --- Wire up Reset button ---
    const resetBtn = document.getElementById('timer-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.remaining = this.durationMinutes * 60;
        this.status = 'idle';
        this.render();
      });
    }

    // --- Wire up Duration Save button ---
    const durationSaveBtn = document.getElementById('timer-duration-save');
    const errorEl = document.getElementById('timer-duration-error');
    if (durationSaveBtn) {
      durationSaveBtn.addEventListener('click', () => {
        const inputEl = document.getElementById('timer-duration-input');
        const rawValue = inputEl ? inputEl.value : '';
        const parsed = parseInt(rawValue, 10);

        // Validate: must be an integer in range [1, 99]
        const isValid =
          !isNaN(parsed) &&
          Number.isInteger(parsed) &&
          parsed >= 1 &&
          parsed <= 99;

        if (isValid) {
          // Persist new duration
          StorageService.write('life_dashboard_pomodoro_minutes', parsed);
          this.durationMinutes = parsed;

          // Reset timer state
          clearInterval(this.intervalId);
          this.intervalId = null;
          this.remaining = this.durationMinutes * 60;
          this.status = 'idle';

          // Clear any error and re-render
          if (errorEl) {
            errorEl.hidden = true;
            errorEl.textContent = '';
          }
          this.render();
        } else {
          // Show inline error
          if (errorEl) {
            errorEl.textContent = 'Please enter a whole number between 1 and 99.';
            errorEl.hidden = false;
          }
        }
      });
    }
  }
};

// ---------------------------------------------------------------------------
// TodoWidget
// Full CRUD for tasks with duplicate prevention, sort ordering, and persistence.
// Task shape: { id: string, text: string, done: boolean }
// Storage keys:
//   "life_dashboard_todos"       — Task[]
//   "life_dashboard_sort_order"  — "manual" | "alpha" | "completed-last"
// ---------------------------------------------------------------------------

/**
 * Generates a unique id using crypto.randomUUID when available,
 * falling back to a timestamp + random string combination.
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

const TodoWidget = {
  tasks: [],
  sortOrder: 'manual',

  /**
   * Returns true if any task (excluding the one with excludeId) has text
   * that matches the given text after trimming and lowercasing.
   * @param {string} text
   * @param {string|null} excludeId - id of task to exclude from check (for edits)
   * @returns {boolean}
   */
  isDuplicate(text, excludeId = null) {
    const normalised = text.trim().toLowerCase();
    return this.tasks
      .filter(t => t.id !== excludeId)
      .some(t => t.text.trim().toLowerCase() === normalised);
  },

  /**
   * Adds a new task if text is non-empty and not a duplicate.
   * Shows #todo-duplicate-warning (by removing the hidden attribute) on duplicate.
   * @param {string} text
   */
  addTask(text) {
    if (text.trim().length < 1) return;

    if (this.isDuplicate(text)) {
      const warning = document.getElementById('todo-duplicate-warning');
      if (warning) warning.removeAttribute('hidden');
      return;
    }

    const task = {
      id: generateId(),
      text: text.trim(),
      done: false
    };
    this.tasks.push(task);
    this.persist();
    this.render();
  },

  /**
   * Updates the text of an existing task if newText is non-empty and not a
   * duplicate (excluding the task being edited).
   * Shows #todo-duplicate-warning on duplicate.
   * @param {string} id
   * @param {string} newText
   */
  editTask(id, newText) {
    if (newText.trim().length < 1) return;

    if (this.isDuplicate(newText, id)) {
      const warning = document.getElementById('todo-duplicate-warning');
      if (warning) warning.removeAttribute('hidden');
      return;
    }

    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.text = newText.trim();
      this.persist();
      this.render();
    }
  },

  /**
   * Flips the done boolean for the task with the given id.
   * @param {string} id
   */
  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.done = !task.done;
      this.persist();
      this.render();
    }
  },

  /**
   * Removes the task with the given id from the list.
   * @param {string} id
   */
  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.persist();
    this.render();
  },

  /**
   * Sets the sort order, persists it, and re-renders.
   * @param {string} order - "manual" | "alpha" | "completed-last"
   */
  setSortOrder(order) {
    this.sortOrder = order;
    StorageService.write('life_dashboard_sort_order', order);
    this.render();
  },

  /**
   * Returns a sorted copy of tasks according to the current sortOrder.
   * - "manual":         insertion order (no sort)
   * - "alpha":          localeCompare ascending, case-insensitive
   * - "completed-last": incomplete first, complete last; relative order preserved within each group
   * @returns {Array}
   */
  getSortedTasks() {
    const copy = this.tasks.slice();

    if (this.sortOrder === 'alpha') {
      copy.sort((a, b) =>
        a.text.localeCompare(b.text, undefined, { sensitivity: 'base' })
      );
    } else if (this.sortOrder === 'completed-last') {
      // Stable partition: false (incomplete) before true (complete)
      const incomplete = copy.filter(t => !t.done);
      const complete = copy.filter(t => t.done);
      return incomplete.concat(complete);
    }
    // "manual": return as-is (insertion order)
    return copy;
  },

  /**
   * Persists the tasks array to localStorage.
   * Shows an inline error element if the write fails.
   */
  persist() {
    const success = StorageService.write('life_dashboard_todos', this.tasks);
    if (!success) {
      // Surface a storage error in the todo widget if possible
      const container = document.getElementById('todo');
      if (container) {
        let errorEl = container.querySelector('.storage-error');
        if (!errorEl) {
          errorEl = document.createElement('p');
          errorEl.className = 'error storage-error';
          container.appendChild(errorEl);
        }
        errorEl.textContent = 'Could not save data.';
      }
    }
  },

  /**
   * Fully re-renders the #todo-list using getSortedTasks(), syncs the sort
   * select value, and wires per-item event handlers.
   */
  render() {
    const list = document.getElementById('todo-list');
    if (!list) return;

    // Sync sort select to current sortOrder
    const sortSelect = document.getElementById('todo-sort-select');
    if (sortSelect) {
      sortSelect.value = this.sortOrder;
    }

    // Clear and rebuild the list
    list.innerHTML = '';

    const sorted = this.getSortedTasks();
    sorted.forEach(task => {
      const li = document.createElement('li');
      li.dataset.id = task.id;

      // --- Checkbox ---
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.addEventListener('change', () => {
        this.toggleTask(task.id);
      });

      // --- Text span ---
      const span = document.createElement('span');
      span.className = 'task-text' + (task.done ? ' done' : '');
      span.textContent = task.text;

      // --- Edit button ---
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-edit';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        // Replace the text span with an inline input
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.value = task.text;
        editInput.className = 'edit-input';

        li.replaceChild(editInput, span);
        editInput.focus();
        editInput.select();

        const save = () => {
          const newText = editInput.value;
          this.editTask(task.id, newText);
          // editTask calls render(), so the inline input is replaced automatically
        };

        const cancel = () => {
          this.render();
        };

        let saved = false;

        editInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            saved = true;
            save();
          } else if (e.key === 'Escape') {
            saved = true;
            cancel();
          }
        });

        editInput.addEventListener('blur', () => {
          if (!saved) {
            saved = true;
            save();
          }
        });
      });

      // --- Delete button ---
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        this.deleteTask(task.id);
      });

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  },

  /**
   * Loads tasks and sortOrder from storage (defaulting to [] and "manual"),
   * wires add-task and sort controls, then renders the initial state.
   */
  init() {
    const storedTasks = StorageService.read('life_dashboard_todos');
    this.tasks = Array.isArray(storedTasks) ? storedTasks : [];

    const storedOrder = StorageService.read('life_dashboard_sort_order');
    this.sortOrder =
      storedOrder === 'alpha' || storedOrder === 'completed-last'
        ? storedOrder
        : 'manual';

    this.render();

    // --- Wire #todo-add-btn click ---
    const addBtn = document.getElementById('todo-add-btn');
    const todoInput = document.getElementById('todo-input');

    const doAdd = () => {
      if (!todoInput) return;
      const text = todoInput.value;
      this.addTask(text);
      // Only clear input if task was actually added (no duplicate warning)
      const warning = document.getElementById('todo-duplicate-warning');
      if (!warning || warning.hasAttribute('hidden')) {
        todoInput.value = '';
      }
    };

    if (addBtn) {
      addBtn.addEventListener('click', doAdd);
    }

    // --- Wire #todo-input Enter key ---
    if (todoInput) {
      todoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          doAdd();
        }
      });

      // Clear duplicate warning on any new input
      todoInput.addEventListener('input', () => {
        const warning = document.getElementById('todo-duplicate-warning');
        if (warning) warning.setAttribute('hidden', '');
      });
    }

    // --- Wire #todo-sort-select change ---
    const sortSelect = document.getElementById('todo-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.setSortOrder(sortSelect.value);
      });
    }
  }
};

// ---------------------------------------------------------------------------
// QuickLinksWidget
// Stores and displays user-defined URL shortcuts.
// Link shape: { id: string, title: string, url: string }
// Storage key: "life_dashboard_links" — Link[]
// ---------------------------------------------------------------------------
const QuickLinksWidget = {
  links: [],

  /**
   * Validates title and url, creates a new Link, and persists + renders.
   * If either field is empty after trimming, rejects silently and focuses
   * the first invalid field.
   * @param {string} title
   * @param {string} url
   */
  addLink(title, url) {
    const titleTrimmed = title.trim();
    const urlTrimmed = url.trim();

    if (titleTrimmed.length < 1) {
      const titleInput = document.getElementById('link-title-input');
      if (titleInput) titleInput.focus();
      return;
    }

    if (urlTrimmed.length < 1) {
      const urlInput = document.getElementById('link-url-input');
      if (urlInput) urlInput.focus();
      return;
    }

    const link = {
      id: generateId(),
      title: titleTrimmed,
      url: urlTrimmed
    };

    this.links.push(link);
    this.persist();
    this.render();
  },

  /**
   * Removes the Link with the given id, then persists and re-renders.
   * @param {string} id
   */
  deleteLink(id) {
    this.links = this.links.filter(l => l.id !== id);
    this.persist();
    this.render();
  },

  /**
   * Persists the links array to localStorage.
   * Shows an inline error inside #quick-links if the write fails.
   */
  persist() {
    const success = StorageService.write('life_dashboard_links', this.links);
    if (!success) {
      const container = document.getElementById('quick-links');
      if (container) {
        let errorEl = container.querySelector('.storage-error');
        if (!errorEl) {
          errorEl = document.createElement('p');
          errorEl.className = 'error storage-error';
          container.appendChild(errorEl);
        }
        errorEl.textContent = 'Could not save data.';
      }
    }
  },

  /**
   * Fully re-renders #links-list from the current links array.
   * Each item is an <li> containing an <a> (opens in new tab) and a Delete button.
   */
  render() {
    const list = document.getElementById('links-list');
    if (!list) return;

    list.innerHTML = '';

    this.links.forEach(link => {
      const li = document.createElement('li');

      // Anchor — opens in a new tab safely
      const a = document.createElement('a');
      a.href = link.url;
      a.textContent = link.title;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        this.deleteLink(link.id);
      });

      li.appendChild(a);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  },

  /**
   * Loads links from storage (defaulting to []), renders the initial state,
   * and wires the #link-add-btn click handler.
   */
  init() {
    const stored = StorageService.read('life_dashboard_links');
    this.links = Array.isArray(stored) ? stored : [];

    this.render();

    // Wire #link-add-btn
    const addBtn = document.getElementById('link-add-btn');
    const titleInput = document.getElementById('link-title-input');
    const urlInput = document.getElementById('link-url-input');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const title = titleInput ? titleInput.value : '';
        const url = urlInput ? urlInput.value : '';

        const beforeCount = this.links.length;
        this.addLink(title, url);
        const afterCount = this.links.length;

        // Clear inputs only when a link was actually added
        if (afterCount > beforeCount) {
          if (titleInput) titleInput.value = '';
          if (urlInput) urlInput.value = '';
        }
      });
    }
  }
};

// ---------------------------------------------------------------------------
// ThemeManager
// Applies and persists the user's chosen colour scheme (light or dark).
// Reads OS preference (prefers-color-scheme) as fallback when no stored value.
// Storage key: "life_dashboard_theme" — "light" | "dark"
//
// Note: generateId() above already includes the crypto.randomUUID fallback
// (Date.now().toString() + Math.random().toString(36).slice(2)), satisfying
// the cross-browser requirement (Task 10.2).
// ---------------------------------------------------------------------------
const ThemeManager = {
  /** The currently active theme: "light" or "dark". */
  current: 'light',

  /**
   * Reads the persisted theme from storage; if absent, falls back to the
   * OS/browser colour-scheme preference. Applies the resolved theme and
   * updates the toggle button icon.
   * Must be called BEFORE other widget inits to prevent a flash of the
   * wrong theme.
   */
  init() {
    const stored = StorageService.read('life_dashboard_theme');

    if (stored === 'dark' || stored === 'light') {
      this.current = stored;
    } else {
      // No stored preference — use OS/browser preference
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.current = prefersDark ? 'dark' : 'light';
    }

    this._apply(this.current);
    this._updateButton();

    // Wire the toggle button
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggle();
      });
    }
  },

  /**
   * Flips the current theme between "light" and "dark", applies the new
   * theme to <html>, persists it to storage, and updates the button icon.
   */
  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    this._apply(this.current);
    StorageService.write('life_dashboard_theme', this.current);
    this._updateButton();
  },

  /**
   * Sets or removes the data-theme="dark" attribute on <html>.
   * CSS custom properties keyed off [data-theme="dark"] handle all colour changes.
   * @param {string} theme - "dark" | "light"
   */
  _apply(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  },

  /**
   * Updates the #theme-toggle button text content:
   *   dark mode  → ☀️  (clicking will switch to light)
   *   light mode → 🌙  (clicking will switch to dark)
   */
  _updateButton() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = this.current === 'dark' ? '☀️' : '🌙';
    }
  }
};

// ---------------------------------------------------------------------------
// Bootstrap
// DOMContentLoaded listener that initialises all modules in the correct order.
// ThemeManager.init() runs FIRST to apply the stored/OS theme immediately and
// prevent a flash of the wrong colour scheme before the rest of the page loads.
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();        // Must be first — prevents theme flash
  GreetingWidget.init();
  FocusTimerWidget.init();
  TodoWidget.init();
  QuickLinksWidget.init();
});
