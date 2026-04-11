# Signed-In Home Redesign (Merge `/dashboard` into Authenticated `/`)

Date: 2026-04-11
Status: Approved in brainstorming

## 1. Objective

Replace the existing signed-in experience by removing `/dashboard` and merging its purpose into authenticated `/`.

The new signed-in home should:
- Keep a Replit-inspired app structure (sidebar + workspace) without copying Replit UI details.
- Be project-first.
- Use only real project data from existing APIs.
- Avoid fake sections, fake filters, or fake metrics.

## 2. Scope

### In scope
- Remove `/dashboard` route so it no longer exists.
- Build a new authenticated `/` signed-in shell.
- Keep unauthenticated `/` marketing experience unchanged.
- Add minimal sidebar with only `Create` and `Projects`.
- Add real project workspace with `Owned` and `Shared` tabs.
- Add search by project name.
- Add in-place `Create Project` modal (name + runtime).
- Add per-project `⋮` action menu with role-specific options.

### Out of scope for this pass
- Replit-style status/access/build-type filter bar.
- Fake or placeholder analytics/usage widgets.
- New backend schemas beyond required API usage.

## 3. Confirmed Product Decisions

- Signed-in primary page becomes authenticated `/`.
- `/dashboard` is removed and should return 404 (no redirect, no alias).
- Signed-in `/` is app-only (no marketing sections mixed in).
- Sidebar is minimal: `Create` and `Projects` only.
- Main content is projects-first.
- Data is real only from existing projects API.
- Project groups are shown as two tabs: `Owned` and `Shared`.
- Project card click opens project in IDE.
- Project card includes `⋮` menu for actions.
- Shared project `⋮` menu includes only: `Open`, `Rename`.
- Filtering MVP: search by project name only.
- Mobile/tablet: sidebar collapsed by default and opened via drawer toggle.

## 4. Information Architecture and Routing

## 4.1 Routes
- `/`
  - Unauthenticated: existing marketing home.
  - Authenticated: new signed-in app shell.
- `/dashboard`
  - Route file removed.
  - Page should 404 naturally.

## 4.2 Signed-In Shell Structure
- Left sidebar
  - Primary button: `Create`.
  - Navigation item: `Projects` (active state for current view).
- Main workspace
  - Header/title row: `Projects`.
  - Controls row: search input + tab switcher (`Owned`, `Shared`).
  - Content region: tab-specific project list with empty states.

## 4.3 Responsive Behavior
- Desktop: persistent left sidebar.
- Mobile/tablet: hidden sidebar by default.
- Top-left menu button opens sidebar as slide-in drawer.

## 5. UI and Interaction Design

## 5.1 Visual Direction
- Replit-inspired structural layout only.
- Styling remains in Yentic design system/tokens and existing visual language.
- No visual cloning of Replit elements beyond high-level shell concept.

## 5.2 Projects Workspace
- Search input filters project names within active tab only.
- Tabs switch between `Owned` and `Shared` datasets.
- Empty states:
  - Owned empty: invite project creation via `Create`.
  - Shared empty: explicit “nothing shared with you yet” state.

## 5.3 Project Item Behavior
- Primary click target opens IDE for that project.
- Secondary action menu (`⋮`) on each project.

Owned menu actions:
- `Open`
- `Rename`
- `Delete`
- `Share`

Shared menu actions:
- `Open`
- `Rename`

## 5.4 Create Project Modal
- Triggered from sidebar `Create`.
- In-place modal (no route change).
- Fields:
  - Project name (required, trimmed).
  - Runtime (required; supported values only).
- Submission uses existing project create API flow.

## 5.5 Rename Project Modal
- Opened from `⋮` menu.
- Required non-empty trimmed name.
- Shows API conflict/error feedback inline.

## 6. Data Flow and Component Boundaries

## 6.1 Data Source
- Use existing `/api/projects` response with `owned` and `shared` arrays.
- No mock data fallback in UI.

## 6.2 Client State
- Active tab (`owned` or `shared`).
- Search query.
- Open/close state for drawer, menus, and modals.
- Action progress/error state per modal/action.

## 6.3 Suggested Component Decomposition
- `SignedInHomeShell`: authenticated app container + sidebar + mobile drawer.
- `ProjectsWorkspace`: title, controls, tabs, derived list orchestration.
- `ProjectsList`: list rendering + empty/error states.
- `ProjectItem`: row/card rendering + `⋮` menu trigger.
- `CreateProjectModal`: create flow.
- `RenameProjectModal`: rename flow.

## 6.4 Action Flows
- Create:
  - Open modal -> validate -> POST create -> update list -> navigate directly to the new project in IDE.
- Open:
  - Navigate directly to project IDE route.
- Rename:
  - Open modal -> validate -> call update endpoint -> refresh affected item/list.
- Delete/Share (owned only):
  - Use existing endpoints and update UI on success.

## 7. Error Handling

- Initial projects load failure:
  - Show inline error panel in main content.
  - Provide retry action.
- Mutation failures (create/rename/delete/share):
  - Show local error near origin (modal/row).
  - Preserve current context and unsaved input where practical.
- Auth/session invalidation:
  - Fall back to existing auth guard behavior.

## 8. Testing Strategy

Required verification coverage:
- Authenticated `/` renders app shell and no marketing sections.
- Unauthenticated `/` still renders marketing home.
- `/dashboard` returns 404 after route removal.
- `Owned` and `Shared` tabs each render correct API-backed data.
- Search filters by project name within active tab only.
- Project item click opens project in IDE.
- `⋮` menus show correct action sets:
  - Owned: Open/Rename/Delete/Share
  - Shared: Open/Rename
- Create modal validates fields, submits, and updates UI from real response.
- Rename modal validates, updates, and surfaces duplicate/other API errors.
- Mobile drawer opens/closes via menu button and remains usable.

## 9. Acceptance Criteria

This redesign is complete when:
- `/dashboard` route is removed and 404s.
- Signed-in `/` is fully app-shell-based and project-first.
- Sidebar includes only `Create` and `Projects`.
- Projects UI uses real `owned/shared` API data.
- Create modal exists and supports name + runtime.
- Search-only MVP filtering is implemented.
- Shared projects show only Open/Rename in `⋮` menu.
- Responsive drawer behavior works on mobile/tablet.
- Tests cover critical route, data, and interaction behavior.
