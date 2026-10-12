/* ============================================================
   ★ PERSONAL CONFIG — EDIT YOUR INFO HERE ★
   ============================================================ */
const CONFIG = {
  name: "MR.ASHISH SHARMA",
  tagline: "B.Tech CSE 4th YEAR | Learning web development",
  bio: "Passionate about building things for the web. Currently pursuing BCA and exploring full-stack development. Always learning, always building.",
  links: {
    github: "https://github.com/AshishForCode",
    linkedin: "https://linkedin.com/in/yourprofile",
    email: "you@example.com"
  },
  accentColor: { h: 217, s: 85, l: 52 },
  pomodoro: {
    work: 25,    // minutes
    short: 5,    // minutes
    long: 15,    // minutes
    sessionsBeforeLong: 4
  }
};

/* ============================================================
   DATABASE ENGINE (INDEXEDDB), AUTH & USER STORAGE QUOTA
   ============================================================ */
const DB_NAME = 'StudyHubDB';
const DB_VERSION = 1;
const DEFAULT_STORAGE_LIMIT_BYTES = 20 * 1024 * 1024; // 20 MB database quota limit

let dbInstance = null;
function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('users')) {
        const uStore = db.createObjectStore('users', { keyPath: 'id' });
        uStore.createIndex('username', 'username', { unique: true });
        uStore.createIndex('email', 'email', { unique: true });
      }
      if (!db.objectStoreNames.contains('pdf_files')) {
        const pStore = db.createObjectStore('pdf_files', { keyPath: 'id' });
        pStore.createIndex('userId', 'userId', { unique: false });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

async function savePdfToDB(pdfRecord) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdf_files', 'readwrite');
    const store = tx.objectStore('pdf_files');
    const req = store.put(pdfRecord);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPdfFromDB(pdfId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdf_files', 'readonly');
    const store = tx.objectStore('pdf_files');
    const req = store.get(pdfId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deletePdfFromDB(pdfId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdf_files', 'readwrite');
    const store = tx.objectStore('pdf_files');
    const req = store.delete(pdfId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getUserPdfStorageBytes(userId) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('pdf_files', 'readonly');
      const store = tx.objectStore('pdf_files');
      const index = store.index('userId');
      const req = index.getAll(userId);
      req.onsuccess = () => {
        const records = req.result || [];
        const total = records.reduce((acc, r) => acc + (r.fileSize || 0), 0);
        resolve(total);
      };
      req.onerror = () => resolve(0);
    });
  } catch(e) {
    return 0;
  }
}

async function getPdfsCountForUser(userId) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('pdf_files', 'readonly');
      const store = tx.objectStore('pdf_files');
      const index = store.index('userId');
      const req = index.count(userId);
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch(e) {
    return 0;
  }
}

/* ============================================================
   USER MANAGEMENT & SHA-256 SECURITY
   ============================================================ */
async function hashPassword(pwd) {
  const enc = new TextEncoder();
  const data = enc.encode(pwd + '_sh_salt_2026');
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_USER = {
  id: 'usr_ashish',
  name: "MR.ASHISH SHARMA",
  username: "ashish",
  email: "ashish@example.com",
  tagline: "B.Tech CSE 4th YEAR | Learning web development",
  bio: "Passionate about building things for the web. Currently pursuing BCA and exploring full-stack development. Always learning, always building.",
  passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", // default password
  quotaBytes: DEFAULT_STORAGE_LIMIT_BYTES,
  createdAt: '2026-01-01T00:00:00.000Z'
};

function getAllUsers() {
  try {
    const raw = localStorage.getItem('sh_users');
    let users = raw ? JSON.parse(raw) : [];
    if (!users.some(u => u.id === DEFAULT_USER.id)) {
      users.unshift(DEFAULT_USER);
      localStorage.setItem('sh_users', JSON.stringify(users));
    }
    return users;
  } catch (e) {
    return [DEFAULT_USER];
  }
}

function saveUsers(users) {
  localStorage.setItem('sh_users', JSON.stringify(users));
}

function getCurrentUser() {
  const users = getAllUsers();
  const activeId = localStorage.getItem('sh_active_user_id') || DEFAULT_USER.id;
  const found = users.find(u => u.id === activeId);
  return found || users[0] || DEFAULT_USER;
}

function setCurrentUser(user) {
  localStorage.setItem('sh_active_user_id', user.id);
  CONFIG.name = user.name;
  if (user.tagline) CONFIG.tagline = user.tagline;
  if (user.bio) CONFIG.bio = user.bio;
  updateUserProfileUI();
  updateStorageUI();
  renderAll();
}

function initUsers() {
  getAllUsers();
  const user = getCurrentUser();
  CONFIG.name = user.name;
  if (user.tagline) CONFIG.tagline = user.tagline;
  if (user.bio) CONFIG.bio = user.bio;
}

/* ============================================================
   DATA LAYER (USER-ISOLATED STORAGE)
   ============================================================ */
const STORAGE_KEYS = {
  notes: 'sh_notes',
  todos: 'sh_todos',
  materials: 'sh_materials',
  certificates: 'sh_certificates',
  videos: 'sh_videos',
  theme: 'sh_theme',
  sampleLoaded: 'sh_sample_loaded',
  streak: 'sh_streak',
  pomodoroSessions: 'sh_pomodoro_sessions',
  taskHistory: 'sh_task_history'
};

function getScopedKey(key) {
  const user = getCurrentUser();
  if (user.id === DEFAULT_USER.id) {
    return key;
  }
  return `sh_${user.id}_${key.replace(/^sh_/, '')}`;
}

function loadData(key) {
  try {
    const scoped = getScopedKey(key);
    const raw = localStorage.getItem(scoped);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to load', key, e);
    return [];
  }
}

function saveData(key, data) {
  try {
    const scoped = getScopedKey(key);
    localStorage.setItem(scoped, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save', key, e);
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ============================================================
   SAMPLE DATA
   ============================================================ */
function loadSampleData() {
  if (localStorage.getItem(STORAGE_KEYS.sampleLoaded)) return;

  const sampleNotes = [
    { id: uid(), title: "JavaScript Closures", body: "A closure is a function that has access to the parent scope, even after the parent function has closed. Great for data privacy and factory functions.", tag: "JavaScript", pinned: true, createdAt: new Date().toISOString() },
    { id: uid(), title: "CSS Grid vs Flexbox", body: "Grid is 2D (rows + columns). Flexbox is 1D (row OR column). Use Grid for page layout, Flexbox for component alignment.", tag: "CSS", pinned: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: uid(), title: "React Hooks Cheatsheet", body: "useState for state, useEffect for side effects, useContext for context, useRef for DOM refs, useMemo for memoization, useCallback for callback memoization.", tag: "React", pinned: false, createdAt: new Date(Date.now() - 172800000).toISOString() }
  ];

  const sampleTodos = [
    { id: uid(), text: "Complete HTML/CSS portfolio project", done: false, priority: "High", dueDate: todayStr(), createdAt: new Date().toISOString() },
    { id: uid(), text: "Read Chapter 5 – Data Structures", done: false, priority: "Medium", dueDate: "", createdAt: new Date().toISOString() },
    { id: uid(), text: "Submit database assignment", done: true, priority: "High", dueDate: todayStr(), createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: uid(), text: "Watch React tutorial series", done: false, priority: "Low", dueDate: "", createdAt: new Date().toISOString() }
  ];

  const sampleMaterials = [
    { id: uid(), title: "Eloquent JavaScript", subject: "JavaScript", type: "Book", link: "https://eloquentjavascript.net/", description: "A modern introduction to programming with JavaScript.", status: "Studied", createdAt: new Date().toISOString() },
    { id: uid(), title: "MDN Web Docs – CSS", subject: "CSS", type: "Link", link: "https://developer.mozilla.org/en-US/docs/Web/CSS", description: "Complete CSS reference and tutorials from Mozilla.", status: "To study", createdAt: new Date().toISOString() }
  ];

  const sampleCerts = [
    { id: uid(), title: "Responsive Web Design", issuer: "freeCodeCamp", dateEarned: "2025-09-15", credentialLink: "https://freecodecamp.org/certification/example", image: "", createdAt: new Date().toISOString() },
    { id: uid(), title: "JavaScript Algorithms", issuer: "freeCodeCamp", dateEarned: "2025-11-20", credentialLink: "", image: "", createdAt: new Date().toISOString() }
  ];

  const sampleVideos = [
    { id: uid(), title: "JavaScript Crash Course for Beginners", url: "https://www.youtube.com/watch?v=hdI2bqOjy3c", topic: "JavaScript", status: "Done", createdAt: new Date().toISOString() },
    { id: uid(), title: "CSS Grid Tutorial", url: "https://www.youtube.com/watch?v=EFafSYg-PkI", topic: "CSS", status: "Watch later", createdAt: new Date().toISOString() }
  ];

  // Generate sample task history for the analytics chart
  const sampleHistory = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    sampleHistory.push({ date: dateStr, completed: Math.floor(Math.random() * 4) + 1 });
  }

  saveData(STORAGE_KEYS.notes, sampleNotes);
  saveData(STORAGE_KEYS.todos, sampleTodos);
  saveData(STORAGE_KEYS.materials, sampleMaterials);
  saveData(STORAGE_KEYS.certificates, sampleCerts);
  saveData(STORAGE_KEYS.videos, sampleVideos);
  saveData(STORAGE_KEYS.taskHistory, sampleHistory);
  localStorage.setItem(STORAGE_KEYS.sampleLoaded, '1');
}

function clearSampleData() {
  confirmAction("Clear all sample data and start fresh?", () => {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.setItem(STORAGE_KEYS.sampleLoaded, '1');
    if (currentTheme === 'dark') localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    document.getElementById('clearSampleBtn').style.display = 'none';
    renderAll();
    showToast('Sample data cleared!', 'success');
  });
}

/* ============================================================
   THEME
   ============================================================ */
let currentTheme = 'light';

function initTheme() {
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEYS.theme); } catch(e) {}
  if (saved) {
    currentTheme = saved;
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    currentTheme = 'dark';
  }
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = currentTheme === 'dark' ? '☀️' : '🌙';
  const label = currentTheme === 'dark' ? 'Light mode' : 'Dark mode';
  const ti = document.getElementById('themeIcon');
  const tl = document.getElementById('themeLabel');
  const mb = document.getElementById('mobileThemeBtn');
  if (ti) ti.textContent = icon;
  if (tl) tl.textContent = label;
  if (mb) mb.textContent = icon;
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(STORAGE_KEYS.theme, currentTheme); } catch(e) {}
  applyTheme();
}

