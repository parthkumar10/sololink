# SoloLink — PRD

## Original Problem Statement
Build a simple multi-user Link-in-bio web app (SoloLink) for creators/students/freelancers. Each user gets a public page at /:username with profile info + links. Email/password auth, unique usernames, profile (display name, bio, image), links (title+URL, add/delete/reorder, max 20, saved order). Public pages viewable without login. Server-side ownership enforcement. Keep V1 simple — no payments/analytics/messaging/teams/feed/marketplace/AI/advanced themes.

## User Choices
- Auth: Email + password (custom JWT, bearer token in localStorage)
- Profile image: file upload (Emergent object storage)
- Design: clean & minimal (Swiss high-contrast + tactile; Plus Jakarta Sans / Inter / JetBrains Mono; indigo #6366F1 accent)

## Architecture
- Backend: FastAPI + MongoDB (motor). Collections: `users` (email, password_hash bcrypt, username[lowercase, unique], display_name, bio, avatar_path), `links` (id uuid, user_id, title, url, order).
- Auth: JWT (7-day access token). get_current_user reads Bearer header (cookie fallback).
- Storage: Emergent object storage for avatars; public serving via GET /api/files/{path}.
- Frontend: React + react-router, AuthContext, sonner toasts, shadcn/ui.

## Public vs Private
- Public: `/` landing, `/:username` public profile, unknown username -> not-found/claim page, `/api/public/{username}`, `/api/files/{path}`.
- Private (JWT): `/dashboard`, profile & link endpoints.

## Ownership Rules (enforced server-side)
- Every link edit/delete/reorder verifies link.user_id == str(current_user._id) -> else 403.
- Username uniqueness case-insensitive (stored lowercase); reserved words blocked.

## Implemented (2026-06-27)
- Signup with live username availability check; login; JWT auth.
- Dashboard: profile editor (name, bio, avatar upload), link manager (add/delete/reorder up-down, 20 cap, counter+progress), share URL copy, live phone preview.
- Public profile page (mobile-first) + not-found/claim page + landing page.
- Validation: invalid URL rejection (auto-prepends https), empty title rejection, 160-char bio, 5MB image.
- Verified: 21/21 backend tests, full frontend flows, multi-user ownership isolation.

## Backlog (P1/P2)
- P1: QR code for public URL; inline link title/url editing.
- P2: username change from dashboard (endpoint exists), link click tracking (out of V1 scope), rate limiting on check-username.
