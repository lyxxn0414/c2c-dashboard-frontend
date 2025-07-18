class RepoDetail {
  constructor() {
    this.currentRepoName = "";
    this.relatedTasksData = [];
    this.currentTaskFilters = {
      createdBy: "all",
      taskId: "all",
      jobName: "all",
      model: "all",
    };
    this.filterConfigs = [
      {
        filterId: "created-by-filter",
        dropdownId: "created-by-dropdown",
        filterKey: "createdBy",
      },
      {
        filterId: "task-id-filter",
        dropdownId: "task-id-dropdown",
        filterKey: "taskId",
      },
      {
        filterId: "job-name-filter",
        dropdownId: "job-name-dropdown",
        filterKey: "jobName",
      },
      {
        filterId: "model-filter",
        dropdownId: "model-dropdown",
        filterKey: "model",
      },
    ];
  }

  initRepoDetailView(repoName) {
    console.log("Initializing repo detail view for:", repoName);
    this.currentRepoName = repoName;
    this.loadRepoDetails();
    this.loadRelatedTasks();
    this.setupTaskFilters();
  }

  setupTaskFilters() {
    this.filterConfigs.forEach((config) => {
      const dropdown = document.getElementById(config.dropdownId);
      if (dropdown) {
        dropdown.addEventListener("click", (e) => {
          if (e.target.classList.contains("dropdown-item")) {
            e.preventDefault();
            const filterValue = e.target.getAttribute("data-filter");
            this.currentTaskFilters[config.filterKey] = filterValue;
            this.updateTaskFilterDisplay(config.filterId, filterValue);
            this.filterRelatedTasks();
          }
        });
      }
    });
  }

  updateTaskFilterDisplay(filterId, value) {
    const button = document.getElementById(filterId);
    if (button) {
      const label = button.textContent.split(" ")[0]; // Get the first word (e.g., "Created", "TaskID")
      const displayValue = value === "all" ? "all" : value;
      button.innerHTML = `${label} <span class="badge bg-primary">equals</span> <span class="badge bg-secondary">${displayValue}</span>`;
    }
  }

  filterRelatedTasks() {
    const filteredTasks = this.relatedTasksData.filter((task) => {
      const matchCreatedBy =
        this.currentTaskFilters.createdBy === "all" ||
        task.createdBy === this.currentTaskFilters.createdBy;
      const matchTaskId =
        this.currentTaskFilters.taskId === "all" ||
        task.taskId === this.currentTaskFilters.taskId;
      const matchModel =
        this.currentTaskFilters.model === "all" ||
        task.copilotModel === this.currentTaskFilters.model;
      // Job name filtering would need additional logic

      return matchCreatedBy && matchTaskId && matchModel;
    });

    this.displayRelatedTasks(filteredTasks);
  }
  async loadRepoDetails(repoName = this.currentRepoName) {
    try {
      console.log("Loading repo details for:", repoName);

      // Use base64 encoding for repo names with special characters to avoid URL issues
      const encodedRepoName = btoa(repoName).replace(
        /[+/=]/g,
        function (match) {
          return { "+": "-", "/": "_", "=": "" }[match];
        }
      );

      // Try to get detailed repo information from API
      const response = await fetch(
        `/api/repos/by-encoded-name/${encodedRepoName}`
      );
      let repoDetails;
      if (response.ok) {
        repoDetails = await response.json();
        console.log("Repo details loaded from API:", repoDetails);
      } else {
        console.log("API failed, trying fallback with URI encoding...");
        // Fallback to the original method
        const fallbackResponse = await fetch(
          `/api/repos/${encodeURIComponent(repoName)}`
        );
        if (fallbackResponse.ok) {
          repoDetails = await fallbackResponse.json();
          console.log("Repo details loaded from fallback API:", repoDetails);
        } else {
          console.log("Both API methods failed, trying cache...");
        }
      }

      // If still no details found, always create placeholder data
      if (!repoDetails) {
        console.log(
          "No repo details found, creating placeholder data for:",
          repoName
        );
        repoDetails = this.createPlaceholderRepoData(repoName);
      }

      this.populateRepoDetails(repoDetails);
    } catch (error) {
      console.error("Error loading repo details:", error);
      // Always fallback to placeholder data in case of any error
      this.populateRepoDetails(this.createPlaceholderRepoData(repoName));
    }
  }

  async loadRelatedTasks(repoName = this.currentRepoName) {
    try {
      console.log("Loading related tasks for:", repoName);
      const loadingIndicator = document.getElementById(
        "tasks-loading-indicator"
      );
      if (loadingIndicator) {
        loadingIndicator.classList.remove("d-none");
      }

      // Try to fetch related tasks from API
      const response = await fetch(
        `/api/repos/${encodeURIComponent(repoName)}/tasks`
      );

      if (response.ok) {
        this.relatedTasksData = await response.json();
        console.log("Related tasks loaded from API:", this.relatedTasksData);
      } else {
        console.log("API failed for tasks, using mock data");
        this.relatedTasksData = [];
      }

      if (!this.relatedTasksData || this.relatedTasksData.length === 0) {
        console.log("No related tasks found, creating mock data");
        this.relatedTasksData = [];
      }

      this.displayRelatedTasks(this.relatedTasksData);
      this.loadTaskFilters(this.relatedTasksData);
    } catch (error) {
      console.error("Error loading related tasks:", error);
      this.displayRelatedTasks([]);
      this.loadTaskFilters([]);
    } finally {
      const loadingIndicator = document.getElementById(
        "tasks-loading-indicator"
      );
      if (loadingIndicator) {
        loadingIndicator.classList.add("d-none");
      }
    }
  }

  populateRepoDetails(repoDetails) {
    console.log("Populating repo details:", repoDetails);

    // Check if all required elements exist
    const elements = {
      title: document.getElementById("repo-detail-title"),
      name: document.getElementById("repo-detail-name"),
      language: document.getElementById("repo-detail-language"),
      appPattern: document.getElementById("repo-detail-app-pattern"),
      // successRate: document.getElementById("repo-detail-success-rate"),
      // totalTasks: document.getElementById("repo-detail-total-tasks"),
      // successTasks: document.getElementById("repo-detail-success-tasks"),
      link: document.getElementById("repo-detail-link"),
      successRateSection: document.getElementById("repo-success-rate"),
      successFractionSection: document.getElementById("repo-success-fraction"),
    };

    // Log which elements are missing
    Object.keys(elements).forEach((key) => {
      if (!elements[key]) {
        console.error(
          `Element not found: ${key} (ID: ${key.replace(/([A-Z])/g, "-$1").toLowerCase()})`
        );
      }
    });

    const languageText = Array.isArray(repoDetails.languages)
      ? repoDetails.languages.join(", ")
      : repoDetails.languages || "Java";
    // Switch success rate to a string

    elements.title.textContent = `${repoDetails.repoName}`;
    elements.name.textContent = repoDetails.repoName;
    elements.language.textContent = languageText;
    elements.appPattern.textContent = repoDetails.appPattern || "N+N";
    elements.link.href = repoDetails.repoURL;
    elements.link.textContent = repoDetails.repoURL;

    // Update success rate in the success rate section as well
    this.updateSuccessRateDisplay(repoDetails);
  }

  updateSuccessRateDisplay(repoDetails) {
    console.log("Updating success rate display:", repoDetails);

    // Use data directly from API without any calculation
    let successRate = 0;
    let totalTasks = repoDetails.totalTasks || 0;
    let successfulTasks = repoDetails.successfulTasks || 0;

    // Parse success rate properly
    if (repoDetails.successRate !== undefined) {
      if (typeof repoDetails.successRate === "string") {
        // Handle percentage string like "28.6%"
        const numericRate = parseFloat(
          repoDetails.successRate.replace("%", "")
        );
        successRate = isNaN(numericRate) ? 0 : numericRate;
      } else if (typeof repoDetails.successRate === "number") {
        if (repoDetails.successRate <= 1) {
          successRate = repoDetails.successRate * 100;
        } else {
          successRate = repoDetails.successRate;
        }
      }
    }

    const successRateElement = document.getElementById("repo-success-rate");
    const successFractionElement = document.getElementById(
      "repo-success-fraction"
    );

    if (successRateElement) {
      successRateElement.textContent = `${successRate.toFixed(1)}%`;
      console.log("Updated success rate:", successRateElement.textContent);
    } else {
      console.error("Success rate element not found");
    }

    if (successFractionElement) {
      successFractionElement.textContent = `(${successfulTasks}/${totalTasks})`;
      console.log(
        "Updated success fraction:",
        successFractionElement.textContent
      );
    } else {
      console.error("Success fraction element not found");
    }
  }

  createPlaceholderRepoData(repoName) {
    // Only create minimal placeholder data when API completely fails
    // Do not generate fake TotalTasks or SuccessTasks
    console.log("Creating minimal placeholder data for:", repoName);

    return {
      repoName: repoName,
      languages: ["Unknown"],
      appPattern: "Unknown",
      successRate: "0%",
      repoURL: `https://github.com/Azure-Samples/${repoName}`,
      totalTasks: 0,
      successfulTasks: 0,
    };
  }

  displayRelatedTasks(tasks) {
    const tbody = document.getElementById("related-tasks-table-body");

    if (tasks.length === 0) {
      tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    No related tasks found
                </td>
            </tr>
        `;
      return;
    }

    tbody.innerHTML = "";

    tasks.forEach((task) => {
      const row = document.createElement("tr");
      row.className = "fade-in-up";

      row.innerHTML = `
            <td>
                <a href="#" class="task-id-link" data-task-id="${task.taskId}">
                    ${task.taskId}
                </a>
            </td>
            <td>${task.creationTime}</td>
            <td>${task.copilotModel}</td>
            <td>
                <span class="deploy-result-badge deploy-result-${task.deployResult.toLowerCase()}">
                    ${task.deployResult}
                </span>
            </td>
            <td>
                <span class="task-type">${task.taskType}</span>
            </td>
            <td>
                <span class="iterations-count">${task.iterations}</span>
            </td>
            <td>
                <span class="iterations-count">${task.errorDescription}</span>
            </td>
        `;

      tbody.appendChild(row);
    });

    // Bind task ID click events
    document.querySelectorAll(".task-id-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const taskId = e.target.dataset.taskId;
        window.navigateToTaskDetail(taskId);
      });
    });
  }

  loadTaskFilters(tasks) {
    // Load unique values for each filter
    const creators = [...new Set(tasks.map((task) => task.createdBy))];
    const taskIds = [...new Set(tasks.map((task) => task.taskId))];
    const models = [...new Set(tasks.map((task) => task.copilotModel))];

    // Populate filter dropdowns
    this.populateFilterDropdown("created-by-dropdown", creators);
    this.populateFilterDropdown("task-id-dropdown", taskIds);
    this.populateFilterDropdown("model-dropdown", models);
  }

  populateFilterDropdown(dropdownId, values) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    // Clear existing options except "All"
    dropdown.innerHTML =
      '<li><a class="dropdown-item" href="#" data-filter="all">all</a></li>';

    values.forEach((value) => {
      const li = document.createElement("li");
      li.innerHTML = `<a class="dropdown-item" href="#" data-filter="${value}">${value}</a>`;
      dropdown.appendChild(li);
    });
  }

  showRepoDetailLoadingState() {
    console.log("Showing repo detail loading state");

    window.viewManager.showView("repo-detail");

    // Clear previous content and show loading state
    const repoDetailTitle = document.getElementById("repo-detail-title");
    const repoDetailName = document.getElementById("repo-detail-name");
    const repoDetailLanguage = document.getElementById("repo-detail-language");
    const repoDetailAppPattern = document.getElementById(
      "repo-detail-app-pattern"
    );
    const repoDetailTotalTasks = document.getElementById(
      "repo-detail-total-tasks"
    );
    const repoDetailSuccessRate = document.getElementById(
      "repo-detail-success-rate"
    );
    const repoDetailSuccessTasks = document.getElementById(
      "repo-detail-success-tasks"
    );
    const repoDetailLink = document.getElementById("repo-detail-link");

    if (repoDetailTitle) repoDetailTitle.textContent = "Loading...";
    if (repoDetailName) repoDetailName.textContent = "Loading...";
    if (repoDetailLanguage) repoDetailLanguage.textContent = "Loading...";
    if (repoDetailAppPattern) repoDetailAppPattern.textContent = "Loading...";
    if (repoDetailTotalTasks) repoDetailTotalTasks.textContent = "...";
    if (repoDetailSuccessRate) repoDetailSuccessRate.textContent = "...";
    if (repoDetailSuccessTasks) repoDetailSuccessTasks.textContent = "...";
    if (repoDetailLink) {
      repoDetailLink.textContent = "Loading...";
      repoDetailLink.href = "#";
    }

    // Show loading spinner for success rate section
    const loadingSpinner =
      '<span class="spinner-border spinner-border-sm" role="status"></span>';

    const repoSuccessRate = document.getElementById("repo-success-rate");
    const repoSuccessFraction = document.getElementById(
      "repo-success-fraction"
    );

    if (repoSuccessRate) repoSuccessRate.innerHTML = loadingSpinner;
    if (repoSuccessFraction) repoSuccessFraction.innerHTML = loadingSpinner;

    // Show loading state for related tasks table
    const relatedTasksTableBody = document.getElementById(
      "related-tasks-table-body"
    );
    if (relatedTasksTableBody) {
      relatedTasksTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    ${loadingSpinner} Loading related tasks...
                </td>
            </tr>
        `;
    }

    // Hide the tasks loading indicator if it's visible
    const tasksLoadingIndicator = document.getElementById(
      "tasks-loading-indicator"
    );
    if (tasksLoadingIndicator) {
      tasksLoadingIndicator.classList.add("d-none");
    }
  }
}

let repoDetail;
function showRepoDetailPage(repoName) {
  if (!repoDetail) {
    repoDetail = new RepoDetail();
  }
  repoDetail.showRepoDetailLoadingState();
  repoDetail.initRepoDetailView(repoName);
  window.viewManager.showView("repo-detail");
}
