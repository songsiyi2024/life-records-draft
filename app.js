(() => {
  "use strict";

  const records = Array.isArray(window.RIJI_RECORDS)
    ? window.RIJI_RECORDS.filter(
        (record) =>
          record &&
          /^\d{4}-\d{2}-\d{2}$/.test(record.date || "") &&
          typeof record.description === "string" &&
          record.description.trim(),
      )
    : [];

  const elements = {
    todayLabel: document.querySelector("#todayLabel"),
    recordsList: document.querySelector("#recordsList"),
    emptyState: document.querySelector("#emptyState"),
    emptyDate: document.querySelector("#emptyDate"),
    searchEmptyState: document.querySelector("#searchEmptyState"),
    searchInput: document.querySelector("#searchInput"),
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

  function parseLocalDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
      </article>
    `;
  }

  function renderMonth(monthKey, monthRecords) {
    const [year, month] = monthKey.split("-");
    return `
      <section class="month-group" aria-label="${year}年${Number(month)}月">
        <div class="month-label">
          <strong>${Number(month)}月</strong>
          <span>${year} · ${String(monthRecords.length).padStart(2, "0")} 条</span>
        </div>
        <div class="month-records">
          ${monthRecords.map(renderRecord).join("")}
        </div>
      </section>
    `;
  }

  function renderRecords() {
    const query = elements.searchInput.value.trim().toLocaleLowerCase("zh-CN");
    const filtered = [...records]
      .filter(
        (record) =>
          !query ||
          record.date.includes(query) ||
          record.description.toLocaleLowerCase("zh-CN").includes(query),
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    elements.emptyState.hidden = records.length > 0;
    elements.searchEmptyState.hidden =
      records.length === 0 || filtered.length > 0;
    elements.recordsList.hidden = filtered.length === 0;

    const groups = filtered.reduce((result, record) => {
      const month = record.date.slice(0, 7);
      if (!result.has(month)) result.set(month, []);
      result.get(month).push(record);
      return result;
    }, new Map());

    elements.recordsList.innerHTML = [...groups.entries()]
      .map(([month, monthRecords]) => renderMonth(month, monthRecords))
      .join("");
  }

  function initialize() {
    const today = new Date();
    elements.todayLabel.textContent = longDateFormatter.format(today);
    elements.emptyDate.textContent = String(today.getDate()).padStart(2, "0");
    elements.searchInput.addEventListener("input", renderRecords);
    renderRecords();
  }

  initialize();
})();
