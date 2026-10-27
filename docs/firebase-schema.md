# Firebase / Firestore schema

This document describes the Firestore model currently used by IronTrack. It is
based on the application writers/readers, checked-in rules, and indexes. Field
names and types are implementation facts; optional fields and legacy shapes are
called out explicitly.

## Overview

- **Firebase project:** `irontrack-f4b19` (`firebase.js`)
- **SDK:** Firebase JavaScript SDK 10.12.2, modular CDN imports
- **Authentication:** Firebase Authentication; application documents identify
  users by their Auth UID
- **Collections:** seven top-level stores; there are currently no subcollections
- **References:** relationships are stored as plain string IDs, not Firestore
  `DocumentReference` values
- **Timestamps:** profile/plan/share lifecycle timestamps generally use
  `serverTimestamp()`, while workout event timestamps use the client clock
  (`Timestamp.now()`)

## Relationship overview

```text
profiles/{uid}
  ├── friends[] ────────────────> profiles/{uid}
  ├── userId <────────────────── workouts/{workoutId}
  ├── userId <────────────────── structured_workouts/{workoutId}
  └── userId <────────────────── workout_plans/{planId}

structured_workouts/{id}
  └── id <────────────────────── workouts.workoutId

workout_plans/{id} <──────────── shared_plans.planId (plan shares)
structured_workouts/{id} <────── shared_plans.planId (workout shares)

config/consistency                 singleton configuration document
daily_activity/{uid}_{YYYY-MM-DD}  legacy/seed-only store
```

## Lifecycle quick reference

| Store | Create | Update | Delete | Live listener | Query/index notes |
| --- | --- | --- | --- | --- | --- |
| `profiles/{uid}` | onboarding, social initialization, profile save | scores, streaks, theme, friends | account deletion only | own profile and leaderboard | leaderboard reads top 50 by score |
| `workouts/{id}` | manual, PB, onboarding, structured contribution logs | none | none | owner-filtered, newest 250 | `userId ASC, timestamp DESC` |
| `structured_workouts/{id}` | structured workout submission | `favorite` | hard delete | owner-filtered, newest 500 | `userId ASC, timestamp DESC` |
| `workout_plans/{id}` | plan save or shared-plan copy | favorite, soft-delete status | never; soft delete | owner-filtered | client sorts by `createdAt` |
| `shared_plans/{id}` | friend share, QR placeholder, QR claim | status, favorite | forbidden by rules | recipient-filtered | deduplication queries use composite indexes |
| `daily_activity/{id}` | seed utility only | none | none | none | not consumed by the app |
| `config/consistency` | seed utility only | none | none | one-shot read | no matching rule in checked-in rules |

## `profiles/{uid}`

The document ID is the Firebase Auth UID. Profiles are also used as the public
source for friend lookup and leaderboard data.

| Field | Type | Meaning | Optional |
| --- | --- | --- | --- |
| `uid` | string | Auth UID, duplicated in the document | yes |
| `displayName` | string | Public Cyber-Tag/display name | yes |
| `gender` | string | `male` or `female`; used by score calculations | yes |
| `bodyweight` | number | Bodyweight in kilograms | yes |
| `day0TrainingDays` | map of numbers | Monthly/yearly/lifetime challenge baseline | yes |
| `onboardingComplete` | boolean | Whether onboarding is finished | yes |
| `onboardedAt` | Timestamp | Onboarding completion time | yes |
| `startingMaxes` | map of numbers | Initial exercise 1RMs captured during onboarding | yes; currently write-only |
| `theme` | string | `auto`, `light`, or `dark` | yes |
| `challengeStreaks` | map | Monthly/yearly completed periods and current/best streaks | yes |
| `dotsScore` | number | Cached DOTS score for leaderboard sorting | yes |
| `sinclairScore` | number | Cached Sinclair score for leaderboard sorting | yes |
| `lastActive` | Timestamp | Activity marker written by social/leaderboard code | yes |
| `friends` | array of strings | One-way list of other profile UIDs | yes |

**Writers/readers:** onboarding and profile save in `app.js`; social profile and
friend changes in `friends.js`; streaks in `calendar.js`; theme in `theme.js`;
score cache in `leaderboard.js`; reads occur in `auth.js`, `friends.js`,
`leaderboard.js`, and `sharing.js`.

**Rules:** authenticated users may read profiles; only the owner may
create/update/delete their own profile. There is no field-level protection.

## `workouts/{workoutId}`

Documents use auto-generated IDs. Each document is an individual exercise/set
row and is associated with its owner through `userId`.

