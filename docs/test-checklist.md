# ServicePilot: Manual testing checklist

Use a local MySQL server and two accounts made with `npm run create-user`: an `admin` and a `technician`.

- [ ] Sign in with admin credentials and see dashboard data.
- [ ] Wrong password is rejected with a clear error.
- [ ] Signing out prevents access to ticket and asset API endpoints.
- [ ] Create an asset with a new unique tag; verify it appears in the inventory.
- [ ] Try creating an asset using a duplicate tag; expect an error.
- [ ] Edit an asset's assigned user, location, and status; refresh to check persistence.
- [ ] Create a ticket linked to the new asset.
- [ ] Open ticket Details and assign a technician.
- [ ] Change ticket priority and status to In Progress.
- [ ] Add a troubleshooting note. Refresh; note should remain in history.
- [ ] Resolve the ticket; dashboard resolved and urgent counts should update.
- [ ] Reopen a resolved ticket; it no longer counts as resolved.
- [ ] Search and filter tickets and assets; check empty-result messages.
- [ ] Export CSV and open the file to confirm columns and values.
- [ ] Sign in as technician; confirm asset creation/edit buttons are hidden.
- [ ] Call POST /api/assets as technician; expect HTTP 403.
- [ ] Visit the app on a phone-sized screen; tables scroll and dialogs remain usable.
- [ ] Test long descriptions and special characters (`<script>`, ampersands) — they should display as text.
- [ ] Stop MySQL and verify the API displays a useful error instead of fabricating data.

Document results with the date, test environment, bugs found, and fixes. Checkboxes above are NOT evidence that testing has happened.
