# Complete FRIDAY Frontend Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the frontend-only FRIDAY prototype so every visible navigation button opens a coherent page, the profile icon opens a login page, and every page has consistent close/back, responsive, theme, watermark, and empty/demo states.

**Architecture:** Keep the current single-file prototype in `frontend/index.html` for this phase rather than scaffolding the production Next.js app. Add a small client-side view router/state layer that switches between the landing view and named page panels, with shared render helpers and page configuration instead of one-off listeners. Preserve the existing transparent sidebar, fixed watermark, hover/focus-only liquid glass controls, and live Class/Exam schedule integration.

**Tech Stack:** HTML, CSS, and vanilla JavaScript in `frontend/index.html`; existing Inter font, inline SVG icons, theme CSS variables, and public Connect JSON schedule source.

**Spec:** `prd.md`, `app-flow.md`, `design-guide.md`, `techstack.md`, `CLAUDE.md`

## Global Constraints

- Keep this phase frontend-only; do not add authentication, database, API routes, or backend dependencies.
- Preserve the transparent left panel and make liquid glass appear only on individual controls during hover or keyboard focus.
- Keep the FRIDAY watermark fixed and in the same position across landing, deadline, schedule, and new views.
- Support dark/light themes, reduced motion, keyboard focus, and mobile widths down to 360px.
- Every major page must have an intentional loading, empty/demo, error, or permission state where applicable.
- Do not replace the current Class/Exam data source or remove its search/filter behavior.
- The profile icon opens the visual login page; demo sign-in returns to the portal and does not claim to authenticate a real account.
- Use sentence-case, user-facing labels consistent with `design-guide.md`; do not introduce unrelated visual systems.

## Review Focus

- Direct navigation from every sidebar, hero quick chip, and relevant CTA must open the correct page rather than silently doing nothing; test each route key in the view router.
- Opening one panel after another must close the prior panel and restore the landing view cleanly; test deadline → schedule → login → back.
- Collapsing the sidebar must leave it narrow until pointer hover expands it temporarily; test click, pointer enter/leave, keyboard focus, and mobile behavior.
- Long lists and empty/error states must remain readable at 360px and in both themes; test each page at mobile width and after theme toggle.
- Fixed watermark and transparent shell must not move or expose the landing composition behind another view; test landing, all feature pages, and close transitions.

---

### Task 1: Establish the shared frontend view state and navigation contract

**Files:**
- Modify: `frontend/index.html` — page panel markup, shared page CSS, and script handlers.
- Test: Manual browser smoke test using the route-key checklist in this task.

**Interfaces:**
- Consumes: Existing DOM IDs `portalSidebar`, `schedulePanel`, `deadlinePanel`, `scheduleClose`, and `deadlineClose`.
- Produces: `openView(viewName)`, `closeView()`, `setActiveView(viewName)`, and a single `viewName` registry used by all navigation controls.

- [ ] **Step 1: Define the view registry and navigation map**

  Add named views for `landing`, `login`, `deadlines`, `notices`, `attendance`, `degree`, `registration`, and `planner`, while retaining `class` and `exam` as schedule modes. Map every sidebar label, hero quick chip, hero CTA, and profile icon to one view key.

- [ ] **Step 2: Implement shared view transitions**

  Add `openView(viewName)` and `closeView()` so opening a view closes all other panels, updates `aria-hidden`, updates the URL hash, and restores focus to the opening/close control when appropriate. Keep schedule loading delegated to the existing `openSchedule(mode)` function.

- [ ] **Step 3: Wire and verify all existing navigation**

  Connect sidebar buttons, quick chips, `Open Schedules`, `Open Portal`, and the profile icon. Verify each route key opens exactly one view and that close/back returns to landing without stale panels or landing content bleed-through.

- [ ] **Step 4: Run the manual route checklist**

  Check landing → login, landing → deadlines, landing → notices, landing → attendance, landing → degree, landing → registration, landing → planner, sidebar → class, sidebar → exam, and close/back from each.

---

### Task 2: Build the shared page shell and visual states

**Files:**
- Modify: `frontend/index.html` — reusable page panel styles and page header/content primitives.
- Test: Manual responsive/theme/accessibility smoke test.

**Interfaces:**
- Consumes: Task 1 view keys and transition helpers.
- Produces: Shared `.page-panel`, `.page-panel__header`, `.page-panel__close`, `.page-content`, `.state-card`, and `.demo-list` patterns used by Tasks 3–5.

- [ ] **Step 1: Add shared page-shell markup**

  Add a consistent fixed panel structure for non-schedule views: eyebrow, heading, description/status line, close button, content region, and optional primary action region.

- [ ] **Step 2: Add shared visual states**

  Style demo cards, status chips with icon plus text, empty states, error states, and primary/secondary buttons using the existing CSS variables. Keep the background transparent where required and preserve the single fixed watermark.

- [ ] **Step 3: Add responsive and reduced-motion behavior**

  Ensure panels use full width on mobile, content stacks below 760px, interactive targets remain at least 44px, focus outlines remain visible, and transitions are disabled under reduced motion.

- [ ] **Step 4: Verify shared behavior**

  Test the shell in dark and light themes at desktop and 360px widths, then verify that closing a panel does not alter sidebar collapse state or watermark position.

---

### Task 3: Implement login and account-entry pages

**Files:**
- Modify: `frontend/index.html` — login panel markup, validation/demo sign-in behavior.
- Test: Manual login interaction checklist.