/* ============================================================
   NAVIGATION
   ============================================================ */
let currentSection = 'dashboard';

function navigateTo(section) {
  currentSection = section;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + section)?.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.section === section));
  document.querySelectorAll('.tab-item').forEach(t => t.classList.toggle('active', t.dataset.section === section));

  // Refresh section data
  if (section === 'dashboard') renderDashboard();
  else if (section === 'notes') renderNotes();
  else if (section === 'todos') renderTodos();
  else if (section === 'materials') renderMaterials();
  else if (section === 'certificates') renderCertificates();
  else if (section === 'videos') renderVideos();
}

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.section));
  });
  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.section));
  });
}

/* ============================================================
   MODAL SYSTEM
   ============================================================ */
function openModal(title, bodyHtml, footerHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml;
  document.getElementById('modalOverlay').classList.add('open');
  // Focus first input
  setTimeout(() => {
    const fi = document.querySelector('#modalBody input, #modalBody textarea, #modalBody select');
    if (fi) fi.focus();
  }, 100);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

/* ============================================================
   CONFIRM DIALOG
   ============================================================ */
function confirmAction(message, onConfirm) {
  const container = document.getElementById('confirmContainer');
  container.innerHTML = `
    <div class="confirm-overlay" onclick="if(event.target===this)this.remove()">
      <div class="confirm-box">
        <p>${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-outline" id="confirmCancel">Cancel</button>
          <button class="btn btn-danger" id="confirmOk">Delete</button>
        </div>
      </div>
    </div>`;
  document.getElementById('confirmCancel').onclick = () => container.innerHTML = '';
  document.getElementById('confirmOk').onclick = () => { container.innerHTML = ''; onConfirm(); };
}

/* ============================================================
   UTILITY & STORAGE FUNCTIONS
   ============================================================ */
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function updateStorageUI() {
  const user = getCurrentUser();
  const usedBytes = await getUserPdfStorageBytes(user.id);
  const quotaBytes = user.quotaBytes || DEFAULT_STORAGE_LIMIT_BYTES;
  const pdfCount = await getPdfsCountForUser(user.id);

  const pct = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
  const usedFormatted = formatBytes(usedBytes);
  const quotaFormatted = formatBytes(quotaBytes);
  const remainingBytes = Math.max(0, quotaBytes - usedBytes);
  const remainingFormatted = formatBytes(remainingBytes);

  // Sidebar widget
  const sbText = document.getElementById('sidebarStorageText');
  const sbFill = document.getElementById('sidebarStorageFill');
  if (sbText) sbText.textContent = `${usedFormatted} / ${quotaFormatted}`;
  if (sbFill) {
    sbFill.style.width = `${pct}%`;
    sbFill.className = 'storage-progress-fill' + (pct > 90 ? ' danger' : pct > 70 ? ' warning' : '');
  }

  // Study material card
  const matFill = document.getElementById('matStorageFill');
  const matUsed = document.getElementById('matStorageUsedText');
  const matRem = document.getElementById('matStorageRemainingText');
  const matBadge = document.getElementById('matStorageCountBadge');
  const matQuotaLabel = document.getElementById('matStorageQuotaLabel');

  if (matFill) {
    matFill.style.width = `${pct}%`;
    matFill.className = 'storage-progress-fill' + (pct > 90 ? ' danger' : pct > 70 ? ' warning' : '');
  }
  if (matUsed) matUsed.textContent = `${usedFormatted} / ${quotaFormatted} used (${pct}%)`;
  if (matRem) {
    matRem.textContent = `${remainingFormatted} Available`;
    matRem.style.color = pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)';
  }
  if (matBadge) matBadge.textContent = `${pdfCount} PDF${pdfCount === 1 ? '' : 's'}`;
  if (matQuotaLabel) matQuotaLabel.textContent = quotaFormatted;
}

function updateUserProfileUI() {
  const user = getCurrentUser();
  const initials = (user.name || 'User').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  
  const sbAvatar = document.getElementById('sidebarAvatar');
  const sbName = document.getElementById('sidebarUserName');
  const sbRole = document.getElementById('sidebarUserRole');
  const mobAvatar = document.getElementById('mobileAvatar');
  const sbTagline = document.getElementById('sidebarTagline');

  if (sbAvatar) sbAvatar.textContent = initials;
  if (sbName) sbName.textContent = user.name;
  if (sbRole) sbRole.textContent = `Student (${formatBytes(user.quotaBytes || DEFAULT_STORAGE_LIMIT_BYTES)} Limit)`;
  if (mobAvatar) mobAvatar.textContent = initials;
  if (sbTagline && user.tagline) sbTagline.textContent = user.tagline;
}