| Field | Type | Meaning |
| --- | --- | --- |
| `userId` | string | Owning Auth UID; required by rules |
| `exercise` | string | Exercise name, including possible weighted-bodyweight variant |
| `sets` | number | Number of sets |
| `reps` | number | Repetitions represented by the row |
| `weight` | number | Entered load in kilograms |
| `externalLoad` | number | Added load for weighted bodyweight movements |
| `estimatedLoad` | number | Effective load after bodyweight/load-factor calculation |
| `totalVolume` | number | Calculated volume |
| `timestamp` | Timestamp | Workout event time; client `Timestamp.now()` |
| `source` | string, optional | `pb-log`, `onboarding`, or `structured`; manual rows may omit it |
| `isInitialMax` | boolean | Marks onboarding rows |
| `workoutId` | string, optional | ID of the related `structured_workouts` document |
| `weightMode` | string, optional | `absolute`, `pct`, or `rpe` |
| `pct` | number/null, optional | Prescribed percentage when applicable |
| `rpe` | number/null, optional | Prescribed RPE when applicable |
| `totalWorkReps` | number, optional | Total reps contributed to a structured session |
| `additionalReps` | number, optional | AMRAP leftover reps |
| `minuteIndex` | number, optional | EMOM minute slot |
| `partialReps` | number, optional | Partial round reps for For Time/Interval workouts |

The main listener filters by `userId`, orders by `timestamp DESC`, and limits
the result to 250 rows (`data.js`). Structured contribution rows remain in this
store even if their parent structured workout is later deleted.

**Rules:** authenticated users can read; create/update/delete requires the
request data's `userId` to equal the authenticated UID. The checked-in rule uses
a recursive wildcard even though the application has no subcollections here.

## `structured_workouts/{workoutId}`

This stores one completed AMRAP, EMOM, For Time, or Interval session. Its
contribution rows are stored separately in `workouts` and point back with the
plain string `workoutId`.

| Field | Type | Meaning |
| --- | --- | --- |
| `userId` | string | Owner |
| `name` | string | Display name |
| `type` | enum | `AMRAP`, `EMOM`, `FOR_TIME`, or `INTERVAL` |
| `structure` | map | Prescribed workout; see shared shapes below |
| `result` | map | Completed result; see result shapes below |
| `scoreDisplay` | string | Human-readable score, such as `5 + 3` or `9:00` |
| `scoreType` | enum | `ROUNDS_AND_REPS`, `COMPLETED_MINUTES`, or `TIME_SECONDS` |
| `scoreValue` | number | Sortable numeric score |
| `timestamp` | Timestamp | Session time, using client `Timestamp.now()` |
| `favorite` | boolean, optional | User's favorite marker |

`workouts.js` listens for the owner's newest 500 documents. Favorites are
updated in `sharing.js`; structured workouts can be hard-deleted by
`plans.js`.

**Rules:** reads and writes require the document `userId` to match the Auth UID,
except creation, which checks `request.resource.data.userId`.

## `workout_plans/{planId}`

Saved plans use auto-generated IDs. Plans are soft-deleted rather than removed.

| Field | Type | Meaning |
| --- | --- | --- |
| `userId` | string | Owner |
| `name` | string | Plan name |
| `type` | enum | Same workout-type enum as structured workouts |
| `structure` | map | Prescribed workout structure |
| `status` | enum | `active` or `deleted` |
| `createdAt` | Timestamp/number | Server timestamp in the app; seed data may use epoch milliseconds |
| `favorite` | boolean, optional | Favorite marker |

The app listens by owner and sorts in memory. A composite index for
`userId + createdAt DESC` exists but is not used by the current listener.

**Rules:** authenticated users may `get` a plan by known ID (required by QR
claim); list and writes are owner-controlled. This means a plan ID is a
capability-like identifier and should not be treated as secret data.

## `shared_plans/{shareId}`

This is a polymorphic collection. All documents use auto-generated IDs, but
there are three shapes:

### Friend share

Written by `sharing.js` when a plan/workout is sent to a friend.

| Field | Type | Meaning |
| --- | --- | --- |
| `sharedBy` | string | Sender UID |
| `sharedByDisplayName` | string | Denormalized sender name |
| `sharedWith` | string | Recipient UID |
| `planId` | string | Source plan or structured-workout ID |
| `contentType` | `plan`/`workout` | Source kind |
| `content` | map | Denormalized `{name, type, structure}` snapshot |
| `status` | string | Pending, saved, or dismissed |
| `createdAt` | Timestamp | Server creation time |
| `favorite` | boolean, optional | Recipient favorite marker |

