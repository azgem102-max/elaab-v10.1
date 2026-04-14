# العَب (Al'ab) — Comprehensive Project Overview
> Last updated: 14 April 2026

---

## 📌 General Overview

**العَب (Al'ab)** is a mobile sports community app that allows users to organise sports matches, join them, form sports groups, and rate fellow players. The app currently supports three sports: **Football, Padel, and Tennis**.

### Tech Stack
| Component | Technology |
|---|---|
| Mobile App | Expo / React Native (expo-router) |
| Backend Server | Node.js + Express |
| Database | PostgreSQL + Drizzle ORM |
| State Management | React Query (TanStack) |
| Design Language | Visual Silence (Minimalist Luxury) / Liquid Glass 2026 |
| Text Direction | Multi-language (Arabic/English) — RTL/LTR |
| Internationalization | i18next + expo-localization |
| Push Notifications | Expo Push Notifications |
| File Uploads | Replit Object Storage |

### Repository Structure (Monorepo — pnpm)
```
/
├── artifacts/
│   ├── mobile/          ← Mobile app (Expo)
│   ├── api-server/      ← Backend server (Express)
│   └── mockup-sandbox/  ← Design sandbox (Canvas Mockups)
├── lib/
│   ├── db/              ← Database schema (Drizzle ORM)
│   ├── api-spec/        ← OpenAPI specification (Frontend–Backend contract)
│   ├── api-zod/         ← Auto-generated Zod schemas
│   └── api-client-react/← Auto-generated React Query Hooks
```

---

## 📊 Project Statistics
- **Last updated:** 14 April 2026
- **Last merged task:** 30
- **Completed tasks:** 30
- **App screens:** 23
- **API routes:** 54
- **Database tables:** 12

---

## 📱 App Screens

### 1. Authentication Flow

| Screen | Route | Description |
|---|---|---|
| Welcome | `/` | Splash screen — sport selection (Football / Padel / Tennis) |
| Phone Input | `/phone` | Enter phone number to request OTP |
| OTP Verification | `/otp` | Enter the SMS code |
| Profile Setup | `/profile-setup` | Name, avatar, play preferences (new users only) |
| Position Selector | `/position-selector` | Select preferred playing positions per sport |

**Navigation flow:**
```
index → phone → otp → (new user)      → profile-setup → position-selector → (tabs)
                    → (existing user) → (tabs)
```

---

### 2. Main Tabs

| Tab | Icon | Description |
|---|---|---|
| Home | 🏠 | Upcoming matches and recent activity |
| Explore | 🔍 | Discover public matches (list + map view) |
| My Matches | ⚽ | Matches the user has joined or organised |
| Groups | 👥 | Sports groups the user is a member of |
| Profile | 👤 | Personal data, statistics, Reliability Index |

---

### 3. Match Screens

| Screen | Route | Accessible From | Leads To |
|---|---|---|---|
| Match Details | `/match-details` | Home / Explore / My Matches / Notification | Manage Match (organiser) / Post-Match Rating (after finish) |
| Create Match | `/create-match` | + button on Home or Group page | Back to Home after creation |
| Edit Match | `/edit-match` | Manage Match screen | Back to Manage Match |
| Manage Match | `/manage-match` | Match Details (organiser only) | Edit Match / Rate Players |
| Post-Match Rating | `/post-match-rating` | Match Details (after match ends) | Home |

**Access permissions:**
- **Organiser only**: sees the "Manage Match" button, can edit, cancel, remove players, and record attendance
- **Players**: can join/leave and rate others after the match ends
- **Cancelled match rating**: closed (rating not allowed)
- **Double-rating prevention**: cannot rate the same player twice in the same match

---

### 4. Group Screens

| Screen | Route | Description |
|---|---|---|
| Group Details | `/group-detail` | Group info, members, group matches |
| Group Management | `/group-management` | Admin dashboard: members, join requests, roles |
| Group Chat | `/group-chat` | Text chat for group members (polling-based) |
| Create Group | `/create-group` | Form for creating a new group |

**Navigation flow:**
```
Groups (tab) → group-detail → group-chat
                           → group-management (admin only)
                           → match-details (group matches)
                           → create-match (create a match for the group)
```

---

### 5. Utility Screens

| Screen | Route | Description |
|---|---|---|
| Notifications | `/notifications` | Notification log — tapping routes to the relevant match/group |
| Settings | `/settings` | Account management, notification preferences, sign out |
| Invite Link | `/invite/[token]` | Handles deep-link invitations |

---

## 🔗 Full Navigation Map

```
[AUTH FLOW]
index ──► phone ──► otp ──► profile-setup ──► position-selector ──► (TABS)
                        └──────────────────────────────────────────► (TABS)

[TABS]
Home ──────────────────────────────────────────────────────────────────────────┐
Explore ──────────────────────────────────────────────────────────────────────►│ match-details
My Matches ───────────────────────────────────────────────────────────────────►│   ├─► manage-match ──► edit-match
Notifications ────────────────────────────────────────────────────────────────►│   └─► post-match-rating
Invite Link ──────────────────────────────────────────────────────────────────►│
                                                                               │
Groups ──────────────────────► group-detail ──────────────────────────────────►│ match-details
                          │        ├──► group-chat                             │
                          │        ├──► group-management                       │
                          │        └──► create-match                           │
                          └──► create-group                                    │
                                                                               │
Profile ──────────────────────► settings ──► [LOGOUT] ──► index               │
                 └──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Full Feature List

### 1. Authentication System
- Phone number + OTP login (passwordless)
- JWT tokens for session management
- Sign-out automatically revokes the Push Token

### 2. Match Management
- **Create a match**: title, sport, date & time, venue, geolocation, max players, cost, skill level, session type (match/training)
- **Join / Leave**: with time-conflict detection (cannot join two matches at the same time)
- **Search & Filter**: by sport, date, skill level, geolocation
- **Gatta (cost tracker)**: track shared match costs and each player's payment status, with payment reminders
- **Attendance recording**: organiser marks who attended and who was absent after the match
- **Mark attendees as paid**: one-click batch payment marking for present players
- **Cancel match**: organiser can cancel with automatic notifications to all players
- **Remove player**: organiser can remove a specific player from the match
- **Invite links**: generate a private link to invite players to a closed match

### 3. Group System
- Create sports groups (public/private)
- Member management with roles (owner, admin, member)
- Join requests for private groups (approve/reject)
- Directly invite users to a group
- Create matches linked to the group
- Group text chat (polling every 5 seconds)
- Group invite links

### 4. Rating & Badges System
After each match, players can rate each other with three badge types:
- 🎨 **Artist**: for skill, style, and creativity
- 🪨 **Rock**: for strength and solidity
- ⚡ **Bolt**: for speed and explosive energy

**Rating rules:**
- Only open for completed matches
- Closed for cancelled matches
- Cannot rate the same player twice
- Cannot rate yourself
- Includes a vote on the accuracy of the rated player's declared skill level

### 5. Reliability Index™
An automated system that calculates each player's reliability score (0–100):

```
Activation condition: must have joined at least 3 matches (as a player, not organiser)

Calculation:
  Base   = (matches attended / total matches joined) × 100
  Bonus  = min(10, total ratings received × 0.5)
  Result = min(100, Base + Bonus)

Before 3 matches: displays "—" (undetermined)
```

### 6. Notifications System
- **Push Notifications** via Expo Push Notifications
- Automatic notifications when:
  - A new player joins your match
  - A match you are registered for is cancelled
  - Another player rates you
  - New matches are created in your groups
- **Notification settings**: each notification type can be toggled independently
- **Mark as read**: individually or all at once
- **POST_NOTIFICATIONS permission**: for Android 13+ devices

### 7. User Profile
- Avatar (uploaded to Object Storage)
- Name and preferred sports
- Playing position selection (multiple per sport)
- Skill levels (Padel: P1–P8, Tennis: 1.0–7.0)
- Sport-specific extended profiles
- Reliability Index and total badges
- Match statistics

---

## 🛠️ API — Endpoints

All routes are served under the `/api` prefix.

### Authentication (2 routes)
```
POST /auth/request-otp   ← Request OTP for a phone number
POST /auth/verify-otp    ← Verify OTP and receive JWT
```

### Matches (15 routes)
```
GET    /matches                                  ← List matches (with filters)
GET    /matches/{id}                             ← Match details
POST   /matches                                  ← Create a new match
DELETE /matches/{id}                             ← Cancel/delete a match (organiser only)
POST   /matches/{id}/join                        ← Join a match
POST   /matches/{id}/leave                       ← Leave a match
PUT    /matches/{id}/attendance                  ← Record player attendance (organiser only)
PATCH  /matches/{id}                             ← Edit match details (organiser only)
PATCH  /matches/{id}/players/{userId}/payment    ← Update a player's payment status
DELETE /matches/{id}/players/{playerId}          ← Remove a player (organiser only)
POST   /matches/{id}/payment-reminder            ← Send payment reminders to unpaid players
POST   /matches/{id}/mark-attendees-paid         ← Batch-mark attending players as paid
POST   /matches/{id}/invite-link                 ← Generate a match invite link
GET    /matches/{id}/level-votes/status          ← Check if user has voted on skill levels
POST   /matches/{id}/level-votes                 ← Submit skill-level feedback after match
```

### Groups (18 routes)
```
GET    /groups                                          ← List public and joined groups
GET    /groups/{id}                                     ← Group details and members
POST   /groups                                          ← Create a new group
PUT    /groups/{id}                                     ← Update group info
DELETE /groups/{id}                                     ← Delete the group (owner only)
POST   /groups/{id}/join                                ← Request to join a group
POST   /groups/{id}/leave                               ← Leave a group
GET    /groups/{id}/join-requests                       ← List pending join requests (admin only)
POST   /groups/{id}/join-requests/{requestId}/approve   ← Approve a join request
POST   /groups/{id}/join-requests/{requestId}/reject    ← Reject a join request
POST   /groups/{id}/invite                              ← Directly invite a user to the group
POST   /groups/{id}/invite-link                         ← Generate a group invite link
GET    /invites/{token}                                 ← Validate invite link and fetch target data
POST   /invites/{token}/accept                          ← Accept the invite and join the target
DELETE /groups/{id}/members/{userId}                    ← Remove a member from the group
PATCH  /groups/{id}/members/{userId}/role               ← Change a member's role
GET    /groups/{id}/messages                            ← Fetch group chat messages
POST   /groups/{id}/messages                            ← Send a group chat message
```

### Users (6 routes)
```
GET    /users/me                          ← My profile and reliability score
PATCH  /users/me                          ← Update my profile
GET    /users/me/notification-settings    ← Get notification preferences
PATCH  /users/me/notification-settings    ← Update notification preferences
POST   /users/me/avatar                   ← Upload avatar image
GET    /users/{id}                        ← Another user's public profile
```

### Notifications (5 routes) + Push (2 routes)
```
GET    /notifications                ← List recent notifications
PATCH  /notifications/read-all       ← Mark all notifications as read
PATCH  /notifications/{id}/read      ← Mark a specific notification as read
DELETE /notifications/{id}           ← Delete a specific notification
DELETE /notifications                ← Delete all notifications
POST   /push/register                ← Register Expo Push Token
DELETE /push/unregister              ← Remove Push Token (on sign-out)
```

### Miscellaneous (6 routes)
```
GET  /healthz            ← Server health check
GET  /invite/{token}     ← Invite deep-link landing page
GET  /match/{id}         ← Match summary landing page (external share)
GET  /group/{id}         ← Group summary landing page (external share)
GET  /profile/{userId}   ← User profile summary landing page (external share)
GET  /storage/avatar     ← Avatar image proxy from Object Storage
```

---

## 🗄️ Database

### Tables

| Table | Key Columns | Description |
|---|---|---|
| `users` | id, phone, name, avatar_url, sports, skill_level, sport_profiles, reliability, notif_match, notif_group, notif_rating | User accounts and notification settings |
| `otp_codes` | id, phone, code, expires_at, used | SMS OTP verification codes |
| `matches` | id, title, sport, date, time, venue, lat, lng, max_players, cost, is_public, organizer_id, invited_group_id, session_type, skill_level, status | Matches and training sessions |
| `match_players` | id, match_id, user_id, position, attended, attendance_status, paid | Players in each match |
| `groups` | id, name, sport, description, is_public, admin_id | Sports groups |
| `group_members` | id, group_id, user_id, role | Group membership and roles |
| `group_messages` | id, group_id, sender_id, sender_name, text | Group chat messages |
| `group_join_requests` | id, group_id, user_id, status, requested_at, reviewed_at, reviewed_by | Join requests for private groups |
| `ratings` | id, match_id, rater_id, rated_user_id, score, rating_type, level_accuracy_vote | Post-match player ratings |
| `notifications` | id, user_id, type, title, body, related_id, read | In-app notifications |
| `push_tokens` | id, user_id, token | Expo push notification tokens |
| `invite_links` | id, token, target_type, target_id, created_by, expires_at, is_revoked | Invite links for matches and groups |

---

## 📋 Development History

| # | Task | Status |
|---|---|---|
| 1 | Full match lifecycle test | ✅ |
| 2 | Payment gateway integration (Gatta — cost tracker) | ✅ |
| 3 | Group chat UI | ✅ |
| 4 | Automatic match lifecycle completion | ✅ |
| 5 | UX improvements and final polish | ✅ |
| 6 | Position selector screen redesign | ✅ |
| 7 | Interactive padel court + skip-without-position flow | ✅ |
| 8 | Multi-position selection support in profile | ✅ |
| 9 | Professional skill-level selector (Padel P1–P8 / Tennis 1.0–7.0) | ✅ |
| 10 | Settings screen redesign (Liquid Glass 2026) | ✅ |
| 11 | Notifications screen redesign (Liquid Glass 2026) | ✅ |
| 12 | Edit match screen redesign (Liquid Glass 2026) | ✅ |
| 13 | Group detail page design unification | ✅ |
| 14 | Comprehensive test: Authentication + Matches | ✅ |
| 15 | Comprehensive test: Groups + Profile + Rating | ✅ |
| 16 | Rating button logic fix (cancelled matches + duplicate prevention) | ✅ |
| 17 | Share and invite link fixes | ✅ |
| 18 | Push Token revocation on sign-out fix | ✅ |
| 19 | Android: transparent StatusBar + Edge-to-Edge | ✅ |
| 20 | Android: FlatList optimisation for 60fps | ✅ |
| 21 | Android: POST_NOTIFICATIONS permission for Android 13+ | ✅ |
| 22 | Android: EAS Build setup | ✅ |
| 23 | Advanced group management (roles + join requests) | ✅ |
| 24 | Invite links for groups and matches | ✅ |
| 25 | App testing on iOS and Android simulators | ✅ |
| 26 | Update official Padel and Tennis skill-level descriptions | ✅ |
| 27 | Improve skill-level question accuracy in the rating screen | ✅ |
| 28 | Implement "Visual Silence" UI/UX identity (Minimalist Luxury) | ✅ |
| 29 | Multi-language support (i18n) — Full Arabic and English interfaces | ✅ |
| 30 | Consolidate translation keys and resolve TypeScript conflicts | ✅ |

---

## 🎨 Visual Identity

- **Style**: Visual Silence + Glassmorphism + Liquid Glass 2026
- **Philosophy**: Reducing visual noise, removing borders, relying on tonal layering.
- **Direction**: Full RTL and LTR support (Arabic/English)
- **Background**: Dark gradients with transparent glass layers
- **Sport-specific colours**: Football (green), Padel (blue), Tennis (orange)
- **Typography**: Clear Arabic font with full RTL support
- **Corners**: Rounded (large border-radius)
- **Effects**: BlurView, LinearGradient, and shadow on all cards
