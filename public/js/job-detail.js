class JobDetail {
  constructor() {
    this.elementsInitialized = false;
    this.initializeElements();
    this.twoDimensionalAnalysis = new TwoDimensionalAnalysis();
    this.currentJob = null; // Store current job for detail view
  }initializeElements() {
    this.jobDetailView = document.getElementById("job-detail-view");

    // Check if elements exist
    if (!this.jobDetailView) {
      console.warn("Views not found, waiting for HTML to load...");
      // Wait for templates to load and retry
      const retryInitialization = () => {
        setTimeout(() => {
          console.log("⏰ Retrying element initialization...");
          this.initializeElements();
        }, 500);
      };
      
      // Listen for templates loaded event
      if (!window.templateRetryListenerAdded) {
        window.addEventListener("templatesLoaded", () => {
          console.log("📡 Templates loaded event received, retrying initialization...");
          setTimeout(() => this.initializeElements(), 100);
        });
        window.templateRetryListenerAdded = true;
      }
        // Fallback retry
      retryInitialization();
      return;
    }

    // Mark elements as initialized
    this.elementsInitialized = true;
    console.log("✅ Job detail elements initialized successfully");
    // Job detail elements
    this.jobDetailTitle = document.getElementById("job-detail-title");
    this.jobDetailId = document.getElementById("job-detail-id");
    this.jobDetailCreator = document.getElementById("job-detail-creator");
    this.jobDetailCreationTime = document.getElementById(
      "job-detail-creation-time"
    );
    this.jobDetailPoolID = document.getElementById("job-detail-pool-id");

    this.jobSuccessTasks = document.getElementById("job-success-tasks");
    this.jobFailedTasks = document.getElementById("job-failed-tasks");
    this.jobSuccessRate = document.getElementById("job-success-rate");
    this.jobAvgIterations = document.getElementById("job-avg-iterations");
    this.jobIterationsChanges = document.getElementById(
      "job-iterations-changes"
    );

    // Tool call elements
    this.toolRecommend = document.getElementById("tool-recommend");
    this.toolPredeploy = document.getElementById("tool-predeploy");
    this.toolDeploy = document.getElementById("tool-deploy");
    this.toolRegion = document.getElementById("tool-region");
    this.toolQuota = document.getElementById("tool-quota");
  }

  async initJobDetailView(jobId) {
    try {
      console.log("Navigating to job detail:", jobId);

      // Fetch job data
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jobDetail = await response.json();
      const job = jobDetail.job;
      const taskErrors = jobDetail.taskErrors;
      const classifiedResults = jobDetail.classifiedResults;
      console.log("Fetched job for detail view:", job);

      // Show job detail view with actual data
      this.showJobDetailView(job, taskErrors, classifiedResults);
    } catch (error) {
      console.error("Error navigating to job detail:", error);
      showAlert(`Failed to load job details for job ${jobId}.`, "danger");
      // Fallback to jobs view on error
      window.navigateToJobs();
    }
  }

  showJobDetailView(job, taskErrors, classifiedResults) {
    this.currentJob = job;

    // Populate job detail fields
    document.getElementById("job-detail-title").textContent =
      `${job.TestJobID}`;
    document.getElementById("job-detail-id").textContent = job.TestJobID;
    document.getElementById("job-detail-creator").textContent = job.InitiatedBy;
    document.getElementById("job-detail-creation-time").textContent =
      formatDateTime(job.CreatedTime);
    document.getElementById("job-detail-pool-id").textContent = job.PoolName;

    // Populate metrics - handle both new and old field names for compatibility
    document.getElementById("job-success-rate").textContent =
      job.SuccessRate+" ("+job.SuccessTasks+"/"+job.TaskNum+")" || "0%";    // Additional metrics from backend
    console.log("Job metrics:", job);
    document.getElementById("job-avg-iterations").textContent =
      job.AvgSuccessIteration || "10";
    
    // Fix for AvgInfraChanges - only call toFixed on numbers
    const avgInfraChanges = job.AvgInfraChanges;
    document.getElementById("job-iterations-changes").textContent = 
      (typeof avgInfraChanges === 'number' && !isNaN(avgInfraChanges)) 
        ? avgInfraChanges.toFixed(2) 
        : (avgInfraChanges || "xx");
    
    // Fix for AvgFileChanges - only call toFixed on numbers
    const avgFileChanges = job.AvgFileChanges;
    document.getElementById("job-avg-file-edits").textContent = 
      (typeof avgFileChanges === 'number' && !isNaN(avgFileChanges)) 
        ? avgFileChanges.toFixed(2) 
        : (avgFileChanges || "xx");

    // Tool call metrics
    document.getElementById("tool-recommend").textContent =
      job.RecommendCalls || 0;
    document.getElementById("tool-predeploy").textContent =
      job.PredeployCalls || 0;
    document.getElementById("tool-deploy").textContent = job.DeployCalls || 0;
    document.getElementById("tool-region").textContent = job.RegionCalls || 0;
    document.getElementById("tool-quota").textContent = job.QuotaCalls || 0;
    document.getElementById("tool-get-logs").textContent = job.GetLogsCalls || 0;


    this.populateModelStatistics(classifiedResults); // Failed tasks analysis
    this.populateFailedTasks(taskErrors);
    document.querySelectorAll(".task-name-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const taskId = e.target.dataset.taskId;
        window.navigateToTaskDetail(taskId);
      });
    });

    this.twoDimensionalAnalysis
      .loadTwoDimensionalAnalysis(job.TestJobID)
      .catch((error) => {
        console.error("Error loading two-dimensional analysis:", error);
      });
  }

  showJobDetailLoadingState() {
    window.viewManager.showView("job-detail");

    // Clear previous content and show loading state
    const jobDetailTitle = document.getElementById("job-detail-title");
    const jobDetailId = document.getElementById("job-detail-id");
    const jobDetailCreator = document.getElementById("job-detail-creator");
    const jobDetailCreationTime = document.getElementById(
      "job-detail-creation-time"
    );
    // const jobDetailDescription = document.getElementById('job-detail-description');

    if (jobDetailTitle) jobDetailTitle.textContent = "Loading...";
    if (jobDetailId) jobDetailId.textContent = "...";
    if (jobDetailCreator) jobDetailCreator.textContent = "...";
    if (jobDetailCreationTime) jobDetailCreationTime.textContent = "...";
    if (this.jobDetailPoolID)
      this.jobDetailPoolID.textContent = "...";
    // if (jobDetailDescription) jobDetailDescription.textContent = 'Loading job details...';

    // Show loading spinner for metrics
    const loadingSpinner =
      '<span class="spinner-border spinner-border-sm" role="status"></span>';

    const metricsElements = [
      "job-success-rate",
      "job-avg-iterations",
      "job-iterations-changes",
      "job-avg-file-edits",
      "tool-recommend",
      "tool-predeploy",
      "tool-deploy",
      "tool-region",
      "tool-quota",
      "tool-get-logs",
    ];

    metricsElements.forEach((elementId) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.innerHTML = loadingSpinner;
      }
    });

    // Clear model statistics and failed tasks content
    const failedTasksContent = document.getElementById("failed-tasks-content");
    if (failedTasksContent) {
      failedTasksContent.innerHTML =
        '<div class="text-center py-3">' +
        loadingSpinner +
        " Loading failed tasks...</div>";
    }
  }

  populateModelStatistics(classifiedResults) {
    const classificationContainer = document.getElementById(
      "classification-container"
    );
    if (!classificationContainer) {
      console.warn("Classification container not found");
      return;
    }

    console.log(
      "Populating model statistics with classified results:",
      classifiedResults
    ); // Define classification categories with their data sources
    const classificationCategories = [
      {
        title: "Result classified by Model",
        subtitle: "",
        data:
          (classifiedResults["Model"] && classifiedResults["Model"].data) || [],
      },
      {
        title: "Result classified by Language",
        subtitle: "",
        data:
          (classifiedResults["Language"] &&
            classifiedResults["Language"].data) ||
          [],
      },
      {
        title: "Result classified by Resource Type",
        subtitle: "Num of Compute Resource + Num of Binding Resource",
        data:
          (classifiedResults["AppPattern"] &&
            classifiedResults["AppPattern"].data) ||
          [],
      },
      {
        title: "Result classified by Repo Type",
        subtitle: "Task Name",
        data:
          (classifiedResults["RepoType"] &&
            classifiedResults["RepoType"].data) ||
          [],
      },
    ];

    // Clear existing content
    classificationContainer.innerHTML = "";

    classificationCategories.forEach((category) => {
      console.log(`Processing classification category data: ${category.data}`);
      if (category.data && category.data.length > 0) {
        const cardHTML = this.generateClassificationCard(category);
        classificationContainer.insertAdjacentHTML("beforeend", cardHTML);
        console.log(`Added classification card for: ${category.title}`);
      }
    });
  }

  populateFailedTasks(taskErrors) {
    const failedTasksContainer = document.getElementById(
      "failed-tasks-content"
    );
    if (!failedTasksContainer) {
      console.warn("Failed tasks container not found");
      return;
    }

    // Ensure taskErrors is always an array
    let failedTasksArr = [];
    if (Array.isArray(taskErrors)) {
      failedTasksArr = taskErrors;
    } else if (
      taskErrors &&
      typeof taskErrors === "object" &&
      Array.isArray(taskErrors.data)
    ) {
      failedTasksArr = taskErrors.data;
    } else if (taskErrors == null) {
      failedTasksArr = [];
    } else {
      console.warn("Unexpected taskErrors format:", taskErrors);
      failedTasksArr = [];
    }

    // Store original data for filtering
    this.originalFailedTasks = failedTasksArr;

    // Group errors by category
    const errorsByCategory = this.groupErrorsByCategory(failedTasksArr);

    // Update top error category module
    this.populateTopErrorCategory(errorsByCategory);

    // Update error categories summary
    this.populateAllErrorCategories(errorsByCategory);

    // Update failed tasks count badge
    const failedTasksCountBadge = document.getElementById("failed-tasks-count");
    if (failedTasksCountBadge) {
      failedTasksCountBadge.textContent = `${failedTasksArr.length} Failed Task${failedTasksArr.length !== 1 ? "s" : ""}`;
    }

    // Populate category filter dropdown    // Populate category filter dropdown
    this.populateCategoryFilter(errorsByCategory);

    // Render failed tasks
    this.renderFailedTasks(failedTasksArr);

    // Setup filter event listeners
    this.setupFilterEventListeners();
  }

  generateClassificationCard(category) {
    console.log(`Generating classification card for: ${category.title}`);
    const subtitleHTML = category.subtitle
      ? `<div class="classification-subtitle">${category.subtitle}</div>`
      : "";

    const itemsHTML = category.data
      .map(
        (item) => `
            <div class="classification-item">
                <span class="model-name">${item.Type}</span>
                <span class="model-stats">
                    Success Rate: ${item.SuccessRate || "0%"} (${item.SuccessNum || 0}/${item.TaskNum || 0}) |
                    Avg Iteration: ${item.AvgSuccessIteration || 0}
                </span>
            </div>
        `
      )
      .join("");

    return `
            <div class="col-md-6 mb-4">
                <div class="classification-card">
                    <div class="classification-header">
                        <h5>${category.title}</h5>
                    </div>
                    <div class="classification-content">
                        ${subtitleHTML}
                        ${itemsHTML}
                    </div>
                </div>
            </div>
        `;
  }

  groupErrorsByCategory(failedTasks) {
    const categories = {};
    failedTasks.forEach((task) => {
      // Normalize category, handle undefined/null/empty cases
      let category = task.ErrorCategory;
      if (
        !category ||
        category === "undefined" ||
        category === "null" ||
        category.trim() === ""
      ) {
        category = "General Error";
      }

      if (!categories[category]) {
        categories[category] = {
          count: 0,
          tasks: [],
        };
      }
      categories[category].count++;
      categories[category].tasks.push(task);
    });

    // Sort categories by count (descending)
    return Object.entries(categories)
      .sort(([, a], [, b]) => b.count - a.count)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  }

  populateTopErrorCategory(errorsByCategory) {
    const entries = Object.entries(errorsByCategory);
    if (entries.length === 0) {
      this.updateTopErrorDisplay(null);
      return;
    }

    // Get the most frequent error category
    const [topCategory, topData] = entries[0];

    // Calculate percentage of this error type
    const totalErrors = Object.values(errorsByCategory).reduce(
      (sum, data) => sum + data.count,
      0
    );
    const percentage = ((topData.count / totalErrors) * 100).toFixed(1);

    this.updateTopErrorDisplay({
      category: topCategory,
      count: topData.count,
      percentage: percentage,
      patterns: this.analyzeErrorPatterns(topData.tasks),
    });
  }

  populateAllErrorCategories(errorsByCategory) {
    const errorCategoriesContainer = document.getElementById(
      "error-categories-container"
    );
    if (!errorCategoriesContainer) {
      console.warn("Error categories container not found");
      return;
    }

    const totalErrors = Object.values(errorsByCategory).reduce(
      (sum, data) => sum + data.count,
      0
    );

    const categoriesHTML = Object.entries(errorsByCategory)
      .map(([category, data]) => {
        const percentage = ((data.count / totalErrors) * 100).toFixed(1);
        const patterns = this.analyzeErrorPatterns(data.tasks);
        const patternsHTML = patterns
          .map(
            (pattern) => `
                <div class="error-pattern-item">
                    <div class="d-flex justify-content-between">
                                               <span>${pattern.pattern}</span>
                        <span class="text-muted">${pattern.count}x</span>
                    </div>
                </div>
            `
          )
          .join("");

        return `
                <div class="col-md-6 mb-4">
                    <div class="error-category-card">
                        <div class="error-category-stat p-3">
                            <div class="d-flex align-items-center mb-3">
                                <div class="error-category-icon me-3">
                                    <i class="bi bi-exclamation-triangle"></i>
                                </div>
                                <div>
                                    <h4 class="mb-1">${category}</h4>
                                    <div class="error-count text-muted">
                                        ${data.count} occurrence${data.count !== 1 ? "s" : ""} (${percentage}%)
                                    </div>
                                </div>
                            </div>
                            <div class="error-patterns">
                                <h6 class="mb-2">Common Patterns:</h6>
                                ${patternsHTML}
                            </div>
                            <div class="error-trend mt-3">
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar bg-danger" role="progressbar" 
                                        style="width: ${percentage}%" 
                                        aria-valuenow="${percentage}" 
                                        aria-valuemin="0" 
                                        aria-valuemax="100">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      })
      .join("");

    errorCategoriesContainer.innerHTML = categoriesHTML;
  }

  populateCategoryFilter(errorsByCategory) {
    console.log("populateCategoryFilter called with:", errorsByCategory);

    const categoryFilter = document.getElementById("category-filter");
    if (!categoryFilter) return;

    // Get unique categories from the data, filter out undefined/null values
    const categories = Object.keys(errorsByCategory)
      .filter(
        (category) =>
          category && category !== "undefined" && category !== "null"
      )
      .sort();

    console.log("Filtered categories:", categories);

    // Clear existing options except "All Categories"
    const options = categoryFilter.querySelectorAll(
      'option:not([value="all"])'
    );
    options.forEach((option) => option.remove());

    // Add categories from actual data
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      const count = errorsByCategory[category].count;
      console.log(`Category: ${category}, Count: ${count}`);
      option.textContent = `${category} (${count})`;
      categoryFilter.appendChild(option);
    });
  }

  renderFailedTasks(tasks) {
    const failedTasksContainer = document.getElementById(
      "failed-tasks-content"
    );
    if (!failedTasksContainer) return;

    if (tasks.length === 0) {
      failedTasksContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-search text-muted" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">No failed tasks found for the current filters.</p>
                </div>
            `;
      return;
    }    // Generate HTML for failed tasks using Bootstrap row/col structure
    const failedTasksHTML = tasks
      .map((task) => {
        // Normalize error category, handle undefined/null cases
        const errorCategory = task.ErrorCategory || "General Error";
        const taskName = task.TaskID || "Unknown Task";
        
        // Determine success status styling based on IsSuccessful property
        let statusText = "";
        let statusClass = "";
        
        if (task.IsSuccessful === true) {
          statusText = "Success";
          statusClass = "badge bg-success";
        } else if (task.IsSuccessful === false) {
          statusText = "Failed";
          statusClass = "badge bg-danger";
        } else {
          statusText = "Unknown";
          statusClass = "badge bg-secondary";
        }

        return `
                <div class="failed-task-item" data-category="${errorCategory}" data-task-name="${taskName.toLowerCase()}">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <a href="/task-detail/${task.TaskID}" class="task-name-link" data-task-id="${task.TaskID}">${taskName}</a>
                        </div>
                        <div class="col-md-1">
                            <span class="${statusClass}">${statusText}</span>
                        </div>
                        <div class="col-md-1">
                            <span class="created-date">${formatDateTime(task.CreatedDate)}</span>
                        </div>
                        <div class="col-md-1">
                            <span class="error-category badge bg-danger-subtle text-danger">${errorCategory}</span>
                        </div>
                        <div class="col-md-2">
                            <span class="error-description">${task.ErrorDescription || "No error description available"}</span>
                        </div>
                        <div class="col-md-5">
                            <span class="error-description">${task.ErrorDetail || "No error details available"}</span>
                        </div>
                    </div>
                </div>
            `;
      })
      .join("");

    failedTasksContainer.innerHTML = failedTasksHTML;
  }

  setupFilterEventListeners() {
    const categoryFilter = document.getElementById("category-filter");
    const clearFilterBtn = document.getElementById("clear-filter-btn");
    const taskSearch = document.getElementById("task-search");

    if (categoryFilter) {
      // Remove existing event listener to avoid duplicates
      categoryFilter.removeEventListener("change", this.handleCategoryFilter);

      // Add new event listener
      this.handleCategoryFilter = (e) => {
        const selectedCategory = e.target.value;
        this.applyFilters();
      };

      categoryFilter.addEventListener("change", this.handleCategoryFilter);
    }

    if (taskSearch) {
      // Remove existing event listener to avoid duplicates
      taskSearch.removeEventListener("input", this.handleTaskSearch);

      // Add new event listener with debounce
      this.handleTaskSearch = debounce((e) => {
        this.applyFilters();
      }, 300);

      taskSearch.addEventListener("input", this.handleTaskSearch);
    }

    if (clearFilterBtn) {
      // Remove existing event listener to avoid duplicates
      clearFilterBtn.removeEventListener("click", this.handleClearFilter);

      // Add new event listener
      this.handleClearFilter = () => {
        this.clearFilters();
      };

      clearFilterBtn.addEventListener("click", this.handleClearFilter);
    }
  }

  updateTopErrorDisplay(data) {
    // Update top error category display
    const categoryElem = document.getElementById("top-error-category");
    const countElem = document.getElementById("top-error-count");
    const percentageElem = document.getElementById("top-error-percentage");
    const progressElem = document.getElementById("top-error-progress");
    const patternsElem = document.getElementById("top-error-patterns");

    if (!data) {
      categoryElem.textContent = "No Errors";
      countElem.innerHTML = '<span class="count">0</span> occurrences';
      percentageElem.textContent = "0%";
      progressElem.style.width = "0%";
      progressElem.setAttribute("aria-valuenow", "0");
      patternsElem.innerHTML =
        '<div class="error-pattern-item text-success">No error patterns to display</div>';
      return;
    }

    categoryElem.textContent = data.category;
    countElem.innerHTML = `<span class="count">${data.count}</span> occurrence${data.count !== 1 ? "s" : ""}`;
    percentageElem.textContent = `${data.percentage}%`;
    progressElem.style.width = `${data.percentage}%`;
    progressElem.setAttribute("aria-valuenow", data.percentage);

    // Display error patterns
    patternsElem.innerHTML = data.patterns
      .map(
        (pattern) => `
            <div class="error-pattern-item">
                <div class="d-flex justify-content-between">
                    <span>${pattern.pattern}</span>
                    <span class="text-muted">${pattern.count}x</span>
                </div>
            </div>
        `
      )
      .join("");
  }

  analyzeErrorPatterns(tasks) {
    // Group similar error descriptions
    const patterns = {};
    tasks.forEach((task) => {
      const description = task.ErrorDescription || "Unknown error";
      // Simplified pattern matching - you could make this more sophisticated
      const pattern = task.ErrorCategory;
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    });

    // Convert to array and sort by frequency
    return Object.entries(patterns)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Show top 3 patterns
  }

  /**
   * Apply filters to the failed tasks list based on category and search text
   */
  applyFilters() {
    // Get filter values
    const categoryFilter = document.getElementById("category-filter");
    const taskSearch = document.getElementById("task-search");
    const clearFilterBtn = document.getElementById("clear-filter-btn");
    
    if (!this.originalFailedTasks) {
      console.warn("No original task data available for filtering");
      return;
    }

    const selectedCategory = categoryFilter ? categoryFilter.value : "all";
    const searchText = taskSearch ? taskSearch.value.toLowerCase() : "";

    // Show or hide clear filter button based on if filters are active
    if (clearFilterBtn) {
      if (selectedCategory !== "all" || searchText) {
        clearFilterBtn.style.display = "inline-block";
      } else {
        clearFilterBtn.style.display = "none";
      }
    }

    // Apply filters
    let filteredTasks = [...this.originalFailedTasks];

    // Apply category filter
    if (selectedCategory !== "all") {
      filteredTasks = filteredTasks.filter(task => {
        const taskCategory = task.ErrorCategory || "General Error";
        return taskCategory === selectedCategory;
      });
    }

    // Apply search filter
    if (searchText) {
      filteredTasks = filteredTasks.filter(task => {
        const taskName = task.TaskID || "Unknown Task";
        const errorDesc = task.ErrorDescription || "";
        const errorDetail = task.ErrorDetail || "";
        
        // Search in task name, error description and detail
        return taskName.toLowerCase().includes(searchText) || 
               errorDesc.toLowerCase().includes(searchText) ||
               errorDetail.toLowerCase().includes(searchText);
      });
    }

    // Update the filtered task count
    const failedTasksCountBadge = document.getElementById("failed-tasks-count");
    if (failedTasksCountBadge) {
      failedTasksCountBadge.textContent = `${filteredTasks.length} Failed Task${filteredTasks.length !== 1 ? "s" : ""}`;
      // Add a filtered indicator if filters are active
      if (selectedCategory !== "all" || searchText) {
        failedTasksCountBadge.textContent += " (filtered)";
      }
    }

    // Render the filtered tasks
    this.renderFailedTasks(filteredTasks);
  }

  /**
   * Clear all applied filters and reset to original state
   */
  clearFilters() {
    const categoryFilter = document.getElementById("category-filter");
    const taskSearch = document.getElementById("task-search");
    const clearFilterBtn = document.getElementById("clear-filter-btn");
    
    // Reset filter elements
    if (categoryFilter) categoryFilter.value = "all";
    if (taskSearch) taskSearch.value = "";
    if (clearFilterBtn) clearFilterBtn.style.display = "none";
    
    // Restore original task list
    if (this.originalFailedTasks) {
      // Update the task count badge
      const failedTasksCountBadge = document.getElementById("failed-tasks-count");
      if (failedTasksCountBadge) {
        failedTasksCountBadge.textContent = `${this.originalFailedTasks.length} Failed Task${this.originalFailedTasks.length !== 1 ? "s" : ""}`;
      }
      
      // Render the original tasks
      this.renderFailedTasks(this.originalFailedTasks);
    }
  }
}

