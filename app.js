/* ============================================================
   ORBIT PRODUCTIVITY — App Logic
   ============================================================ */
(function () {
  "use strict";

  // ── Auth Guard ─────────────────────────────────────────────
  // Must be the very first thing — redirects to auth.html if no valid session
  const SESSION_KEY = 'orbit_auth_session';
  const _rawSession = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  const _session = (() => { try { return _rawSession ? JSON.parse(_rawSession) : null; } catch { return null; } })();
  if (!_session || (_session.expiresAt && Date.now() > _session.expiresAt)) {
    window.location.replace('auth.html');
    // Stop execution while redirect happens
    throw new Error('AUTH_REDIRECT');
  }
  // Sync user name from session into app state
  const _sessionName = _session.name || '';
  if (_sessionName) localStorage.setItem('orbit_prod_userName', JSON.stringify(_sessionName));

  // ── Storage helpers ────────────────────────────────────────
  const NS = "orbit_prod_";
  const load = (key, def) => {
    try {
      const v = localStorage.getItem(NS + key);
      return v ? JSON.parse(v) : def;
    } catch {
      return def;
    }
  };
  const save = (key, val) => {
    try {
      localStorage.setItem(NS + key, JSON.stringify(val));
    } catch {}
  };

  // ── State ──────────────────────────────────────────────────
  let tasks = load("tasks", []);
  let notes = load("notes", []);
  let habits = load("habits", []);
  let pomoDates = load("pomoDates", {}); // { 'YYYY-MM-DD': { sessions, minutes } }
  let taskHistory = load("taskHistory", {}); // { 'YYYY-MM-DD': completedCount }
  let userName = load("userName", "");
  let theme    = load("theme", "dark");     // 'dark' | 'light'

  // ── ID generator ───────────────────────────────────────────
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ── Date helpers ───────────────────────────────────────────
  const today = () => new Date().toISOString().slice(0, 10);
  const todayLabel = () =>
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

  const isToday = (d) => d === today();
  const isOverdue = (d) => d && d < today();
  const isUpcoming = (d) => d && d > today();

  const dayLabel = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1);
  };

  // ── Persist ────────────────────────────────────────────────
  const persist = () => {
    save("tasks", tasks);
    save("notes", notes);
    save("habits", habits);
    save("pomoDates", pomoDates);
    save("taskHistory", taskHistory);
    save("userName", userName);
    save("theme", theme);
  };

  // ──────────────────────────────────────────────────────────
  // THEME TOGGLE
  // ──────────────────────────────────────────────────────────
  const applyTheme = (t) => {
    document.documentElement.setAttribute("data-theme", t);
    const icon  = document.getElementById("theme-icon");
    const label = document.getElementById("theme-label");
    if (icon)  icon.textContent  = t === "light" ? "☀️" : "🌙";
    if (label) label.textContent = t === "light" ? "Dark Mode"  : "Light Mode";
  };

  const toggleTheme = () => {
    theme = theme === "dark" ? "light" : "dark";
    save("theme", theme);
    applyTheme(theme);
  };

  document.getElementById("theme-toggle-btn").addEventListener("click", toggleTheme);
  applyTheme(theme); // apply on boot

  // ──────────────────────────────────────────────────────────
  // TOAST
  // ──────────────────────────────────────────────────────────
  const toastContainer = document.getElementById("toast-container");
  const showToast = (msg, type = "success") => {
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${type === "success" ? "✅" : "❌"}</span> ${msg}`;
    toastContainer.appendChild(t);
    setTimeout(() => {
      t.style.animation = "toastOut 0.3s ease forwards";
      setTimeout(() => t.remove(), 300);
    }, 2800);
  };

  // ──────────────────────────────────────────────────────────
  // ROUTER / NAVIGATION
  // ──────────────────────────────────────────────────────────
  const pages = document.querySelectorAll(".page");
  const navItems = document.querySelectorAll(".nav-item");

  const navigate = (pageId) => {
    pages.forEach((p) => p.classList.remove("active"));
    navItems.forEach((n) => n.classList.remove("active"));
    const page = document.getElementById("page-" + pageId);
    const nav = document.getElementById("nav-" + pageId);
    if (page) page.classList.add("active");
    if (nav) nav.classList.add("active");
    window.location.hash = pageId;
    // refresh view
    if (pageId === "dashboard") renderDashboard();
    if (pageId === "tasks") renderTasks();
    if (pageId === "notes") renderNotes();
    if (pageId === "habits") renderHabits();
  };

  navItems.forEach((n) =>
    n.addEventListener("click", () => navigate(n.dataset.page)),
  );
  document.querySelectorAll(".dash-link").forEach((l) =>
    l.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(l.dataset.page);
    }),
  );

  // Hash routing on load
  const initRoute = () => {
    const hash = window.location.hash.slice(1);
    const valid = ["dashboard", "tasks", "pomodoro", "notes", "habits"];
    navigate(valid.includes(hash) ? hash : "dashboard");
  };

  // ──────────────────────────────────────────────────────────
  // GREETING
  // ──────────────────────────────────────────────────────────
  const updateGreeting = () => {
    const h = new Date().getHours();
    const g =
      h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const name = userName || "there";
    document.getElementById("greeting-text").innerHTML =
      `${g}, <span class="name-highlight">${esc(name)}</span> 👋`;
    document.getElementById("greeting-sub").textContent =
      `Today is ${todayLabel()}.`;
    document.getElementById("user-name-display") &&
      (document.getElementById("user-name-display").textContent = name);
    const sn = document.getElementById("sidebar-user-name");
    if (sn) sn.textContent = name;
    const av = document.getElementById("user-avatar-initial");
    if (av) av.textContent = name ? name[0].toUpperCase() : "U";
  };

  // ──────────────────────────────────────────────────────────
  // USER NAME MODAL
  // ──────────────────────────────────────────────────────────
  const nameModal = document.getElementById("name-modal");
  const openNameModal = () => {
    nameModal.classList.add("open");
    document.getElementById("name-input").focus();
  };
  const closeNameModal = () => nameModal.classList.remove("open");

  document.getElementById("name-save-btn").addEventListener("click", () => {
    const v = document.getElementById("name-input").value.trim();
    if (!v) return;
    userName = v;
    persist();
    closeNameModal();
    updateGreeting();
  });
  document.getElementById("name-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("name-save-btn").click();
  });
  document.getElementById("user-card").addEventListener("click", openNameModal);

  // ──────────────────────────────────────────────────────────
  // TASK MANAGER
  // ──────────────────────────────────────────────────────────
  let currentFilter = "all";

  const addTask = (title, priority = "medium", dueDate = "", category = "") => {
    if (!title.trim()) return false;
    tasks.push({
      id: uid(),
      title: title.trim(),
      priority,
      dueDate,
      category,
      done: false,
      createdAt: today(),
    });
    persist();
    updateBadge();
    return true;
  };

  const toggleTask = (id) => {
    const t = tasks.find((t) => t.id === id);
    if (!t) return;
    t.done = !t.done;
    if (t.done) {
      const d = today();
      taskHistory[d] = (taskHistory[d] || 0) + 1;
    }
    persist();
    updateBadge();
  };

  const deleteTask = (id) => {
    tasks = tasks.filter((t) => t.id !== id);
    persist();
    updateBadge();
  };

  const filteredTasks = () => {
    switch (currentFilter) {
      case "today":
        return tasks.filter((t) => !t.done && isToday(t.dueDate));
      case "upcoming":
        return tasks.filter((t) => !t.done && isUpcoming(t.dueDate));
      case "done":
        return tasks.filter((t) => t.done);
      case "high":
        return tasks.filter((t) => t.priority === "high" && !t.done);
      default:
        return tasks.slice();
    }
  };

  const updateBadge = () => {
    const count = tasks.filter((t) => !t.done).length;
    document.getElementById("badge-tasks").textContent = count;
    document.getElementById("badge-tasks").style.display = count
      ? "inline"
      : "none";
  };

  const renderTasks = () => {
    const list = document.getElementById("task-list");
    const filtered = filteredTasks();
    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>No tasks here.<br>Add one above!</p></div>`;
      return;
    }
    list.innerHTML = filtered
      .map(
        (t) => `
      <div class="task-item ${t.done ? "done" : ""}" data-id="${t.id}">
        <div class="task-check" data-action="toggle" data-id="${t.id}">${t.done ? "✓" : ""}</div>
        <div class="task-body">
          <div class="task-title">${esc(t.title)}</div>
          <div class="task-meta">
            <span class="priority-badge ${t.priority}">${t.priority}</span>
            ${t.dueDate ? `<span class="task-due ${isOverdue(t.dueDate) && !t.done ? "overdue" : ""}">📅 ${t.dueDate}</span>` : ""}
            ${t.category ? `<span class="task-due">🏷 ${esc(t.category)}</span>` : ""}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-icon" data-action="delete" data-id="${t.id}" title="Delete">🗑</button>
        </div>
      </div>
    `,
      )
      .join("");
  };

  document.getElementById("task-list").addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    if (el.dataset.action === "toggle") {
      toggleTask(el.dataset.id);
      renderTasks();
      renderDashboard();
    }
    if (el.dataset.action === "delete") {
      deleteTask(el.dataset.id);
      renderTasks();
      renderDashboard();
      showToast("Task deleted");
    }
  });

  document.getElementById("task-add-btn").addEventListener("click", () => {
    const t = document.getElementById("task-title-input").value;
    const p = document.getElementById("task-priority-input").value;
    const d = document.getElementById("task-due-input").value;
    const c = document.getElementById("task-category-input").value;
    if (!addTask(t, p, d, c)) {
      showToast("Please enter a task title", "error");
      return;
    }
    document.getElementById("task-title-input").value = "";
    document.getElementById("task-category-input").value = "";
    renderTasks();
    renderDashboard();
    showToast("Task added!");
  });

  document
    .getElementById("task-title-input")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("task-add-btn").click();
    });

  document.getElementById("task-filter-bar").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    document
      .querySelectorAll("#task-filter-bar .filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderTasks();
  });

  // ──────────────────────────────────────────────────────────
  // DASHBOARD
  // ──────────────────────────────────────────────────────────
  const renderDashboard = () => {
    updateGreeting();
    const todayTasks = tasks.filter((t) => !t.done);
    const habitsToday = habits;
    const habitsDone = habits.filter((h) => (h.checks || {})[today()]);
    const bestStreak = habits.reduce((mx, h) => Math.max(mx, h.streak || 0), 0);
    const todayDate = today();
    const podSessions = (pomoDates[todayDate] || {}).sessions || 0;

    document.getElementById("dash-tasks-left").textContent = todayTasks.length;
    document.getElementById("dash-habits-done").textContent =
      `${habitsDone.length}/${habitsToday.length}`;
    document.getElementById("dash-sessions").textContent = podSessions;
    document.getElementById("dash-streak").textContent = bestStreak;

    // Recent tasks (last 5 non-done)
    const recent = tasks
      .filter((t) => !t.done)
      .slice(-5)
      .reverse();
    const rtl = document.getElementById("recent-tasks-list");
    if (!recent.length) {
      rtl.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-icon" style="font-size:32px">✨</div><p>All clear! Great work.</p></div>`;
    } else {
      rtl.innerHTML = recent
        .map(
          (t) => `
        <div class="recent-task-item">
          <div class="task-check" style="width:16px;height:16px;font-size:10px;cursor:default;border:2px solid ${t.priority === "high" ? "var(--rose)" : t.priority === "medium" ? "var(--amber)" : "var(--teal)"}"></div>
          <div style="flex:1;font-size:13px;font-weight:500">${esc(t.title)}</div>
          <span class="priority-badge ${t.priority}">${t.priority}</span>
        </div>
      `,
        )
        .join("");
    }

    // Habits today list (dash)
    const dhl = document.getElementById("dash-habits-list");
    if (!habits.length) {
      dhl.innerHTML = `<div class="empty-state" style="padding:16px"><p>No habits yet. Add some!</p></div>`;
    } else {
      dhl.innerHTML = habits
        .slice(0, 5)
        .map((h) => {
          const done = (h.checks || {})[today()];
          return `
          <div class="habit-today-item">
            <div class="habit-check ${done ? "completed" : ""}" data-dash-habit="${h.id}" style="cursor:pointer">${done ? "✓" : ""}</div>
            <span style="font-size:18px">${h.icon || "🔥"}</span>
            <span style="flex:1;font-size:13px;font-weight:500">${esc(h.name)}</span>
            ${done ? '<span style="font-size:11px;color:var(--teal)">Done!</span>' : ""}
          </div>`;
        })
        .join("");
    }

    // Weekly chart
    renderWeeklyChart();
  };

  document.getElementById("dash-habits-list").addEventListener("click", (e) => {
    const el = e.target.closest("[data-dash-habit]");
    if (!el) return;
    toggleHabit(el.dataset.dashHabit);
    renderDashboard();
    renderHabits();
  });

  document.getElementById("quick-task-btn").addEventListener("click", () => {
    const v = document.getElementById("quick-task-input").value;
    if (!addTask(v)) {
      showToast("Enter a task title!", "error");
      return;
    }
    document.getElementById("quick-task-input").value = "";
    renderDashboard();
    showToast("Task added!");
  });
  document
    .getElementById("quick-task-input")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("quick-task-btn").click();
    });

  const renderWeeklyChart = () => {
    const chart = document.getElementById("weekly-chart");
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ label: dayLabel(i), val: taskHistory[key] || 0 });
    }
    const maxVal = Math.max(1, ...days.map((d) => d.val));
    chart.innerHTML = days
      .map((d) => {
        const pct = Math.round((d.val / maxVal) * 100);
        return `<div class="bar-wrap">
        <div class="bar" style="height:${Math.max(4, pct)}%" data-val="${d.val}"></div>
        <span class="bar-day">${d.label}</span>
      </div>`;
      })
      .join("");
  };

  // ──────────────────────────────────────────────────────────
  // POMODORO TIMER
  // ──────────────────────────────────────────────────────────
  let pomoCfg = {
    work: parseInt(document.getElementById("setting-work").value) * 60,
    short: parseInt(document.getElementById("setting-short").value) * 60,
    long: parseInt(document.getElementById("setting-long").value) * 60,
    sessionsPerRound: parseInt(
      document.getElementById("setting-sessions").value,
    ),
  };

  let pomoState = {
    mode: "work",
    running: false,
    elapsed: 0, // seconds elapsed in current mode
    totalSeconds: pomoCfg.work,
    sessionCount: 0, // completed work sessions in current round
    interval: null,
  };

  const RING_CIRC = 2 * Math.PI * 110; // ≈ 691.15

  const pomoDuration = (mode) => {
    if (mode === "work") return pomoCfg.work;
    if (mode === "short") return pomoCfg.short;
    return pomoCfg.long;
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const updateRing = () => {
    const remaining = pomoState.totalSeconds - pomoState.elapsed;
    const frac = Math.max(0, remaining / pomoState.totalSeconds);
    const offset = RING_CIRC * (1 - frac);
    document.getElementById("timer-ring-fg").style.strokeDashoffset = offset;
    document.getElementById("timer-display").textContent = formatTime(
      Math.max(0, remaining),
    );
  };

  const updateModeTabs = () => {
    ["work", "short", "long"].forEach((m) => {
      document
        .getElementById("mode-" + m)
        .classList.toggle("active", pomoState.mode === m);
    });
    const labels = {
      work: "Work Session",
      short: "Short Break",
      long: "Long Break",
    };
    document.getElementById("timer-mode-label").textContent =
      labels[pomoState.mode];
  };

  const updateSessionDots = () => {
    const dots = document.getElementById("session-dots");
    const n = pomoCfg.sessionsPerRound;
    dots.innerHTML = Array.from(
      { length: n },
      (_, i) =>
        `<div class="session-dot ${i < pomoState.sessionCount ? "done" : ""}"></div>`,
    ).join("");
    document.getElementById("session-count-display").textContent = Math.min(
      pomoState.sessionCount + 1,
      n,
    );
  };

  const finishSession = () => {
    clearInterval(pomoState.interval);
    pomoState.running = false;
    pomoState.elapsed = 0;

    if (pomoState.mode === "work") {
      pomoState.sessionCount++;
      // record
      const d = today();
      if (!pomoDates[d]) pomoDates[d] = { sessions: 0, minutes: 0 };
      pomoDates[d].sessions++;
      pomoDates[d].minutes += Math.round(pomoCfg.work / 60);
      persist();
      updatePomoStats();

      // Determine next mode
      if (pomoState.sessionCount >= pomoCfg.sessionsPerRound) {
        pomoState.sessionCount = 0;
        switchMode("long");
        showToast("🎉 Round complete! Long break time.");
      } else {
        switchMode("short");
        showToast("✅ Work session done! Short break.");
      }
    } else {
      switchMode("work");
      showToast("⚡ Break over! Back to work.");
    }

    // Browser notification
    if (Notification.permission === "granted") {
      const labels = {
        work: "Work session complete!",
        short: "Break time!",
        long: "Long break time!",
      };
      new Notification("Orbit Pomodoro 🌀", {
        body: labels[pomoState.mode],
        icon: "",
      });
    }

    document.getElementById("timer-start-btn").textContent = "▶";
    updateSessionDots();
    updateRing();
  };

  const switchMode = (mode) => {
    clearInterval(pomoState.interval);
    pomoState.mode = mode;
    pomoState.running = false;
    pomoState.elapsed = 0;
    pomoState.totalSeconds = pomoDuration(mode);
    updateModeTabs();
    updateRing();
    document.getElementById("timer-start-btn").textContent = "▶";
  };

  const startTimer = () => {
    if (pomoState.running) {
      clearInterval(pomoState.interval);
      pomoState.running = false;
      document.getElementById("timer-start-btn").textContent = "▶";
    } else {
      if (Notification.permission === "default")
        Notification.requestPermission();
      pomoState.running = true;
      document.getElementById("timer-start-btn").textContent = "⏸";
      pomoState.interval = setInterval(() => {
        pomoState.elapsed++;
        updateRing();
        if (pomoState.elapsed >= pomoState.totalSeconds) finishSession();
      }, 1000);
    }
  };

  const resetTimer = () => {
    clearInterval(pomoState.interval);
    pomoState.running = false;
    pomoState.elapsed = 0;
    document.getElementById("timer-start-btn").textContent = "▶";
    updateRing();
  };
  const skipTimer = () => finishSession();

  document
    .getElementById("timer-start-btn")
    .addEventListener("click", startTimer);
  document
    .getElementById("timer-reset-btn")
    .addEventListener("click", resetTimer);
  document
    .getElementById("timer-skip-btn")
    .addEventListener("click", skipTimer);

  ["work", "short", "long"].forEach((m) => {
    document
      .getElementById("mode-" + m)
      .addEventListener("click", () => switchMode(m));
  });

  document
    .getElementById("apply-settings-btn")
    .addEventListener("click", () => {
      pomoCfg.work =
        parseInt(document.getElementById("setting-work").value) * 60 || 1500;
      pomoCfg.short =
        parseInt(document.getElementById("setting-short").value) * 60 || 300;
      pomoCfg.long =
        parseInt(document.getElementById("setting-long").value) * 60 || 900;
      pomoCfg.sessionsPerRound =
        parseInt(document.getElementById("setting-sessions").value) || 4;
      switchMode(pomoState.mode);
      updateSessionDots();
      showToast("Settings applied!");
    });

  const updatePomoStats = () => {
    const d = today();
    const data = pomoDates[d] || { sessions: 0, minutes: 0 };
    document.getElementById("pomo-today-sessions").textContent = data.sessions;
    document.getElementById("pomo-total-minutes").textContent =
      data.minutes + "m";
    document.getElementById("dash-sessions").textContent = data.sessions;
  };

  // ──────────────────────────────────────────────────────────
  // NOTES
  // ──────────────────────────────────────────────────────────
  let editingNoteId = null;
  let selectedNoteColor = "default";
  let noteFilter = "all";
  let noteSearch = "";

  const noteModal = document.getElementById("note-modal");
  const openNoteModal = (id = null) => {
    editingNoteId = id;
    selectedNoteColor = "default";
    if (id) {
      const n = notes.find((n) => n.id === id);
      if (!n) return;
      document.getElementById("note-title-input").value = n.title;
      document.getElementById("note-content-input").value = n.content;
      document.getElementById("note-tag-input").value = n.tag || "";
      selectedNoteColor = n.color || "default";
      document.getElementById("modal-title").textContent = "Edit Note";
    } else {
      document.getElementById("note-title-input").value = "";
      document.getElementById("note-content-input").value = "";
      document.getElementById("note-tag-input").value = "work";
      document.getElementById("modal-title").textContent = "New Note";
    }
    updateColorPicker();
    noteModal.classList.add("open");
    setTimeout(() => document.getElementById("note-title-input").focus(), 100);
  };
  const closeNoteModal = () => {
    noteModal.classList.remove("open");
    editingNoteId = null;
  };

  const updateColorPicker = () => {
    document.querySelectorAll("#note-color-picker .color-dot").forEach((d) => {
      d.classList.toggle("selected", d.dataset.color === selectedNoteColor);
    });
  };
  document.querySelectorAll("#note-color-picker .color-dot").forEach((d) => {
    d.addEventListener("click", () => {
      selectedNoteColor = d.dataset.color;
      updateColorPicker();
    });
  });

  document
    .getElementById("add-note-btn")
    .addEventListener("click", () => openNoteModal());
  document
    .getElementById("note-cancel-btn")
    .addEventListener("click", closeNoteModal);
  noteModal.addEventListener("click", (e) => {
    if (e.target === noteModal) closeNoteModal();
  });

  document.getElementById("note-save-btn").addEventListener("click", () => {
    const title = document.getElementById("note-title-input").value.trim();
    const content = document.getElementById("note-content-input").value.trim();
    const tag = document.getElementById("note-tag-input").value;
    if (!title && !content) {
      showToast("Please add a title or content.", "error");
      return;
    }
    if (editingNoteId) {
      const n = notes.find((n) => n.id === editingNoteId);
      if (n) {
        n.title = title;
        n.content = content;
        n.tag = tag;
        n.color = selectedNoteColor;
        n.updatedAt = today();
      }
    } else {
      notes.push({
        id: uid(),
        title,
        content,
        tag,
        color: selectedNoteColor,
        pinned: false,
        createdAt: today(),
      });
    }
    persist();
    renderNotes();
    closeNoteModal();
    showToast(editingNoteId ? "Note updated!" : "Note saved!");
  });

  const togglePin = (id, e) => {
    e && e.stopPropagation();
    const n = notes.find((n) => n.id === id);
    if (!n) return;
    n.pinned = !n.pinned;
    persist();
    renderNotes();
  };

  const deleteNote = (id, e) => {
    e && e.stopPropagation();
    notes = notes.filter((n) => n.id !== id);
    persist();
    renderNotes();
    showToast("Note deleted");
  };

  const filteredNotes = () => {
    let ns = notes.slice();
    // sort: pinned first
    ns.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    if (noteFilter === "pinned") ns = ns.filter((n) => n.pinned);
    else if (noteFilter !== "all") ns = ns.filter((n) => n.tag === noteFilter);
    if (noteSearch)
      ns = ns.filter((n) =>
        (n.title + n.content).toLowerCase().includes(noteSearch.toLowerCase()),
      );
    return ns;
  };

  const renderNotes = () => {
    const grid = document.getElementById("notes-grid");
    const fn = filteredNotes();
    if (!fn.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📝</div><p>No notes yet.<br>Click "+ New Note" to get started.</p></div>`;
      return;
    }
    grid.innerHTML = fn
      .map(
        (n) => `
      <div class="note-card color-${n.color || "default"} ${n.pinned ? "pinned" : ""}" data-note-id="${n.id}">
        <button class="note-pin-btn" data-pin="${n.id}" title="${n.pinned ? "Unpin" : "Pin"}">${n.pinned ? "📌" : "🖇"}</button>
        ${n.title ? `<div class="note-title">${esc(n.title)}</div>` : ""}
        <div class="note-content">${esc(n.content)}</div>
        <div class="note-footer">
          ${n.tag ? `<span class="note-tag">${n.tag}</span>` : "<span></span>"}
          <span class="note-date">${n.createdAt || ""}</span>
        </div>
      </div>
    `,
      )
      .join("");
  };

  document.getElementById("notes-grid").addEventListener("click", (e) => {
    const pinBtn = e.target.closest("[data-pin]");
    if (pinBtn) {
      togglePin(pinBtn.dataset.pin, e);
      return;
    }
    const card = e.target.closest("[data-note-id]");
    if (card) openNoteModal(card.dataset.noteId);
  });

  document.getElementById("note-search").addEventListener("input", (e) => {
    noteSearch = e.target.value;
    renderNotes();
  });
  document.getElementById("note-tag-filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    document
      .querySelectorAll("#note-tag-filters .filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    noteFilter = btn.dataset.tag;
    renderNotes();
  });

  // ──────────────────────────────────────────────────────────
  // HABITS
  // ──────────────────────────────────────────────────────────
  const calcStreak = (h) => {
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if ((h.checks || {})[key]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  };

  const addHabit = (name, icon) => {
    if (!name.trim()) return false;
    habits.push({
      id: uid(),
      name: name.trim(),
      icon: icon || "🌟",
      checks: {},
      streak: 0,
    });
    persist();
    return true;
  };

  const toggleHabit = (id) => {
    const h = habits.find((h) => h.id === id);
    if (!h) return;
    const d = today();
    if (!h.checks) h.checks = {};
    h.checks[d] = !h.checks[d];
    h.streak = calcStreak(h);
    persist();
  };

  const deleteHabit = (id) => {
    habits = habits.filter((h) => h.id !== id);
    persist();
  };

  const weekGrid = (h) => {
    const cells = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const done = (h.checks || {})[key];
      const isT = key === today();
      cells.push(
        `<div class="week-dot ${done ? (isT ? "done-today" : "done") : ""}" title="${key}"></div>`,
      );
    }
    return cells.join("");
  };

  const renderHabits = () => {
    const list = document.getElementById("habit-list");
    if (!habits.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌱</div><p>No habits yet.<br>Add one to start your streak!</p></div>`;
      return;
    }
    list.innerHTML = habits
      .map((h) => {
        const done = (h.checks || {})[today()];
        return `
        <div class="habit-item ${done ? "completed" : ""}" data-habit-id="${h.id}">
          <div class="habit-check ${done ? "completed" : ""}" data-habit-toggle="${h.id}">${done ? "✓" : ""}</div>
          <span style="font-size:24px">${h.icon || "🌟"}</span>
          <div class="habit-body">
            <div class="habit-name">${esc(h.name)}</div>
            <div class="habit-streak">🔥 ${h.streak || 0} day streak</div>
            <div class="habit-week-grid">${weekGrid(h)}</div>
          </div>
          <button class="btn-icon btn-danger habit-delete" data-habit-del="${h.id}" title="Delete">🗑</button>
        </div>`;
      })
      .join("");
  };

  document.getElementById("habit-list").addEventListener("click", (e) => {
    const tog = e.target.closest("[data-habit-toggle]");
    const del = e.target.closest("[data-habit-del]");
    if (tog) {
      toggleHabit(tog.dataset.habitToggle);
      renderHabits();
      renderDashboard();
    }
    if (del) {
      deleteHabit(del.dataset.habitDel);
      renderHabits();
      renderDashboard();
      showToast("Habit deleted");
    }
  });

  document.getElementById("add-habit-btn").addEventListener("click", () => {
    const name = document.getElementById("habit-name-input").value;
    const icon = document.getElementById("habit-icon-input").value || "🌟";
    if (!addHabit(name, icon)) {
      showToast("Please enter a habit name.", "error");
      return;
    }
    document.getElementById("habit-name-input").value = "";
    document.getElementById("habit-icon-input").value = "";
    renderHabits();
    renderDashboard();
    showToast("Habit added! 🔥");
  });
  document
    .getElementById("habit-name-input")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("add-habit-btn").click();
    });

  // ──────────────────────────────────────────────────────────
  // UTILITY
  // ──────────────────────────────────────────────────────────
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // ──────────────────────────────────────────────────────────
  // INIT
  // ──────────────────────────────────────────────────────────
  const init = () => {
    updateBadge();
    updatePomoStats();
    updateRing();
    updateModeTabs();
    updateSessionDots();
    initRoute();

    // Seed demo data if brand new
    if (!tasks.length && !notes.length && !habits.length) {
      addTask("Review weekly goals", "high", today(), "Work");
      addTask("Read for 30 minutes", "medium", today(), "Personal");
      addTask("Plan tomorrow's schedule", "medium", "", "Work");
      notes.push({
        id: uid(),
        title: "Welcome to Orbit! 🌀",
        content:
          "This is your all-in-one productivity workspace. Add tasks, set up habits, and use the Pomodoro timer to stay focused.",
        tag: "personal",
        color: "teal",
        pinned: true,
        createdAt: today(),
      });
      notes.push({
        id: uid(),
        title: "Ideas for next sprint",
        content:
          "Refactor auth flow\nAdd dark mode toggle\nOptimize database queries",
        tag: "idea",
        color: "violet",
        pinned: false,
        createdAt: today(),
      });
      habits.push({
        id: uid(),
        name: "Morning workout",
        icon: "🏋️",
        checks: {},
        streak: 0,
      });
      habits.push({
        id: uid(),
        name: "Read 20 pages",
        icon: "📚",
        checks: {},
        streak: 0,
      });
      persist();
    }

    // Trigger renders for current view
    renderDashboard();
    renderTasks();
    renderNotes();
    renderHabits();

    // Show name modal only if no name from session or storage
    if (!userName) {
      setTimeout(openNameModal, 500);
    }

    // ── Logout ────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        // Clear session from both stores
        sessionStorage.removeItem('orbit_auth_session');
        localStorage.removeItem('orbit_auth_session');
        window.location.replace('auth.html');
      });
    }
  };

  init();
})();