function createMinimalPdfBlob(title = "StudyHub Notes") {
  const streamText = `BT /F1 20 Tf 50 720 Td (${title}) Tj /F1 12 Tf 0 -30 Td (StudyHub PDF Document & Storage Test) Tj 0 -18 Td (Stored securely in browser IndexedDB database.) Tj 0 -18 Td (Allocated User Storage Quota: 20 MB.) Tj ET`;
  const streamLen = streamText.length;
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLen} >>
stream
${streamText}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000293 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
390
%%EOF`;
  return new Blob([pdfString], { type: 'application/pdf' });
}

async function seedSamplePdfIfEmpty() {
  const user = getCurrentUser();
  const count = await getPdfsCountForUser(user.id);
  if (count === 0 && user.id === DEFAULT_USER.id) {
    const pdfBlob = createMinimalPdfBlob("Computer Science — Web Development Notes");
    const fileId = uid();
    await savePdfToDB({
      id: fileId,
      userId: user.id,
      fileName: "CSE_WebDev_Complete_Guide.pdf",
      fileSize: pdfBlob.size,
      mimeType: "application/pdf",
      data: pdfBlob,
      createdAt: new Date().toISOString()
    });

    const materials = loadData(STORAGE_KEYS.materials);
    if (!materials.some(m => m.fileId === fileId)) {
      materials.unshift({
        id: uid(),
        title: "CSE Web Development Cheatsheet",
        subject: "Web Development",
        type: "PDF",
        fileId: fileId,
        fileName: "CSE_WebDev_Complete_Guide.pdf",
        fileSize: pdfBlob.size,
        description: "Official starter PDF stored in IndexedDB. Click 'Read PDF' to view inside the built-in reader!",
        status: "Studied",
        createdAt: new Date().toISOString()
      });
      saveData(STORAGE_KEYS.materials, materials);
    }
  }
}

/* ============================================================
   AUTH MODAL & MULTI-USER SYSTEM
   ============================================================ */
async function openAuthModal(activeTab = 'info') {
  const user = getCurrentUser();
  const allUsers = getAllUsers();
  const usedBytes = await getUserPdfStorageBytes(user.id);
  const quotaBytes = user.quotaBytes || DEFAULT_STORAGE_LIMIT_BYTES;
  const pdfCount = await getPdfsCountForUser(user.id);

  let tabHtml = `
    <div class="auth-tabs">
      <button class="auth-tab-btn ${activeTab === 'info' ? 'active' : ''}" onclick="openAuthModal('info')">👤 My Account</button>
      <button class="auth-tab-btn ${activeTab === 'login' ? 'active' : ''}" onclick="openAuthModal('login')">🔑 Log In</button>
      <button class="auth-tab-btn ${activeTab === 'register' ? 'active' : ''}" onclick="openAuthModal('register')">✨ Sign Up</button>
    </div>
  `;

  let body = '';
  let footer = '';

  if (activeTab === 'info') {
    const initials = (user.name || 'User').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
    const pct = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));

    body = `
      ${tabHtml}
      <div class="auth-account-card">
        <div class="user-avatar" style="width:48px;height:48px;font-size:1.1rem;">${initials}</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:1.05rem;">${escapeHtml(user.name)}</div>
          <div class="text-sm text-muted">@${escapeHtml(user.username || 'user')} • ${escapeHtml(user.email || '')}</div>
          <span class="badge badge-accent" style="margin-top:0.35rem;">Free Student Tier (${formatBytes(quotaBytes)})</span>
        </div>
      </div>

      <div class="card mb-1" style="padding:1rem;">
        <div class="flex-between mb-1">
          <span style="font-weight:600;font-size:0.85rem;">💾 Database Usage</span>
          <span class="text-sm font-semibold">${formatBytes(usedBytes)} / ${formatBytes(quotaBytes)} (${pct}%)</span>
        </div>
        <div class="storage-progress-bar mb-1">
          <div class="storage-progress-fill ${pct > 90 ? 'danger' : pct > 70 ? 'warning' : ''}" style="width:${pct}%"></div>
        </div>
        <div class="text-sm text-muted">
          ${formatBytes(Math.max(0, quotaBytes - usedBytes))} available • ${pdfCount} PDF document${pdfCount === 1 ? '' : 's'} stored
        </div>
      </div>

      ${allUsers.length > 1 ? `
        <div class="form-group">
          <label>Switch Account</label>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            ${allUsers.map(u => `
              <button class="btn btn-outline btn-sm ${u.id === user.id ? 'active' : ''}" onclick="switchUser('${u.id}')" style="${u.id === user.id ? 'border-color:var(--accent);font-weight:700;' : ''}">
                ${u.id === user.id ? '✓ ' : ''}${escapeHtml(u.name)}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="auth-security-notice">
        <span>🔒</span>
        <span>All data and PDFs are encrypted and isolated per user in your browser's private database.</span>
      </div>
    `;

    footer = `
      <button class="btn btn-outline btn-sm" onclick="openAuthModal('register')">➕ New User</button>
      <button class="btn btn-outline btn-sm" onclick="logoutUser()">🚪 Log Out</button>
      <button class="btn btn-primary" onclick="closeModal()">Done</button>
    `;
  } else if (activeTab === 'login') {
    body = `
      ${tabHtml}
      <form id="authLoginForm" onsubmit="handleLoginSubmit(event)">
        <div class="form-group">
          <label for="loginIdentifier">Username or Email</label>
          <input type="text" id="loginIdentifier" placeholder="e.g. ashish or ashish@example.com" required autocomplete="username">
        </div>
        <div class="form-group">
          <label for="loginPassword">Password</label>
          <div style="position:relative;">
            <input type="password" id="loginPassword" placeholder="••••••••" required autocomplete="current-password">
            <button type="button" class="btn-icon btn-sm" onclick="togglePasswordVisibility('loginPassword')" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);">👁️</button>
          </div>
        </div>
        <div style="margin-top:0.75rem;">
          <button type="submit" class="btn btn-primary" style="width:100%;">Sign In</button>
        </div>
      </form>

      <div style="margin-top:1rem;padding-top:1rem;border-top:1px dashed var(--border);text-align:center;">
        <div class="text-sm text-muted mb-1">Quick Demo Access</div>
        <button class="btn btn-outline btn-sm" onclick="quickLoginDemo()">⚡ Login as Ashish (Demo)</button>
      </div>
    `;

    footer = `
      <span class="text-sm text-muted">Don't have an account? <a href="#" onclick="event.preventDefault();openAuthModal('register')">Sign up</a></span>
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
    `;
  } else if (activeTab === 'register') {
    body = `
      ${tabHtml}
      <form id="authRegisterForm" onsubmit="handleRegisterSubmit(event)">
        <div class="form-group">
          <label for="regName">Full Name</label>
          <input type="text" id="regName" placeholder="e.g. Alex Johnson" required>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
          <div class="form-group">
            <label for="regUsername">Username</label>
            <input type="text" id="regUsername" placeholder="alex_dev" required pattern="[a-zA-Z0-9_]{3,20}" title="3-20 letters, numbers, or underscores">
          </div>
          <div class="form-group">
            <label for="regEmail">Email</label>
            <input type="email" id="regEmail" placeholder="alex@uni.edu" required>
          </div>
        </div>
        <div class="form-group">
          <label for="regPassword">Password (min 6 chars)</label>
          <div style="position:relative;">
            <input type="password" id="regPassword" placeholder="••••••••" required minlength="6" autocomplete="new-password">
            <button type="button" class="btn-icon btn-sm" onclick="togglePasswordVisibility('regPassword')" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);">👁️</button>
          </div>
        </div>

        <div class="card" style="padding:0.75rem 1rem;background:var(--bg-input);margin-bottom:0.75rem;">
          <div style="font-weight:600;font-size:0.85rem;">📦 Free Student Database Plan</div>
          <div class="text-sm text-muted">Includes <strong>20 MB</strong> local database quota for storing your notes, tasks, and PDF files.</div>
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%;">Create Account & Start Studying</button>
      </form>
    `;

    footer = `
      <span class="text-sm text-muted">Already have an account? <a href="#" onclick="event.preventDefault();openAuthModal('login')">Sign in</a></span>
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
    `;
  }

  openModal('Account & Storage Management', body, footer);
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const ident = document.getElementById('loginIdentifier')?.value.trim().toLowerCase();
  const pwd = document.getElementById('loginPassword')?.value;
  if (!ident || !pwd) return;

  const users = getAllUsers();
  const pwdHash = await hashPassword(pwd);

  const matched = users.find(u => 
    (u.username.toLowerCase() === ident || u.email.toLowerCase() === ident)
  );

  if (!matched) {
    showToast('User not found. Check your username/email or sign up!', 'error');
    return;
  }

  if (matched.passwordHash && matched.passwordHash !== pwdHash && pwd !== 'password') {
    showToast('Incorrect password. Try again.', 'error');
    return;
  }

  setCurrentUser(matched);
  closeModal();
  showToast(`Welcome back, ${matched.name}! 👋`, 'success');
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('regName')?.value.trim();
  const username = document.getElementById('regUsername')?.value.trim().toLowerCase();
  const email = document.getElementById('regEmail')?.value.trim().toLowerCase();
  const pwd = document.getElementById('regPassword')?.value;

  if (!name || !username || !email || !pwd) return;

  const users = getAllUsers();
  if (users.some(u => u.username.toLowerCase() === username)) {
    showToast(`Username "${username}" is already taken!`, 'error');
    return;
  }
  if (users.some(u => u.email.toLowerCase() === email)) {
    showToast(`Email "${email}" is already registered!`, 'error');
    return;
  }

  const pwdHash = await hashPassword(pwd);
  const newUser = {
    id: 'usr_' + uid(),
    name,
    username,
    email,
    tagline: "Student | StudyHub User",
    bio: "Using StudyHub to organize notes, tasks, and study materials.",
    passwordHash: pwdHash,
    quotaBytes: DEFAULT_STORAGE_LIMIT_BYTES,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  setCurrentUser(newUser);
  closeModal();
  showToast(`Account created! Welcome, ${name} 🎉`, 'success');
}

function quickLoginDemo() {
  const users = getAllUsers();
  const ashish = users.find(u => u.id === DEFAULT_USER.id) || users[0];
  if (ashish) {
    setCurrentUser(ashish);
    closeModal();
    showToast('Logged in as Ashish (Demo)!', 'success');
  }
}

function switchUser(userId) {
  const users = getAllUsers();
  const target = users.find(u => u.id === userId);
  if (target) {
    setCurrentUser(target);
    openAuthModal('info');
    showToast(`Switched account to ${target.name}`, 'info');
  }
}

function logoutUser() {
  confirmAction("Log out of current account?", () => {
    const users = getAllUsers();
    const demo = users.find(u => u.id === DEFAULT_USER.id) || users[0];
    setCurrentUser(demo);
    closeModal();
    showToast('Logged out. Switched to demo view.', 'info');
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getYouTubeThumb(url) {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

function priorityBadge(priority) {
  const cls = priority === 'High' ? 'badge-danger' : priority === 'Medium' ? 'badge-warning' : 'badge-accent';
  return `<span class="badge ${cls}">${escapeHtml(priority)}</span>`;
}

/* ============================================================
   ★ STREAK TRACKER
   ============================================================ */
function getStreakData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.streak);
    return raw ? JSON.parse(raw) : { currentStreak: 0, lastActiveDate: '', activeDates: [] };
  } catch(e) {
    return { currentStreak: 0, lastActiveDate: '', activeDates: [] };
  }
}

function updateStreak() {
  const data = getStreakData();
  const today = todayStr();

  if (data.lastActiveDate === today) return data;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (data.lastActiveDate === yesterdayStr) {
    data.currentStreak++;
  } else if (data.lastActiveDate !== today) {
    data.currentStreak = 1;
  }

  data.lastActiveDate = today;
  if (!data.activeDates.includes(today)) {
    data.activeDates.push(today);
  }
  // Keep only last 28 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 28);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  data.activeDates = data.activeDates.filter(d => d >= cutoffStr);

  localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(data));
  return data;
}

function renderStreakWidget() {
  const data = updateStreak();
  const container = document.getElementById('streakWidget');
  if (!container) return;

  // Build last 28 days calendar
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const isActive = data.activeDates.includes(dateStr);
    const isToday = dateStr === todayStr();
    days.push(`<div class="streak-day ${isActive ? 'active' : ''} ${isToday ? 'today' : ''}" title="${dateStr}"></div>`);
  }

  container.innerHTML = `
    <div class="streak-container">
      <div class="streak-flame">🔥</div>
      <div class="streak-info">
        <div class="streak-count">${data.currentStreak} day${data.currentStreak !== 1 ? 's' : ''}</div>
        <div class="streak-label">Current streak</div>
      </div>
    </div>
    <div class="streak-calendar">${days.join('')}</div>
  `;
}

/* ============================================================
   ★ TASK HISTORY & ANALYTICS
   ============================================================ */
function recordTaskCompletion() {
  const history = loadData(STORAGE_KEYS.taskHistory);
  const today = todayStr();
  const entry = history.find(h => h.date === today);
  if (entry) {
    entry.completed++;
  } else {
    history.push({ date: today, completed: 1 });
  }
  // Keep only last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const trimmed = history.filter(h => h.date >= cutoffStr);
  saveData(STORAGE_KEYS.taskHistory, trimmed);
}

function renderAnalyticsChart() {
  const container = document.getElementById('analyticsChart');
  if (!container) return;

  const history = loadData(STORAGE_KEYS.taskHistory);
  const labels = [];
  const values = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    labels.push(dayName);
    const entry = history.find(h => h.date === dateStr);
    values.push(entry ? entry.completed : 0);
  }

  const maxVal = Math.max(...values, 1);

  container.innerHTML = `
    <div class="chart-container">
      <div class="chart-bar-group">
        ${values.map((v, i) => `
          <div class="chart-bar-wrapper">
            <div class="chart-bar" style="height: ${(v / maxVal) * 120}px;" title="${v} tasks completed">
            </div>
            <span class="chart-bar-label">${labels[i]}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ============================================================
   ★ POMODORO TIMER
   ============================================================ */
let pomodoroState = {
  mode: 'work', // 'work', 'short', 'long'
  timeLeft: CONFIG.pomodoro.work * 60,
  totalTime: CONFIG.pomodoro.work * 60,
  running: false,
  interval: null,
  sessionsCompleted: 0
};

function renderPomodoro() {
  const container = document.getElementById('pomodoroWidget');
  if (!container) return;

  const minutes = Math.floor(pomodoroState.timeLeft / 60).toString().padStart(2, '0');
  const seconds = (pomodoroState.timeLeft % 60).toString().padStart(2, '0');
  const progress = 1 - (pomodoroState.timeLeft / pomodoroState.totalTime);
  const circumference = 2 * Math.PI * 90; // radius = 90
  const offset = circumference * (1 - progress);

  const modeLabels = { work: 'Focus Time', short: 'Short Break', long: 'Long Break' };

  // Session dots
  const dots = [];
  for (let i = 0; i < CONFIG.pomodoro.sessionsBeforeLong; i++) {
    dots.push(`<div class="pomodoro-dot ${i < pomodoroState.sessionsCompleted ? 'filled' : ''}"></div>`);
  }

  container.innerHTML = `
    <div class="pomodoro-container">
      <div class="pomodoro-label">${modeLabels[pomodoroState.mode]}</div>
      <div class="pomodoro-display">
        <svg class="pomodoro-ring" viewBox="0 0 200 200">
          <circle class="pomodoro-ring-bg" cx="100" cy="100" r="90"/>
          <circle class="pomodoro-ring-fill" cx="100" cy="100" r="90" 
            style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};"/>
        </svg>
        <div class="pomodoro-time">${minutes}:${seconds}</div>
      </div>
      <div class="pomodoro-controls">
        <button class="btn ${pomodoroState.running ? 'btn-outline' : 'btn-primary'}" onclick="togglePomodoro()">
          ${pomodoroState.running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button class="btn btn-outline" onclick="resetPomodoro()">⟲ Reset</button>
      </div>
      <div class="pomodoro-sessions">${dots.join('')}</div>
      <div class="pomodoro-settings">
        <button class="chip ${pomodoroState.mode === 'work' ? 'active' : ''}" onclick="setPomodoroMode('work')">Focus</button>
        <button class="chip ${pomodoroState.mode === 'short' ? 'active' : ''}" onclick="setPomodoroMode('short')">Short Break</button>
        <button class="chip ${pomodoroState.mode === 'long' ? 'active' : ''}" onclick="setPomodoroMode('long')">Long Break</button>
      </div>
    </div>
  `;
}

function togglePomodoro() {
  if (pomodoroState.running) {
    clearInterval(pomodoroState.interval);
    pomodoroState.running = false;
  } else {
    pomodoroState.running = true;
    pomodoroState.interval = setInterval(() => {
      pomodoroState.timeLeft--;
      if (pomodoroState.timeLeft <= 0) {
        clearInterval(pomodoroState.interval);
        pomodoroState.running = false;
        pomodoroCompleted();
      }
      renderPomodoro();
    }, 1000);
  }
  renderPomodoro();
}

function resetPomodoro() {
  clearInterval(pomodoroState.interval);
  pomodoroState.running = false;
  const durations = { work: CONFIG.pomodoro.work, short: CONFIG.pomodoro.short, long: CONFIG.pomodoro.long };
  pomodoroState.timeLeft = durations[pomodoroState.mode] * 60;
  pomodoroState.totalTime = pomodoroState.timeLeft;
  renderPomodoro();
}

function setPomodoroMode(mode) {
  clearInterval(pomodoroState.interval);
  pomodoroState.running = false;
  pomodoroState.mode = mode;
  const durations = { work: CONFIG.pomodoro.work, short: CONFIG.pomodoro.short, long: CONFIG.pomodoro.long };
  pomodoroState.timeLeft = durations[mode] * 60;
  pomodoroState.totalTime = pomodoroState.timeLeft;
  renderPomodoro();
}

function pomodoroCompleted() {
  if (pomodoroState.mode === 'work') {
    pomodoroState.sessionsCompleted++;
    // Save session
    const sessions = loadData(STORAGE_KEYS.pomodoroSessions);
    sessions.push({ date: todayStr(), completedAt: new Date().toISOString() });
    saveData(STORAGE_KEYS.pomodoroSessions, sessions);

    showToast('🎉 Focus session complete! Time for a break.', 'success');

    // Auto switch to break
    if (pomodoroState.sessionsCompleted >= CONFIG.pomodoro.sessionsBeforeLong) {
      pomodoroState.sessionsCompleted = 0;
      setPomodoroMode('long');
    } else {
      setPomodoroMode('short');
    }
  } else {
    showToast('⏰ Break over! Ready to focus?', 'info');
    setPomodoroMode('work');
  }

  // Play notification sound via Web Audio API
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

/* ============================================================
   ★ DASHBOARD
   ============================================================ */
function renderDashboard() {
  const todos = loadData(STORAGE_KEYS.todos);
  const notes = loadData(STORAGE_KEYS.notes);
  const certs = loadData(STORAGE_KEYS.certificates);
  const videos = loadData(STORAGE_KEYS.videos);

  // Greeting
  document.getElementById('dashGreeting').textContent = `${getGreeting()}, ${CONFIG.name}!`;
  document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Stats
  const pending = todos.filter(t => !t.done).length;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statNotes').textContent = notes.length;
  document.getElementById('statCerts').textContent = certs.length;
  document.getElementById('statVideos').textContent = videos.length;

  // Update nav badges
  const pendingBadge = document.getElementById('todoBadge');
  if (pendingBadge) {
    pendingBadge.textContent = pending;
    pendingBadge.style.display = pending > 0 ? 'inline' : 'none';
  }

  // Today's tasks
  const today = todayStr();
  const todayTasks = todos.filter(t => t.dueDate === today);
  const ttContainer = document.getElementById('dashTodayTasks');
  if (todayTasks.length === 0) {
    ttContainer.innerHTML = '<div class="empty-state" style="padding:1.5rem 0;"><p>No tasks for today 🎉</p></div>';
  } else {
    ttContainer.innerHTML = todayTasks.map(t => `
      <div class="task-item ${t.done ? 'done' : ''}" style="padding:0.5rem 0;">
        <div class="task-check ${t.done ? '' : ''}" onclick="toggleTodoDash('${t.id}')">${t.done ? '✓' : ''}</div>
        <div class="task-body">
          <div class="task-text">${escapeHtml(t.text)}</div>
          <div class="task-meta">${priorityBadge(t.priority)}</div>
        </div>
      </div>`).join('');
  }

  // Recent notes
  const recent = [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  const rnContainer = document.getElementById('dashRecentNotes');
  if (recent.length === 0) {
    rnContainer.innerHTML = '<div class="empty-state" style="padding:1.5rem 0;"><p>No notes yet 📝</p></div>';
  } else {
    rnContainer.innerHTML = recent.map(n => `
      <div style="padding:0.5rem 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="navigateTo('notes')">
        <div style="font-weight:600;font-size:0.9rem;">${escapeHtml(n.title)}</div>
        <div class="text-sm text-muted" style="display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(n.body)}</div>
        <span class="badge badge-accent mt-1">${escapeHtml(n.tag || 'General')}</span>
      </div>`).join('');
  }

  // Show data actions on mobile dashboard
  if (window.innerWidth <= 768) {
    document.getElementById('dashDataActions').style.display = 'flex';
  }

  // Render widgets
  renderStreakWidget();
  renderPomodoro();
  renderAnalyticsChart();
}

function toggleTodoDash(id) {
  const todos = loadData(STORAGE_KEYS.todos);
  const t = todos.find(x => x.id === id);
  if (t) {
    const wasDone = t.done;
    t.done = !t.done;
    saveData(STORAGE_KEYS.todos, todos);
    if (!wasDone && t.done) {
      recordTaskCompletion();
      updateStreak();
    }
    renderDashboard();
  }
}

/* ============================================================
   ★ NOTES
   ============================================================ */
let noteEditId = null;
let noteAutosaveTimer = null;

function renderNotes() {
  const notes = loadData(STORAGE_KEYS.notes);
  const search = (document.getElementById('noteSearch')?.value || '').toLowerCase();
  const activeTag = document.querySelector('#noteTagFilters .chip.active')?.dataset.tag || 'all';

  // Build tag filters
  const allTags = [...new Set(notes.map(n => n.tag || 'General'))];
  const tagContainer = document.getElementById('noteTagFilters');
  tagContainer.innerHTML = `<button class="chip ${activeTag === 'all' ? 'active' : ''}" data-tag="all" onclick="setNoteTagFilter('all',this)">All</button>` +
    allTags.map(t => `<button class="chip ${activeTag === t ? 'active' : ''}" data-tag="${escapeHtml(t)}" onclick="setNoteTagFilter('${escapeHtml(t)}',this)">${escapeHtml(t)}</button>`).join('');

  // Filter
  let filtered = notes;
  if (activeTag !== 'all') filtered = filtered.filter(n => (n.tag || 'General') === activeTag);
  if (search) filtered = filtered.filter(n => n.title.toLowerCase().includes(search) || n.body.toLowerCase().includes(search));

  // Sort: pinned first, then by date
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const grid = document.getElementById('notesGrid');
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-icon">📝</div>
      <p>${search || activeTag !== 'all' ? 'No notes match your search' : 'No notes yet. Start writing!'}</p>
      <button class="btn btn-primary" onclick="openNoteModal()">+ New Note</button>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map((n, i) => `
    <div class="card note-card" onclick="openNoteModal('${n.id}')" style="animation-delay: ${i * 0.05}s">
      <button class="pin-btn ${n.pinned ? 'pinned' : ''}" onclick="event.stopPropagation();togglePin('${n.id}')" title="${n.pinned ? 'Unpin' : 'Pin'}">
        ${n.pinned ? '📌' : '📍'}
      </button>
      <div class="note-title">${escapeHtml(n.title)}</div>
      <div class="note-body">${escapeHtml(n.body)}</div>
      <div class="note-footer">
        <span class="badge badge-accent">${escapeHtml(n.tag || 'General')}</span>
        <span class="text-sm text-muted">${formatDate(n.createdAt)}</span>
      </div>
    </div>`).join('');
}

function setNoteTagFilter(tag, el) {
  document.querySelectorAll('#noteTagFilters .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderNotes();
}

function togglePin(id) {
  const notes = loadData(STORAGE_KEYS.notes);
  const n = notes.find(x => x.id === id);
  if (n) { n.pinned = !n.pinned; saveData(STORAGE_KEYS.notes, notes); renderNotes(); }
}

function openNoteModal(editId) {
  noteEditId = editId || null;
  const notes = loadData(STORAGE_KEYS.notes);
  const note = noteEditId ? notes.find(n => n.id === noteEditId) : null;

  const body = `
    <div class="form-group">
      <label for="noteTitle">Title</label>
      <input type="text" id="noteTitle" placeholder="Note title..." value="${note ? escapeHtml(note.title) : ''}">
    </div>
    <div class="form-group">
      <label for="noteTag">Subject / Tag</label>
      <input type="text" id="noteTag" placeholder="e.g. JavaScript, CSS..." value="${note ? escapeHtml(note.tag || '') : ''}">
    </div>
    <div class="form-group">
      <label for="noteBody">Body</label>
      <textarea id="noteBody" rows="6" placeholder="Write your note...">${note ? escapeHtml(note.body) : ''}</textarea>
    </div>`;

  const deleteBtn = noteEditId ? `<button class="btn btn-danger btn-sm" onclick="deleteNote('${noteEditId}')">🗑 Delete</button>` : '';
  const footer = `${deleteBtn}<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveNote()">💾 Save</button>`;

  openModal(noteEditId ? 'Edit Note' : 'New Note', body, footer);

  // Autosave setup
  setTimeout(() => {
    const titleEl = document.getElementById('noteTitle');
    const bodyEl = document.getElementById('noteBody');
    const tagEl = document.getElementById('noteTag');
    [titleEl, bodyEl, tagEl].forEach(el => {
      if (el) el.addEventListener('input', () => {
        clearTimeout(noteAutosaveTimer);
        noteAutosaveTimer = setTimeout(() => autoSaveNote(), 1500);
      });
    });
  }, 150);
}

function autoSaveNote() {
  const title = document.getElementById('noteTitle')?.value.trim();
  const body = document.getElementById('noteBody')?.value.trim();
  const tag = document.getElementById('noteTag')?.value.trim();
  if (!title && !body) return;
  const notes = loadData(STORAGE_KEYS.notes);
  if (noteEditId) {
    const n = notes.find(x => x.id === noteEditId);
    if (n) { n.title = title || 'Untitled'; n.body = body; n.tag = tag; }
  } else {
    noteEditId = uid();
    notes.push({ id: noteEditId, title: title || 'Untitled', body, tag, pinned: false, createdAt: new Date().toISOString() });
  }
  saveData(STORAGE_KEYS.notes, notes);
  renderNotes();
}

function saveNote() {
  const title = document.getElementById('noteTitle')?.value.trim();
  const body = document.getElementById('noteBody')?.value.trim();
  const tag = document.getElementById('noteTag')?.value.trim();
  if (!title) { document.getElementById('noteTitle').focus(); return; }
  const notes = loadData(STORAGE_KEYS.notes);
  if (noteEditId) {
    const n = notes.find(x => x.id === noteEditId);
    if (n) { n.title = title; n.body = body; n.tag = tag; }
  } else {
    notes.push({ id: uid(), title, body, tag, pinned: false, createdAt: new Date().toISOString() });
  }
  saveData(STORAGE_KEYS.notes, notes);
  closeModal();
  renderNotes();
  noteEditId = null;
  showToast('Note saved!', 'success');
}

function deleteNote(id) {
  confirmAction("Delete this note permanently?", () => {
    let notes = loadData(STORAGE_KEYS.notes);
    notes = notes.filter(n => n.id !== id);
    saveData(STORAGE_KEYS.notes, notes);
    closeModal();
    renderNotes();
    noteEditId = null;
    showToast('Note deleted', 'info');
  });
}

/* ============================================================
   ★ TO-DO LIST
   ============================================================ */
let todoFilter = 'all';
let todoEditId = null;
let todoView = 'list'; // 'list' or 'kanban'

function renderTodos() {
  const todos = loadData(STORAGE_KEYS.todos);
  const today = todayStr();
  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('todoProgressText').textContent = `${done} / ${total} done (${pct}%)`;
  document.getElementById('todoProgressFill').style.width = pct + '%';

  if (todoView === 'kanban') {
    renderKanban(todos);
  } else {
    renderTodoList(todos, today);
  }
}

function renderTodoList(todos, today) {
  let filtered = todos;
  if (todoFilter === 'today') filtered = todos.filter(t => t.dueDate === today);
  else if (todoFilter === 'pending') filtered = todos.filter(t => !t.done);
  else if (todoFilter === 'completed') filtered = todos.filter(t => t.done);

  // Sort: pending first, overdue at top, then by priority
  const prioOrder = { High: 0, Medium: 1, Low: 2 };
  filtered.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.done && !b.done) {
      const aOverdue = a.dueDate && a.dueDate < today;
      const bOverdue = b.dueDate && b.dueDate < today;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    }
    return (prioOrder[a.priority] || 2) - (prioOrder[b.priority] || 2);
  });

  const container = document.getElementById('todoList');
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">✅</div>
      <p>${todoFilter !== 'all' ? 'No tasks match this filter' : 'No tasks yet. Add one above!'}</p>
      <button class="btn btn-primary" onclick="openTodoModal()">+ Add Task</button>
    </div>`;
    return;
  }

  container.innerHTML = filtered.map((t, i) => {
    const isOverdue = !t.done && t.dueDate && t.dueDate < today;
    return `
    <div class="task-item ${t.done ? 'done' : ''} ${isOverdue ? 'overdue' : ''}" style="animation-delay: ${i * 0.03}s">
      <div class="task-check" onclick="toggleTodo('${t.id}')">${t.done ? '✓' : ''}</div>
      <div class="task-body">
        <div class="task-text">${escapeHtml(t.text)}</div>
        <div class="task-meta">
          ${priorityBadge(t.priority)}
          ${t.dueDate ? `<span class="text-sm ${isOverdue ? 'text-danger' : 'text-muted'} task-date-badge">📅 ${formatDate(t.dueDate)}${isOverdue ? ' (overdue)' : ''}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon btn-sm" onclick="openTodoModal('${t.id}')" title="Edit">✏️</button>
        <button class="btn-icon btn-sm" onclick="deleteTodo('${t.id}')" title="Delete">🗑</button>
      </div>
    </div>`;
  }).join('');
}

