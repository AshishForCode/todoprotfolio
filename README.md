# StudyHub — Personal Portfolio & Student Productivity Suite 🎓⚡

> A modern, zero-backend personal portfolio, study management hub, and PDF material vault built with HTML5, CSS3, and JavaScript. Powered by **IndexedDB** for local encrypted file storage and **Web Crypto SHA-256** authentication.

---

## 🌟 Key Features

### 1. 🔐 User Authentication & Multi-Account Isolation
* **Login & Registration:** Create private student accounts with custom username, email, and password.
* **Cryptographic Security:** Passwords are never stored in plaintext — securely hashed using browser-native **Web Crypto API (SHA-256 with salt)**.
* **Isolated Workspaces:** Each user's notes, tasks, study materials, certificates, and streaks are sandboxed in their own private namespace.
* **Account Switching:** Quickly switch between accounts or test with the built-in demo profile.

### 2. 📄 PDF Study Material Vault & Built-In Reader
* **Save Materials as PDF:** Upload real `.pdf` textbooks, lecture notes, and assignments via drag-and-drop or file picker.
* **IndexedDB Binary Storage:** Uses browser **IndexedDB** (`StudyHubDB`) to store real PDF binary Blobs reliably without crashing localStorage.
* **Built-In PDF Reader:** Read and review documents directly inside StudyHub with zoom, page navigation, and fullscreen reading mode.
* **Direct Download:** Download stored PDFs back to your device anytime with a single click.

### 3. 💾 Enforced Database Storage Quotas & Limits
* **Strict Per-User Limits:** Every student account is allocated an enforced **20 MB** local database quota.
* **Live Storage Meter:** Real-time visual progress bar showing exact bytes used (e.g. `1.8 MB / 20.0 MB - 9%`).
* **Intelligent Limit Enforcement:** Automatically validates incoming PDF file sizes before upload. If a file would exceed the available space, the app rejects the upload with a clear alert and prompts the user to free up space.
* **Dynamic Color Alerts:** Storage meter turns amber at 70% and red at 90% capacity. Deleting materials immediately frees database space.

### 4. 📊 Study Dashboard & Productivity
* **Study Streak Tracker:** Daily consistency counter with a visual activity calendar.
* **Pomodoro Timer:** 25/5/15 minute focus intervals with Web Audio notification chimes.
* **Kanban & List Tasks:** Drag-and-drop Kanban board (To Do, In Progress, Done) plus quick-add.
* **Certificates Showcase:** Upload credentials, images, and completion dates.
* **Video Learning Hub:** Track YouTube tutorials with auto-fetched thumbnail cards.
* **Dark / Light Mode:** High-contrast glassmorphism interface with smooth theme switching.
* **JSON Backup & Restore:** 1-click Export and Import to migrate data across laptops or phones.

---

## 🚀 How Other People Can Use It

### Method 1: Instant Browser Use (Zero Setup)
Host the folder on **GitHub Pages**, **Vercel**, or **Netlify**:
1. Open the website link in any modern browser.
2. Click **Account & Storage** (`⚙️`) in the sidebar or mobile header.
3. Click **Sign Up** to create your own account.
4. Upload your own PDF notes and track your own tasks — each user gets their own private 20 MB database stored locally in their browser!

### Method 2: Open-Source GitHub Template
1. Fork or click **"Use this template"** on this repository.
2. Edit `CONFIG` at the top of [app.js](file:///d:/todoportfolio/app.js) with your name, bio, and social links.
3. Go to **Settings $\rightarrow$ Pages** on GitHub and enable GitHub Pages. Live in 60 seconds!

---

## 🔒 Security Architecture

| Feature | Implementation | Purpose |
| :--- | :--- | :--- |
| **Password Protection** | Web Crypto SHA-256 + Salt | Protects credentials from plaintext exposure |
| **Data Isolation** | User-scoped key namespaces | Prevents cross-account data leaks |
| **PDF Storage** | Private Browser IndexedDB | Keeps study documents confidential on the user's device |
| **Quota Enforcement** | Byte-level pre-upload validation | Prevents browser memory exhaustion and storage crashes |
| **Reverse Tabnabbing** | `rel="noopener noreferrer"` | Secures external links |

---

## 💻 Tech Stack

* **Frontend:** Vanilla HTML5, Modern CSS3 (CSS Variables, Flexbox, CSS Grid)
* **Logic:** Vanilla ES6+ JavaScript
* **Database & Storage:** IndexedDB (`StudyHubDB`) + `localStorage`
* **Cryptography:** Browser Web Crypto API
* **Icons & Fonts:** Unicode Emojis & Google Fonts (Inter)
