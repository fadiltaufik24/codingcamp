# Requirements Document

## Introduction

The Life Dashboard is a single-page web application built with HTML, CSS, and Vanilla JavaScript (no frameworks). It runs entirely in the browser with no backend server. All persistent data is stored in the browser's Local Storage API. The dashboard displays four features on one screen: a greeting with current time and date, a configurable focus timer, a to-do list, and a quick links panel. The application must work in modern browsers (Chrome, Firefox, Edge, Safari) and may be used as a standalone web app or browser extension.

## Glossary

- **Dashboard**: The single HTML page (`index.html`) that renders all four feature widgets.
- **Greeting Widget**: The section of the Dashboard that displays the current time, date, a personalised greeting using the user's custom name, and a time-of-day greeting message.
- **Focus Timer**: The countdown timer widget with a user-configurable duration (default 25 minutes).
- **Pomodoro Duration**: The number of minutes the Focus Timer counts down from, set by the user and stored in Local Storage.
- **To-Do List**: The widget that allows the user to manage a list of tasks.
- **Task**: A single to-do item with a text description and a completion state (done or not done).
- **Duplicate Task**: A task whose trimmed, case-insensitive text exactly matches an existing task in the list.
- **Sort Order**: The ordering applied to the task list — either manual (insertion order), alphabetical ascending, or completed-last.
- **Quick Links**: The widget that stores and displays user-defined shortcut URLs.
- **Link**: A Quick Links entry consisting of a display title and a URL.
- **Local Storage**: The browser's `localStorage` API used to persist all user data between page loads.
- **Active Timer**: A Focus Timer that is currently counting down.
- **Idle Timer**: A Focus Timer that is stopped or has been reset and is not counting down.
- **Theme**: The colour scheme applied to the entire Dashboard — either Light or Dark.
- **Custom Name**: A user-provided first name displayed in the Greeting Widget in place of a generic greeting.

## Requirements

### Requirement 1: Greeting Widget

**User Story:** As a user, I want to see the current time, date, and a personalised contextual greeting when I open the dashboard, so that I feel welcomed and oriented to the present moment at a glance.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Greeting Widget SHALL display the current local time in HH:MM format (24-hour or 12-hour with AM/PM).
2. WHEN the Dashboard loads, THE Greeting Widget SHALL display the current local date including the day of week, month, and day number.
3. WHILE the Dashboard is open, THE Greeting Widget SHALL update the displayed time every 60 seconds without requiring a page reload.
4. WHEN the local time is between 05:00 and 11:59, THE Greeting Widget SHALL display the message "Good morning".
5. WHEN the local time is between 12:00 and 17:59, THE Greeting Widget SHALL display the message "Good afternoon".
6. WHEN the local time is between 18:00 and 21:59, THE Greeting Widget SHALL display the message "Good evening".
7. WHEN the local time is between 22:00 and 04:59, THE Greeting Widget SHALL display the message "Good night".
8. WHEN a Custom Name has been saved, THE Greeting Widget SHALL append the name to the greeting message (e.g., "Good morning, Alex").
9. WHEN no Custom Name has been saved, THE Greeting Widget SHALL display the greeting without a name suffix.
10. THE Dashboard SHALL provide a text input that allows the user to enter or update their Custom Name.
11. WHEN the user saves a Custom Name, THE Dashboard SHALL persist it to Local Storage and update the greeting immediately.
12. WHEN the user clears the Custom Name field and saves, THE Dashboard SHALL remove the name from the greeting and from Local Storage.

### Requirement 2: Focus Timer

**User Story:** As a user, I want a configurable countdown timer with start, stop, and reset controls, so that I can structure focused work sessions to my preferred duration.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Focus Timer SHALL display an Idle Timer showing the saved Pomodoro Duration (defaulting to 25:00 if none is saved).
2. WHEN the user activates the start control, THE Focus Timer SHALL begin counting down from the current displayed time in one-second intervals.
3. WHILE the Focus Timer is Active, THE Focus Timer SHALL update the displayed time every second.
4. WHEN the user activates the stop control WHILE the Focus Timer is Active, THE Focus Timer SHALL pause the countdown and retain the remaining time.
5. WHEN the user activates the reset control, THE Focus Timer SHALL stop any active countdown and reset the displayed time to the saved Pomodoro Duration.
6. WHEN the Focus Timer countdown reaches 00:00, THE Focus Timer SHALL stop automatically and notify the user via a browser alert or audible signal.
7. THE Focus Timer SHALL display remaining time in MM:SS format at all times.
8. THE Focus Timer widget SHALL provide a numeric input that allows the user to set the Pomodoro Duration in whole minutes (minimum 1, maximum 99).
9. WHEN the user saves a new Pomodoro Duration, THE Focus Timer SHALL persist the value to Local Storage, reset the timer to the new duration, and display the new MM:00 time.
10. WHEN the user attempts to set a Pomodoro Duration outside the range 1–99 minutes, THE Focus Timer SHALL reject the input and retain the current duration.

### Requirement 3: To-Do List

**User Story:** As a user, I want to add, edit, complete, sort, and delete tasks in a to-do list that persists across browser sessions, and I want the list to prevent me from accidentally adding duplicates.

#### Acceptance Criteria

