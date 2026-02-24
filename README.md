# 🌀 Orbit Productivity

A premium all-in-one productivity web app — built with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools, no backend.

![Dark Mode](https://img.shields.io/badge/theme-dark%20%2F%20light-6d28d9?style=flat-square)
![Auth](https://img.shields.io/badge/auth-SHA--256%20%2B%20sessions-00d4aa?style=flat-square)
![Storage](https://img.shields.io/badge/storage-localStorage-f59e0b?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## ✨ Features

### 📋 Task Manager

- Add tasks with priority (High / Medium / Low), due date, and category
- Toggle completion, delete, and filter tasks (All, Today, Upcoming, Done, High Priority)
- Overdue highlighting and priority badges

### 🍅 Pomodoro Timer

- Work, short break, and long break modes
- Animated SVG ring with gradient progress indicator
- Customisable durations and sessions per round
- Browser notifications on session complete
- Daily focus session stats

### 📝 Notes

- Create, edit, pin, and delete notes
- Colour-coded notes (6 colours)
- Tag system (Work, Personal, Ideas)
- Full-text search

### 🔥 Habit Tracker

- Add habits with custom emoji icons
- Daily check-ins with streak tracking
- 7-day grid visualisation per habit

### 📊 Dashboard

- Time-of-day greeting with your name
- Live stats: tasks left, habits done, focus sessions, best streak
- Weekly task completion bar chart
- Quick task add + today's habits panel

### 🔐 Authentication

- Username + password login (no email required)
- Passwords hashed with **SHA-256** via the Web Crypto API + per-user random salt
- Session tokens in `sessionStorage` (auto-clears on tab close)
- "Remember me" — 30-day persistent session via `localStorage`
- Forgot password: generates a temporary password shown on screen

### 🌙 Dark / Light Mode

- System-aware default with a persistent toggle
- Full custom property-driven theming

---

## 🗂 File Structure

```
orbit-productivity/
├── index.html        # Waitlist landing page
├── styles.css        # Landing page styles
├── script.js         # Landing page logic
├── auth.html         # Login / Register page
├── auth.css          # Auth page styles
├── auth.js           # Authentication logic
├── app.html          # Main productivity app
├── app.css           # App design system
└── app.js            # App logic
```

---

## 🚀 Getting Started

No installation needed. Just open the files in a browser.

```bash
git clone https://github.com/Dave-dDev/orbit-productivity.git
cd orbit-productivity
# Open auth.html in your browser
```

Or open `auth.html` directly — register an account and you're in.

---

## 🔧 Tech Stack

| Layer   | Technology                                                 |
| ------- | ---------------------------------------------------------- |
| Markup  | HTML5 (semantic)                                           |
| Styling | Vanilla CSS (custom properties, glassmorphism, animations) |
| Logic   | Vanilla JavaScript (ES2020+)                               |
| Fonts   | Inter + Outfit (Google Fonts)                              |
| Crypto  | Web Crypto API (`crypto.subtle`)                           |
| Storage | localStorage / sessionStorage                              |

---

## 🔒 Security Notes

- Passwords are **never stored in plaintext** — SHA-256 + random salt per user
- Sessions expire automatically when the browser tab closes (unless "Remember me" is checked)
- All data stays local — nothing is sent to any server

---

## 📸 Pages

| Page         | Description                                       |
| ------------ | ------------------------------------------------- |
| `index.html` | Marketing / waitlist landing page                 |
| `auth.html`  | Login & registration with password strength meter |
| `app.html`   | Full productivity dashboard                       |

---


© [Dave-dDev](https://github.com/Dave-dDev)
