# How to understand ServicePilot, step by step

This project was generated with assistant help. Use this guide to understand each file, make your own changes, and accurately explain your contribution when showing it to employers.

## 1. Start with what the user sees

Open `public/index.html`. Find the three workspace sections: Dashboard, Tickets, and Assets. Then open `public/styles.css` and look for `.sidebar`, `.stats-grid`, `.panel`, and the `@media` rules.

**Exercise:** Change the heading text and one accent color. Check desktop and mobile views.

## 2. Follow a button click

In `public/app.js`, find the `#ticket-form` submit handler. It collects form fields with `FormData`, sends JSON to the server using `fetch`, then reloads from the database.

**Exercise:** Add a placeholder to the ticket description field. Explain the difference between frontend and backend validation.

## 3. Follow an API request

In `server.js`, find `app.post('/api/tickets', ...)`. It validates fields using `checkTicket` and runs parameterized SQL. The operation uses a transaction because it creates a ticket **and** an activity entry.

**Exercise:** Explain why `?` placeholders are safer than combining user input into SQL text.

## 4. Explore relational tables

In `schema.sql`, find `assets`, `tickets`, `users`, and `ticket_activity`. A ticket may refer to an asset and an assigned technician using foreign keys.

**Exercise:** Draw a quick entity relationship diagram. Explain `ON DELETE SET NULL` and `ON DELETE CASCADE`.

## 5. Learn the ticket lifecycle

In `server.js`, the PATCH ticket route can change status, priority, assignee, or linked asset. Setting status to Resolved updates the timestamp; reopening clears it. Activity entries show what happened.

**Exercise:** Create and resolve a ticket in the interface, then inspect corresponding MySQL rows using Workbench.

## 6. Understand sign-in

`lib/security.js` uses scrypt for password hashes and a random token for sessions. `server.js` stores a **hash** of that token and sends the raw token only in an HttpOnly cookie.

**Exercise:** Explain why passwords should not be stored in plaintext. Explain the purpose of cookies, roles, and a session expiration time.

## 7. Practice debugging

Try entering the same asset tag twice; the server should return a conflict. Try accessing the protected API while signed out. Watch Network and Console in browser developer tools.

**Exercise:** Write down three bugs you found, how you diagnosed them, and which file you changed.

## 8. Prepare for an interview

A recruiter or interviewer may ask:

1. What problem does your application solve?
2. Why use MySQL instead of localStorage?
3. What is the difference between a GET, POST, and PATCH endpoint?
4. What is a foreign key?
5. How do transactions protect the ticket activity history?
6. How are passwords and sessions handled?
7. What would you change for 10,000 tickets instead of 50?
8. Which parts did you personally test or change after receiving the initial code?

Avoid memorizing claims about work you have not done. The best portfolio version is one you have tested, customized, and understand.