class TwoDimensionalAnalysis {
  async loadTwoDimensionalAnalysis(jobId) {
    try {
      console.log("Loading two-dimensional analysis for job:", jobId);
      this.currentJobId = jobId;
      this.setupTwoDimensionalControls();
      await this.generateMatrix();
    } catch (error) {
      console.error("Error loading two-dimensional analysis:", error);
      this.showMatrixErrorState();
    }
  }
  setupTwoDimensionalControls() {
    // Dimension selectors
    const xDimension = document.getElementById("x-dimension");
    const yDimension = document.getElementById("y-dimension");
    const showValues = document.getElementById("show-values");
    const colorCoding = document.getElementById("color-coding");
    const generateBtn = document.getElementById("generate-matrix-btn");
    const exportBtn = document.getElementById("export-matrix-btn");

    if (xDimension) {
      xDimension.addEventListener("change", async () => {
        await this.onDimensionChange();
      });
    }

    if (yDimension) {
      yDimension.addEventListener("change", async () => {
        await this.onDimensionChange();
      });
    }

    if (showValues) {
      showValues.addEventListener("change", () => this.updateMatrixDisplay());
    }

    if (colorCoding) {
      colorCoding.addEventListener("change", () => this.updateMatrixDisplay());
    }

    if (generateBtn) {
      generateBtn.addEventListener("click", async () => {
        await this.generateMatrix();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportMatrix());
    }
  }

  async generateMatrix() {
    this.showMatrixLoadingState();

    try {
      const jobId = this.currentJobId;

      console.log("Fetching fresh task data for job:", jobId);

      // Call the /:jobId/tasks route to get fresh data
      const response = await fetch(`/api/jobs/${jobId}/tasks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tasksResponse = await response.json();
      console.log("Fresh tasks data received:", tasksResponse);

      // Extract tasks data from response
      const tasksData =
        tasksResponse.data || tasksResponse.tasks || tasksResponse;

      if (!tasksData || tasksData.length === 0) {
        console.warn("No task data available for matrix generation");
        this.showMatrixErrorState();
        return;
      }

      // Update the stored analysis data
      this.analysisTasksData = tasksData; // Get selected dimensions (no metric type needed anymore)
      const xDimension =
        document.getElementById("x-dimension")?.value || "CopilotModel";
      const yDimension =
        document.getElementById("y-dimension")?.value || "Languages";

      console.log("Generating matrix with fresh data:", {
        jobId,
        taskCount: tasksData.length,
        xDimension,
        yDimension,
      });

      // Process data and create matrix
      const matrixData = this.processMatrixData(xDimension, yDimension);

      // Render the matrix
      this.renderMatrix(matrixData, xDimension, yDimension);

      // Update summary statistics
      this.updateMatrixSummary(matrixData);

      // Show results
      const loadingEl = document.getElementById("matrix-loading");
      const containerEl = document.getElementById("matrix-container");
      const legendEl = document.getElementById("matrix-legend");
      const summaryEl = document.getElementById("matrix-summary");

      if (loadingEl) loadingEl.style.display = "none";
      if (containerEl) containerEl.style.display = "block";
      if (legendEl) legendEl.style.display = "block";
      if (summaryEl) summaryEl.style.display = "block";
    } catch (error) {
      console.error("Error generating matrix with fresh data:", error);
      this.showMatrixErrorState();
    }
  }

  showMatrixErrorState() {
    const loadingEl = document.getElementById("matrix-loading");
    const containerEl = document.getElementById("matrix-container");
    const emptyEl = document.getElementById("matrix-empty");
    const legendEl = document.getElementById("matrix-legend");
    const summaryEl = document.getElementById("matrix-summary");

    if (loadingEl) loadingEl.style.display = "none";
    if (containerEl) containerEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "block";
    if (legendEl) legendEl.style.display = "none";
    if (summaryEl) summaryEl.style.display = "none";
  }

  updateMatrixDisplay() {
    // Re-render matrix with current settings
    if (this.lastMatrixData) {
      this.renderMatrix(
        this.lastMatrixData,
        this.lastMatrixData.xDimension,
        this.lastMatrixData.yDimension
      );
    }
  }

  renderMatrix(matrixData, xDimension, yDimension) {
    const table = document.getElementById("matrix-table");
    if (!table) return;

    const { matrix, cellData, xValues, yValues } = matrixData;

    // Calculate totals
    const xTotals = this.calculateXTotals(cellData, xValues, yValues);
    const yTotals = this.calculateYTotals(cellData, xValues, yValues);
    const grandTotal = this.calculateGrandTotal(cellData, xValues, yValues);

    // Create header with totals column
    const headerRow = document.getElementById("matrix-header");
    if (headerRow) {
      let headerHTML = `<th scope="col">${yDimension} \\ ${xDimension}</th>`;
      xValues.forEach((xVal) => {
        headerHTML += `<th scope="col">${xVal}</th>`;
      });
      headerHTML += `<th scope="col" class="total-column"><strong>Total</strong></th>`;
      headerRow.innerHTML = headerHTML;
    }

    // Create body with totals for each row
    const tbody = document.getElementById("matrix-body");
    if (tbody) {
      let bodyHTML = "";

      yValues.forEach((yVal) => {
        bodyHTML += `<tr><th scope="row">${yVal}</th>`;

        // Regular data cells
        xValues.forEach((xVal) => {
          const cellInfo = cellData[yVal][xVal];
          const metrics = cellInfo.metrics;
          const count = cellInfo.count;

          let cellClass = "matrix-cell";
          let cellContent = "";

          if (metrics !== null && count > 0) {
            // Determine performance class based on success rate
            cellClass +=
              " " +
              this.getPerformanceClass(metrics.successRate, "successRate");

            const showValues =
              document.getElementById("show-values")?.checked !== false;

            if (showValues) {
              cellContent = `
                                <div class="matrix-cell-content">
                                    <div class="matrix-metric-line">Success Rate: ${metrics.successRate}% (${metrics.successfulCount}/${metrics.totalTasks})</div>
                                    <div class="matrix-metric-line">Avg Interactions: ${metrics.avgInteractions}</div>
                                    <div class="matrix-metric-line">Avg File Edits: ${metrics.avgFileEdits}</div>
                                </div>
                            `;
            } else {
              cellContent = `
                                <div class="matrix-cell-content">
                                    <div class="matrix-cell-count">${count} task${count !== 1 ? "s" : ""}</div>
                                </div>
                            `;
            }
          } else {
            cellClass += " no-data";
            cellContent = `
                            <div class="matrix-cell-content">
                                <div class="matrix-metric-line">No data</div>
                                <div class="matrix-cell-count">0 tasks</div>
                            </div>
                        `;
          }

          bodyHTML += `<td><div class="${cellClass}" title="${this.getCellTooltip(cellInfo, xVal, yVal)}">${cellContent}</div></td>`;
        });

        // Row total cell
        const yTotal = yTotals[yVal];
        const showValues =
          document.getElementById("show-values")?.checked !== false;
        let totalCellClass = "matrix-cell total-cell";
        totalCellClass +=
          " " + this.getPerformanceClass(yTotal.successRate, "successRate");

        let totalCellContent = "";
        if (showValues) {
          totalCellContent = `
                        <div class="matrix-cell-content">
                            <div class="matrix-metric-line"><strong>Success Rate: ${yTotal.successRate}% (${yTotal.successfulCount}/${yTotal.totalTasks})</strong></div>
                            <div class="matrix-metric-line"><strong>Avg Interactions: ${yTotal.avgInteractions}</strong></div>
                            <div class="matrix-metric-line"><strong>Avg File Edits: ${yTotal.avgFileEdits}</strong></div>
                        </div>
                    `;
        } else {
          totalCellContent = `
                        <div class="matrix-cell-content">
                            <div class="matrix-cell-count"><strong>${yTotal.totalTasks} task${yTotal.totalTasks !== 1 ? "s" : ""}</strong></div>
                        </div>
                    `;
        }

        bodyHTML += `<td><div class="${totalCellClass}" title="Row total for ${yVal}">${totalCellContent}</div></td>`;
        bodyHTML += "</tr>";
      });

      // Add total row
      bodyHTML += `<tr class="total-row"><th scope="row"><strong>Total</strong></th>`;

      // Column totals
      xValues.forEach((xVal) => {
        const xTotal = xTotals[xVal];
        const showValues =
          document.getElementById("show-values")?.checked !== false;
        let totalCellClass = "matrix-cell total-cell";
        totalCellClass +=
          " " + this.getPerformanceClass(xTotal.successRate, "successRate");

        let totalCellContent = "";
        if (showValues) {
          totalCellContent = `
                        <div class="matrix-cell-content">
                            <div class="matrix-metric-line"><strong>Success Rate: ${xTotal.successRate}% (${xTotal.successfulCount}/${xTotal.totalTasks})</strong></div>
                            <div class="matrix-metric-line"><strong>Avg Interactions: ${xTotal.avgInteractions}</strong></div>
                            <div class="matrix-metric-line"><strong>Avg File Edits: ${xTotal.avgFileEdits}</strong></div>
                        </div>
                    `;
        } else {
          totalCellContent = `
                        <div class="matrix-cell-content">
                            <div class="matrix-cell-count"><strong>${xTotal.totalTasks} task${xTotal.totalTasks !== 1 ? "s" : ""}</strong></div>
                        </div>
                    `;
        }

        bodyHTML += `<td><div class="${totalCellClass}" title="Column total for ${xVal}">${totalCellContent}</div></td>`;
      });

      // Grand total cell
      const showValues =
        document.getElementById("show-values")?.checked !== false;
      let grandTotalCellClass = "matrix-cell grand-total-cell";
      grandTotalCellClass +=
        " " + this.getPerformanceClass(grandTotal.successRate, "successRate");

      let grandTotalCellContent = "";
      if (showValues) {
        grandTotalCellContent = `
                    <div class="matrix-cell-content">
                        <div class="matrix-metric-line"><strong>Success Rate: ${grandTotal.successRate}% (${grandTotal.successfulCount}/${grandTotal.totalTasks})</strong></div>
                        <div class="matrix-metric-line"><strong>Avg Interactions: ${grandTotal.avgInteractions}</strong></div>
                        <div class="matrix-metric-line"><strong>Avg File Edits: ${grandTotal.avgFileEdits}</strong></div>
                    </div>
                `;
      } else {
        grandTotalCellContent = `
                    <div class="matrix-cell-content">
                        <div class="matrix-cell-count"><strong>${grandTotal.totalTasks} task${grandTotal.totalTasks !== 1 ? "s" : ""}</strong></div>
                    </div>
                `;
      }

      bodyHTML += `<td><div class="${grandTotalCellClass}" title="Grand total">${grandTotalCellContent}</div></td>`;
      bodyHTML += "</tr>";

      tbody.innerHTML = bodyHTML;
    }
  }

  updateMatrixSummary(matrixData) {
    const { cellData, xValues, yValues } = matrixData;

    let totalCombinations = xValues.length * yValues.length;
    let coveredCombinations = 0;
    let bestSuccessRate = null;
    let bestCombination = "";

    // Count covered combinations and find best success rate
    yValues.forEach((yVal) => {
      xValues.forEach((xVal) => {
        const cellInfo = cellData[yVal][xVal];
        if (cellInfo.count > 0) {
          coveredCombinations++;

          const metrics = cellInfo.metrics;
          if (metrics && metrics.successRate !== null) {
            if (
              bestSuccessRate === null ||
              metrics.successRate > bestSuccessRate
            ) {
              bestSuccessRate = metrics.successRate;
              bestCombination = `${yVal} + ${xVal}`;
            }
          }
        }
      });
    });

    const coverage = Math.round(
      (coveredCombinations / totalCombinations) * 100
    );

    // Update summary elements
    const totalEl = document.getElementById("matrix-total-combinations");
    const coveredEl = document.getElementById("matrix-covered-combinations");
    const bestEl = document.getElementById("matrix-best-combination");
    const coverageEl = document.getElementById("matrix-coverage-percentage");

    if (totalEl) totalEl.textContent = totalCombinations;
    if (coveredEl) coveredEl.textContent = coveredCombinations;
    if (bestEl) {
      bestEl.textContent =
        bestSuccessRate !== null
          ? `${bestCombination} (${bestSuccessRate}%)`
          : "N/A";
    }
    if (coverageEl) coverageEl.textContent = `${coverage}%`;

    // Store for potential re-rendering
    this.lastMatrixData = matrixData;
  }

  // Helper function to calculate totals for X dimension (columns)
  calculateXTotals(cellData, xValues, yValues) {
    const xTotals = {};

    xValues.forEach((xVal) => {
      let totalTasks = 0;
      let totalSuccessful = 0;
      let totalInteractions = 0;
      let totalFileEdits = 0;
      let successfulTasksCount = 0;

      yValues.forEach((yVal) => {
        const cellInfo = cellData[yVal][xVal];
        if (cellInfo.metrics && cellInfo.count > 0) {
          totalTasks += cellInfo.metrics.totalTasks;
          totalSuccessful += cellInfo.metrics.successfulCount;

          // Only count interactions and edits from successful tasks
          if (cellInfo.metrics.successfulCount > 0) {
            totalInteractions +=
              cellInfo.metrics.avgInteractions *
              cellInfo.metrics.successfulCount;
            totalFileEdits +=
              cellInfo.metrics.avgFileEdits * cellInfo.metrics.successfulCount;
            successfulTasksCount += cellInfo.metrics.successfulCount;
          }
        }
      });

      const successRate =
        totalTasks > 0 ? Math.round((totalSuccessful / totalTasks) * 100) : 0;
      const avgInteractions =
        successfulTasksCount > 0
          ? Math.round((totalInteractions / successfulTasksCount) * 10) / 10
          : 0;
      const avgFileEdits =
        successfulTasksCount > 0
          ? Math.round((totalFileEdits / successfulTasksCount) * 10) / 10
          : 0;

      xTotals[xVal] = {
        totalTasks,
        successfulCount: totalSuccessful,
        successRate,
        avgInteractions,
        avgFileEdits,
      };
    });

    return xTotals;
  }

  // Helper function to calculate totals for Y dimension (rows)
  calculateYTotals(cellData, xValues, yValues) {
    const yTotals = {};

    yValues.forEach((yVal) => {
      let totalTasks = 0;
      let totalSuccessful = 0;
      let totalInteractions = 0;
      let totalFileEdits = 0;
      let successfulTasksCount = 0;

      xValues.forEach((xVal) => {
        const cellInfo = cellData[yVal][xVal];
        if (cellInfo.metrics && cellInfo.count > 0) {
          totalTasks += cellInfo.metrics.totalTasks;
          totalSuccessful += cellInfo.metrics.successfulCount;

          // Only count interactions and edits from successful tasks
          if (cellInfo.metrics.successfulCount > 0) {
            totalInteractions +=
              cellInfo.metrics.avgInteractions *
              cellInfo.metrics.successfulCount;
            totalFileEdits +=
              cellInfo.metrics.avgFileEdits * cellInfo.metrics.successfulCount;
            successfulTasksCount += cellInfo.metrics.successfulCount;
          }
        }
      });

      const successRate =
        totalTasks > 0 ? Math.round((totalSuccessful / totalTasks) * 100) : 0;
      const avgInteractions =
        successfulTasksCount > 0
          ? Math.round((totalInteractions / successfulTasksCount) * 10) / 10
          : 0;
      const avgFileEdits =
        successfulTasksCount > 0
          ? Math.round((totalFileEdits / successfulTasksCount) * 10) / 10
          : 0;

      yTotals[yVal] = {
        totalTasks,
        successfulCount: totalSuccessful,
        successRate,
        avgInteractions,
        avgFileEdits,
      };
    });

    return yTotals;
  }

  // Helper function to calculate grand total
  calculateGrandTotal(cellData, xValues, yValues) {
    let totalTasks = 0;
    let totalSuccessful = 0;
    let totalInteractions = 0;
    let totalFileEdits = 0;
    let successfulTasksCount = 0;

    yValues.forEach((yVal) => {
      xValues.forEach((xVal) => {
        const cellInfo = cellData[yVal][xVal];
        if (cellInfo.metrics && cellInfo.count > 0) {
          totalTasks += cellInfo.metrics.totalTasks;
          totalSuccessful += cellInfo.metrics.successfulCount;

          if (cellInfo.metrics.successfulCount > 0) {
            totalInteractions +=
              cellInfo.metrics.avgInteractions *
              cellInfo.metrics.successfulCount;
            totalFileEdits +=
              cellInfo.metrics.avgFileEdits * cellInfo.metrics.successfulCount;
            successfulTasksCount += cellInfo.metrics.successfulCount;
          }
        }
      });
    });

    const successRate =
      totalTasks > 0 ? Math.round((totalSuccessful / totalTasks) * 100) : 0;
    const avgInteractions =
      successfulTasksCount > 0
        ? Math.round((totalInteractions / successfulTasksCount) * 10) / 10
        : 0;
    const avgFileEdits =
      successfulTasksCount > 0
        ? Math.round((totalFileEdits / successfulTasksCount) * 10) / 10
        : 0;

    return {
      totalTasks,
      successfulCount: totalSuccessful,
      successRate,
      avgInteractions,
      avgFileEdits,
    };
  }

  exportMatrix() {
    if (!this.lastMatrixData) {
      alert("No matrix data to export. Please generate a matrix first.");
      return;
    }

    const { cellData, xValues, yValues, xDimension, yDimension } =
      this.lastMatrixData;

    // Create CSV content with all metrics
    let csvContent = `${yDimension}\\${xDimension},${xValues.join(",")}\n`;
    yValues.forEach((yVal) => {
      const row = [yVal];
      xValues.forEach((xVal) => {
        const cellInfo = cellData[yVal][xVal];
        if (cellInfo.metrics && cellInfo.count > 0) {
          const metrics = cellInfo.metrics;
          row.push(
            `"Success: ${metrics.successRate}% (${metrics.successfulCount}/${metrics.totalTasks}), Interactions: ${metrics.avgInteractions}, Edits: ${metrics.avgFileEdits}"`
          );
        } else {
          row.push("-");
        }
      });
      csvContent += row.join(",") + "\n";
    });

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `matrix_${xDimension}_vs_${yDimension}_metrics.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  showMatrixLoadingState() {
    const loadingEl = document.getElementById("matrix-loading");
    const containerEl = document.getElementById("matrix-container");
    const emptyEl = document.getElementById("matrix-empty");
    const legendEl = document.getElementById("matrix-legend");
    const summaryEl = document.getElementById("matrix-summary");

    if (loadingEl) loadingEl.style.display = "block";
    if (containerEl) containerEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "none";
    if (legendEl) legendEl.style.display = "none";
    if (summaryEl) summaryEl.style.display = "none";
  }

  processMatrixData(xDimension, yDimension) {
    const tasks = this.analysisTasksData;
    console.log(
      "Processing matrix data with dimensions:",
      xDimension,
      yDimension
    );

    // Get unique values for each dimension
    const xValues = [
      ...new Set(
        tasks
          .map((task) => this.getDimensionValue(task, xDimension))
          .filter(Boolean)
      ),
    ].sort();
    const yValues = [
      ...new Set(
        tasks
          .map((task) => this.getDimensionValue(task, yDimension))
          .filter(Boolean)
      ),
    ].sort();

    // Create matrix
    const matrix = {};
    const cellData = {};

    yValues.forEach((yVal) => {
      matrix[yVal] = {};
      cellData[yVal] = {};

      xValues.forEach((xVal) => {
        // Find tasks matching this combination
        const matchingTasks = tasks.filter(
          (task) =>
            this.getDimensionValue(task, xDimension) === xVal &&
            this.getDimensionValue(task, yDimension) === yVal
        );

        if (matchingTasks.length > 0) {
          // Calculate all metrics for this cell
          const metrics = this.calculateCellMetrics(matchingTasks);
          matrix[yVal][xVal] = metrics;
          cellData[yVal][xVal] = {
            tasks: matchingTasks,
            count: matchingTasks.length,
            metrics: metrics,
          };
        } else {
          matrix[yVal][xVal] = null;
          cellData[yVal][xVal] = {
            tasks: [],
            count: 0,
            metrics: null,
          };
        }
      });
    });

    return {
      matrix,
      cellData,
      xValues,
      yValues,
      xDimension,
      yDimension,
    };
  }

  getDimensionValue(task, dimension) {
    switch (dimension) {
      case "IaCType":
        return (
          task.IaCType ||
          task.InfrastructureType ||
          (task.UseTerraform ? "Terraform" : "Bicep") ||
          "Unknown"
        );
      case "CopilotModel":
        return task.CopilotModel || task.Model || "Unknown";
      case "Languages":
        // Handle Languages array (from new API response) or single Language field
        if (task.Languages && Array.isArray(task.Languages)) {
          return task.Languages.join(", ");
        }
        return task.Language || task.ProgrammingLanguage || "Unknown";
      case "RepoType":
        return task.RepoType || task.RepositoryType || "Unknown";
      case "AppPattern":
        return task.AppPattern || task.ApplicationPattern || "Unknown";
      default:
        return "Unknown";
    }
  }

  calculateCellMetrics(tasks) {
    if (tasks.length === 0) return null;

    // Separate successful and all tasks
    const successfulTasks = tasks.filter(
      (task) => task.IsSuccessful === true || task.IsSuccessful === "true"
    );
    const totalTasks = tasks.length;
    const successfulCount = successfulTasks.length;

    // Calculate success rate
    const successRate = Math.round((successfulCount / totalTasks) * 100);

    // Calculate average interactions for successful tasks only
    let avgInteractions = 0;
    if (successfulTasks.length > 0) {
      const totalInteractions = successfulTasks.reduce((sum, task) => {
        return sum + (task.Iterations || 0);
      }, 0);
      avgInteractions =
        Math.round((totalInteractions / successfulTasks.length) * 10) / 10;
    }

    // Calculate average file edits for successful tasks only
    let avgFileEdits = 0;
    if (successfulTasks.length > 0) {
      const totalEdits = successfulTasks.reduce((sum, task) => {
        return sum + (task.FileEditsNum || 0);
      }, 0);
      avgFileEdits =
        Math.round((totalEdits / successfulTasks.length) * 10) / 10;
    }

    return {
      successRate,
      successfulCount,
      totalTasks,
      avgInteractions,
      avgFileEdits,
    };
  }

  getCellTooltip(cellInfo, xVal, yVal) {
    if (cellInfo.count === 0) {
      return `No tasks found for ${yVal} + ${xVal}`;
    }

    const metrics = cellInfo.metrics;
    if (metrics) {
      return `${yVal} + ${xVal}\n${cellInfo.count} task(s)\nSuccess Rate: ${metrics.successRate}%\nAvg Interactions: ${metrics.avgInteractions}\nAvg File Edits: ${metrics.avgFileEdits}`;
    }

    return `${yVal} + ${xVal}\n${cellInfo.count} task(s)`;
  }

  getPerformanceClass(value, metricType) {
    switch (metricType) {
      case "successRate":
        if (value >= 80) return "high-performance";
        if (value >= 50) return "medium-performance";
        return "low-performance";

      case "taskCount":
        if (value >= 10) return "high-performance";
        if (value >= 5) return "medium-performance";
        return "low-performance";

      case "avgInteractions":
      case "avgToolCalls":
        // Lower is better for these metrics
        if (value <= 5) return "high-performance";
        if (value <= 10) return "medium-performance";
        return "low-performance";

      case "avgChanges":
        // Lower is better
        if (value <= 3) return "high-performance";
        if (value <= 6) return "medium-performance";
        return "low-performance";

      default:
        return "medium-performance";
    }
  }
}

let jobDetail;
function showJobDetailPage(jobId) {
  if (!jobDetail) {
    jobDetail = new JobDetail();
  }
  
  // Check if elements are initialized before proceeding
  if (!jobDetail.elementsInitialized) {
    console.warn("⚠️ Elements not initialized yet, waiting...");
    // Retry after a short delay
    setTimeout(() => {
      showJobDetailPage(jobId);
    }, 200);
    return;
  }
  
  jobDetail.showJobDetailLoadingState();
  jobDetail.initJobDetailView(jobId);
  window.viewManager.showView("job-detail");
}
