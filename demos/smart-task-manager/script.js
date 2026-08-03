/* =====================================================================
   Smart Task Manager — script
   Pure vanilla JS · HTML5 Drag and Drop API · LocalStorage persistence
   Zero dependencies.
   ===================================================================== */
(function () {
  "use strict";

  /* ----------------------- Constants & state ----------------------- */
  const STORAGE_KEY = "smart-task-manager:board:v1";
  const COLUMNS = ["backlog", "in-progress", "review", "done"];

  // Day in milliseconds (used for deadline countdown math)
  const DAY_MS = 24 * 60 * 60 * 1000;

  /** @type {Record<string, Task[]>} column id -> ordered task list */
  let board = { backlog: [], "in-progress": [], review: [], done: [] };

  /** Active filters (search/priority/hide-done) */
  const filters = { search: "", priority: "all", hideDone: false };

  /** Editing state for the modal */
  let editing = { id: null, column: null };

  /** Drag state for HTML5 DnD */
  const drag = { id: null, fromColumn: null };

  /* ----------------------- DOM references ----------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const boardEl = $("#board");
  const searchInput = $("#searchInput");
  const priorityFilter = $("#priorityFilter");
  const hideDoneEl = $("#hideDone");
  const filterStats = $("#filterStats");
  const toastStack = $("#toastStack");

  // Modal elements
  const overlay = $("#modalOverlay");
  const modalTitle = $("#modalTitle");
  const form = $("#taskForm");
  const fTitle = $("#fTitle");
  const fDescription = $("#fDescription");
  const fDeadline = $("#fDeadline");
  const fTags = $("#fTags");
  const fPriority = $("#fPriority");
  const priorityPicker = $("#priorityPicker");

  /* ----------------------- Utility helpers ----------------------- */

  /** Generate a unique-ish id without any dependency. */
  const uid = () =>
    "t_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);

  /** ISO date (YYYY-MM-DD) for today, local time. */
  const todayISO = () => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  };

  /** Return YYYY-MM-DD offset by n days from today. */
  const offsetISO = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  };

  /** Strip tags and collapse whitespace for safe text insertion. */
  const escapeHtml = (str) =>
    String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  /** Find which column a task id lives in. */
  const locateTask = (id) => {
    for (const col of COLUMNS) {
      const idx = board[col].findIndex((t) => t.id === id);
      if (idx !== -1) return { column: col, index: idx };
    }
    return null;
  };

  /** Parse comma-separated tags into a clean array. */
  const parseTags = (raw) =>
    String(raw || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

  /** Human-readable label for a priority value. */
  const PRIORITY_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

  /* ----------------------- Deadline math ----------------------- */
  /**
   * Build a deadline descriptor for a task.
   * Returns { text, className } — text like "Due in 2 days" / "Overdue by 1 day".
   * Done tasks show "Completed". Tasks with no deadline show "No deadline".
   */
  function describeDeadline(task) {
    if (task.column === "done") {
      return { text: "Completed", className: "done" };
    }
    if (!task.deadline) {
      return { text: "No deadline", className: "" };
    }
    // Normalize to midnight local to count whole days accurately.
    const today = new Date(todayISO() + "T00:00:00");
    const due = new Date(task.deadline + "T00:00:00");
    const diffDays = Math.round((due - today) / DAY_MS);

    if (diffDays === 0) return { text: "Due today", className: "due-soon" };
    if (diffDays === 1) return { text: "Due tomorrow", className: "due-soon" };
    if (diffDays > 1) return { text: `Due in ${diffDays} days`, className: diffDays <= 3 ? "due-soon" : "" };

    // Overdue
    const overDays = Math.abs(diffDays);
    return {
      text: overDays === 1 ? "Overdue by 1 day" : `Overdue by ${overDays} days`,
      className: "overdue",
    };
  }

  /* ----------------------- Persistence ----------------------- */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    } catch (err) {
      // Storage may be full or disabled; fail gracefully.
      console.warn("Could not save to LocalStorage:", err);
      toast("Couldn't save changes — storage unavailable", "error");
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Defensive: ensure all columns exist and are arrays.
        const next = {};
        for (const col of COLUMNS) next[col] = Array.isArray(parsed[col]) ? parsed[col] : [];
        return next;
      }
    } catch (err) {
      console.warn("Could not parse saved board, starting fresh:", err);
    }
    return null;
  }

  /* ----------------------- Seed data (first load) ----------------------- */
  function seedData() {
    // ~7 realistic sample tasks spread across columns. Deadlines are relative
    // to today so the countdowns stay meaningful whenever the demo is opened.
    const now = Date.now();
    const mk = (overrides) => Object.assign({
      id: uid(),
      title: "",
      description: "",
      priority: "medium",
      deadline: "",
      tags: [],
      createdAt: now,
      column: "backlog",
    }, overrides);

    return {
      backlog: [
        mk({
          title: "Research multi-factor auth providers",
          description: "Compare Auth0, Clerk, and a self-hosted solution on price, DX, and security posture before next sprint planning.",
          priority: "low",
          deadline: offsetISO(12),
          tags: ["research", "security"],
        }),
        mk({
          title: "Define onboarding email sequence",
          description: "Draft the welcome + activation emails for new signups, including trigger events for each step.",
          priority: "medium",
          deadline: offsetISO(6),
          tags: ["marketing", "copy"],
        }),
      ],
      "in-progress": [
        mk({
          title: "Design login page",
          description: "Dark-themed login screen with social SSO buttons, forgot-password link, and inline validation states.",
          priority: "high",
          deadline: offsetISO(2),
          tags: ["design", "frontend"],
          column: "in-progress",
        }),
        mk({
          title: "Write API docs for /payments",
          description: "Document request/response schemas, error codes, and webhook events for the new payments endpoints.",
          priority: "medium",
          deadline: offsetISO(5),
          tags: ["docs", "api"],
          column: "in-progress",
        }),
      ],
      review: [
        mk({
          title: "Fix payment bug on checkout",
          description: "Race condition between coupon validation and charge creation double-charges some customers. Needs patch + data backfill plan.",
          priority: "critical",
          deadline: offsetISO(-1), // overdue
          tags: ["bug", "payments", "urgent"],
          column: "review",
        }),
        mk({
          title: "Refactor user settings component",
          description: "Break the 600-line monolith into smaller, testable pieces and migrate the form state to the shared reducer.",
          priority: "medium",
          deadline: offsetISO(1),
          tags: ["refactor", "frontend"],
          column: "review",
        }),
      ],
      done: [
        mk({
          title: "Set up CI pipeline",
          description: "GitHub Actions workflow running lint, type-check, and tests on every pull request.",
          priority: "high",
          deadline: offsetISO(-3),
          tags: ["devops", "ci"],
          column: "done",
        }),
      ],
    };
  }

  /* ----------------------- Filtering ----------------------- */
  /** Returns true if a task passes the active filter criteria. */
  function taskMatchesFilters(task) {
    if (filters.hideDone && task.column === "done") return false;
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = [
        task.title,
        task.description,
        (task.tags || []).join(" "),
      ].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }

  /* ----------------------- Rendering ----------------------- */
  function render() {
    let visibleTotal = 0;
    let grandTotal = 0;

    for (const col of COLUMNS) {
      const allTasks = board[col];
      grandTotal += allTasks.length;

      const visible = allTasks.filter(taskMatchesFilters);
      visibleTotal += visible.length;

      const dropzone = $(`[data-dropzone="${col}"]`);
      // Clear current children but keep the dropzone node itself.
      dropzone.innerHTML = "";

      if (visible.length === 0) {
        const ph = document.createElement("div");
        ph.className = "empty-placeholder";
        // Differentiate "no tasks at all" vs "filtered out".
        ph.textContent = allTasks.length === 0 ? "Drop tasks here" : "No matching tasks";
        dropzone.appendChild(ph);
      } else {
        const frag = document.createDocumentFragment();
        for (const task of visible) frag.appendChild(buildCard(task));
        dropzone.appendChild(frag);
      }

      // Update the column count badge — counts ALL tasks (not filtered),
      // so the board's true size is always visible.
      const badge = $(`[data-count-for="${col}"]`);
      if (badge) badge.textContent = String(allTasks.length);
    }

    // Filter summary line.
    if (filters.search || filters.priority !== "all" || filters.hideDone) {
      filterStats.textContent = `Showing ${visibleTotal} of ${grandTotal}`;
    } else {
      filterStats.textContent = `${grandTotal} task${grandTotal === 1 ? "" : "s"} total`;
    }
  }

  /** Build a single task card element. */
  function buildCard(task) {
    const card = document.createElement("article");
    card.className = "card" + (task.column === "done" ? " is-done" : "");
    card.draggable = true;
    card.dataset.id = task.id;
    card.dataset.priority = task.priority;

    // --- Deadline descriptor ---
    const dl = describeDeadline(task);

    // --- Tags chips ---
    const tagsHtml = (task.tags || [])
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join("");

    // --- Created date (compact) ---
    const created = new Date(task.createdAt);
    const createdLabel = created.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    card.innerHTML = `
      <div class="card-top">
        <div class="card-title">${escapeHtml(task.title)}</div>
        <div class="card-actions">
          <button class="icon-btn done" type="button" title="${task.column === "done" ? "Mark as not done" : "Mark as done"}" data-act="toggle-done" aria-label="Toggle done">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="icon-btn edit" type="button" title="Edit task" data-act="edit" aria-label="Edit task">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="icon-btn del" type="button" title="Delete task" data-act="delete" aria-label="Delete task">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      ${task.description ? `<p class="card-desc">${escapeHtml(task.description)}</p>` : ""}
      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ""}
      <div class="card-foot">
        <span class="deadline ${dl.className}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${escapeHtml(dl.text)}
        </span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="card-created">${createdLabel}</span>
          <span class="priority-badge">${PRIORITY_LABEL[task.priority] || task.priority}</span>
        </div>
      </div>
    `;

    attachCardDnD(card);
    return card;
  }

  /* ----------------------- Drag and Drop ----------------------- */
  function attachCardDnD(card) {
    card.addEventListener("dragstart", (e) => {
      drag.id = card.dataset.id;
      drag.fromColumn = locateTask(drag.id)?.column || null;
      card.classList.add("is-dragging");
      // Some browsers need data set on the DataTransfer to allow dragging.
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", drag.id);
      }
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("is-dragging");
      // Clean up any lingering drag-over states on all columns.
      $$(".column").forEach((c) => c.classList.remove("is-drag-over"));
      drag.id = null;
      drag.fromColumn = null;
    });
  }

  /** Wire up each column's dropzone for dragover/drop. */
  function bindDropzones() {
    $$(".column").forEach((col) => {
      const columnName = col.dataset.column;

      col.addEventListener("dragover", (e) => {
        e.preventDefault(); // required to allow a drop
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        col.classList.add("is-drag-over");
      });

      col.addEventListener("dragleave", (e) => {
        // Only remove when leaving the column itself (not a child boundary flicker).
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove("is-drag-over");
        }
      });

      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.classList.remove("is-drag-over");

        const id = drag.id || e.dataTransfer?.getData("text/plain");
        if (!id) return;

        const located = locateTask(id);
        if (!located) return;

        const task = board[located.column][located.index];

        // Determine insertion index based on pointer position relative to cards.
        const dropzone = $(`[data-dropzone="${columnName}"]`);
        const cards = $$(".card:not(.is-dragging)", dropzone);
        let insertIndex = cards.length; // default: end of column

        for (let i = 0; i < cards.length; i++) {
          const rect = cards[i].getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          if (e.clientY < midpoint) {
            insertIndex = i;
            break;
          }
        }

        // Remove from old column.
        board[located.column].splice(located.index, 1);

        // If moving within the same column and the insertion index is past the
        // removed item, decrement to account for the removal.
        if (located.column === columnName && insertIndex > located.index) {
          insertIndex -= 1;
        }

        task.column = columnName;
        board[columnName].splice(insertIndex, 0, task);

        save();
        render();

        // Subtle drop animation on the moved card.
        const moved = $(`.card[data-id="${id}"]`);
        if (moved) {
          moved.classList.add("drop-pulse");
          moved.addEventListener("animationend", () => moved.classList.remove("drop-pulse"), { once: true });
        }
      });
    });
  }

  /* ----------------------- Card action delegation ----------------------- */
  boardEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const card = btn.closest(".card");
    if (!card) return;
    const id = card.dataset.id;
    const act = btn.dataset.act;

    if (act === "toggle-done") return toggleDone(id);
    if (act === "edit") return openModalForEdit(id);
    if (act === "delete") return deleteTask(id);
  });

  function toggleDone(id) {
    const located = locateTask(id);
    if (!located) return;
    const task = board[located.column][located.index];
    if (located.column === "done") {
      // Move back to "in-progress" when un-marking done.
      board.done.splice(located.index, 1);
      task.column = "in-progress";
      board["in-progress"].unshift(task);
      toast(`Restored "${task.title}" to In Progress`, "info");
    } else {
      board[located.column].splice(located.index, 1);
      task.column = "done";
      board.done.unshift(task);
      toast(`Completed "${task.title}"`, "success");
    }
    save();
    render();
  }

  function deleteTask(id) {
    const located = locateTask(id);
    if (!located) return;
    const task = board[located.column][located.index];
    const ok = window.confirm(`Delete "${task.title}"? This cannot be undone.`);
    if (!ok) return;
    board[located.column].splice(located.index, 1);
    save();
    render();
    toast(`Deleted "${task.title}"`, "info");
  }

  /* ----------------------- Modal (add / edit) ----------------------- */
  function openModalForNew() {
    editing = { id: null, column: null };
    modalTitle.textContent = "New Task";
    form.reset();
    setPriority("medium");
    fDeadline.value = offsetISO(3); // sensible default: due in 3 days
    showModal();
    setTimeout(() => fTitle.focus(), 60);
  }

  function openModalForEdit(id) {
    const located = locateTask(id);
    if (!located) return;
    const task = board[located.column][located.index];
    editing = { id: task.id, column: located.column };

    modalTitle.textContent = "Edit Task";
    fTitle.value = task.title;
    fDescription.value = task.description || "";
    fDeadline.value = task.deadline || "";
    fTags.value = (task.tags || []).join(", ");
    setPriority(task.priority);
    showModal();
    setTimeout(() => fTitle.focus(), 60);
  }

  function showModal() { overlay.hidden = false; }
  function hideModal() {
    overlay.hidden = true;
    editing = { id: null, column: null };
  }

  function setPriority(value) {
    fPriority.value = value;
    $$(".priority-chip", priorityPicker).forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.priority === value);
    });
  }

  // Priority chip selection
  priorityPicker.addEventListener("click", (e) => {
    const chip = e.target.closest(".priority-chip");
    if (!chip) return;
    setPriority(chip.dataset.priority);
  });

  // Modal close interactions
  $("#modalClose").addEventListener("click", hideModal);
  $("#modalCancel").addEventListener("click", hideModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) hideModal();
  });

  // Submit (create or update)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = fTitle.value.trim();
    if (!title) {
      fTitle.focus();
      toast("Title is required", "error");
      return;
    }

    const payload = {
      title,
      description: fDescription.value.trim(),
      priority: fPriority.value,
      deadline: fDeadline.value,
      tags: parseTags(fTags.value),
    };

    if (editing.id) {
      // Update existing task, preserving createdAt + column.
      const located = locateTask(editing.id);
      if (located) {
        const task = board[located.column][located.index];
        Object.assign(task, payload);
        toast(`Updated "${task.title}"`, "success");
      }
    } else {
      // Create new task in Backlog by default.
      const task = Object.assign({
        id: uid(),
        createdAt: Date.now(),
        column: "backlog",
      }, payload);
      board.backlog.unshift(task);
      toast(`Added "${task.title}" to Backlog`, "success");
    }

    save();
    hideModal();
    render();
  });

  /* ----------------------- Header buttons ----------------------- */
  $("#btnNewTask").addEventListener("click", openModalForNew);

  // Export board to a downloadable JSON file.
  $("#btnExport").addEventListener("click", () => {
    const data = JSON.stringify({ exportedAt: new Date().toISOString(), board }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smart-task-manager-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Release the object URL promptly.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast("Board exported to JSON", "success");
  });

  // Import board from a JSON file.
  const importInput = $("#importFile");
  $("#btnImport").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const source = parsed.board && typeof parsed.board === "object" ? parsed.board : parsed;
        const next = {};
        for (const col of COLUMNS) {
          const list = Array.isArray(source[col]) ? source[col] : [];
          // Sanitize imported tasks so a malformed file can't break rendering.
          next[col] = list.map(cleanTask).filter(Boolean);
        }
        const total = COLUMNS.reduce((n, c) => n + next[c].length, 0);
        if (total === 0) {
          toast("Imported file contained no tasks", "error");
          return;
        }
        board = next;
        save();
        render();
        toast(`Imported ${total} task${total === 1 ? "" : "s"}`, "success");
      } catch (err) {
        console.warn("Import failed:", err);
        toast("Could not read JSON file", "error");
      } finally {
        // Reset so the same file can be re-selected later.
        importInput.value = "";
      }
    };
    reader.onerror = () => {
      toast("Could not read JSON file", "error");
      importInput.value = "";
    };
    reader.readAsText(file);
  });

  /** Coerce an arbitrary imported object into a valid task shape. */
  function cleanTask(raw) {
    if (!raw || typeof raw !== "object") return null;
    const priority = ["critical", "high", "medium", "low"].includes(raw.priority) ? raw.priority : "medium";
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
      title: String(raw.title || "Untitled task").slice(0, 200),
      description: typeof raw.description === "string" ? raw.description : "",
      priority,
      deadline: typeof raw.deadline === "string" ? raw.deadline : "",
      tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).toLowerCase()).filter(Boolean) : [],
      createdAt: Number(raw.createdAt) || Date.now(),
    };
  }

  /* ----------------------- Filters wiring ----------------------- */
  searchInput.addEventListener("input", () => {
    filters.search = searchInput.value.trim();
    render();
  });
  priorityFilter.addEventListener("change", () => {
    filters.priority = priorityFilter.value;
    render();
  });
  hideDoneEl.addEventListener("change", () => {
    filters.hideDone = hideDoneEl.checked;
    render();
  });

  /* ----------------------- Toasts ----------------------- */
  function toast(message, type = "info") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-dot"></span><span>${escapeHtml(message)}</span>`;
    toastStack.appendChild(el);
    setTimeout(() => {
      el.classList.add("is-leaving");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 2600);
  }

  /* ----------------------- Init ----------------------- */
  function init() {
    const saved = load();
    if (saved) {
      board = saved;
    } else {
      board = seedData();
      // Persist the seed immediately so a reload (even with no edits) restores
      // the exact board state, per the persistence requirement.
      save();
    }

    // Ensure every task carries its own column reference (used by render).
    for (const col of COLUMNS) {
      for (const task of board[col]) task.column = col;
    }

    bindDropzones();
    render();

    // First-run hint.
    if (!saved) {
      setTimeout(() => toast("Loaded sample tasks — start dragging!", "info"), 400);
    }
  }

  // Run after DOM is ready (script is loaded at end of body, so it is).
  init();
})();
