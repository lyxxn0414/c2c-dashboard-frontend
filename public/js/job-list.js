class JobsView {
  constructor() {
    this.currentPage = 1;
    this.pageSize = 10;
    this.currentSort = { field: "creationTime", order: "desc" };
    this.currentFilter = "";
    this.currentUserFilter = "all";
    this.currentMcpFilter = "all";
    this.currentTerraformFilter = "all";
    this.externalServiceStatus = null;
    this.jobDropdownsInitialized = false;

    setTimeout(() => {
      this.initializeElements();
      this.bindEvents();
      this.initializeJobDropdowns();
      this.loadJobs();
    }, 200);
  }

  initJobsView() {
    this.loadJobs();
  }

  initializeElements() {
    // Core view element
    this.jobsView = document.getElementById("jobs-view");

    // Check if elements exist
    if (!this.jobsView) {
      console.warn("Views not found, waiting for HTML to load...");
      return;
    }

    // Jobs view elements
    this.jobsTableBody = document.getElementById("jobs-table-body");
    this.filterInput = document.getElementById("filter-input");
    this.loadingIndicator = document.getElementById("loading-indicator");
    this.pagination = document.getElementById("pagination");

    // Filter elements
    this.createdByFilter = document.getElementById("created-by-filter");
    this.useMcpFilter = document.getElementById("use-mcp-filter");
    this.useTerraformFilter = document.getElementById("use-terraform-filter");
  }

  bindEvents() {
    // Check if elements exist before binding events
    if (!this.filterInput) {
      console.warn("Essential elements not ready for event binding");
      return;
    }
    this.filterInput?.addEventListener(
      "input",
      debounce((e) => {
        this.currentFilter = e.target.value;

        // Use client-side filtering instead of reloading from server
        if (this.allJobs) {
          this.renderJobs(this.allJobs);
        }
      }, 300)
    );

    this.setupJobDropdownItemHandlers();
  }

  async loadJobs() {
    this.showLoading(true);

    try {
      const params = new URLSearchParams({
        page: this.currentPage.toString(),
        limit: this.pageSize.toString(),
        sortBy: this.currentSort.field,
        sortOrder: this.currentSort.order,
      });

      // Use our backend API endpoint (not direct kusto call)
      const response = await fetch(`/api/jobs?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.allJobs = data.jobs || [];
      this.populateCreatedByFilter(this.allJobs);

      // Backend already returns mapped data, so we can use it directly
      this.renderJobs(data.jobs);
      this.renderPagination(data);
    } catch (error) {
      console.error("Error loading jobs:", error);
      this.showError(
        "Failed to load jobs. Please check your connection and try again."
      );
      // Show empty state
      this.renderJobs([]);
    } finally {
      this.showLoading(false);
    }
  }

  populateCreatedByFilter(jobs) {
    // Extract unique 'InitiatedBy' values from jobs
    const uniqueCreatedBy = new Set();

    jobs.forEach((job) => {
      if (
        job.InitiatedBy &&
        job.InitiatedBy.trim() !== "" &&
        job.InitiatedBy !== "Unknown"
      ) {
        uniqueCreatedBy.add(job.InitiatedBy);
      }
    });

    // Convert to sorted array
    const sortedCreatedBy = Array.from(uniqueCreatedBy).sort();

    // Use dropdown manager to populate the created by filter
    window.dropdownManager.populateDropdown(
      "created-by-filter",
      sortedCreatedBy
    );

    console.log(
      `Populated CreatedBy filter with ${sortedCreatedBy.length} unique creators:`,
      sortedCreatedBy
    );
  }

  renderPagination(data) {
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    if (data.totalPages <= 1) return;

    // Previous button
    const prevItem = document.createElement("li");
    prevItem.className = `page-item ${data.page === 1 ? "disabled" : ""}`;
    prevItem.innerHTML = `
            <a class="page-link" href="#" data-page="${data.page - 1}">
                <i class="bi bi-chevron-left"></i>
            </a>
        `;
    pagination.appendChild(prevItem);

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, data.page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(data.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageItem = document.createElement("li");
      pageItem.className = `page-item ${i === data.page ? "active" : ""}`;
      pageItem.innerHTML = `
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            `;
      pagination.appendChild(pageItem);
    }

    // Next button
    const nextItem = document.createElement("li");
    nextItem.className = `page-item ${data.page === data.totalPages ? "disabled" : ""}`;
    nextItem.innerHTML = `
            <a class="page-link" href="#" data-page="${data.page + 1}">
                <i class="bi bi-chevron-right"></i>
            </a>
        `;
    pagination.appendChild(nextItem);

    // Bind pagination click events
    pagination.addEventListener("click", (e) => {
      e.preventDefault();
      if (
        e.target.classList.contains("page-link") &&
        !e.target.closest(".disabled")
      ) {
        const page = parseInt(e.target.dataset.page);
        if (page && page !== this.currentPage) {
          this.currentPage = page;
          this.loadJobs();
        }
      }
    });
  }

  renderJobs(jobs) {
    const tbody = document.getElementById("jobs-table-body");
    if (!tbody) {
      console.error("jobs-table-body element not found");
      return;
    }

    tbody.innerHTML = "";

    if (jobs.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                        No jobs found
                    </td>
                </tr>
            `;
      return;
    }

    // Apply all filters
    let filteredJobs = jobs;

    // Apply user filter (check both fields for compatibility)
    if (this.currentUserFilter !== "all") {
      filteredJobs = filteredJobs.filter((job) => {
        const matches = job.InitiatedBy === this.currentUserFilter;
        return matches;
      });
    }

    // Apply MCP filter
    if (this.currentMcpFilter !== "all") {
      const useMcp = this.currentMcpFilter === "true";
      filteredJobs = filteredJobs.filter((job) => {
        // Check if job has MCP usage (you might need to adjust this based on your data structure)
        const mcpRate = parseFloat(job.MCPRate) || 0;
        return useMcp ? mcpRate > 0 : mcpRate === 0;
      });
    }

    // Apply Terraform filter
    if (this.currentTerraformFilter !== "all") {
      const useTerraform = this.currentTerraformFilter === "true";
      filteredJobs = filteredJobs.filter((job) => {
        // Check if job has Terraform usage (you might need to adjust this based on your data structure)
        const terraformRate = parseFloat(job.TerraformRate) || 0;
        return useTerraform ? terraformRate > 0 : terraformRate === 0;
      });
    }

    // Apply text filter for any field (including ID)
    if (this.currentFilter && this.currentFilter.trim() !== "") {
      const filterText = this.currentFilter.toLowerCase().trim();
      console.log(`Applying text filter: "${filterText}"`);

      filteredJobs = filteredJobs.filter((job) => {
        // Search in multiple fields including ID
        const searchFields = [
          job.TestJobID?.toString() || "",
          job.InitiatedBy || job.createdBy || "",
          job.MCPRate?.toString() || "",
          job.TerraformRate?.toString() || "",
          job.TaskNum?.toString() || "",
          job.SuccessRate?.toString() || "",
          formatDateTime(job.CreatedTime || job.creationTime) || "",
        ];

        const matches = searchFields.some((field) =>
          field.toLowerCase().includes(filterText)
        );

        if (matches) {
          console.log(`Job ${job.TestJobID} matches filter`);
        }

        return matches;
      });
    }

    filteredJobs.forEach((job) => {
      const row = document.createElement("tr");
      row.className = "fade-in";
      row.innerHTML = `
                <td>
                    <a href="#" class="job-id-link" data-job-id="${job.TestJobID}">
                        ${job.TestJobID}
                    </a>
                </td>
                <td>${escapeHtml(job.InitiatedBy)}</td>
                <td>${formatDateTime(job.CreatedTime)}</td>
                <td>${escapeHtml(job.MCPRate)}</td>
                <td>${escapeHtml(job.TerraformRate)}</td>
                <td>${job.TaskNum}</td>
                <td>
                    <span class="success-rate ${getSuccessRateClass(job.SuccessRate)}">
                        ${job.SuccessRate} (${job.SuccessTasks}/${job.TaskNum})
                    </span>
                </td>
            `;
      tbody.appendChild(row);
    });

    // Bind job ID click events
    document.querySelectorAll(".job-id-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        window.navigateToJobDetail(e.target.dataset.jobId);
      });
    });
  }

  setupJobDropdownItemHandlers() {
    // Use event delegation for dropdown items to handle dynamic content
    document.addEventListener("click", (e) => {
      // Generic handler for all filter dropdowns
      this.handleDropdownItemClick(e, [
        {
          selector: "#created-by-filter + .dropdown-menu .dropdown-item",
          property: "currentUserFilter",
          buttonId: "created-by-filter",
        },
        {
          selector: "#use-mcp-filter + .dropdown-menu .dropdown-item",
          property: "currentMcpFilter",
          buttonId: "use-mcp-filter",
        },
        {
          selector: "#use-terraform-filter + .dropdown-menu .dropdown-item",
          property: "currentTerraformFilter",
          buttonId: "use-terraform-filter",
        },
      ]);
    });
  }

  handleDropdownItemClick(event, filterConfigs) {
    filterConfigs.forEach((config) => {
      if (event.target.closest(config.selector)) {
        event.preventDefault();

        const filter = event.target.dataset.filter;
        this[config.property] = filter;

        // Use utility function to update filter display
        this.updateFilterDisplay(config.buttonId, filter);

        // Apply client-side filtering
        if (this.allJobs) {
          this.renderJobs(this.allJobs);
        }

        const menu = event.target.closest(".dropdown-menu");
        if (menu) {
          closeDropdown(config.buttonId, menu.id || `${config.buttonId}-menu`);
        }
      }
    });
  }

  updateFilterDisplay(filterId, value) {
    const button = document.getElementById(filterId);
    const badge = button.querySelector(".badge.bg-secondary");
    badge.textContent = value;
  }

  initializeJobDropdowns() {
    if (this.jobDropdownsInitialized) {
      console.log("Job dropdowns already initialized, skipping...");
      return;
    }
    console.log("Initializing job dropdowns...");
    this.setupJobDropdowns();

    this.jobDropdownsInitialized = true;
  }

  setupJobDropdowns() {
    // Register created by filter dropdown
    window.dropdownManager.register("created-by-filter", {
      buttonId: "created-by-filter",
      dropdownId: "created-by-filter-menu",
      placeholder: "Created By",
      filterType: "select",
      onSelect: (value, label, id) => {
        this.currentUserFilter = value;
        this.loadJobs();
        console.log(`Created by filter changed to: ${value}`);
      },
    }); // Register MCP filter dropdown
    window.dropdownManager.register("use-mcp-filter", {
      buttonId: "use-mcp-filter",
      dropdownId: "use-mcp-filter-menu",
      placeholder: "UseMCP",
      filterType: "select",
      onSelect: (value, label, id) => {
        this.currentMcpFilter = value;
        this.loadJobs();
        console.log(`MCP filter changed to: ${value}`);
      },
    });

    // Register Terraform filter dropdown
    window.dropdownManager.register("use-terraform-filter", {
      buttonId: "use-terraform-filter",
      dropdownId: "use-terraform-filter-menu",
      placeholder: "UseTerraform",
      filterType: "select",
      onSelect: (value, label, id) => {
        this.currentTerraformFilter = value;
        this.loadJobs();
        console.log(`Terraform filter changed to: ${value}`);
      },
    });

    // Initialize all job dropdowns
    window.dropdownManager.init("created-by-filter");
    window.dropdownManager.init("use-mcp-filter");
    window.dropdownManager.init("use-terraform-filter");
  }

  showLoading(show) {
    const loadingIndicator = document.getElementById("loading-indicator");
    const table = document.querySelector(".table-responsive");

    if (show) {
      loadingIndicator.classList.remove("d-none");
      table.style.opacity = "0.5";
    } else {
      loadingIndicator.classList.add("d-none");
      table.style.opacity = "1";
    }
  }
}
let jobsView;
function initJobsView() {
  if (!jobsView) {
    console.log("Creating new JobsView instance");
    jobsView = new JobsView();
  }
  jobsView.initJobsView();
}
