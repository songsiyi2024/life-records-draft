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
    dateFrom: document.querySelector("#dateFrom"),
    dateTo: document.querySelector("#dateTo"),
    clearDateRange: document.querySelector("#clearDateRange"),
    collapseAll: document.querySelector("#collapseAll"),
    statsPanel: document.querySelector("#statsPanel"),
    monthNav: document.querySelector("#monthNav"),
  };

  const state = {
    collapsedMonths: new Set(
      JSON.parse(localStorage.getItem("riji_collapsed") || "[]")
    ),
    allCollapsed: false,
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

  function saveCollapseState() {
    localStorage.setItem(
      "riji_collapsed",
      JSON.stringify([...state.collapsedMonths])
    );
  }

  function toggleMonth(monthKey) {
    if (state.collapsedMonths.has(monthKey)) {
      state.collapsedMonths.delete(monthKey);
    } else {
      state.collapsedMonths.add(monthKey);
    }
    saveCollapseState();
    renderRecords();
  }

  function toggleAllMonths() {
    state.allCollapsed = !state.allCollapsed;
    const monthElements = document.querySelectorAll("[data-month]");
    if (state.allCollapsed) {
      monthElements.forEach((el) =>
        state.collapsedMonths.add(el.dataset.month)
      );
      elements.collapseAll.textContent = "全部展开";
    } else {
      state.collapsedMonths.clear();
      elements.collapseAll.textContent = "全部折叠";
    }
    saveCollapseState();
    renderRecords();
  }

  function renderRecord(record) {
    const date = parseLocalDate(record.date);
    const day = String(date.getDate()).padStart(2, "0");
    const weekday = weekdayFormatter.format(date).replace("星期", "周");

    const paragraphs = record.description
      .split("\n")
      .map((para) => para.trim())
      .filter((para) => para.length > 0)
      .map((para) => `<p>${escapeHtml(para)}</p>`)
      .join("");

    return `
      <article class="record-card">
        <time class="record-date" datetime="${record.date}">
          <strong>${day}</strong>
          <span>${weekday}</span>
        </time>
        <div class="record-description">${paragraphs}</div>
      </article>
    `;
  }

  function renderMonth(monthKey, monthRecords) {
    const [year, month] = monthKey.split("-");
    const isCollapsed = state.collapsedMonths.has(monthKey);
    return `
      <section class="month-group ${isCollapsed ? "collapsed" : ""}"
               aria-label="${year}年${Number(month)}月"
               data-month="${monthKey}">
        <div class="month-label" role="button" tabindex="0" aria-expanded="${!isCollapsed}">
          <strong>${Number(month)}月</strong>
          <span>${year} · ${String(monthRecords.length).padStart(2, "0")} 条</span>
        </div>
        <div class="month-records">
          ${monthRecords.map(renderRecord).join("")}
        </div>
      </section>
    `;
  }

  function renderStats(filtered) {
    if (filtered.length === 0) return "";

    const monthCounts = filtered.reduce((acc, r) => {
      const month = r.date.slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const latest = filtered[0];
    const oldest = filtered[filtered.length - 1];

    return `
      <div class="stats-grid">
        <div class="stat-item">
          <strong>${filtered.length}</strong>
          <span>条记录</span>
        </div>
        <div class="stat-item">
          <strong>${Object.keys(monthCounts).length}</strong>
          <span>个月份</span>
        </div>
        <div class="stat-item">
          <strong>${latest.date}</strong>
          <span>最新记录</span>
        </div>
        <div class="stat-item">
          <strong>${oldest.date}</strong>
          <span>最早记录</span>
        </div>
      </div>
    `;
  }

  function renderMonthNav(groups) {
    if (groups.size === 0) return;

    const navItems = [...groups.keys()]
      .map((monthKey) => {
        const [year, month] = monthKey.split("-");
        return `<a href="#month-${monthKey}" class="month-nav-item">${year}年${Number(month)}月</a>`;
      })
      .join("");

    elements.monthNav.innerHTML = navItems;
  }

  function renderRecords() {
    const query = elements.searchInput.value.trim().toLocaleLowerCase("zh-CN");
    const dateFrom = elements.dateFrom.value;
    const dateTo = elements.dateTo.value;

    const filtered = [...records]
      .filter((record) => {
        if (query && !record.date.includes(query) &&
            !record.description.toLocaleLowerCase("zh-CN").includes(query)) {
          return false;
        }
        if (dateFrom && record.date < dateFrom) return false;
        if (dateTo && record.date > dateTo) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    elements.emptyState.hidden = records.length > 0;
    elements.searchEmptyState.hidden =
      records.length === 0 || filtered.length > 0;
    elements.recordsList.hidden = filtered.length === 0;

    elements.statsPanel.innerHTML = renderStats(filtered);
    elements.statsPanel.hidden = filtered.length === 0;

    const groups = filtered.reduce((result, record) => {
      const month = record.date.slice(0, 7);
      if (!result.has(month)) result.set(month, []);
      result.get(month).push(record);
      return result;
    }, new Map());

    elements.recordsList.innerHTML = [...groups.entries()]
      .map(([month, monthRecords]) => renderMonth(month, monthRecords))
      .join("");

    renderMonthNav(groups);

    document.querySelectorAll(".month-label").forEach((label) => {
      label.addEventListener("click", (e) => {
        const monthKey = e.currentTarget.closest("[data-month]").dataset.month;
        toggleMonth(monthKey);
      });
      label.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const monthKey = e.currentTarget.closest("[data-month]").dataset.month;
          toggleMonth(monthKey);
        }
      });
    });

    [...groups.keys()].forEach((monthKey) => {
      const section = document.querySelector(`[data-month="${monthKey}"]`);
      if (section) {
        section.id = `month-${monthKey}`;
      }
    });
  }

  function initialize() {
    const today = new Date();
    elements.todayLabel.textContent = longDateFormatter.format(today);
    elements.emptyDate.textContent = String(today.getDate()).padStart(2, "0");

    elements.searchInput.addEventListener("input", renderRecords);
    elements.dateFrom.addEventListener("change", renderRecords);
    elements.dateTo.addEventListener("change", renderRecords);

    elements.clearDateRange.addEventListener("click", () => {
      elements.dateFrom.value = "";
      elements.dateTo.value = "";
      renderRecords();
    });

    elements.collapseAll.addEventListener("click", toggleAllMonths);

    renderRecords();
  }

  initialize();
})();




