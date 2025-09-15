// Error Center JavaScript
class ErrorCenter {
  constructor() {
    this.currentPeriod = 3;
    this.currentCategory = "all";
    this.currentSearch = "";
    this.allErrors = [];
    this.filteredErrors = [];
    this.errorsByCategory = {};

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadErrorData();
  }

  bindEvents() {
    // Period selector
    const periodSelect = document.getElementById("error-period-select");
    if (periodSelect) {
      periodSelect.addEventListener("change", (e) => {
        this.currentPeriod = parseInt(e.target.value);
        this.loadErrorData();
      });
    }

    // Category filter
    const categoryFilter = document.getElementById("error-category-filter");
    if (categoryFilter) {
      categoryFilter.addEventListener("change", (e) => {
        this.currentCategory = e.target.value;
        this.applyFilters();
      });
    }

    // Search input
    const searchInput = document.getElementById("error-search-input");
    if (searchInput) {
      searchInput.addEventListener(
        "input",
        this.debounce((e) => {
          this.currentSearch = e.target.value.toLowerCase().trim();
          this.applyFilters();
        }, 300)
      );
    }

    // Clear search
    const clearSearchBtn = document.getElementById("clear-error-search-btn");
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", () => {
        document.getElementById("error-search-input").value = "";
        this.currentSearch = "";
        this.applyFilters();
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById("refresh-errors-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.loadErrorData();
      });
    }

    // Export button
    const exportBtn = document.getElementById("export-errors-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.exportErrors();
      });
    }

    // Retry button
    const retryBtn = document.getElementById("retry-load-errors-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        this.loadErrorData();
      });
    }

    // Try different period button
    const tryPeriodBtn = document.getElementById("try-different-period-btn");
    if (tryPeriodBtn) {
      tryPeriodBtn.addEventListener("click", () => {
        document.getElementById("error-period-select").value = "7";
        this.currentPeriod = 7;
        this.loadErrorData();
      });
    }

    // Event delegation for dynamically created buttons
    document.addEventListener("click", (e) => {
      // Toggle category buttons
      if (e.target.closest(".toggle-category-btn")) {
        e.preventDefault();
        const button = e.target.closest(".toggle-category-btn");
        const category = button.dataset.category;
        this.toggleCategory(category);
      }

      // Toggle error description buttons
      if (e.target.closest(".toggle-error-desc-btn")) {
        e.preventDefault();
        const button = e.target.closest(".toggle-error-desc-btn");
        const taskId = button.dataset.taskId;
        this.toggleErrorDescription(taskId);
      }

      // Toggle error detail buttons
      if (e.target.closest(".toggle-error-detail-btn")) {
        e.preventDefault();
        const button = e.target.closest(".toggle-error-detail-btn");
        const taskId = button.dataset.taskId;
        this.toggleErrorDetail(taskId);
      }

      // Show error detail buttons
      if (e.target.closest(".show-error-detail-btn")) {
        e.preventDefault();
        const button = e.target.closest(".show-error-detail-btn");
        const taskId = button.dataset.taskId;
        this.showErrorDetail(taskId);
      }

      // Task and job links
      if (e.target.closest(".task-link")) {
        e.preventDefault();
        const link = e.target.closest(".task-link");
        const taskId = link.dataset.taskId;
        window.navigateToTaskDetail(taskId);
      }

      if (e.target.closest(".job-link")) {
        e.preventDefault();
        const link = e.target.closest(".job-link");
        const jobId = link.dataset.jobId;
        window.navigateToJobDetail(jobId);
      }
    });
  }

  async loadErrorData() {
    this.showLoadingState();

    try {
      console.log(`Loading error data for period: ${this.currentPeriod} days`);

      const response = await fetch("/api/jobs/errors/recent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Period: this.currentPeriod,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Error data received:", data);

      this.allErrors = data.data || [];
      this.processErrorData();
      this.populateCategoryFilter();
      this.applyFilters();
      this.showDataState();
    } catch (error) {
      console.error("Error loading error data:", error);
      this.showErrorState();
    }
  }

  processErrorData() {
    // Group errors by category
    this.errorsByCategory = {};

    this.allErrors.forEach((error) => {
      const category = error.ErrorCategory || "General Error";

      if (!this.errorsByCategory[category]) {
        this.errorsByCategory[category] = {
          count: 0,
          errors: [],
          latestDate: null,
        };
      }

      this.errorsByCategory[category].count++;
      this.errorsByCategory[category].errors.push(error);

      const errorDate = new Date(error.CreatedDate);
      if (
        !this.errorsByCategory[category].latestDate ||
        errorDate > this.errorsByCategory[category].latestDate
      ) {
        this.errorsByCategory[category].latestDate = errorDate;
      }
    });

    // Sort categories by count (descending)
    this.errorsByCategory = Object.entries(this.errorsByCategory)
      .sort(([, a], [, b]) => b.count - a.count)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  }

  populateCategoryFilter() {
    const categoryFilter = document.getElementById("error-category-filter");
    if (!categoryFilter) return;

    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';

    // Add categories
    Object.keys(this.errorsByCategory).forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = `${category} (${this.errorsByCategory[category].count})`;
      categoryFilter.appendChild(option);
    });
  }

  applyFilters() {
    let filtered = [...this.allErrors];

    // Apply category filter
    if (this.currentCategory !== "all") {
      filtered = filtered.filter(
        (error) =>
          (error.ErrorCategory || "General Error") === this.currentCategory
      );
    }

    // Apply search filter
    if (this.currentSearch) {
      filtered = filtered.filter((error) => {
        const searchFields = [
          error.TaskID || "",
          error.TestJobID || "",
          error.ErrorDescription || "",
          error.ErrorDetail || "",
          error.ErrorCategory || "",
        ];

        return searchFields.some((field) =>
          field.toLowerCase().includes(this.currentSearch)
        );
      });
    }

    this.filteredErrors = filtered;
    this.updateSummary();
    this.renderErrorCategories();
    this.updateFilteredCount();
  }

  updateSummary() {
    const totalCount = document.getElementById("total-errors-count");
    const categoriesCount = document.getElementById("total-categories-count");
    const mostRecent = document.getElementById("most-recent-error");
    const topCategory = document.getElementById("top-error-category");

    if (totalCount) totalCount.textContent = this.filteredErrors.length;
    if (categoriesCount)
      categoriesCount.textContent = Object.keys(this.errorsByCategory).length;

    // Find most recent error
    if (this.filteredErrors.length > 0) {
      const mostRecentError = this.filteredErrors.reduce((latest, error) => {
        const errorDate = new Date(error.CreatedDate);
        const latestDate = new Date(latest.CreatedDate);
        return errorDate > latestDate ? error : latest;
      });

      if (mostRecent) {
        mostRecent.textContent = formatDateTime(mostRecentError.CreatedDate);
      }
    } else {
      if (mostRecent) mostRecent.textContent = "No errors";
    }

    // Top category
    const categories = Object.entries(this.errorsByCategory);
    if (categories.length > 0 && topCategory) {
      const [categoryName, categoryData] = categories[0];
      topCategory.textContent = `${categoryName} (${categoryData.count})`;
    } else if (topCategory) {
      topCategory.textContent = "No errors";
    }
  }

  renderErrorCategories() {
    const container = document.getElementById("error-categories-list");
    if (!container) return;

    if (this.filteredErrors.length === 0) {
      container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-search text-muted" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">No errors found matching current filters.</p>
                </div>
            `;
      return;
    }

    // Group filtered errors by category
    const filteredByCategory = {};
    this.filteredErrors.forEach((error) => {
      const category = error.ErrorCategory || "General Error";
      if (!filteredByCategory[category]) {
        filteredByCategory[category] = [];
      }
      filteredByCategory[category].push(error);
    });

    // Sort categories by count
    const sortedCategories = Object.entries(filteredByCategory).sort(
      ([, a], [, b]) => b.length - a.length
    );

    let html = "";

    sortedCategories.forEach(([category, errors]) => {
      const categoryClass = this.getCategoryClass(category);
      const percentage = (
        (errors.length / this.filteredErrors.length) *
        100
      ).toFixed(1);

      html += `
                <div class="error-category-card mb-4">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center ${categoryClass}">
                            <h5 class="mb-0">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                ${category}
                            </h5>
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge bg-light text-dark">${
                                  errors.length
                                } error${errors.length !== 1 ? "s" : ""}</span>
                                <span class="badge bg-primary">${percentage}%</span>                                <button class="btn btn-sm btn-outline-secondary toggle-category-btn" data-category="${category}">
                                    <i class="bi bi-chevron-down" id="chevron-${category}"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-body collapse" id="category-${category}">
                            <div class="row">
                                ${this.renderErrorItems(errors)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
    });

    container.innerHTML = html;
  }

  renderErrorItems(errors) {
    return errors
      .map(
        (error) => `
            <div class="col-12 mb-3">
                <div class="error-item p-3 border rounded">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <strong>Task ID:</strong><br>
                            <a href="#" class="task-link" data-task-id="${
                              error.TaskID
                            }">${error.TaskID}</a>
                        </div>
                        <div class="col-md-2">
                            <strong>Job ID:</strong><br>
                            <a href="#" class="job-link" data-job-id="${
                              error.TestJobID
                            }">${error.TestJobID}</a>
                        </div>
                        <div class="col-md-2">
                            <strong>Date:</strong><br>
                            <small>${formatDateTime(error.CreatedDate)}</small>
                        </div>                        <div class="col-md-3">
                            <strong>Description:</strong><br>
                            <div class="error-description">
                                <span class="error-description-short text-muted" id="desc-short-${
                                  error.TaskID
                                }">
                                    ${this.truncateText(
                                      error.ErrorDescription ||
                                        "No description",
                                      50
                                    )}
                                </span>
                                <span class="error-description-full text-muted" id="desc-full-${
                                  error.TaskID
                                }" style="display: none;">
                                    ${this.cleanText(
                                      error.ErrorDescription || "No description"
                                    )}
                                </span>
                                ${
                                  (error.ErrorDescription || "").length > 50
                                    ? `<button class="btn btn-link btn-sm p-0 text-decoration-none toggle-error-desc-btn" data-task-id="${error.TaskID}">
                                        <span id="toggle-btn-${error.TaskID}">
                                            <i class="bi bi-chevron-down me-1"></i>Show Details
                                        </span>
                                    </button>`
                                    : ""
                                }
                            </div>
                        </div>
                        <div class="col-md-2">
                            <strong>Error Detail:</strong><br>
                            <div class="error-detail">
                                <span class="error-detail-short text-muted" id="detail-short-${
                                  error.TaskID
                                }">
                                    ${this.truncateText(
                                      error.ErrorDetail || "No details",
                                      50
                                    )}
                                </span>
                                <span class="error-detail-full text-muted" id="detail-full-${
                                  error.TaskID
                                }" style="display: none;">
                                    ${this.cleanText(
                                      error.ErrorDetail || "No details"
                                    )}
                                </span>
                                ${
                                  (error.ErrorDetail || "").length > 50
                                    ? `<button class="btn btn-link btn-sm p-0 text-decoration-none toggle-error-detail-btn" data-task-id="${error.TaskID}">
                                        <span id="toggle-detail-btn-${error.TaskID}">
                                            <i class="bi bi-chevron-down me-1"></i>Show Details
                                        </span>
                                    </button>`
                                    : ""
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
      )
      .join("");
  }

  toggleErrorDescription(taskId) {
    const shortDesc = document.getElementById(`desc-short-${taskId}`);
    const fullDesc = document.getElementById(`desc-full-${taskId}`);
    const toggleBtn = document.getElementById(`toggle-btn-${taskId}`);

    if (!shortDesc || !fullDesc || !toggleBtn) return;

    const isExpanded = fullDesc.style.display !== "none";

    if (isExpanded) {
      // Collapse - show short description
      shortDesc.style.display = "block";
      fullDesc.style.display = "none";
      toggleBtn.innerHTML =
        '<i class="bi bi-chevron-down me-1"></i>Show Details';
    } else {
      // Expand - show full description
      shortDesc.style.display = "none";
      fullDesc.style.display = "block";
      toggleBtn.innerHTML = '<i class="bi bi-chevron-up me-1"></i>Hide Details';
    }
  }

  toggleErrorDetail(taskId) {
    const shortDetail = document.getElementById(`detail-short-${taskId}`);
    const fullDetail = document.getElementById(`detail-full-${taskId}`);
    const toggleBtn = document.getElementById(`toggle-detail-btn-${taskId}`);

    if (!shortDetail || !fullDetail || !toggleBtn) return;

    const isExpanded = fullDetail.style.display !== "none";

    if (isExpanded) {
      // Collapse - show short detail
      shortDetail.style.display = "block";
      fullDetail.style.display = "none";
      toggleBtn.innerHTML =
        '<i class="bi bi-chevron-down me-1"></i>Show Details';
    } else {
      // Expand - show full detail
      shortDetail.style.display = "none";
      fullDetail.style.display = "block";
      toggleBtn.innerHTML = '<i class="bi bi-chevron-up me-1"></i>Hide Details';
    }
  }
  getCategoryClass(category) {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes("docker")) return "error-category-docker";
    if (categoryLower.includes("bicep") || categoryLower.includes("terraform"))
      return "error-category-bicep";
    if (
      categoryLower.includes("network") ||
      categoryLower.includes("connection")
    )
      return "error-category-network";
    if (categoryLower.includes("permission") || categoryLower.includes("auth"))
      return "error-category-permission";
    return "error-category-general";
  }

  updateFilteredCount() {
    const countElement = document.getElementById("filtered-errors-count");
    if (countElement) {
      countElement.textContent = `${this.filteredErrors.length} error${
        this.filteredErrors.length !== 1 ? "s" : ""
      }`;
    }
  }

  toggleCategory(category) {
    const categoryBody = document.getElementById(`category-${category}`);
    const chevron = document.getElementById(`chevron-${category}`);

    if (categoryBody && chevron) {
      if (categoryBody.classList.contains("show")) {
        categoryBody.classList.remove("show");
        chevron.classList.remove("bi-chevron-up");
        chevron.classList.add("bi-chevron-down");
      } else {
        categoryBody.classList.add("show");
        chevron.classList.remove("bi-chevron-down");
        chevron.classList.add("bi-chevron-up");
      }
    }
  }

  showErrorDetail(taskId) {
    const error = this.allErrors.find((e) => e.TaskID === taskId);
    if (!error) return;

    // Populate modal
    document.getElementById("modal-task-id").textContent = error.TaskID;
    document.getElementById("modal-job-id").textContent = error.TestJobID;
    document.getElementById("modal-error-date").textContent = formatDateTime(
      error.CreatedDate
    );
    document.getElementById("modal-error-category").textContent =
      error.ErrorCategory || "General Error";
    document.getElementById("modal-task-type").textContent =
      error.TaskType || "Unknown";
    document.getElementById("modal-use-terraform").textContent =
      error.UseTerraform ? "Yes" : "No";
    document.getElementById("modal-error-description").textContent =
      error.ErrorDescription || "No description available";
    document.getElementById("modal-error-detail").textContent =
      error.ErrorDetail || "No details available"; // Setup view task button
    const viewTaskBtn = document.getElementById("view-task-detail-btn");
    if (viewTaskBtn) {
      // Remove existing event listeners to prevent duplicates
      viewTaskBtn.replaceWith(viewTaskBtn.cloneNode(true));
      const newViewTaskBtn = document.getElementById("view-task-detail-btn");

      newViewTaskBtn.addEventListener("click", () => {
        // Navigate to task detail
        window.navigateToTaskDetail(error.TaskID);
        bootstrap.Modal.getInstance(
          document.getElementById("errorDetailModal")
        ).hide();
      });
    }

    // Show modal
    const modal = new bootstrap.Modal(
      document.getElementById("errorDetailModal")
    );
    modal.show();
  }

  exportErrors() {
    if (this.filteredErrors.length === 0) {
      alert("No errors to export");
      return;
    }

    const csvContent = this.generateCSV(this.filteredErrors);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `error-report-${this.currentPeriod}days-${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  generateCSV(errors) {
    const headers = [
      "TaskID",
      "TestJobID",
      "CreatedDate",
      "TaskType",
      "UseTerraform",
      "ErrorCategory",
      "ErrorDescription",
      "ErrorDetail",
    ];
    const csvRows = [headers.join(",")];

    errors.forEach((error) => {
      const row = [
        error.TaskID || "",
        error.TestJobID || "",
        error.CreatedDate || "",
        error.TaskType || "",
        error.UseTerraform ? "Yes" : "No",
        error.ErrorCategory || "",
        `"${(error.ErrorDescription || "").replace(/"/g, '""')}"`,
        `"${(error.ErrorDetail || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    return csvRows.join("\n");
  }

  showLoadingState() {
    document.getElementById("error-center-loading").style.display = "block";
    document.getElementById("error-summary-section").style.display = "none";
    document.getElementById("error-categories-section").style.display = "none";
    document.getElementById("error-center-empty").style.display = "none";
    document.getElementById("error-center-error").style.display = "none";
  }

  showDataState() {
    document.getElementById("error-center-loading").style.display = "none";
    document.getElementById("error-center-error").style.display = "none";

    if (this.allErrors.length === 0) {
      document.getElementById("error-center-empty").style.display = "block";
      document.getElementById("error-summary-section").style.display = "none";
      document.getElementById("error-categories-section").style.display =
        "none";
    } else {
      document.getElementById("error-center-empty").style.display = "none";
      document.getElementById("error-summary-section").style.display = "block";
      document.getElementById("error-categories-section").style.display =
        "block";
    }
  }

  showErrorState() {
    document.getElementById("error-center-loading").style.display = "none";
    document.getElementById("error-summary-section").style.display = "none";
    document.getElementById("error-categories-section").style.display = "none";
    document.getElementById("error-center-empty").style.display = "none";
    document.getElementById("error-center-error").style.display = "block";
  }

  // Utility methods
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  truncateText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  cleanText(text) {
    if (!text) return "";
    return text
      .replace(/\r\n/g, " ") // Replace Windows line breaks
      .replace(/\n/g, " ") // Replace Unix line breaks
      .replace(/\r/g, " ") // Replace Mac line breaks
      .replace(/\t/g, " ") // Replace tabs
      .replace(/\s{2,}/g, " ") // Replace multiple consecutive spaces with single space
      .replace(/^\s+|\s+$/g, "") // Trim leading/trailing whitespace
      .replace(/\s*\./g, ".") // Remove spaces before periods
      .replace(/\s*,/g, ",") // Remove spaces before commas
      .trim();
  }

  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global instance
let errorCenter;

// Initialize Error Center when the view is shown
function initErrorCenter() {
  if (!errorCenter) {
    errorCenter = new ErrorCenter();
  }
}