**Interfaces:**
- Consumes: `openView('login')`, `closeView()`, and shared page-shell controls.
- Produces: Login form with email and password inputs, inline validation, demo sign-in action, and return-to-portal behavior.

- [ ] **Step 1: Add the login form**

  Include email, password, remember-me control, forgot-password link state, sign-in button, and a back-to-portal control. Keep copy explicit that this is a frontend demo where necessary.

- [ ] **Step 2: Add client-side validation**

  Require a non-empty valid-looking email and a non-empty password, show inline errors, and prevent the demo transition until the form is valid.

- [ ] **Step 3: Add demo sign-in transition**

  On valid submission, show a short success state and return to the portal landing view; do not persist or send credentials.

- [ ] **Step 4: Verify login behavior**

  Test profile icon navigation, invalid form submission, valid demo sign-in, forgot-password visual state, close/back, keyboard tab order, and mobile layout.

---

### Task 4: Implement student information pages

**Files:**
- Modify: `frontend/index.html` — Notices, Attendance, and Degree Progress panels.
- Test: Manual page-state and responsive checklist.

**Interfaces:**
- Consumes: Shared page-shell and view router from Tasks 1–2.
- Produces: `notices`, `attendance`, and `degree` pages with static/demo data and intentional states.

- [ ] **Step 1: Build Notices page**

  Add search/filter controls, category chips, unread/read indicators, three representative notice cards, and a no-results state when the search/filter excludes all cards.

- [ ] **Step 2: Build Attendance page**

  Add attendance summary cards, course rows with attended/total values, solid status indicators with text, and an empty/error state for unavailable records.

- [ ] **Step 3: Build Degree Progress page**

  Add overall credit progress, requirement-group rows, completed/in-progress/remaining status text, and an incomplete-data banner with a link back to onboarding/login context.

- [ ] **Step 4: Verify information pages**

  Test each page from sidebar and hero quick chips, search/filter empty states, responsive stacking, theme contrast, and close/back behavior.

---

### Task 5: Implement planning and academic-tool pages

**Files:**
- Modify: `frontend/index.html` — Registration Copilot and Semester Planner panels.
- Test: Manual interaction checklist.

**Interfaces:**
- Consumes: Shared page-shell, demo cards, and view router.
- Produces: `registration` and `planner` pages with clickable planning interactions.

- [ ] **Step 1: Build Registration Copilot page**

  Add semester selector, preference controls, course-plan rows, conflict warning, and a disabled/loading/demo result state. Keep the action read-only and label it as a prototype.

- [ ] **Step 2: Build Semester Planner page**

  Add term tabs or selector, weekly planning summary, planned-course cards, add-course visual action, and an empty semester state.

- [ ] **Step 3: Verify planning pages**

  Test navigation, selector changes, warning state, empty state, mobile layout, and keyboard operation.

---

### Task 6: Finalize existing schedule and deadline views

**Files:**
- Modify: `frontend/index.html` — schedule/deadline integration with shared router and consistent page shell.
- Test: Manual schedule/deadline regression checklist.

**Interfaces:**
- Consumes: Existing `openSchedule(mode)`, `renderSchedule()`, `closePanels()`, and the Task 1 view router.
- Produces: Class, Exam, and Deadlines views with consistent navigation and no stale landing artifacts.

- [ ] **Step 1: Integrate Class and Exam views**

  Preserve the Connect fetch, course/faculty filters, sorting, result count, loading/error copy, and schedule close behavior while routing through `openView('class')` or `openView('exam')`.

- [ ] **Step 2: Improve the Deadlines demo page**

  Preserve the existing deadline cards and add grouped status/source presentation, a visible add-deadline demo action, and an empty state without implying persistence.

- [ ] **Step 3: Verify view isolation**

  Test landing → deadlines → class → exam → landing, confirming only one page is visible, the fixed watermark does not move, and the transparent sidebar/hover glass behavior is unchanged.

---

### Task 7: Wire remaining buttons and run the complete frontend verification pass

**Files:**
- Modify: `frontend/index.html` — final event bindings and minor copy/ARIA corrections.
- Modify: `buildplan.md` — record the completed frontend prototype milestone and remaining foundation gap.
- Test: `frontend/index.html` manual browser smoke test.

**Interfaces:**
- Consumes: All view keys and page panels from Tasks 1–6.
- Produces: A complete clickable frontend-only prototype with no inert primary navigation controls.

- [ ] **Step 1: Audit all buttons and links**

  Enumerate every `button`, anchor, and navigation item; assign a view, visual state, or explicit no-op explanation. Remove accidental inert primary actions.

- [ ] **Step 2: Add final accessibility attributes**

  Confirm panel labels, `aria-hidden`, `aria-expanded`, input labels, close buttons, focus-visible styles, and escape-key close behavior for open panels.

- [ ] **Step 3: Verify the full interaction matrix**

  Test every page from every relevant entry point, profile-to-login, demo sign-in-to-portal, close/back, theme toggle, collapsed-sidebar hover expansion, 360px layout, and reduced-motion mode.

- [ ] **Step 4: Run repository checks**

  Run `git diff --check -- frontend/index.html buildplan.md`. No build/test command is currently configured; report manual verification and this limitation honestly.

- [ ] **Step 5: Update project tracking**

  Record the frontend prototype milestone in `buildplan.md` without marking the production Next.js/database/authentication work complete.
