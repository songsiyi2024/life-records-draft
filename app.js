(() => {
  "use strict";

  const STORAGE_KEY = "riji-life-records-v1";
  const state = {
    records: [],
    query: "",
  };

  const elements = {
    todayLabel: document.querySelector("#todayLabel"),
    openComposerButton: document.querySelector("#openComposerButton"),
    emptyComposerButton: document.querySelector("#emptyComposerButton"),
    recordsList: document.querySelector("#recordsList"),
    emptyState: document.querySelector("#emptyState"),
    emptyDate: document.querySelector("#emptyDate"),
    searchEmptyState: document.querySelector("#searchEmptyState"),
    searchInput: document.querySelector("#searchInput"),
    backupButton: document.querySelector("#backupButton"),
    backupPanel: document.querySelector("#backupPanel"),
    exportButton: document.querySelector("#exportButton"),
    importButton: document.querySelector("#importButton"),
    importInput: document.querySelector("#importInput"),
    composerDialog: document.querySelector("#composerDialog"),
    composerTitle: document.querySelector("#composerTitle"),
    closeComposerButton: document.querySelector("#closeComposerButton"),
    cancelButton: document.querySelector("#cancelButton"),
    recordForm: document.querySelector("#recordForm"),
    recordId: document.querySelector("#recordId"),
    recordDate: document.querySelector("#recordDate"),
    recordDescription: document.querySelector("#recordDescription"),
    characterCount: document.querySelector("#characterCount"),
    deleteButton: document.querySelector("#deleteButton"),
    toast: document.querySelector("#toast"),
  };

  const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
  });

  const longDateFormatter = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseLocalDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function loadRecords() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      state.records = Array.isArray(saved)
        ? saved.filter(isValidRecord).map(normalizeRecord)
        : [];
    } catch {
      state.records = [];
      showToast("未能读取旧记录，已打开空白页面");
    }
  }

  function saveRecords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
      return true;
    } catch {
      showToast("浏览器未允许本地保存，请及时导出备份");
      return false;
    }
  }

  function isValidRecord(record) {
    return (
      record &&
      typeof record.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(record.date) &&
      typeof record.description === "string"
    );
  }

  function normalizeRecord(record) {
    return {
      id: String(record.id || createId()),
      date: record.date,
      description: record.description.trim(),
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
    };
  }

  function createId() {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getFilteredRecords() {
    const query = state.query.trim().toLocaleLowerCase("zh-CN");
    return [...state.records]
      .filter((record) => {
        if (!query) return true;
        return (
          record.description.toLocaleLowerCase("zh-CN").includes(query) ||
          record.date.includes(query)
        );
      })
      .sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        if (byDate !== 0) return byDate;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }

  function groupByMonth(records) {
    return records.reduce((groups, record) => {
      const monthKey = record.date.slice(0, 7);
      if (!groups.has(monthKey)) groups.set(monthKey, []);
      groups.get(monthKey).push(record);
      return groups;
    }, new Map());
  }

  function renderRecords() {
    const filteredRecords = getFilteredRecords();
    const hasRecords = state.records.length > 0;
    const hasResults = filteredRecords.length > 0;

    elements.emptyState.hidden = hasRecords;
    elements.searchEmptyState.hidden = !hasRecords || hasResults;
    elements.recordsList.hidden = !hasResults;

    if (!hasResults) {
      elements.recordsList.innerHTML = "";
      return;
    }

    const groups = groupByMonth(filteredRecords);
    elements.recordsList.innerHTML = [...groups.entries()]
      .map(([monthKey, records]) => renderMonth(monthKey, records))
      .join("");

    elements.recordsList
      .querySelectorAll("[data-edit-id]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          openComposer(button.dataset.editId),
        ),
      );
  }

  function renderMonth(monthKey, records) {
    const [year, month] = monthKey.split("-");
    const monthNumber = Number(month);
    return `
      <section class="month-group" aria-label="${year}年${monthNumber}月">
        <div class="month-label">
          <strong>${monthNumber}月</strong>
          <span>${year} · ${String(records.length).padStart(2, "0")} 条</span>
        </div>
        <div class="month-records">
          ${records.map(renderRecord).join("")}
        </div>
      </section>
    `;
  }

  function renderRecord(record) {
    const date = parseLocalDate(record.date);
    const day = String(date.getDate()).padStart(2, "0");
    const weekday = weekdayFormatter.format(date).replace("星期", "周");
    return `
      <article class="record-card">
        <time class="record-date" datetime="${record.date}">
          <strong>${day}</strong>
          <span>${weekday}</span>
        </time>
        <div class="record-description">${escapeHtml(record.description)}</div>
        <button class="edit-button" type="button" data-edit-id="${escapeHtml(record.id)}">
          编辑
        </button>
      </article>
    `;
  }

  function openComposer(recordId = "") {
    const record = state.records.find((item) => item.id === recordId);
    elements.recordForm.reset();
    elements.recordId.value = record?.id || "";
    elements.recordDate.value = record?.date || localDateString();
    elements.recordDescription.value = record?.description || "";
    elements.composerTitle.textContent = record ? "编辑这条记录" : "写一条记录";
    elements.deleteButton.hidden = !record;
    updateCharacterCount();
    elements.composerDialog.showModal();
    window.setTimeout(() => elements.recordDescription.focus(), 60);
  }

  function closeComposer() {
    elements.composerDialog.close();
  }

  function submitRecord(event) {
    event.preventDefault();
    const id = elements.recordId.value;
    const date = elements.recordDate.value;
    const description = elements.recordDescription.value.trim();

    if (!date || !description) return;

    const existingIndex = state.records.findIndex((record) => record.id === id);
    if (existingIndex >= 0) {
      state.records[existingIndex] = {
        ...state.records[existingIndex],
        date,
        description,
        updatedAt: new Date().toISOString(),
      };
      showToast("记录已更新");
    } else {
      state.records.push({
        id: createId(),
        date,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      showToast("今天被好好记下了");
    }

    saveRecords();
    closeComposer();
    renderRecords();
  }

  function deleteCurrentRecord() {
    const id = elements.recordId.value;
    const record = state.records.find((item) => item.id === id);
    if (!record) return;

    const confirmed = window.confirm(
      `确定删除 ${record.date} 的这条记录吗？此操作无法撤销。`,
    );
    if (!confirmed) return;

    state.records = state.records.filter((item) => item.id !== id);
    saveRecords();
    closeComposer();
    renderRecords();
    showToast("记录已删除");
  }

  function updateCharacterCount() {
    elements.characterCount.textContent = String(
      elements.recordDescription.value.length,
    );
  }

  function toggleBackupPanel() {
    const shouldOpen = elements.backupPanel.hidden;
    elements.backupPanel.hidden = !shouldOpen;
    elements.backupButton.setAttribute("aria-expanded", String(shouldOpen));
  }

  function exportRecords() {
    const payload = {
      app: "日迹",
      version: 1,
      exportedAt: new Date().toISOString(),
      records: state.records,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `日迹备份-${localDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("备份已导出");
  }

  function importRecords(event) {
    const [file] = event.target.files;
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const payload = JSON.parse(String(reader.result));
        const importedRecords = Array.isArray(payload)
          ? payload
          : payload.records;
        if (!Array.isArray(importedRecords)) throw new Error("Invalid backup");

        const normalized = importedRecords
          .filter(isValidRecord)
          .map(normalizeRecord);
        const confirmed = window.confirm(
          `备份中有 ${normalized.length} 条记录。导入后会替换当前的 ${state.records.length} 条记录，是否继续？`,
        );
        if (!confirmed) return;

        state.records = normalized;
        saveRecords();
        renderRecords();
        showToast("备份已恢复");
      } catch {
        showToast("这个文件不是有效的日迹备份");
      } finally {
        elements.importInput.value = "";
      }
    });
    reader.readAsText(file);
  }

  let toastTimer;
  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("visible");
    }, 2400);
  }

  function initialize() {
    const today = new Date();
    elements.todayLabel.textContent = longDateFormatter.format(today);
    elements.emptyDate.textContent = String(today.getDate()).padStart(2, "0");
    elements.recordDate.max = "9999-12-31";

    loadRecords();
    renderRecords();

    elements.openComposerButton.addEventListener("click", () => openComposer());
    elements.emptyComposerButton.addEventListener("click", () => openComposer());
    elements.closeComposerButton.addEventListener("click", closeComposer);
    elements.cancelButton.addEventListener("click", closeComposer);
    elements.recordForm.addEventListener("submit", submitRecord);
    elements.deleteButton.addEventListener("click", deleteCurrentRecord);
    elements.recordDescription.addEventListener("input", updateCharacterCount);
    elements.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderRecords();
    });
    elements.backupButton.addEventListener("click", toggleBackupPanel);
    elements.exportButton.addEventListener("click", exportRecords);
    elements.importButton.addEventListener("click", () =>
      elements.importInput.click(),
    );
    elements.importInput.addEventListener("change", importRecords);

    elements.composerDialog.addEventListener("click", (event) => {
      if (event.target === elements.composerDialog) closeComposer();
    });
  }

  initialize();
})();