1. WHEN the user submits a non-empty task description, THE To-Do List SHALL add a new Task to the list and display it immediately.
2. WHEN the user attempts to submit an empty or whitespace-only task description, THE To-Do List SHALL reject the input and leave the task list unchanged.
3. WHEN the user marks a Task as done, THE To-Do List SHALL visually distinguish the completed Task from incomplete Tasks (e.g., strikethrough text).
4. WHEN the user marks a completed Task as not done, THE To-Do List SHALL restore the Task's visual appearance to the incomplete state.
5. WHEN the user activates the edit control on a Task, THE To-Do List SHALL allow the user to modify the Task's description and save the change.
6. WHEN the user activates the delete control on a Task, THE To-Do List SHALL remove the Task from the list permanently.
7. WHEN a Task is added, edited, completed, or deleted, THE To-Do List SHALL persist the updated task list to Local Storage immediately.
8. WHEN the Dashboard loads, THE To-Do List SHALL retrieve and display all previously saved Tasks from Local Storage.
9. WHEN the user submits a task description whose trimmed, case-insensitive text exactly matches an existing task in the list, THE To-Do List SHALL reject the input, leave the task list unchanged, and display a visible duplicate warning message.
10. WHEN the user edits a task to a trimmed, case-insensitive text that matches another existing task, THE To-Do List SHALL reject the edit and display a visible duplicate warning message.
11. THE To-Do List SHALL provide a sort control with at least the following options: Manual (insertion order), A→Z (alphabetical ascending), Completed Last.
12. WHEN the user selects a sort order, THE To-Do List SHALL re-render the task list in the chosen order immediately.
13. WHEN the Dashboard loads, THE To-Do List SHALL restore and apply the last saved sort order from Local Storage.

### Requirement 4: Quick Links

**User Story:** As a user, I want to save and open favorite website shortcuts from the dashboard, so that I can navigate to frequently used sites with one click.

#### Acceptance Criteria

1. WHEN the user submits a Link with a valid title and a non-empty URL, THE Quick Links widget SHALL add the Link to the panel and display it immediately.
2. WHEN the user attempts to submit a Link with an empty title or an empty URL, THE Quick Links widget SHALL reject the input and leave the links list unchanged.
3. WHEN the user clicks a Link, THE Quick Links widget SHALL open the associated URL in a new browser tab.
4. WHEN the user activates the delete control on a Link, THE Quick Links widget SHALL remove the Link from the panel permanently.
5. WHEN a Link is added or deleted, THE Quick Links widget SHALL persist the updated links list to Local Storage immediately.
6. WHEN the Dashboard loads, THE Quick Links widget SHALL retrieve and display all previously saved Links from Local Storage.

### Requirement 5: Layout and Visual Design

**User Story:** As a user, I want all four features visible on a single screen with a clean, readable interface, so that the dashboard is immediately useful without any navigation.

#### Acceptance Criteria

1. THE Dashboard SHALL display all four widgets (Greeting, Focus Timer, To-Do List, Quick Links) on a single page without requiring scrolling on a 1280×800 or larger viewport.
2. THE Dashboard SHALL use a single CSS file (`css/style.css`) for all visual styling.
3. THE Dashboard SHALL use a single JavaScript file (`js/app.js`) for all application logic.
4. THE Dashboard SHALL apply a clear visual hierarchy that distinguishes each widget from the others.
5. THE Dashboard SHALL use readable typography with sufficient contrast between text and background.
6. WHEN the Dashboard renders on a viewport narrower than 768px, THE Dashboard SHALL reflow the layout so each widget remains fully readable without horizontal scrolling.

### Requirement 6: Data Persistence

**User Story:** As a user, I want my tasks, quick links, settings, and preferences to survive browser refreshes and restarts, so that I don't have to re-enter data every time I open the dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL store all Task data exclusively in the browser's Local Storage under a consistent key name.
2. THE Dashboard SHALL store all Link data exclusively in the browser's Local Storage under a consistent key name.
3. WHEN Local Storage is unavailable or read fails, THE Dashboard SHALL render with an empty task list and an empty links panel without throwing an unhandled error.
4. WHEN Local Storage write fails, THE Dashboard SHALL continue operating and notify the user of the failure via a visible error message.
5. THE Dashboard SHALL store the Custom Name, the active Theme, the Pomodoro Duration, and the task Sort Order in Local Storage under consistent key names.

### Requirement 7: Light / Dark Mode

**User Story:** As a user, I want to switch between a light and a dark colour scheme, so that the dashboard is comfortable to use in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control (e.g., a button or switch) that switches between Light mode and Dark mode.
2. WHEN the user activates the theme toggle, THE Dashboard SHALL apply the selected theme to the entire page immediately without a page reload.
3. WHEN Dark mode is active, THE Dashboard SHALL apply a dark background with light text across all widgets.
4. WHEN Light mode is active, THE Dashboard SHALL apply a light background with dark text across all widgets.
5. WHEN the user selects a theme, THE Dashboard SHALL persist the choice to Local Storage immediately.
6. WHEN the Dashboard loads, THE Dashboard SHALL restore the previously saved theme from Local Storage and apply it before any content is displayed to avoid a flash of the wrong theme.
7. WHEN no theme preference is saved, THE Dashboard SHALL default to the user's OS-level colour scheme preference via `prefers-color-scheme` media query.
