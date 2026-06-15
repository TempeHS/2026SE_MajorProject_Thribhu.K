# PRIVACY.md

This document defines what data is collected by tppr (Thribhu's Past Paper Repository).

## TLDR:
We do not collect any personal information, and anything that may be considered personal (i.e. email) is never used outside of the website purposes. 

A cookie is added to your session to store authentication details (even so, only alive for 24 hours), and Javascript IndexedDB is used to cache papers locally. 

Since this app is for education purposes, there is no advertising used.

If you don't believe me, check the source out for yourself at GitHub. 


## Account Data

| Field | Purpose |
| ----- | ------- |
| Username | Display name and login identifier |
| Email | Login identifier and 2FA provisioning |
| Password hash | Authentication (stored as bcrypt hash, never plaintext) |
| TOTP secret | Two-factor authentication (optional, only if user enables 2FA) |
| Created at | Timestamp of account creation |
| Last login | Timestamp of most recent successful login |

## Paper & Question Data

| Field | Purpose |
| ----- | ------- |
| Author ID | Links papers and questions to the user who created them |
| Paper metadata | Title, subject, year, source, school, course level, visibility, duration |
| Question content | Stimulus, body text, parts, MCQ options, answer, topics, difficulty, syllabus points |
| Timestamps | Created and last-updated times on all papers and questions |

## Authentication

- A JSON Web Token (JWT) is stored as an HTTP-only cookie (`access_token_cookie`) with a 24-hour expiry.
- Revoked tokens are held in a server-side blocklist until they expire.

## Local Browser Storage

- Papers are cached in the browser's IndexedDB for offline access and are only sent to the server when syncing.

## What We Do NOT Collect

- No analytics or tracking pixels
- No IP address logging beyond standard server access logs
- No payment or financial information
- No device fingerprinting
- No cookies beyond the authentication JWT

## Data Sharing

- User-created papers marked as "public" are visible to all users of the platform.
- Private papers are only accessible to their author.
- No data is shared with or sold to third parties.

## Data Deletion

- Users can delete their papers at any time, which removes them from both local storage and the server.
- Account deletion removes all associated user data from the database.