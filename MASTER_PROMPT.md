# Master Prompt — Professionally Enhance PulsePoll

Copy the prompt below into your coding assistant after opening the **entire `my-web-app` project folder**. Give it repository/file-editing access, not only a chat window.

---

## PROMPT START

You are a senior full-stack engineer, product designer, application security reviewer, and QA lead. Your task is to **finish and elevate the existing PulsePoll project into a polished, reliable, easy-to-run real-time polling product**, while preserving and improving the current codebase rather than replacing it with an unrelated template.

### 1. Project context and architecture

The project is a real-time polling web app with:

- Frontend: React 18, Vite, Tailwind CSS, Framer Motion, Lucide icons, Socket.IO client.
- Backend: Node.js 20+, Express, Socket.IO, Zod validation, Mongoose.
- Storage: optional MongoDB; local JSON storage for quick setup and demo use.
- Existing features: create polls, 2–10 choices, optional expiry, vote counts and percentages, local browser voter token, shareable poll URLs, active/all/my-votes filters, real-time room updates and viewer counts.
- Main code paths: `client/src/App.jsx`, `client/src/components/`, `client/src/hooks/useSocketPoll.js`, `client/src/services/socket.js`, `server/src/controllers/`, `server/src/repositories/pollRepository.js`, `server/src/sockets/pollSocket.js`, `server/src/models/Poll.js`.

**Do not add a second backend, duplicate the UI in a standalone HTML server, or silently replace the established stack.** There should be one source of truth for the UI, REST API, storage, and WebSocket events.

### 2. Start by auditing, not rewriting blindly

1. Read the full repository, package files, environment examples, routes, API contracts, socket events, storage model, styling, and run scripts.
2. Map each user-facing action to its frontend handler, API/socket handler, storage operation, and real-time event.
3. Identify dead code, duplicate implementations, mismatched event names, missing handlers, race conditions, inaccessible controls, configuration assumptions, secret files, and broken setup instructions.
4. Create a short prioritized plan. Then implement the fixes; do not stop at recommendations or a mockup.
5. Preserve useful code and existing sample data. Avoid changing dependencies or architecture without a concrete need.

### 3. Product and UI quality bar

Build a cohesive, production-minded interface that feels designed rather than generated:

- A clear PulsePoll identity, polished hierarchy, consistent spacing, restrained dark palette with accessible contrast, careful type scale, responsive cards, and purposeful motion.
- Responsive behavior across mobile, tablet, and desktop, including no horizontal overflow.
- A useful overview: poll count, vote count, active polls, search, and clear All / Active / My votes filters.
- Clear loading, empty, no-search-results, server-error, expired-poll, vote-success, vote-failure, offline, and reconnecting states.
- Accessible controls with correct labels, keyboard focus, visible focus rings, semantic headings, dialog semantics, Escape handling, and status announcements.
- Create-poll flow with title validation, 2–10 distinct options, option add/remove, optional duration, pending state, and readable backend validation errors.
- Share links that preserve the poll ID and reopen the correct poll; clipboard failure must have a useful fallback.
- Results with live counts and percentages, readable long option text, no false viewer counts, and graceful behavior after a reconnect.
- Respect reduced-motion preferences where practical. Do not add decorative complexity that makes the interface harder to use.

### 4. Backend and real-time behavior

Make the real product flow work end-to-end:

- Validate and normalize every client input on the server. Enforce reasonable title/option limits, 2–10 options, duplicate-option prevention, duration bounds, payload-size limits, and clear HTTP status codes.
- Keep public poll responses sanitized; never return private voter-token collections, credentials, stack traces, or environment variables.
- Ensure the create-poll API broadcasts exactly one creation event and all clients add the poll once.
- Ensure votes update the authoritative storage, return an acknowledgement, update the poll room, and refresh dashboard totals through a consistent event contract.
- Validate poll IDs, option IDs, tokens, poll expiry, inactive polls, missing polls, and repeated votes. Handle a missing/disconnected socket or an acknowledgement timeout without leaving the UI permanently pending.
- Preserve MongoDB atomic vote updates when database mode is enabled. If a local JSON mode is supported, keep its file paths out of source-controlled runtime data and make its limitations clear. Never silently switch to a different data store after a MongoDB disconnection while claiming the data is unchanged.
- Add reasonable CORS configuration, secure response headers, safe error handling, graceful shutdown, health status, configurable ports, and no hard-coded workstation paths.
- Do not claim that browser fingerprints prevent fraud. Document that token-based deduplication is best-effort and recommend authentication, rate limits, abuse controls, and audit logs before any consequential voting.

### 5. Stability and maintainability

- Use one consistent REST + Socket.IO contract.
- Remove duplicate/obsolete implementations and bundled executables, logs, generated `node_modules`, build output, and secrets from the deliverable.
- Keep `.env.example` safe and useful. Never include a real `.env` or credentials in the final archive.
- Use environment-based configuration instead of machine-specific paths.
- Use clear function/file names, focused modules, and comments only where they explain non-obvious behavior.
- Keep dependency changes minimal, ensure scripts work on Windows and POSIX shells, and provide a single documented command to start the UI and API.
- Ensure the production build is served correctly or document the chosen deployment model.

### 6. Tests and verification are mandatory

Write and run tests for at least:

- Poll creation, IDs/options, validation limits, and public-field sanitization.
- Valid vote updates totals and percentages.
- Duplicate vote token rejection.
- Invalid option, nonexistent poll, inactive/expired poll, and invalid voter token.
- JSON persistence and API error shapes where practical.
- Real-time event contract and one-time poll creation broadcast.

Then run all available checks, including:

1. Install dependencies from package manifests.
2. Run backend unit tests.
3. Build the React production bundle.
4. Start the API in local JSON mode and verify `GET /health`, `GET /api/polls`, create poll, cast vote, duplicate vote, and expiry behavior.
5. Verify production static serving and Socket.IO connection where the environment permits it.
6. Check browser console/runtime issues if a browser is available.
7. Report actual command results, including failed checks and environmental limitations. Never claim a test passed if it was not run.

### 7. Documentation and delivery

Update `README.md` with prerequisites, exact install/run/build/test commands, ports, local JSON mode, optional MongoDB configuration, deployment steps, API routes, Socket.IO events, troubleshooting, folder structure, and a truthful security note.

Before finishing:

- Review the changed files and remove temporary artifacts, real secrets, machine-specific paths, and unnecessary binaries.
- Ensure a fresh user can extract the ZIP, follow the README, install dependencies, start the app, create a poll, cast a vote, see live updates, and share the poll link.
- Package the entire clean project in one ZIP, excluding `node_modules`, runtime executables, local `.env`, logs, and generated build output unless explicitly requested.
- Provide the ZIP link plus a concise summary of implemented changes and actual verification results.

### 8. Working style

Make the best engineering decisions without asking me to approve every small choice. Do not stop after producing a plan. Implement the useful improvements, test them, and package the result. If something cannot be fully verified due to missing dependencies, network restrictions, or unavailable services, state exactly what could not be verified and leave clear steps to verify it locally.

## PROMPT END
