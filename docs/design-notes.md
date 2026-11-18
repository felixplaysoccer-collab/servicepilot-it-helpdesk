# Project notes / architecture

## Problem
Small IT teams need a shared view of incoming requests and the equipment tied to those requests. A spreadsheet could hold basic records, but a ticket system keeps work history in one place.

## Users
- **Administrator:** everything a technician does, plus manage devices and assignment information.
- **Technician:** work the ticket queue, link existing equipment, document troubleshooting, export records.

## Data model
`users` sign in; `sessions` stores SHA-256 hashes of random browser tokens. A `ticket` has a creator and optional assigned technician and optional linked asset. `ticket_activity` stores events and troubleshooting notes as append-only records. Asset tags are unique so two records can't claim the same label.

## Core workflow
Open → In Progress → Resolved. Resolved records receive `resolved_at`; reopening clears it. Every assignment, priority, status or linked-asset change adds an activity event. These changes use a SQL transaction so the ticket update and its audit event succeed together.

## Why no React?
Plain JS allows a student to trace form submission → `fetch` → Express route → SQL query → rerender without learning an additional framework. A later version can use React and TypeScript.

## Next possible improvements
Password reset, server-side pagination, SLA targets, ticket categories charts, real role-specific visibility, stronger audit retention, tests backed by a disposable database, automated deployment, email notifications, and an internal deployment security review.