### QR placeholder

Created when a QR code is generated:

```text
sharedBy, sharedByDisplayName, sharedWith: "__qr__",
shareMethod: "qr", planId, createdAt
```

It intentionally has no `content`, `contentType`, or `status`.

### QR claimed copy

Created for the person claiming a QR plan:

```text
sharedBy, sharedByDisplayName, sharedWith: <claimer UID>,
shareMethod: "qr_claimed", planId, contentType: "plan",
content: { name, type, structure }, status: "active", createdAt
```

The content is copied at claim time, so later edits to the source do not update
the shared copy.

**Rules:** recipients may read their own shares; authenticated users may read
QR placeholders; senders may create direct/QR shares; recipients may update
their shares; deletion is forbidden. No cleanup job currently removes old
shares.

## Shared workout structures

The `structure` map is type-dependent:

- **AMRAP:** `{ durationSeconds, movements[] }`
- **EMOM:** `{ mode, rounds, durationMinutes, intervalSeconds, minutes[] }`
- **FOR_TIME:** `{ durationMinutes, movements[], rounds }`
- **INTERVAL:** `{ rounds, workSeconds, restSeconds, movements[] }`

Each movement normally contains:

```text
{ exerciseId, weight, reps, weightMode, pct, rpe }
```

Older/compatibility data may also contain `movement` instead of `exerciseId`
and `kg` instead of `weight`. Readers support both pairs; new documentation and
writers should treat `exerciseId` and `weight` as canonical.

Result maps are:

- **AMRAP:** `{ roundsCompleted, additionalReps }`
- **EMOM:** `{ roundsCompleted }`
- **FOR_TIME:** `{ timeSeconds, completed, remainingReps? }`
- **INTERVAL:** `{ roundsCompleted, partialReps, completed }`

## Legacy and configuration stores

### `daily_activity/{uid}_{YYYY-MM-DD}`

The seed utility can write `{userId, date, hasWorkout, totalDuration}`. The
application does not read this collection; calendar activity is computed from
workout timestamps in memory. The checked-in rule also uses `resource.data` for
writes, which does not authorize new-document creates. Treat this store as
vestigial unless the data model is intentionally revived.

### `config/consistency`

The singleton document contains numeric thresholds:

```text
{ monthlyUniqueDays, yearlyUniqueDays, lifetimeUniqueDays }
```

`calendar.js` attempts a one-shot read and falls back to hardcoded defaults on
failure. No `/config` rule is present in the checked-in `firestore.rules`, so
this document may be unreadable in the deployed project unless production rules
differ.

## Known quirks and operational notes

These are current behaviors, not recommendations or schema guarantees:

1. `shared_plans` has three incompatible document shapes; consumers must branch
   on `shareMethod` and field presence.
2. QR claiming currently reads `workout_plans/{planId}`. QR sharing a structured
   workout therefore does not follow the same successful claim path as plans.
3. Workout timestamps use client clocks, while plan/profile/share timestamps use
   server timestamps. Ordering can be affected by a device with an incorrect
   clock.
4. Seeded plan `createdAt` values may be numbers while app-created values are
   Timestamps; readers contain a fallback for both.
5. Workout history is limited to 250 rows and structured history to 500 rows;
   calculated records, scores, and volume are therefore not unlimited history
   queries.
6. `startingMaxes` is stored during onboarding but is not currently read.
7. Deleting a structured workout leaves its `workouts` contribution rows and
   their `workoutId` strings behind.
8. Account deletion removes the profile document but leaves workout, plan, and
   share documents with the old UID.
9. Friendship is one-way: adding a friend updates the adder's `friends` array,
   not the other profile.
10. Authenticated users can read profile and workout documents under the
    checked-in rules. The client normally applies owner filters, but rules do
    not provide field-level privacy.
11. `lastActive` is written but has no current reader, and some composite
    indexes are not used by current queries.
12. The repository contains rules and indexes but no `firebase.json`; GitHub
    Pages deployment does not deploy Firestore rules or indexes. Verify the
    deployed Firebase configuration separately.

## Source map

The principal implementation sources for this reference are:

- Firebase initialization and exports: `firebase.js`
- Rules: `firestore.rules`
- Composite indexes: `firestore.indexes.json`
- Profile and onboarding writes: `app.js`, `auth.js`, `friends.js`
- Workout streams and rows: `data.js`, `workouts.js`, `auth.js`
- Plans and structures: `plans.js`
- Sharing and QR flows: `sharing.js`
- Calendar/config behavior: `calendar.js`
- Development data generation: `seed.html`
