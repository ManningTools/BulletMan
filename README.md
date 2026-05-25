# BulletMan

> A desktop task-timer app for freelancers and focused workers.  
> Track time, log earnings, manage clients, and visualize your day — all stored locally, no account required.

Built with **Electron + React + Vite**. All data lives in `localStorage` — nothing leaves your machine.

---

## Features

### ⏱ Task Timers
- Add bullet tasks and start/stop a timer on each one with a single click
- Only one timer runs at a time — starting a new task automatically pauses the current one
- Click the time display on any task to manually edit the logged time (`1h 30m`, `90`, `1:30:00` all accepted)
- Timers stop cleanly at midnight and are stamped to the correct day

### ✅ Subtasks
- Expand any task to reveal a bullet sub-list
- Check off individual subtasks; progress shows as `2/4` on the parent task
- Subtask counts are included in CSV exports

### 💰 Earnings Tracking
- Set a **global hourly rate** in Settings ($ icon in the header)
- Override the rate **per task** with the `$` button on each task row
- Earnings are calculated live from logged time and shown inline on each task and in the visualizer

### 🏢 Clients & Projects
- Create **clients** with a custom colour and nest unlimited **projects** under each
- Assign any task to a **client / project** via the `◎` button — a coloured chip appears inline
- When clients exist, the add-task form shows **client and project dropdowns** for instant assignment
- All client and project fields appear in every CSV export

### 📊 Day Visualizer
- Donut chart breaking down today's time by task
- Progress bars with time and earnings per task
- Full earnings breakdown section (only shown when rates are configured)

### 📅 Week View
- Stacked bar chart across the current week (Sun → Sat)
- Navigate to any past week with arrow buttons or the **calendar picker** (📅)
- Calendar highlights weeks that have logged time
- Weekly summary cards with per-task totals and earnings

### 🏷 Clients Visualizer
- Dedicated **Clients tab** with a time/earnings visualizer per client and per project
- Toggle between **This Week**, **This Month**, and **All Time**
- Full CRUD management: add, rename, recolour, and delete clients and projects

### 📥 CSV Export
- Export **today**, the **current week**, or the **current month** as a `.csv` file
- Columns: `Date, Task, Client, Project, Hours, Time, Rate ($/hr), Earnings ($), Completed, Subtasks Done, Subtasks Total`

### 🗓 History & Carry-Over
- Every day's tasks are stored permanently — navigate to any past week in the Week tab
- Yesterday's incomplete tasks appear at the bottom of Today with a **+ Add** button to carry them over

### 🎨 Themes
Eight built-in colour themes plus a fully custom picker:

| Theme | Style |
|---|---|
| **Default Light** | Crisp white, black borders — Manning design system |
| **Default Dark** | Inverted: black bg, white hard shadows |
| Mocha | Dark purple |
| Ocean | Dark blue |
| Forest | Dark green |
| Sunset | Dark rose |
| Latte | Soft lavender |
| Custom | Pick any background + accent colour |

### 🖥 System Tray (Linux & Windows)
- Closing the window **hides to tray** — the app keeps running in the background
- Left-click the tray icon to show/hide the window
- Right-click → **Quit** to fully exit

---

## Download

| Platform | File |
|---|---|
| Linux (AppImage) | `BulletMan-1.1.0.AppImage` |
| Linux (deb) | `bulletman_1.1.0_amd64.deb` |
| Windows (installer) | `BulletMan Setup 1.1.0.exe` |
| Windows (portable) | `BulletMan 1.1.0.exe` |

> **Linux AppImage:** `chmod +x BulletMan-1.1.0.AppImage && ./BulletMan-1.1.0.AppImage`

---

## Run from Source

**Prerequisites:** Node.js 18+

```bash
git clone <repo-url>
cd BulletMan
npm install
npm run electron:dev
```

### Build release binaries

```bash
# Linux (AppImage + deb)
npm run electron:build

# Windows (NSIS installer + portable)
npm run electron:build:win

# Both platforms
npm run electron:build:all
```

Output goes to `release/`.

---

## Data & Privacy

All data is stored in your browser's `localStorage` within the Electron context — nothing is sent to any server, ever. To back up or transfer your data, use your browser's developer tools to export the `bulletman_tasks`, `bulletman_clients`, `bulletman_settings`, and `bulletman_theme` keys.

---

## Tech Stack

- [Electron](https://www.electronjs.org/) — desktop shell
- [React 19](https://react.dev/) — UI
- [Vite 8](https://vitejs.dev/) — bundler / dev server
- [Recharts](https://recharts.org/) — charts
- [Montserrat](https://fonts.google.com/specimen/Montserrat) — typography

---

## License

MIT © Manning Moore
