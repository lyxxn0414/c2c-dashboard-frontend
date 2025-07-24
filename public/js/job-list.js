class JobsView {  constructor() {
    this.currentPage = 1;
    this.pageSize = 10; // Changed back to 10 jobs per page
    this.currentSort = { field: "creationTime", order: "desc" };
    this.currentFilter = "";
    this.currentToolTypeFilter = "all";
    this.currentIacTypeFilter = "all";
    this.currentCopilotModelFilter = "all";
    this.currentDeployTypeFilter = "all";
    this.currentComputingResourceFilter = "all";
    this.externalServiceStatus = null;
    this.jobDropdownsInitialized = false;
    this.selectedJobIds = new Set(); // Track selected jobs for comparison

    setTimeout(() => {
      this.initializeElements();
      this.bindEvents();
      this.initializeJobDropdowns();
      this.loadJobs();
    }, 200);
  }

  initJobsView() {
    this.loadJobs();
  }  initializeElements() {
    // Core view element
    this.jobsView = document.getElementById("jobs-view");

    // Check if elements exist
    if (!this.jobsView) {
      console.warn("Views not found, waiting for HTML to load...");
      return;
    }    // Jobs view elements
    this.jobsTableBody = document.getElementById("jobs-table-body");
    this.filterInput = document.getElementById("filter-input");
    this.loadingIndicator = document.getElementById("loading-indicator");
    this.pagination = document.getElementById("pagination");

    // Filter elements
    this.toolTypeFilter = document.getElementById("tool-type-filter");
    this.iacTypeFilter = document.getElementById("iac-type-filter");
    this.copilotModelFilter = document.getElementById("copilot-model-filter");
    this.deployTypeFilter = document.getElementById("deploy-type-filter");
    this.computingResourceFilter = document.getElementById("computing-resource-filter");

    // Job comparison elements
    this.selectAllCheckbox = document.getElementById("select-all-jobs");
    this.selectedCountSpan = document.getElementById("selected-count");
    this.compareBtn = document.getElementById("compare-jobs-btn");
    this.clearSelectionBtn = document.getElementById("clear-selection-btn");
    this.comparisonSection = document.getElementById("job-comparison-section");
  }
  bindEvents() {
    // Check if elements exist before binding events
    if (!this.filterInput) {
      console.warn("Essential elements not ready for event binding");
      return;
    }    this.filterInput?.addEventListener(
      "input",
      debounce((e) => {
        this.currentFilter = e.target.value;
        this.currentPage = 1; // Reset to first page when search changes
        this.loadJobs(); // Reload data from server with search filter
      }, 300)
    );

    // Job comparison event handlers
    this.selectAllCheckbox?.addEventListener('change', (e) => {
      this.handleSelectAll(e.target.checked);
    });

    this.compareBtn?.addEventListener('click', () => {
      this.navigateToComparison();
    });

    this.clearSelectionBtn?.addEventListener('click', () => {
      this.clearSelection();
    });

    this.setupJobDropdownItemHandlers();
  }async loadJobs() {
    this.showLoading(true);    try {
      const params = new URLSearchParams({
        sortBy: this.currentSort.field,
        sortOrder: this.currentSort.order,
        // Request all jobs for client-side pagination
        limit: "1000", // Large number to get all jobs
        page: "1"
      });

      // Add filter parameters (for when backend implements server-side filtering)
      if (this.currentToolTypeFilter !== "all") {
        params.append("toolType", this.currentToolTypeFilter);
      }
      if (this.currentIacTypeFilter !== "all") {
        params.append("iacType", this.currentIacTypeFilter);
      }
      if (this.currentCopilotModelFilter !== "all") {
        params.append("copilotModel", this.currentCopilotModelFilter);
      }
      if (this.currentDeployTypeFilter !== "all") {
        params.append("deployType", this.currentDeployTypeFilter);
      }
      if (this.currentComputingResourceFilter !== "all") {
        params.append("computingResource", this.currentComputingResourceFilter);
      }
      if (this.currentFilter && this.currentFilter.trim() !== "") {
        params.append("search", this.currentFilter.trim());
      }

      // Use our backend API endpoint (not direct kusto call)
      const response = await fetch(`/api/jobs?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }      const data = await response.json();
      this.allJobs = data.jobs || [];
      console.log(`Loaded ${this.allJobs.length} total jobs from server`);
      this.populateJobFilters(this.allJobs);

      // Apply client-side filtering (fallback until backend implements server-side filtering)
      const filteredJobs = this.applyClientSideFilters(this.allJobs);
      
      // Create paginated results from filtered data
      const paginatedData = this.paginateFilteredResults(filteredJobs);
      
      // Backend already returns mapped data, so we can use it directly
      this.renderJobs(paginatedData.jobs);
      this.renderPagination(paginatedData);
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
  populateJobFilters(jobs) {
    // Extract unique values for each filter
    const toolTypes = [...new Set(jobs.map(job => {
      const jobType = job.TestJobID.startsWith("xiaofan") ? "MCP" : job.Tool;
      return jobType;
    }).filter(Boolean))].sort();

    const iacTypes = [...new Set(jobs.map(job => job.IacType).filter(Boolean))].sort();
    
    const copilotModels = [...new Set(jobs.map(job => job.CopilotModel).filter(Boolean))].sort();
    
    const deployTypes = [...new Set(jobs.map(job => job.DeployType).filter(Boolean))].sort();
    
    const computingResources = [...new Set(jobs.map(job => job.ComputingType).filter(Boolean))].sort();

    // Populate all filter dropdowns
    window.dropdownManager.populateDropdown("tool-type-filter", toolTypes);
    window.dropdownManager.populateDropdown("iac-type-filter", iacTypes);
    window.dropdownManager.populateDropdown("copilot-model-filter", copilotModels);
    window.dropdownManager.populateDropdown("deploy-type-filter", deployTypes);
    window.dropdownManager.populateDropdown("computing-resource-filter", computingResources);

    console.log("Populated job filters:", {
      toolTypes: toolTypes.length,
      iacTypes: iacTypes.length,
      copilotModels: copilotModels.length,
      deployTypes: deployTypes.length,
      computingResources: computingResources.length
    });  }

  applyClientSideFilters(jobs) {
    let filteredJobs = jobs;

    // Apply ToolType filter
    if (this.currentToolTypeFilter !== "all") {
      filteredJobs = filteredJobs.filter((job) => {
        const jobType = job.TestJobID.startsWith("xiaofan") ? "MCP" : job.Tool;
        return jobType === this.currentToolTypeFilter;
      });
    }

    // Apply IacType filter
    if (this.currentIacTypeFilter !== "all") {
      filteredJobs = filteredJobs.filter((job) => {
        return job.IacType === this.currentIacTypeFilter;
      });
    }

    // Apply CopilotModel filter
    if (this.currentCopilotModelFilter !== "all") {
      filteredJobs = filteredJobs.filter((job) => {
        return job.CopilotModel === this.currentCopilotModelFilter;
      });
    }

    // Apply DeployType filter
    if (this.currentDeployTypeFilter !== "all") {
      filteredJobs = filteredJobs.filter((job) => {
        return job.DeployType === this.currentDeployTypeFilter;
      });
    }

    // Apply ComputingResource filter
    if (this.currentComputingResourceFilter !== "all") {
      filteredJobs = filteredJobs.filter((job) => {
        return job.ComputingType === this.currentComputingResourceFilter;
      });
    }

    // Apply text filter for any field (including ID)
    if (this.currentFilter && this.currentFilter.trim() !== "") {
      const filterText = this.currentFilter.toLowerCase().trim();
      console.log(`Applying text filter: "${filterText}"`);
      
      filteredJobs = filteredJobs.filter((job) => {
        // Search in multiple fields including ID and new columns
        const jobType = job.TestJobID.startsWith("xiaofan") ? "MCP" : job.Tool;
        const searchFields = [
          job.TestJobID?.toString() || "",
          formatDateTime(job.CreatedTime || job.creationTime) || "",
          jobType || "",
          job.IacType || "",
          job.CopilotModel || "",
          job.DeployType || "",
          job.ComputingType || "",
          job.SuccessRate?.toString() || "",
          job.SuccessTasks?.toString() || "",
          job.TaskNum?.toString() || "",
        ];

        const matches = searchFields.some((field) =>
          field.toLowerCase().includes(filterText)
        );

        if (matches) {
          console.log(`Job ${job.TestJobID} matches filter`);
        }

        return matches;
      });
    }    console.log(`Filtered ${filteredJobs.length} jobs from ${jobs.length} total jobs`);
    console.log('Active filters:', {
      toolType: this.currentToolTypeFilter,
      iacType: this.currentIacTypeFilter,
      copilotModel: this.currentCopilotModelFilter,
      deployType: this.currentDeployTypeFilter,
      computingResource: this.currentComputingResourceFilter,
      search: this.currentFilter
    });
    return filteredJobs;
  }
  paginateFilteredResults(filteredJobs) {
    const totalJobs = filteredJobs.length;
    const totalPages = Math.ceil(totalJobs / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const pageJobs = filteredJobs.slice(startIndex, endIndex);

    const paginationData = {
      jobs: pageJobs,
      page: this.currentPage,
      totalPages: totalPages,
      totalJobs: totalJobs,
      pageSize: this.pageSize
    };

    console.log('Pagination calculation:', {
      totalJobs,
      pageSize: this.pageSize,
      totalPages,
      currentPage: this.currentPage,
      startIndex,
      endIndex,
      pageJobsCount: pageJobs.length
    });

    return paginationData;
  }
  renderPagination(data) {
    const pagination = document.getElementById("pagination");
    if (!pagination) return;
      console.log('Pagination data:', data);
    pagination.innerHTML = "";

    // Temporarily show pagination even with 1 page for testing
    if (data.totalPages <= 1) {
      console.log('Not showing pagination: totalPages =', data.totalPages);
      // For testing - let's show a simple pagination even with 1 page
      pagination.innerHTML = `<li class="page-item active"><a class="page-link" href="#">1</a></li>`;
      return;
    }

    console.log('Showing pagination with', data.totalPages, 'pages, current page:', data.page);

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
                    <td colspan="9" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                        No jobs found
                    </td>
                </tr>
            `;
      return;    }

    // Since filtering is now done server-side, we can directly render all jobs
    jobs.forEach((job) => {
      const row = document.createElement("tr");
      row.className = "fade-in";
      const jobType = job.TestJobID.startsWith("xiaofan")? "MCP" : job.Tool;
      const isSelected = this.selectedJobIds.has(job.TestJobID);
      
      row.innerHTML = `
                <td>
                    <input type="checkbox" class="form-check-input job-checkbox" 
                           data-job-id="${job.TestJobID}" ${isSelected ? 'checked' : ''}>
                </td>
                <td>
                    <a href="#" class="job-id-link" data-job-id="${job.TestJobID}">
                        ${job.TestJobID}
                    </a>
                </td>
                <td>${formatDateTime(job.CreatedTime)}</td>
                <td>${jobType}</td>
                <td>${escapeHtml(job.IacType)}</td>
                <td>${job.CopilotModel}</td>
                <td>${job.DeployType}</td>
                <td>${job.ComputingType}</td>
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

    // Bind checkbox events
    document.querySelectorAll(".job-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        this.handleJobSelection(e.target.dataset.jobId, e.target.checked);
      });
    });

    // Update the select all checkbox state
    this.updateSelectAllState();
    // Update the selection count and button states
    this.updateSelectionUI();
  }
  setupJobDropdownItemHandlers() {
    // Use event delegation for dropdown items to handle dynamic content
    document.addEventListener("click", (e) => {
      // Generic handler for all filter dropdowns
      this.handleDropdownItemClick(e, [
        {
          selector: "#tool-type-filter + .dropdown-menu .dropdown-item",
          property: "currentToolTypeFilter",
          buttonId: "tool-type-filter",
        },
        {
          selector: "#iac-type-filter + .dropdown-menu .dropdown-item",
          property: "currentIacTypeFilter",
          buttonId: "iac-type-filter",
        },
        {
          selector: "#copilot-model-filter + .dropdown-menu .dropdown-item",
          property: "currentCopilotModelFilter",
          buttonId: "copilot-model-filter",
        },
        {
          selector: "#deploy-type-filter + .dropdown-menu .dropdown-item",
          property: "currentDeployTypeFilter",
          buttonId: "deploy-type-filter",
        },
        {
          selector: "#computing-resource-filter + .dropdown-menu .dropdown-item",
          property: "currentComputingResourceFilter",
          buttonId: "computing-resource-filter",
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
  }  setupJobDropdowns() {
    // Register ToolType filter dropdown
    window.dropdownManager.register("tool-type-filter", {
      buttonId: "tool-type-filter",
      dropdownId: "tool-type-filter-menu",
      placeholder: "ToolType",
      filterType: "select",
      onSelect: (value, label, id) => {
        this.currentToolTypeFilter = value;
        this.currentPage = 1; // Reset to first page when filter changes
        this.loadJobs(); // Reload data from server
        console.log(`ToolType filter changed to: ${value}`);
      },
    });

    // Register IacType filter dropdown
    window.dropdownManager.register("iac-type-filter", {
      buttonId: "iac-type-filter",
      dropdownId: "iac-type-filter-menu",
      placeholder: "Iac Type",
      filterType: "select",
      onSelect: (value, label, id) => {
        this.currentIacTypeFilter = value;
        this.currentPage = 1; // Reset to first page when filter changes
        this.loadJobs(); // Reload data from server
        console.log(`IacType filter changed to: ${value}`);
      },
    });

    // Register CopilotModel filter dropdown
    window.dropdownManager.register("copilot-model-filter", {
      buttonId: "copilot-model-filter",
      dropdownId: "copilot-model-filter-menu",
      placeholder: "Copilot Model",
      filterType: "select",
      onSelect: (value, label, id) => {
        this.currentCopilotModelFilter = value;
        this.currentPage = 1; // Reset to first page when filter changes
        this.loadJobs(); // Reload data from server
        console.log(`CopilotModel filter changed to: ${value}`);
      },
    });

    // Register DeployType filter dropdown
    window.dropdownManager.register("deploy-type-filter", {
      buttonId: "deploy-type-filter",
      dropdownId: "deploy-type-filter-menu",
      placeholder: "Deploy Type",
      filterType: "select",
      onSelect: (value, label, id) => {
        this.currentDeployTypeFilter = value;
        this.currentPage = 1; // Reset to first page when filter changes
        this.loadJobs(); // Reload data from server
        console.log(`DeployType filter changed to: ${value}`);
      },
    });

    // Register ComputingResource filter dropdown
    window.dropdownManager.register("computing-resource-filter", {
      buttonId: "computing-resource-filter",
      dropdownId: "computing-resource-filter-menu",
      placeholder: "Computing Resource",
      filterType: "select",
      onSelect: (value, label, id) => {
        this.currentComputingResourceFilter = value;
        this.currentPage = 1; // Reset to first page when filter changes
        this.loadJobs(); // Reload data from server
        console.log(`ComputingResource filter changed to: ${value}`);
      },
    });

    // Initialize all job dropdowns
    window.dropdownManager.init("tool-type-filter");
    window.dropdownManager.init("iac-type-filter");
    window.dropdownManager.init("copilot-model-filter");
    window.dropdownManager.init("deploy-type-filter");
    window.dropdownManager.init("computing-resource-filter");
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

  // Job selection management methods
  handleJobSelection(jobId, isChecked) {
    if (isChecked) {
      this.selectedJobIds.add(jobId);
    } else {
      this.selectedJobIds.delete(jobId);
    }
    this.updateSelectionUI();
    this.updateSelectAllState();
  }

  handleSelectAll(isChecked) {
    const checkboxes = document.querySelectorAll('.job-checkbox');
    checkboxes.forEach(checkbox => {
      const jobId = checkbox.dataset.jobId;
      checkbox.checked = isChecked;
      
      if (isChecked) {
        this.selectedJobIds.add(jobId);
      } else {
        this.selectedJobIds.delete(jobId);
      }
    });
    this.updateSelectionUI();
  }

  updateSelectAllState() {
    if (!this.selectAllCheckbox) return;
    
    const checkboxes = document.querySelectorAll('.job-checkbox');
    const checkedBoxes = document.querySelectorAll('.job-checkbox:checked');
    
    if (checkboxes.length === 0) {
      this.selectAllCheckbox.indeterminate = false;
      this.selectAllCheckbox.checked = false;
    } else if (checkedBoxes.length === checkboxes.length) {
      this.selectAllCheckbox.indeterminate = false;
      this.selectAllCheckbox.checked = true;
    } else if (checkedBoxes.length > 0) {
      this.selectAllCheckbox.indeterminate = true;
      this.selectAllCheckbox.checked = false;
    } else {
      this.selectAllCheckbox.indeterminate = false;
      this.selectAllCheckbox.checked = false;
    }
  }  updateSelectionUI() {
    const selectedCount = this.selectedJobIds.size;
    
    if (this.selectedCountSpan) {
      this.selectedCountSpan.textContent = selectedCount;
    }
    
    if (this.compareBtn) {
      this.compareBtn.disabled = selectedCount < 2 || selectedCount > 5;
    }
    
    if (this.clearSelectionBtn) {
      this.clearSelectionBtn.disabled = selectedCount === 0;
    }

    // Show/hide comparison section based on selection
    if (this.comparisonSection) {
      if (selectedCount > 0) {
        this.comparisonSection.style.display = 'block';
      } else {
        this.comparisonSection.style.display = 'none';
      }
    }

    // Update selected jobs preview
    this.updateSelectedJobsPreview();
  }

  updateSelectedJobsPreview() {
    const previewContainer = document.getElementById("selected-jobs-preview");
    if (!previewContainer) return;

    const selectedJobIds = Array.from(this.selectedJobIds);
    if (selectedJobIds.length === 0) {
      previewContainer.innerHTML = '<span class="text-muted">No jobs selected</span>';
      return;
    }

    const previewHtml = selectedJobIds.map(jobId => `
      <span class="badge bg-primary me-1 mb-1">
        ${jobId}
        <button type="button" class="btn-close btn-close-white ms-2" 
                data-job-id="${jobId}" style="font-size: 0.6em;"></button>
      </span>
    `).join('');

    previewContainer.innerHTML = previewHtml;

    // Add click handlers for remove buttons
    previewContainer.querySelectorAll('.btn-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const jobId = e.target.dataset.jobId;
        this.selectedJobIds.delete(jobId);
        
        // Update the corresponding checkbox
        const checkbox = document.querySelector(`[data-job-id="${jobId}"]`);
        if (checkbox) {
          checkbox.checked = false;
        }
        
        this.updateSelectionUI();
        this.updateSelectAllState();
      });
    });
  }

  clearSelection() {
    this.selectedJobIds.clear();
    const checkboxes = document.querySelectorAll('.job-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    this.updateSelectionUI();
    this.updateSelectAllState();
  }

  navigateToComparison() {
    if (this.selectedJobIds.size < 2 || this.selectedJobIds.size > 5) {
      alert('Please select 2-5 jobs to compare.');
      return;
    }
    
    // Convert Set to Array and pass to comparison view
    const jobIds = Array.from(this.selectedJobIds);
    window.navigateToJobComparison(jobIds);
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