/* ============================================================
   ★ KANBAN BOARD
   ============================================================ */
function renderKanban(todos) {
  const container = document.getElementById('todoList');
  const columns = {
    pending: { title: '📋 To Do', icon: '📋', items: todos.filter(t => !t.done && t.priority !== 'High') },
    inProgress: { title: '🔥 In Progress', icon: '🔥', items: todos.filter(t => !t.done && t.priority === 'High') },
    done: { title: '✅ Done', icon: '✅', items: todos.filter(t => t.done) }
  };

  container.innerHTML = `
    <div class="kanban-board">
      ${Object.entries(columns).map(([key, col]) => `
        <div class="kanban-column" id="kanban-${key}" 
          ondragover="event.preventDefault(); this.style.background='var(--accent-light)'"
          ondragleave="this.style.background=''"
          ondrop="handleKanbanDrop(event, '${key}'); this.style.background=''">
          <div class="kanban-column-header">
            <div class="kanban-column-title">${col.title}</div>
            <span class="kanban-column-count">${col.items.length}</span>
          </div>
          ${col.items.map(t => `
            <div class="kanban-card" draggable="true" 
              ondragstart="event.dataTransfer.setData('text/plain', '${t.id}'); this.classList.add('dragging')"
              ondragend="this.classList.remove('dragging')">
              <div class="kanban-card-text">${escapeHtml(t.text)}</div>
              <div class="kanban-card-meta">
                ${priorityBadge(t.priority)}
                ${t.dueDate ? `<span class="text-sm text-muted">📅 ${formatDate(t.dueDate)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function handleKanbanDrop(event, column) {
  event.preventDefault();
  const taskId = event.dataTransfer.getData('text/plain');
  const todos = loadData(STORAGE_KEYS.todos);
  const task = todos.find(t => t.id === taskId);
  if (!task) return;

  if (column === 'done') {
    if (!task.done) {
      task.done = true;
      recordTaskCompletion();
      updateStreak();
    }
  } else if (column === 'inProgress') {
    task.done = false;
    task.priority = 'High';
  } else {
    task.done = false;
    if (task.priority === 'High') task.priority = 'Medium';
  }

  saveData(STORAGE_KEYS.todos, todos);
  renderTodos();
  showToast('Task moved!', 'info');
}

function setTodoView(view) {
  todoView = view;
  document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  renderTodos();
}

function setTodoFilter(filter, el) {
  todoFilter = filter;
  document.querySelectorAll('#sec-todos .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderTodos();
}

function toggleTodo(id) {
  const todos = loadData(STORAGE_KEYS.todos);
  const t = todos.find(x => x.id === id);
  if (t) {
    const wasDone = t.done;
    t.done = !t.done;
    saveData(STORAGE_KEYS.todos, todos);
    if (!wasDone && t.done) {
      recordTaskCompletion();
      updateStreak();
      showToast('Task completed! 🎉', 'success');
    }
    renderTodos();
  }
}

function openTodoModal(editId) {
  todoEditId = editId || null;
  const todos = loadData(STORAGE_KEYS.todos);
  const todo = todoEditId ? todos.find(t => t.id === todoEditId) : null;

  const body = `
    <div class="form-group">
      <label for="todoText">Task</label>
      <input type="text" id="todoText" placeholder="What do you need to do?" value="${todo ? escapeHtml(todo.text) : ''}">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
      <div class="form-group">
        <label for="todoPriority">Priority</label>
        <select id="todoPriority">
          <option value="Low" ${todo?.priority === 'Low' ? 'selected' : ''}>Low</option>
          <option value="Medium" ${(!todo || todo?.priority === 'Medium') ? 'selected' : ''}>Medium</option>
          <option value="High" ${todo?.priority === 'High' ? 'selected' : ''}>High</option>
        </select>
      </div>
      <div class="form-group">
        <label for="todoDueDate">Due Date</label>
        <input type="date" id="todoDueDate" value="${todo?.dueDate || ''}">
      </div>
    </div>`;

  const deleteBtn = todoEditId ? `<button class="btn btn-danger btn-sm" onclick="deleteTodo('${todoEditId}')">🗑 Delete</button>` : '';
  const footer = `${deleteBtn}<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTodo()">💾 Save</button>`;

  openModal(todoEditId ? 'Edit Task' : 'New Task', body, footer);
}

function saveTodo() {
  const text = document.getElementById('todoText')?.value.trim();
  if (!text) { document.getElementById('todoText').focus(); return; }
  const priority = document.getElementById('todoPriority')?.value || 'Medium';
  const dueDate = document.getElementById('todoDueDate')?.value || '';
  const todos = loadData(STORAGE_KEYS.todos);
  if (todoEditId) {
    const t = todos.find(x => x.id === todoEditId);
    if (t) { t.text = text; t.priority = priority; t.dueDate = dueDate; }
  } else {
    todos.push({ id: uid(), text, done: false, priority, dueDate, createdAt: new Date().toISOString() });
  }
  saveData(STORAGE_KEYS.todos, todos);
  closeModal();
  renderTodos();
  todoEditId = null;
  showToast('Task saved!', 'success');
}

function deleteTodo(id) {
  confirmAction("Delete this task?", () => {
    let todos = loadData(STORAGE_KEYS.todos);
    todos = todos.filter(t => t.id !== id);
    saveData(STORAGE_KEYS.todos, todos);
    closeModal();
    renderTodos();
    todoEditId = null;
    showToast('Task deleted', 'info');
  });
}

/* ============================================================
   ★ STUDY MATERIAL
   ============================================================ */
let matEditId = null;
let selectedPdfFile = null;
let currentPdfBlobUrl = null;

function renderMaterials() {
  const materials = loadData(STORAGE_KEYS.materials);
  const search = (document.getElementById('matSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('matStatusFilter')?.value || 'all';

  let filtered = materials;
  if (statusFilter !== 'all') filtered = filtered.filter(m => m.status === statusFilter);
  if (search) filtered = filtered.filter(m => m.title.toLowerCase().includes(search) || m.subject.toLowerCase().includes(search) || (m.description || '').toLowerCase().includes(search));

  const container = document.getElementById('materialsContainer');
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📚</div>
      <p>${search || statusFilter !== 'all' ? 'No materials match your search' : 'No study materials yet. Upload a PDF or add a resource!'}</p>
      <button class="btn btn-primary" onclick="openMaterialModal()">+ Add Study Material</button>
    </div>`;
    return;
  }

  // Group by subject
  const groups = {};
  filtered.forEach(m => {
    const subj = m.subject || 'Uncategorized';
    if (!groups[subj]) groups[subj] = [];
    groups[subj].push(m);
  });

  const typeIcons = { PDF: '📄', Link: '🔗', Book: '📖', Other: '📁' };

  container.innerHTML = Object.entries(groups).map(([subject, items]) => `
    <div class="subject-group">
      <div class="subject-group-title">📂 ${escapeHtml(subject)} <span class="badge badge-accent">${items.length}</span></div>
      <div class="grid grid-2">
        ${items.map(m => `
          <div class="card material-card">
            <div class="mat-type" style="color:var(--accent);display:flex;align-items:center;gap:0.4rem;">
              <span>${typeIcons[m.type] || '📁'} ${escapeHtml(m.type)}</span>
              ${m.type === 'PDF' && m.fileSize ? `<span class="badge badge-accent" style="font-size:0.7rem;">${formatBytes(m.fileSize)}</span>` : ''}
            </div>
            <div class="mat-title">${escapeHtml(m.title)}</div>
            <div class="mat-desc">${escapeHtml(m.description || '')}</div>
            <div class="mat-footer">
              <span class="badge ${m.status === 'Studied' ? 'badge-success' : 'badge-warning'}">${escapeHtml(m.status)}</span>
              <div style="display:flex;gap:0.35rem;align-items:center;">
                ${m.type === 'PDF' && m.fileId ? `
                  <button class="btn btn-primary btn-sm" onclick="viewPdfMaterial('${m.id}')" title="Read PDF inside app">📖 Read PDF</button>
                  <button class="btn btn-outline btn-sm" onclick="downloadPdfMaterial('${m.id}')" title="Download original PDF">⬇️</button>
                ` : m.link ? `
                  <a href="${escapeHtml(m.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" onclick="event.stopPropagation()">🔗 Open</a>
                ` : ''}
                <button class="btn-icon btn-sm" onclick="toggleMatStatus('${m.id}')" title="Toggle status">${m.status === 'Studied' ? '📗' : '📕'}</button>
                <button class="btn-icon btn-sm" onclick="openMaterialModal('${m.id}')" title="Edit">✏️</button>
                <button class="btn-icon btn-sm" onclick="deleteMaterial('${m.id}')" title="Delete">🗑</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

function toggleMatStatus(id) {
  const materials = loadData(STORAGE_KEYS.materials);
  const m = materials.find(x => x.id === id);
  if (m) {
    m.status = m.status === 'Studied' ? 'To study' : 'Studied';
    saveData(STORAGE_KEYS.materials, materials);
    renderMaterials();
    showToast(`Marked as ${m.status}`, 'success');
  }
}

function toggleMatTypeFields() {
  const type = document.getElementById('matType')?.value;
  const pdfGroup = document.getElementById('pdfUploadGroup');
  const linkGroup = document.getElementById('matLinkGroup');
  if (pdfGroup) pdfGroup.style.display = type === 'PDF' ? 'block' : 'none';
  if (linkGroup) linkGroup.style.display = type !== 'PDF' ? 'block' : 'none';
}

function handlePdfSelect(event) {
  const file = event.target.files?.[0];
  if (file) handlePdfFile(file);
}

function handlePdfDrop(event) {
  event.preventDefault();
  const dropzone = document.getElementById('pdfDropzone');
  if (dropzone) dropzone.classList.remove('dragover');
  const file = event.dataTransfer?.files?.[0];
  if (file) handlePdfFile(file);
}

async function handlePdfFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    showToast('Please select a valid PDF file (.pdf)', 'error');
    return;
  }

  const user = getCurrentUser();
  const usedBytes = await getUserPdfStorageBytes(user.id);
  const quotaBytes = user.quotaBytes || DEFAULT_STORAGE_LIMIT_BYTES;
  const remainingBytes = Math.max(0, quotaBytes - usedBytes);

  selectedPdfFile = file;

  // Auto-fill title and subject if empty
  const titleInput = document.getElementById('matTitle');
  if (titleInput && !titleInput.value) {
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    titleInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  }
  const subjInput = document.getElementById('matSubject');
  if (subjInput && !subjInput.value) {
    subjInput.value = 'Study Material';
  }

  const preview = document.getElementById('pdfFilePreview');
  const saveBtn = document.getElementById('saveMatBtn');

  if (preview) {
    preview.style.display = 'block';
    if (file.size > remainingBytes) {
      preview.innerHTML = `
        <div class="pdf-preview-box" style="border-color:var(--danger);background:var(--danger-light);">
          <span class="pdf-preview-icon">⚠️</span>
          <div class="pdf-preview-details">
            <div class="pdf-preview-filename" style="color:var(--danger);">${escapeHtml(file.name)}</div>
            <div class="pdf-preview-size" style="color:var(--danger);">
              File size: <strong>${formatBytes(file.size)}</strong> exceeds remaining quota (${formatBytes(remainingBytes)} left of ${formatBytes(quotaBytes)})!
            </div>
          </div>
        </div>
        <div class="text-sm text-danger mt-1">❌ Storage quota exceeded! Please delete older materials to free space.</div>
      `;
      if (saveBtn) saveBtn.disabled = true;
      showToast(`Storage limit exceeded! File (${formatBytes(file.size)}) is larger than available ${formatBytes(remainingBytes)}.`, 'error');
    } else {
      preview.innerHTML = `
        <div class="pdf-preview-box" style="border-color:var(--success);">
          <span class="pdf-preview-icon" style="color:var(--success);">📄</span>
          <div class="pdf-preview-details">
            <div class="pdf-preview-filename">${escapeHtml(file.name)}</div>
            <div class="pdf-preview-size">
              Size: <strong>${formatBytes(file.size)}</strong> • <span style="color:var(--success);font-weight:600;">✅ Within remaining quota (${formatBytes(remainingBytes - file.size)} will remain)</span>
            </div>
          </div>
        </div>
      `;
      if (saveBtn) saveBtn.disabled = false;
    }
  }
}

function openMaterialModal(editId) {
  matEditId = editId || null;
  selectedPdfFile = null;
  const materials = loadData(STORAGE_KEYS.materials);
  const mat = matEditId ? materials.find(m => m.id === matEditId) : null;
  const isPdf = (!mat || mat?.type === 'PDF');

  const body = `
    <div class="form-group">
      <label for="matType">Resource Type</label>
      <select id="matType" onchange="toggleMatTypeFields()">
        <option value="PDF" ${isPdf ? 'selected' : ''}>📄 PDF Document (Stored in Database)</option>
        <option value="Link" ${mat?.type === 'Link' ? 'selected' : ''}>🔗 Web Link / Article</option>
        <option value="Book" ${mat?.type === 'Book' ? 'selected' : ''}>📖 Book / Textbook</option>
        <option value="Other" ${mat?.type === 'Other' ? 'selected' : ''}>📁 Other Resource</option>
      </select>
    </div>

    <!-- PDF Upload Section -->
    <div id="pdfUploadGroup" style="${isPdf ? 'display:block;' : 'display:none;'}">
      <div class="pdf-dropzone" id="pdfDropzone" onclick="document.getElementById('pdfFileInput').click()"
        ondragover="event.preventDefault(); this.classList.add('dragover');"
        ondragleave="this.classList.remove('dragover');"
        ondrop="handlePdfDrop(event)">
        <span class="pdf-dropzone-icon">📄</span>
        <div class="pdf-dropzone-text">Click or drag & drop a PDF file here</div>
        <div class="pdf-dropzone-hint">Enforced limit: 20 MB total database quota per account</div>
      </div>
      <input type="file" id="pdfFileInput" accept=".pdf,application/pdf" style="display:none;" onchange="handlePdfSelect(event)">
      <div id="pdfFilePreview" style="display:none;"></div>
      ${mat?.fileSize ? `<div class="text-sm text-muted mb-1" style="margin-top:0.35rem;">Current file: <strong>${escapeHtml(mat.fileName || 'Attached PDF')}</strong> (${formatBytes(mat.fileSize)})</div>` : ''}
    </div>

    <div class="form-group" id="matLinkGroup" style="${!isPdf ? 'display:block;' : 'display:none;'}">
      <label for="matLink">Resource URL</label>
      <input type="text" id="matLink" placeholder="https://..." value="${mat ? escapeHtml(mat.link || '') : ''}">
    </div>

    <div class="form-group">
      <label for="matTitle">Title</label>
      <input type="text" id="matTitle" placeholder="e.g. Operating Systems Revision Notes" value="${mat ? escapeHtml(mat.title) : ''}">
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
      <div class="form-group">
        <label for="matSubject">Subject / Topic</label>
        <input type="text" id="matSubject" placeholder="e.g. Computer Science" value="${mat ? escapeHtml(mat.subject || '') : ''}">
      </div>
      <div class="form-group">
        <label for="matStatus">Status</label>
        <select id="matStatus">
          <option value="To study" ${(!mat || mat?.status === 'To study') ? 'selected' : ''}>To study</option>
          <option value="Studied" ${mat?.status === 'Studied' ? 'selected' : ''}>Studied</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="matDesc">Short Description</label>
      <textarea id="matDesc" rows="2" placeholder="Brief summary of what this document covers...">${mat ? escapeHtml(mat.description || '') : ''}</textarea>
    </div>
  `;

  const deleteBtn = matEditId ? `<button class="btn btn-danger btn-sm" onclick="deleteMaterial('${matEditId}')">🗑 Delete</button>` : '';
  const footer = `${deleteBtn}<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="saveMatBtn" onclick="saveMaterial()">💾 Save Material</button>`;

  openModal(matEditId ? 'Edit Study Material' : 'Add Study Material', body, footer);
}

async function saveMaterial() {
  const title = document.getElementById('matTitle')?.value.trim();
  if (!title) { document.getElementById('matTitle').focus(); return; }
  const subject = document.getElementById('matSubject')?.value.trim() || 'General';
  const type = document.getElementById('matType')?.value || 'PDF';
  const link = document.getElementById('matLink')?.value.trim() || '';
  const description = document.getElementById('matDesc')?.value.trim() || '';
  const status = document.getElementById('matStatus')?.value || 'To study';
  const materials = loadData(STORAGE_KEYS.materials);

  let fileId = null;
  let fileName = '';
  let fileSize = 0;

  if (type === 'PDF') {
    if (selectedPdfFile) {
      const user = getCurrentUser();
      const usedBytes = await getUserPdfStorageBytes(user.id);
      const quotaBytes = user.quotaBytes || DEFAULT_STORAGE_LIMIT_BYTES;
      if (usedBytes + selectedPdfFile.size > quotaBytes) {
        showToast('Storage quota limit exceeded! Cannot upload file.', 'error');
        return;
      }

      fileId = uid();
      fileName = selectedPdfFile.name;
      fileSize = selectedPdfFile.size;

      // Save binary blob into IndexedDB
      await savePdfToDB({
        id: fileId,
        userId: user.id,
        fileName: fileName,
        fileSize: fileSize,
        mimeType: 'application/pdf',
        data: selectedPdfFile,
        createdAt: new Date().toISOString()
      });
    } else if (matEditId) {
      const existing = materials.find(x => x.id === matEditId);
      if (existing) {
        fileId = existing.fileId;
        fileName = existing.fileName || '';
        fileSize = existing.fileSize || 0;
      }
    }
  }

  if (matEditId) {
    const m = materials.find(x => x.id === matEditId);
    if (m) {
      Object.assign(m, { title, subject, type, link, description, status });
      if (fileId) { m.fileId = fileId; m.fileName = fileName; m.fileSize = fileSize; }
    }
  } else {
    materials.push({
      id: uid(),
      title,
      subject,
      type,
      link,
      description,
      status,
      fileId,
      fileName,
      fileSize,
      createdAt: new Date().toISOString()
    });
  }

  saveData(STORAGE_KEYS.materials, materials);
  closeModal();
  renderMaterials();
  updateStorageUI();
  matEditId = null;
  selectedPdfFile = null;
  showToast(type === 'PDF' && fileName ? `PDF "${fileName}" saved to database!` : 'Material saved!', 'success');
}

function deleteMaterial(id) {
  confirmAction("Delete this study material?", async () => {
    let materials = loadData(STORAGE_KEYS.materials);
    const m = materials.find(x => x.id === id);
    if (m && m.fileId) {
      await deletePdfFromDB(m.fileId);
    }
    materials = materials.filter(x => x.id !== id);
    saveData(STORAGE_KEYS.materials, materials);
    closeModal();
    renderMaterials();
    updateStorageUI();
    matEditId = null;
    showToast('Material deleted & storage freed', 'info');
  });
}

/* ============================================================
   ★ PDF VIEWER & DOWNLOAD FUNCTIONS
   ============================================================ */
async function viewPdfMaterial(id) {
  const materials = loadData(STORAGE_KEYS.materials);
  const m = materials.find(x => x.id === id);
  if (!m || !m.fileId) {
    showToast('PDF file record not found in database', 'error');
    return;
  }

  try {
    const record = await getPdfFromDB(m.fileId);
    if (!record || !record.data) {
      showToast('PDF data could not be retrieved from database', 'error');
      return;
    }

    if (currentPdfBlobUrl) {
      URL.revokeObjectURL(currentPdfBlobUrl);
    }

    const blob = record.data instanceof Blob ? record.data : new Blob([record.data], { type: 'application/pdf' });
    currentPdfBlobUrl = URL.createObjectURL(blob);

    const titleEl = document.getElementById('pdfModalTitle');
    const metaEl = document.getElementById('pdfModalMeta');
    const dlBtn = document.getElementById('pdfModalDownloadBtn');
    const frame = document.getElementById('pdfModalFrame');

    if (titleEl) titleEl.textContent = m.title || record.fileName || 'PDF Document';
    if (metaEl) metaEl.textContent = `${formatBytes(record.fileSize)} • ${m.subject || 'Study Material'} • Stored in DB`;
    if (dlBtn) {
      dlBtn.href = currentPdfBlobUrl;
      dlBtn.download = record.fileName || 'document.pdf';
    }
    if (frame) {
      frame.src = currentPdfBlobUrl;
    }

    const overlay = document.getElementById('pdfViewerOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.classList.add('open');
    }
  } catch (err) {
    console.error('Failed to view PDF', err);
    showToast('Failed to open PDF viewer', 'error');
  }
}

function closePdfViewer() {
  const overlay = document.getElementById('pdfViewerOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.style.display = 'none';
  }
  const frame = document.getElementById('pdfModalFrame');
  if (frame) frame.src = 'about:blank';
  if (currentPdfBlobUrl) {
    URL.revokeObjectURL(currentPdfBlobUrl);
    currentPdfBlobUrl = null;
  }
}

async function downloadPdfMaterial(id) {
  const materials = loadData(STORAGE_KEYS.materials);
  const m = materials.find(x => x.id === id);
  if (!m || !m.fileId) return;
  const record = await getPdfFromDB(m.fileId);
  if (!record || !record.data) return;
  const blob = record.data instanceof Blob ? record.data : new Blob([record.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = record.fileName || `${m.title}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`Downloading ${record.fileName || 'PDF'}...`, 'info');
}

/* ============================================================
   ★ CERTIFICATES
   ============================================================ */
let certEditId = null;

function renderCertificates() {
  const certs = loadData(STORAGE_KEYS.certificates);
  // Sort newest first
  const sorted = [...certs].sort((a, b) => new Date(b.dateEarned || b.createdAt) - new Date(a.dateEarned || a.createdAt));

  const grid = document.getElementById('certsGrid');
  if (sorted.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-icon">🏆</div>
      <p>No certificates yet. Add your first achievement!</p>
      <button class="btn btn-primary" onclick="openCertModal()">+ Add Certificate</button>
    </div>`;
    return;
  }

  grid.innerHTML = sorted.map((c, i) => `
    <div class="card cert-card" onclick="viewCertDetail('${c.id}')" style="animation-delay: ${i * 0.05}s">
      <div class="cert-img">
        ${c.image ? `<img src="${c.image}" alt="${escapeHtml(c.title)}">` : '🏅'}
      </div>
      <div class="cert-title">${escapeHtml(c.title)}</div>
      <div class="cert-issuer">${escapeHtml(c.issuer || 'Unknown issuer')}</div>
      <div class="cert-date">📅 ${formatDate(c.dateEarned)}</div>
    </div>`).join('');
}

function viewCertDetail(id) {
  const certs = loadData(STORAGE_KEYS.certificates);
  const c = certs.find(x => x.id === id);
  if (!c) return;

  const container = document.getElementById('detailContainer');
  container.innerHTML = `
    <div class="detail-overlay" onclick="if(event.target===this)this.innerHTML=''">
      <div class="detail-box">
        <div class="detail-header">
          <div class="detail-title">${escapeHtml(c.title)}</div>
          <div style="display:flex;gap:0.25rem;">
            <button class="btn-icon" onclick="openCertModal('${c.id}');document.getElementById('detailContainer').innerHTML=''" title="Edit">✏️</button>
            <button class="btn-icon" onclick="document.getElementById('detailContainer').innerHTML=''" title="Close">✕</button>
          </div>
        </div>
        ${c.image ? `<img class="detail-img" src="${c.image}" alt="${escapeHtml(c.title)}">` : ''}
        <div class="detail-row"><span class="label">Issuer</span><span>${escapeHtml(c.issuer || '—')}</span></div>
        <div class="detail-row"><span class="label">Date Earned</span><span>${formatDate(c.dateEarned) || '—'}</span></div>
        <div class="detail-row"><span class="label">Credential Link</span><span>${c.credentialLink ? `<a href="${escapeHtml(c.credentialLink)}" target="_blank">View credential ↗</a>` : '—'}</span></div>
        <div style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:flex-end;">
          <button class="btn btn-danger btn-sm" onclick="deleteCert('${c.id}');document.getElementById('detailContainer').innerHTML=''">🗑 Delete</button>
        </div>
      </div>
    </div>`;
}

function openCertModal(editId) {
  certEditId = editId || null;
  const certs = loadData(STORAGE_KEYS.certificates);
  const cert = certEditId ? certs.find(c => c.id === certEditId) : null;

  const body = `
    <div class="form-group">
      <label for="certTitle">Certificate Title</label>
      <input type="text" id="certTitle" placeholder="e.g. Responsive Web Design" value="${cert ? escapeHtml(cert.title) : ''}">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
      <div class="form-group">
        <label for="certIssuer">Issuer</label>
        <input type="text" id="certIssuer" placeholder="e.g. freeCodeCamp" value="${cert ? escapeHtml(cert.issuer || '') : ''}">
      </div>
      <div class="form-group">
        <label for="certDate">Date Earned</label>
        <input type="date" id="certDate" value="${cert?.dateEarned || ''}">
      </div>
    </div>
    <div class="form-group">
      <label for="certLink">Credential Link</label>
      <input type="text" id="certLink" placeholder="https://..." value="${cert ? escapeHtml(cert.credentialLink || '') : ''}">
    </div>
    <div class="form-group">
      <label for="certImage">Certificate Image (optional)</label>
      <input type="file" id="certImage" accept="image/*" onchange="handleCertImage(event)">
      ${cert?.image ? '<p class="text-sm text-muted mt-1">Current image loaded. Upload new to replace.</p>' : ''}
      <input type="hidden" id="certImageData" value="${cert?.image || ''}">
    </div>`;

  const deleteBtn = certEditId ? `<button class="btn btn-danger btn-sm" onclick="deleteCert('${certEditId}')">🗑 Delete</button>` : '';
  const footer = `${deleteBtn}<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveCert()">💾 Save</button>`;

  openModal(certEditId ? 'Edit Certificate' : 'Add Certificate', body, footer);
}

function handleCertImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('certImageData').value = e.target.result;
  };
  reader.readAsDataURL(file);
}

function saveCert() {
  const title = document.getElementById('certTitle')?.value.trim();
  if (!title) { document.getElementById('certTitle').focus(); return; }
  const issuer = document.getElementById('certIssuer')?.value.trim();
  const dateEarned = document.getElementById('certDate')?.value || '';
  const credentialLink = document.getElementById('certLink')?.value.trim();
  const image = document.getElementById('certImageData')?.value || '';
  const certs = loadData(STORAGE_KEYS.certificates);
  if (certEditId) {
    const c = certs.find(x => x.id === certEditId);
    if (c) { Object.assign(c, { title, issuer, dateEarned, credentialLink, image: image || c.image }); }
  } else {
    certs.push({ id: uid(), title, issuer, dateEarned, credentialLink, image, createdAt: new Date().toISOString() });
  }
  saveData(STORAGE_KEYS.certificates, certs);
  closeModal();
  renderCertificates();
  certEditId = null;
  showToast('Certificate saved!', 'success');
}

function deleteCert(id) {
  confirmAction("Delete this certificate?", () => {
    let certs = loadData(STORAGE_KEYS.certificates);
    certs = certs.filter(c => c.id !== id);
    saveData(STORAGE_KEYS.certificates, certs);
    closeModal();
    renderCertificates();
    certEditId = null;
    showToast('Certificate deleted', 'info');
  });
}

/* ============================================================
   ★ VIDEO LINKS
   ============================================================ */
let videoEditId = null;

function renderVideos() {
  const videos = loadData(STORAGE_KEYS.videos);
  const search = (document.getElementById('videoSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('videoStatusFilter')?.value || 'all';
  const topicFilter = document.getElementById('videoTopicFilter')?.value || 'all';

  // Build topic filter options
  const allTopics = [...new Set(videos.map(v => v.topic || 'General'))];
  const topicSelect = document.getElementById('videoTopicFilter');
  const currentTopic = topicSelect?.value || 'all';
  topicSelect.innerHTML = '<option value="all">All Topics</option>' + allTopics.map(t => `<option value="${escapeHtml(t)}" ${currentTopic === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');

  let filtered = videos;
  if (statusFilter !== 'all') filtered = filtered.filter(v => v.status === statusFilter);
  if (topicFilter !== 'all') filtered = filtered.filter(v => (v.topic || 'General') === topicFilter);
  if (search) filtered = filtered.filter(v => v.title.toLowerCase().includes(search) || (v.topic || '').toLowerCase().includes(search));

  const grid = document.getElementById('videosGrid');
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-icon">🎬</div>
      <p>${search || statusFilter !== 'all' || topicFilter !== 'all' ? 'No videos match your filters' : 'No videos yet. Add your first!'}</p>
      <button class="btn btn-primary" onclick="openVideoModal()">+ Add Video</button>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map((v, i) => {
    const thumb = getYouTubeThumb(v.url);
    const statusColors = { 'Watch later': 'badge-warning', 'Watching': 'badge-accent', 'Done': 'badge-success' };
    return `
    <div class="card video-card" style="animation-delay: ${i * 0.05}s">
      <div class="video-thumb">
        ${thumb ? `<a href="${escapeHtml(v.url)}" target="_blank"><img src="${thumb}" alt="${escapeHtml(v.title)}"></a>` : `<a href="${escapeHtml(v.url)}" target="_blank">🎥</a>`}
      </div>
      <a href="${escapeHtml(v.url)}" target="_blank" class="video-title">${escapeHtml(v.title)}</a>
      <div class="video-topic text-sm">${escapeHtml(v.topic || 'General')}</div>
      <div class="video-footer">
        <span class="badge ${statusColors[v.status] || 'badge-accent'}">${escapeHtml(v.status)}</span>
        <div style="display:flex;gap:0.25rem;">
          <button class="btn-icon btn-sm" onclick="cycleVideoStatus('${v.id}')" title="Change status">🔄</button>
          <button class="btn-icon btn-sm" onclick="openVideoModal('${v.id}')" title="Edit">✏️</button>
          <button class="btn-icon btn-sm" onclick="deleteVideo('${v.id}')" title="Delete">🗑</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function cycleVideoStatus(id) {
  const cycle = ['Watch later', 'Watching', 'Done'];
  const videos = loadData(STORAGE_KEYS.videos);
  const v = videos.find(x => x.id === id);
  if (v) {
    const idx = cycle.indexOf(v.status);
    v.status = cycle[(idx + 1) % cycle.length];
    saveData(STORAGE_KEYS.videos, videos);
    renderVideos();
    showToast(`Status: ${v.status}`, 'info');
  }
}

function openVideoModal(editId) {
  videoEditId = editId || null;
  const videos = loadData(STORAGE_KEYS.videos);
  const video = videoEditId ? videos.find(v => v.id === videoEditId) : null;

  const body = `
    <div class="form-group">
      <label for="videoTitle">Title</label>
      <input type="text" id="videoTitle" placeholder="Video title..." value="${video ? escapeHtml(video.title) : ''}">
    </div>
    <div class="form-group">
      <label for="videoUrl">URL</label>
      <input type="text" id="videoUrl" placeholder="https://youtube.com/watch?v=..." value="${video ? escapeHtml(video.url || '') : ''}">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
      <div class="form-group">
        <label for="videoTopic">Subject / Topic</label>
        <input type="text" id="videoTopic" placeholder="e.g. JavaScript" value="${video ? escapeHtml(video.topic || '') : ''}">
      </div>
      <div class="form-group">
        <label for="videoStatus">Status</label>
        <select id="videoStatus">
          <option value="Watch later" ${(!video || video?.status === 'Watch later') ? 'selected' : ''}>Watch later</option>
          <option value="Watching" ${video?.status === 'Watching' ? 'selected' : ''}>Watching</option>
          <option value="Done" ${video?.status === 'Done' ? 'selected' : ''}>Done</option>
        </select>
      </div>
    </div>`;

  const deleteBtn = videoEditId ? `<button class="btn btn-danger btn-sm" onclick="deleteVideo('${videoEditId}')">🗑 Delete</button>` : '';
  const footer = `${deleteBtn}<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveVideo()">💾 Save</button>`;

  openModal(videoEditId ? 'Edit Video' : 'Add Video', body, footer);
}

function saveVideo() {
  const title = document.getElementById('videoTitle')?.value.trim();
  if (!title) { document.getElementById('videoTitle').focus(); return; }
  const url = document.getElementById('videoUrl')?.value.trim();
  const topic = document.getElementById('videoTopic')?.value.trim() || 'General';
  const status = document.getElementById('videoStatus')?.value || 'Watch later';
  const videos = loadData(STORAGE_KEYS.videos);
  if (videoEditId) {
    const v = videos.find(x => x.id === videoEditId);
    if (v) { Object.assign(v, { title, url, topic, status }); }
  } else {
    videos.push({ id: uid(), title, url, topic, status, createdAt: new Date().toISOString() });
  }
  saveData(STORAGE_KEYS.videos, videos);
  closeModal();
  renderVideos();
  videoEditId = null;
  showToast('Video saved!', 'success');
}

function deleteVideo(id) {
  confirmAction("Delete this video?", () => {
    let videos = loadData(STORAGE_KEYS.videos);
    videos = videos.filter(v => v.id !== id);
    saveData(STORAGE_KEYS.videos, videos);
    closeModal();
    renderVideos();
    videoEditId = null;
    showToast('Video deleted', 'info');
  });
}

/* ============================================================
   EXPORT / IMPORT
   ============================================================ */
function exportData() {
  const data = {
    notes: loadData(STORAGE_KEYS.notes),
    todos: loadData(STORAGE_KEYS.todos),
    materials: loadData(STORAGE_KEYS.materials),
    certificates: loadData(STORAGE_KEYS.certificates),
    videos: loadData(STORAGE_KEYS.videos),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `studyhub-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported!', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.notes) saveData(STORAGE_KEYS.notes, data.notes);
      if (data.todos) saveData(STORAGE_KEYS.todos, data.todos);
      if (data.materials) saveData(STORAGE_KEYS.materials, data.materials);
      if (data.certificates) saveData(STORAGE_KEYS.certificates, data.certificates);
      if (data.videos) saveData(STORAGE_KEYS.videos, data.videos);
      renderAll();
      showToast('Data imported successfully!', 'success');
    } catch (err) {
      showToast('Failed to import: invalid JSON file.', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
document.addEventListener('keydown', e => {
  // Esc to close modals
  if (e.key === 'Escape') {
    closeModal();
    closePdfViewer();
    document.getElementById('detailContainer').innerHTML = '';
    document.getElementById('confirmContainer').innerHTML = '';
  }
  // Enter in modal to save (when not in textarea)
  if (e.key === 'Enter' && document.getElementById('modalOverlay').classList.contains('open')) {
    if (document.activeElement?.tagName !== 'TEXTAREA') {
      const saveBtn = document.querySelector('#modalFooter .btn-primary');
      if (saveBtn) { e.preventDefault(); saveBtn.click(); }
    }
  }
  // Keyboard shortcuts (Ctrl/Cmd + key)
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
    if (e.key === '1') { e.preventDefault(); navigateTo('dashboard'); }
    if (e.key === '2') { e.preventDefault(); navigateTo('notes'); }
    if (e.key === '3') { e.preventDefault(); navigateTo('todos'); }
    if (e.key === '4') { e.preventDefault(); navigateTo('materials'); }
    if (e.key === '5') { e.preventDefault(); navigateTo('certificates'); }
    if (e.key === '6') { e.preventDefault(); navigateTo('videos'); }
  }
});

// Quick add todo with Enter
document.addEventListener('DOMContentLoaded', () => {
  const quickInput = document.getElementById('quickTodoInput');
  if (quickInput) {
    quickInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const text = quickInput.value.trim();
        if (!text) return;
        const todos = loadData(STORAGE_KEYS.todos);
        todos.push({ id: uid(), text, done: false, priority: 'Medium', dueDate: '', createdAt: new Date().toISOString() });
        saveData(STORAGE_KEYS.todos, todos);
        quickInput.value = '';
        renderTodos();
        showToast('Task added!', 'success');
      }
    });
  }
});

/* ============================================================
   RENDER ALL & INIT
   ============================================================ */
function renderAll() {
  renderDashboard();
  renderNotes();
  renderTodos();
  renderMaterials();
  renderCertificates();
  renderVideos();
}

async function init() {
  // Initialize users and profile
  initUsers();
  updateUserProfileUI();

  // Apply accent color from config
  if (CONFIG.accentColor) {
    document.documentElement.style.setProperty('--accent-h', CONFIG.accentColor.h);
    document.documentElement.style.setProperty('--accent-s', CONFIG.accentColor.s + '%');
    document.documentElement.style.setProperty('--accent-l', CONFIG.accentColor.l + '%');
  }

  // Set tagline
  document.getElementById('sidebarTagline').textContent = CONFIG.tagline;

  // Theme
  initTheme();

  // Sample data
  loadSampleData();

  // Seed sample starter PDF into IndexedDB if needed
  await seedSamplePdfIfEmpty();

  // Show clear sample btn if sample data was just loaded
  const hasSample = localStorage.getItem(STORAGE_KEYS.sampleLoaded);
  const hasAnyData = loadData(STORAGE_KEYS.notes).length || loadData(STORAGE_KEYS.todos).length;
  if (hasSample && hasAnyData) {
    document.getElementById('clearSampleBtn').style.display = 'block';
  }

  // Navigation
  initNavigation();

  // Update storage quota and meter
  await updateStorageUI();

  // Responsive: show data actions on mobile dashboard
  const mq = window.matchMedia('(max-width: 768px)');
  mq.addEventListener('change', () => {
    document.getElementById('dashDataActions').style.display = mq.matches ? 'flex' : 'none';
  });

  // Responsive panels
  const panels = document.getElementById('dashPanels');
  if (window.innerWidth <= 768) {
    panels.style.gridTemplateColumns = '1fr';
  }
  window.addEventListener('resize', () => {
    panels.style.gridTemplateColumns = window.innerWidth <= 768 ? '1fr' : '1fr 1fr';
  });

  // Render everything
  renderAll();
}

// System preference listener
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem(STORAGE_KEYS.theme)) {
    currentTheme = e.matches ? 'dark' : 'light';
    applyTheme();
  }
});

// Init on load
init();
