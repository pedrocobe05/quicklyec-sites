# Frontend Reusable Design Guide

This document describes the visual system and layout patterns used by `apps/admin` so they can be reused in another product with the same brand language, login, sidebar, header, notifications, loaders, and mobile behavior.

## Goal

The objective is to keep a consistent experience across products:

- same login composition
- same sidebar structure
- same top header and page chrome
- same card, form, and shell treatment
- same toast/notification style
- same loading and skeleton behavior
- same mobile behavior and scrolling rules
- same branding tokens, but with easy rebranding

## Core Files

These files define most of the current front-end experience:

- [apps/admin/src/features/auth/pages/login-page.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/features/auth/pages/login-page.tsx)
- [apps/admin/src/app/layout/sidebar.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/app/layout/sidebar.tsx)
- [apps/admin/src/app/layout/dashboard-layout.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/app/layout/dashboard-layout.tsx)
- [apps/admin/src/styles.css](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/styles.css)
- [apps/admin/index.html](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/index.html)
- [apps/admin/src/shared/components/brand/brand-mark.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/shared/components/brand/brand-mark.tsx)
- [apps/admin/src/shared/notifications/notification-context.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/shared/notifications/notification-context.tsx)
- [apps/admin/src/shared/notifications/use-notification.ts](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/shared/notifications/use-notification.ts)

## Visual System

The current UI is built around a restrained premium theme.

- Primary navy: `#000120`
- Accent gold: `#ffcb30`
- Soft gold variants for highlights and badges
- Light sand/off-white background with radial gradients
- Rounded cards and panels
- Soft shadows, not harsh borders
- Dense but readable spacing
- IBM Plex Sans as the main font in the admin app

The brand and background treatment are defined in:

- [apps/admin/src/styles.css](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/styles.css)
- [apps/admin/index.html](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/index.html)

## Login Pattern

The login page uses a split layout:

- left side: brand narrative, logo, and product positioning
- right side: auth form
- full-screen background with soft gradients

Use this pattern when cloning the product:

- keep the large brand panel
- keep the form panel isolated and centered
- keep the same spacing and rounded container style
- swap only logo, product name, and copy

Reference:

- [apps/admin/src/features/auth/pages/login-page.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/features/auth/pages/login-page.tsx)

## Sidebar Pattern

The sidebar is grouped by business domain:

- General
- Ventas
- Compras
- Inventario
- Catálogos
- Tesorería
- Documentos
- Reportes
- Administración / plataforma

The sidebar is module-aware and permission-aware:

- if a tenant module is disabled, the entry is hidden
- if the role lacks permission, the route is blocked
- on mobile, the sidebar becomes a drawer

Reference:

- [apps/admin/src/app/layout/sidebar.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/app/layout/sidebar.tsx)
- [apps/admin/src/app/router/access-route.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/app/router/access-route.tsx)

## Header And Page Chrome

The dashboard header is part of the product identity. It combines:

- breadcrumb or page title
- contextual description
- current workspace / branch
- mobile drawer trigger
- action buttons

The same pattern should be preserved in a fork. Only page-specific titles and descriptions should change.

Reference:

- [apps/admin/src/app/layout/dashboard-layout.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/app/layout/dashboard-layout.tsx)

## Notifications And Toasts

The app uses a global notification system rather than ad-hoc inline alerts for every success or error.

Behavior:

- success notifications confirm mutations and actions
- error notifications surface API failures
- notifications should be short, readable, and actionable
- the style should stay consistent across all modules

Reusable files:

- [apps/admin/src/shared/notifications/notification-context.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/shared/notifications/notification-context.tsx)
- [apps/admin/src/shared/notifications/use-notification.ts](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/shared/notifications/use-notification.ts)

## Loaders And Skeletons

The loading strategy is split into two layers:

- local skeletons for the current view or panel
- global HTTP request spinner for background loads

Rules:

- do not leave screens blank while loading data
- use skeletons for first render and long list/detail loads
- use a small global spinner for active requests
- keep loading states subtle, not intrusive

Reference:

- [apps/admin/src/shared/api/http-client.ts](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/shared/api/http-client.ts)
- [apps/admin/src/app/layout/dashboard-layout.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/app/layout/dashboard-layout.tsx)

## Mobile Rules

Mobile behavior is intentionally constrained so the app stays usable on phones and tablets.

Rules:

- the app shell should not create global horizontal scrolling
- cards should use full available width
- horizontal scrolling must live inside the content that actually overflows
- long labels should clamp instead of pushing columns
- tables should have local `overflow-x-auto`
- use `min-w-0` in grid columns so cards do not expand outside the viewport

Relevant utilities and patterns:

- `.quickly-page-shell`
- `.quickly-horizontal-scroll-shell`
- `.text-clamp-1`
- `.text-clamp-2`

Reference:

- [apps/admin/src/styles.css](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/styles.css)

## Layout Pattern

The dashboard layout is based on:

- fixed sidebar on desktop
- drawer sidebar on mobile
- top-level page header with title and description
- page content wrapped in cards and panels

Reference:

- [apps/admin/src/app/layout/dashboard-layout.tsx](/Users/andrescobena/Documents/Proyectos/project_base/apps/admin/src/app/layout/dashboard-layout.tsx)

## Reusable Components

The following components are intended to be reused in a second product:

- `BrandMark`
- `Card`
- `Button`
- `Input`
- `Select`
- `Toggle`
- `FormField`
- `Modal`
- `ConfirmModal`
- `SearchableSelect`
- `SearchInput`
- `MultiSelect`
- `Skeleton`

These components already encode the visual language of the app.

## Rebrand Checklist

To reuse the design in another product, update:

- logo asset
- app title in `index.html`
- brand colors in `styles.css`
- brand copy in `login-page.tsx`
- sidebar labels if the business model changes
- favicon and touch icon
- notification copy if the new product has different tone
- page title and section descriptions
- any global loading labels or empty states

If the new product needs a different name but the same structure, keep the following unchanged:

- layout hierarchy
- card radii and shadows
- background gradients
- mobile overflow rules
- form and modal patterns

## Recommended Extraction Plan

If this needs to become a shared design system later, extract in this order:

1. `BrandMark` and brand tokens
2. `Card`, `Button`, `Input`, `Select`, `Toggle`, `FormField`
3. login shell
4. sidebar shell
5. dashboard layout shell
6. mobile overflow utilities

That split keeps the design portable without turning it into a heavy framework.
