// Job Compare JavaScript
class JobCompare {
  constructor() {
    this.selectedJobIds = [];
    this.jobsData = [];
    this.comparisonData = {};

    // Don't automatically initialize - wait for loadJobs call
    this.bindEvents();
  }

  // New method to load jobs with provided IDs
  async loadJobs(jobIds) {
    console.log("JobCompare.loadJobs called with:", jobIds);
    this.selectedJobIds = jobIds || [];

    if (this.selectedJobIds.length < 2) {
      this.showNoJobsSelected();
    } else {
      await this.loadJobsForComparison();
    }
  }

  init() {
    this.bindEvents();
    this.loadSelectedJobs();
  }

  bindEvents() {
    // Back to jobs button
    const backBtn = document.getElementById("back-to-jobs-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        window.navigateToJobs();
      });
    }

    // Select jobs button (from no jobs selected state)
    const selectJobsBtn = document.getElementById("select-jobs-btn");
    if (selectJobsBtn) {
      selectJobsBtn.addEventListener("click", () => {
        window.navigateToJobs();
      });
    }

    // Export comparison button
    const exportBtn = document.getElementById("export-comparison-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.exportComparison();
      });
    }

    // Retry button
    const retryBtn = document.getElementById("retry-comparison-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        this.loadJobsForComparison();
      });
    }

    // Event delegation for remove job buttons
    document.addEventListener("click", (e) => {
      if (e.target.closest(".remove-job-btn")) {
        e.preventDefault();
        const button = e.target.closest(".remove-job-btn");
        const jobId = button.dataset.jobId;
        this.removeJobFromComparison(jobId);
      }
    });
  }

  loadSelectedJobs() {
    // Get selected job IDs from session storage or global state
    const selectedIds = sessionStorage.getItem("selectedJobIds");
    if (selectedIds) {
      this.selectedJobIds = JSON.parse(selectedIds);
    }

    // Also check global state if available
    if (window.selectedJobIds && window.selectedJobIds.length > 0) {
      this.selectedJobIds = [...window.selectedJobIds];
    }

    console.log("Selected job IDs for comparison:", this.selectedJobIds);

    if (this.selectedJobIds.length < 2) {
      this.showNoJobsSelected();
    } else {
      this.loadJobsForComparison();
    }
  }

  async loadJobsForComparison() {
    this.showLoadingState();

    try {
      console.log("Loading jobs for comparison:", this.selectedJobIds);

      // Load job details for each selected job
      const jobPromises = this.selectedJobIds.map((jobId) =>
        this.loadJobDetail(jobId)
      );

      const results = await Promise.allSettled(jobPromises);

      this.jobsData = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          this.jobsData.push(result.value);
        } else {
          console.error(
            `Failed to load job ${this.selectedJobIds[index]}:`,
            result.reason
          );
        }
      });
      if (this.jobsData.length < 2) {
        throw new Error("Not enough valid jobs loaded for comparison");
      }

      console.log("Successfully loaded job data:", this.jobsData);
      console.log("First job structure:", this.jobsData[0]);

      this.updateSelectedJobsSummary();
      this.generateComparison();
      this.showComparisonState();
    } catch (error) {
      console.error("Error loading jobs for comparison:", error);
      this.showErrorState();
    }
  }
  async loadJobDetail(jobId) {
    console.log(`Loading job detail for: ${jobId}`);

    try {
      // Load job info first (required)
      const jobResponse = await fetch(`/api/jobs/${jobId}`);

      if (!jobResponse.ok) {
        throw new Error(`Failed to load job ${jobId}: ${jobResponse.status}`);
      }
      const jobRawData = await jobResponse.json();

      // Extract job data from the response wrapper
      const jobData = jobRawData.job || jobRawData;

      // Try to load tasks (optional - if it fails, we'll use job-level data)
      let tasksResponse = null;
      let tasksData = null;

      try {
        tasksResponse = await fetch(`/api/jobs/${jobId}/tasks`);
        if (!tasksResponse.ok) {
          console.warn(
            `Failed to load tasks for job ${jobId}: ${tasksResponse.status}, using job-level data`
          );
        } else {
          // Try to get tasks data, but don't fail if it's not available
          try {
            const tasksRawData = await tasksResponse.json();
            // Extract tasks data from the response - handle API format {name: "PrimaryResult", data: [...]}
            if (
              tasksRawData.name === "PrimaryResult" &&
              Array.isArray(tasksRawData.data)
            ) {
              tasksData = tasksRawData.data;
            } else {
              tasksData =
                tasksRawData.data || tasksRawData.tasks || tasksRawData;
            }
          } catch (taskError) {
            console.warn(
              `Failed to parse tasks data for job ${jobId}:`,
              taskError
            );
            tasksData = null;
          }
        }
      } catch (tasksFetchError) {
        console.warn(
          `Error fetching tasks for job ${jobId}:`,
          tasksFetchError,
          "using job-level data"
        );
        tasksData = null;
      }

      console.log(`Raw job data for ${jobId}:`, jobData);
      console.log(`Raw tasks data for ${jobId}:`, tasksData);
      console.log(
        `Tasks data type:`,
        typeof tasksData,
        Array.isArray(tasksData)
      );

      // Extract tasks array from response - handle different response formats
      let tasksArray = [];
      if (tasksData) {
        if (Array.isArray(tasksData)) {
          tasksArray = tasksData;
        } else if (tasksData && typeof tasksData === "object") {
          // Check various common property names for task arrays
          if (Array.isArray(tasksData.data)) {
            tasksArray = tasksData.data;
          } else if (Array.isArray(tasksData.tasks)) {
            tasksArray = tasksData.tasks;
          } else if (Array.isArray(tasksData.items)) {
            tasksArray = tasksData.items;
          } else if (Array.isArray(tasksData.results)) {
            tasksArray = tasksData.results;
          } else if (Array.isArray(tasksData.value)) {
            tasksArray = tasksData.value;
          } else {
            // If it's an object but doesn't have recognizable array properties,
            // check if it's a single task and wrap it
            if (
              tasksData.TaskID ||
              tasksData.taskId ||
              tasksData.id ||
              tasksData.IsSuccessful !== undefined
            ) {
              tasksArray = [tasksData];
            } else {
              console.warn(
                `Tasks data is an object but no recognizable array property found:`,
                tasksData
              );
              tasksArray = [];
            }
          }
        } else {
          console.warn(
            `Tasks data is not an object or array:`,
            typeof tasksData,
            tasksData
          );
          tasksArray = [];
        }
      } else {
        console.warn(`No tasks data available for job ${jobId}`);
        tasksArray = [];
      }

      console.log(
        `Processed tasks array for ${jobId}:`,
        tasksArray,
        `Length: ${tasksArray.length}`
      ); // Combine job data with computed task statistics
      const combinedData = {
        ...jobData,
        tasks: tasksArray,
        // Compute task statistics from actual task data, with fallback to job-level data
        computedStats:
          tasksArray.length > 0
            ? this.computeTaskStatistics(tasksArray)
            : this.computeStatsFromJobData(jobData),
      };

      console.log(`Successfully loaded data for job ${jobId}:`, combinedData);

      // Validate and sanitize the combined data
      const sanitizedData = this.validateAndSanitizeJobData(
        combinedData,
        jobId
      );

      return sanitizedData;
    } catch (error) {
      console.error(`Error loading job ${jobId}:`, error);
      throw error;
    }
  }
  computeTaskStatistics(tasks) {
    console.log(
      "computeTaskStatistics called with:",
      tasks,
      "Type:",
      typeof tasks,
      "IsArray:",
      Array.isArray(tasks)
    );

    // Ensure tasks is an array with more robust validation
    if (!tasks) {
      console.warn("Tasks is null/undefined, using empty array");
      tasks = [];
    } else if (!Array.isArray(tasks)) {
      console.warn("Tasks is not an array:", typeof tasks, tasks);
      // Try to convert or extract array from object
      if (typeof tasks === "object") {
        if (tasks.tasks && Array.isArray(tasks.tasks)) {
          tasks = tasks.tasks;
        } else if (tasks.data && Array.isArray(tasks.data)) {
          tasks = tasks.data;
        } else if (tasks.items && Array.isArray(tasks.items)) {
          tasks = tasks.items;
        } else {
          console.warn(
            "Could not find array in tasks object, using empty array"
          );
          tasks = [];
        }
      } else {
        console.warn("Tasks is not an object or array, using empty array");
        tasks = [];
      }
    }

    // Final validation before forEach
    if (!Array.isArray(tasks)) {
      console.error(
        "Tasks is still not an array after processing, forcing empty array"
      );
      tasks = [];
    }

    console.log("Final validated tasks array:", tasks, "Length:", tasks.length);

    const stats = {
      total: tasks.length,
      completed: 0,
      failed: 0,
      pending: 0,
      running: 0,
      errorSummary: {},
    }; // Use try-catch around forEach for additional safety
    try {
      tasks.forEach((task) => {
        console.log("Processing task:", task);

        // Handle different task status formats from the API
        let isSuccessful = false;

        // Check for IsSuccessful boolean field (from API response)
        if (task.IsSuccessful !== undefined) {
          isSuccessful = task.IsSuccessful;
        } else {
          // Fallback to status strings if IsSuccessful is not available
          const status = (
            task.Status ||
            task.status ||
            task.state ||
            "unknown"
          ).toLowerCase();
          isSuccessful = ["completed", "success", "succeeded"].includes(status);
        }

        if (isSuccessful) {
          stats.completed++;
        } else {
          stats.failed++;
          // Count error types if available - check various error field names
          const errorType =
            task.ErrorType ||
            task.errorType ||
            task.error_type ||
            task.FailureReason ||
            task.failureReason ||
            task.Error ||
            task.error ||
            "Unknown Error";
          if (errorType && errorType !== "Unknown Error") {
            stats.errorSummary[errorType] =
              (stats.errorSummary[errorType] || 0) + 1;
          }
        }

        // Note: With the current API structure, all tasks appear to be either successful or failed
        // No pending/running status observed, so we'll keep those at 0
      });
    } catch (error) {
      console.error("Error processing tasks in forEach:", error);
      console.error("Tasks variable at error:", tasks);
    }

    // Calculate success rate
    stats.successRate =
      stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0;

    console.log("Computed stats:", stats);
    return stats;
  }
  computeStatsFromJobData(jobData) {
    console.log("Using fallback stats from job data:", jobData);

    // Extract stats from job-level properties (like what we see in job list)
    const total = jobData.TaskNum || jobData.TotalTasks || 0;
    const completed = jobData.SuccessTasks || jobData.CompletedTasks || 0;
    const failed = total - completed || jobData.FailedTasks || 0;

    const stats = {
      total: total,
      completed: completed,
      failed: failed,
      pending: 0,
      running: 0,
      errorSummary: jobData.ErrorSummary || {},
    };

    // Calculate success rate
    stats.successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

    console.log("Fallback computed stats:", stats);
    return stats;
  }
  updateSelectedJobsSummary() {
    const countElement = document.getElementById("selected-jobs-count");
    const listElement = document.getElementById("selected-jobs-list");

    if (countElement) {
      countElement.textContent = this.jobsData.length;
    }

    if (listElement) {
      const badgesHtml = this.jobsData
        .map((job) => {
          // Use TestJobID or JobID based on what's available
          const jobId = job.TestJobID || job.JobID || job.id || "Unknown";
          return `
        <span class="badge bg-primary me-2 mb-2 d-flex align-items-center">
          <span class="me-2">${jobId}</span>
          <button class="btn-close btn-close-white remove-job-btn" 
                  data-job-id="${jobId}" 
                  style="font-size: 0.7em;"
                  title="Remove from comparison"></button>
        </span>
      `;
        })
        .join("");

      listElement.innerHTML = badgesHtml;
    }
  }
  generateComparison() {
    console.log("Generating comparison data...");
    this.comparisonData = {
      basic: this.generateBasicComparison(),
      config: this.generateConfigComparison(),
      results: this.generateResultsComparison(),
      dimensions: this.generateDimensionComparison(),
    };

    this.renderBasicComparison();
    this.renderSameConfigSection();
    this.renderConfigResultsSection();
    this.renderDimensionTables();
  }
  generateBasicComparison() {
    const properties = [
      { key: "TestJobID", label: "Job ID" },
      { key: "InitiatedBy", label: "Initiated By" },
      { key: "PoolName", label: "Pool Name" },
      { key: "CreatedTime", label: "Created Date" },
      { key: "JobDiscription", label: "Description" },
      { key: "TaskNum", label: "Total Tasks" },
      { key: "SuccessTasks", label: "Success Tasks" },
      { key: "FailedTasks", label: "Failed Tasks" },
      { key: "SuccessRate", label: "Success Rate" },
      { key: "AvgSuccessIteration", label: "Avg Success Iteration" },
      { key: "AvgInfraChanges", label: "Avg Infra Changes" },
      { key: "RecommendCalls", label: "Recommend Calls" },
      { key: "PredeployCalls", label: "Pre-deploy Calls" },
      { key: "DeployCalls", label: "Deploy Calls" },
      { key: "RegionCalls", label: "Region Calls" },
      { key: "QuotaCalls", label: "Quota Calls" },
      { key: "GetLogsCalls", label: "Get Logs Calls" },
      { key: "AIIntegration", label: "AI Integration" },
    ];

    return properties.map((prop) => ({
      property: prop.label,
      values: this.jobsData.map((job) =>
        this.formatPropertyValue(job, prop.key)
      ),
    }));
  }

  generateConfigComparison() {
    // Configuration comparison for the 5 dimensions
    const configProperties = [
      { key: "Tool", label: "Tool" },
      { key: "CopilotModel", label: "Copilot Model" },
      { key: "DeployType", label: "Deploy Type" },
      { key: "IacType", label: "IaC Type" },
      { key: "ComputingType", label: "Computing Type" },
    ];

    return configProperties.map((prop) => ({
      property: prop.label,
      values: this.jobsData.map((job) =>
        this.formatPropertyValue(job, prop.key)
      ),
    }));
  }
  renderSameConfigSection() {
    const container = document.getElementById("same-config-content");
    if (!container) return;

    const configData = this.comparisonData.config;

    // Check which configurations are the same across all jobs
    const sameConfigs = [];
    configData.forEach((item) => {
      const uniqueValues = [...new Set(item.values.filter((v) => v !== "N/A"))];
      if (uniqueValues.length <= 1) {
        sameConfigs.push({
          property: item.property,
          value: uniqueValues[0] || "N/A",
        });
      }
    });

    if (sameConfigs.length > 0) {
      const sameConfigHtml = `
        <div class="same-config-display">
          <p class="mb-0 text-success">
            ${sameConfigs.map((config) => `${config.value}`).join(", ")}
          </p>
        </div>
      `;
      container.innerHTML = sameConfigHtml;
    } else {
      container.innerHTML =
        '<p class="text-muted mb-0">No configurations are the same across all jobs.</p>';
    }
  }

  renderConfigResultsSection() {
    const container = document.getElementById("config-results-table-body");
    const tableContainer = document.getElementById("config-results-section");
    if (!container || !tableContainer) return;

    const configData = this.comparisonData.config;
    const resultsData = this.comparisonData.results;

    // Get different configurations
    const differentConfigs = [];
    configData.forEach((item) => {
      const uniqueValues = [...new Set(item.values.filter((v) => v !== "N/A"))];
      if (uniqueValues.length > 1) {
        differentConfigs.push(item);
      }
    });

    // Update job headers
    this.jobsData.forEach((job, index) => {
      const header = document.getElementById(`job-header-config-${index}`);
      if (header) {
        header.textContent =
          job.TestJobID || job.JobID || job.id || `Job ${index + 1}`;
        header.style.display = "table-cell";
      }
    });

    // Hide unused headers
    for (let i = this.jobsData.length; i < 5; i++) {
      const header = document.getElementById(`job-header-config-${i}`);
      if (header) {
        header.style.display = "none";
      }
    }

    // Generate table rows for different configs and results
    let rowsHtml = "";

    // Add different configuration rows
    differentConfigs.forEach((item) => {
      rowsHtml += `
        <tr class="table-warning">
          <td class="fw-semibold">${item.property}</td>
          ${item.values.map((value) => `<td>${value}</td>`).join("")}
          ${Array(5 - item.values.length)
            .fill('<td style="display: none;"></td>')
            .join("")}
        </tr>
      `;
    });

    // Add results rows
    const resultProperties = [
      { key: "successRate", label: "Success Rate" },
      { key: "avgIteration", label: "Avg Interaction with Copilot" },
      { key: "avgInfraChanges", label: "Avg IaC Edits" },
    ];

    resultProperties.forEach((prop) => {
      rowsHtml += `
        <tr>
          <td class="fw-semibold">${prop.label}</td>
          ${resultsData.summary
            .map((job) => {
              let value = job[prop.key];
              if (
                prop.key === "avgIteration" ||
                prop.key === "avgInfraChanges"
              ) {
                value = typeof value === "number" ? value.toFixed(1) : value;
              }
              return `<td>${value}</td>`;
            })
            .join("")}
          ${Array(5 - resultsData.summary.length)
            .fill('<td style="display: none;"></td>')
            .join("")}
        </tr>
      `;
    });

    container.innerHTML = rowsHtml;
  }

  generateResultsComparison() {
    // Total results comparison
    return {
      summary: this.jobsData.map((job) => {
        const jobId = job.TestJobID || job.JobID || job.id || "Unknown";
        const stats = job.computedStats || {};

        return {
          jobId: jobId,
          total: job.TaskNum || 0,
          success: job.SuccessTasks || 0,
          failed: job.FailedTasks || 0,
          successRate:
            job.SuccessRate +
              " (" +
              job.SuccessTasks +
              "/" +
              job.TaskNum +
              ")" || "0%",
          avgIteration: job.AvgSuccessIteration || 0,
          avgInfraChanges: job.AvgInfraChanges || 0,
          aiIntegration: job.AIIntegration || 0,
        };
      }),
      detailed: this.generateTaskComparison(),
      errors: this.generateErrorComparison(),
    };
  }

  renderResultsComparison() {
    const container = document.getElementById("results-comparison-content");
    if (!container) return;

    const resultsData = this.comparisonData.results;

    const resultsHtml = `
      <div class="row">
        <!-- Summary Cards -->
        <div class="col-12 mb-4">
          <div class="row">
            ${resultsData.summary
              .map(
                (job) => `
              <div class="col-md-6 col-lg-4 mb-3">
                <div class="card">
                  <div class="card-header">
                    <h6 class="mb-0">${job.jobId}</h6>
                  </div>
                  <div class="card-body">
                    <div class="row text-center">
                      <div class="col-4">
                        <div class="text-primary">
                          <div class="fs-4 fw-bold">${job.total}</div>
                          <small>Total Tasks</small>
                        </div>
                      </div>
                      <div class="col-4">
                        <div class="text-success">
                          <div class="fs-4 fw-bold">${job.success}</div>
                          <small>Success</small>
                        </div>
                      </div>
                      <div class="col-4">
                        <div class="text-danger">
                          <div class="fs-4 fw-bold">${job.failed}</div>
                          <small>Failed</small>
                        </div>
                      </div>
                    </div>
                    <div class="mt-3">
                      <div class="progress mb-2" style="height: 8px;">
                        <div class="progress-bar bg-success" style="width: ${
                          (job.success / job.total) * 100
                        }%"></div>
                        <div class="progress-bar bg-danger" style="width: ${
                          (job.failed / job.total) * 100
                        }%"></div>
                      </div>
                      <div class="text-center">
                        <span class="badge bg-primary">${job.successRate}</span>
                      </div>
                    </div>
                    <hr>
                    <div class="small">
                      <div>Avg Iterations: <strong>${
                        job.avgIteration
                      }</strong></div>
                      <div>Avg Infra Changes: <strong>${
                        job.avgInfraChanges
                      }</strong></div>
                      <div>AI Integration: <strong>${
                        job.aiIntegration
                      }%</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
        
        <!-- Detailed Task Status (reuse existing task comparison) -->
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Detailed Task Analysis</h5>
            </div>
            <div class="card-body" id="detailed-task-comparison-content">
              ${this.renderDetailedTaskComparison()}
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = resultsHtml;
  }

  generateErrorComparison() {
    return this.jobsData.map((job) => {
      const jobId = job.TestJobID || job.JobID || job.id || "Unknown";
      const stats = job.computedStats || {};

      return {
        jobId: jobId,
        errorCategories: stats.errorSummary || {},
        totalErrors: stats.failed || 0,
      };
    });
  }

  renderErrorComparison() {
    const container = document.getElementById("error-comparison-content");
    if (!container) return;

    const errorChartsHtml = this.comparisonData.errors
      .map((job) => {
        const categories = Object.entries(job.errorCategories);
        const totalErrors = job.totalErrors;

        const categoriesHtml =
          categories.length > 0
            ? categories
                .map(
                  ([category, count]) => `
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge bg-light text-dark">${category}</span>
              <span class="fw-bold text-danger">${count}</span>
            </div>
          `
                )
                .join("")
            : '<div class="text-muted text-center">No errors</div>';

        return `
        <div class="col-md-6 mb-4">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">${job.jobId} - Error Summary</h6>
            </div>
            <div class="card-body">
              <div class="text-center mb-3">
                <div class="display-6 ${
                  totalErrors > 0 ? "text-danger" : "text-success"
                }">${totalErrors}</div>
                <small class="text-muted">Total Errors</small>
              </div>
              ${categoriesHtml}
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    container.innerHTML = `<div class="row">${errorChartsHtml}</div>`;
  }
  generateDimensionComparison() {
    // More dimension results: repoType, AppPattern, Language
    const dimensionData = {};

    // Aggregate data by dimensions from tasks
    this.jobsData.forEach((job) => {
      const jobId = job.TestJobID || job.JobID || job.id || "Unknown";
      const tasks = job.tasks || [];

      // Initialize job dimension data
      dimensionData[jobId] = {
        repoTypes: {},
        appPatterns: {},
        languages: {},
        copilotModels: {},
      };

      tasks.forEach((task) => {
        // Repository Types
        if (task.RepoType) {
          dimensionData[jobId].repoTypes[task.RepoType] =
            (dimensionData[jobId].repoTypes[task.RepoType] || 0) + 1;
        }

        // App Patterns
        if (task.AppPattern) {
          dimensionData[jobId].appPatterns[task.AppPattern] =
            (dimensionData[jobId].appPatterns[task.AppPattern] || 0) + 1;
        }

        // Languages (array handling)
        if (task.Languages && Array.isArray(task.Languages)) {
          task.Languages.forEach((lang) => {
            dimensionData[jobId].languages[lang] =
              (dimensionData[jobId].languages[lang] || 0) + 1;
          });
        }

        // Copilot Models
        if (task.CopilotModel) {
          dimensionData[jobId].copilotModels[task.CopilotModel] =
            (dimensionData[jobId].copilotModels[task.CopilotModel] || 0) + 1;
        }
      });
    });

    return dimensionData;
  }
  renderDimensionTables() {
    const dimensionData = this.comparisonData.dimensions;

    // Get all unique dimensions across all jobs for each table
    const allRepoTypes = new Set();
    const allAppPatterns = new Set();
    const allLanguages = new Set();

    Object.values(dimensionData).forEach((jobData) => {
      Object.keys(jobData.repoTypes || {}).forEach((type) =>
        allRepoTypes.add(type)
      );
      Object.keys(jobData.appPatterns || {}).forEach((pattern) =>
        allAppPatterns.add(pattern)
      );
      Object.keys(jobData.languages || {}).forEach((lang) =>
        allLanguages.add(lang)
      );
    });

    const repoTypeList = Array.from(allRepoTypes).sort();
    const appPatternList = Array.from(allAppPatterns).sort();
    const languageList = Array.from(allLanguages).sort();

    // Update table headers
    this.updateTableHeader("repo-type-table-header", repoTypeList);
    this.updateTableHeader("app-pattern-table-header", appPatternList);
    this.updateTableHeader("language-table-header", languageList);

    // Render tables with dynamic data
    this.renderDimensionTable(
      "repo-type-table-body",
      dimensionData,
      "repoTypes",
      repoTypeList
    );

    this.renderDimensionTable(
      "app-pattern-table-body",
      dimensionData,
      "appPatterns",
      appPatternList
    );

    this.renderDimensionTable(
      "language-table-body",
      dimensionData,
      "languages",
      languageList
    );
  }

  updateTableHeader(headerId, dimensionList) {
    const header = document.getElementById(headerId);
    if (!header) return;

    // Keep the first column (Job/Language) and add dynamic columns
    const headerHtml =
      `<th>Job/Dimension</th>` +
      dimensionList.map((dim) => `<th>${dim}</th>`).join("");

    header.innerHTML = headerHtml;
  }
  renderDimensionTable(
    tableBodyId,
    dimensionData,
    dimensionType,
    dimensionList
  ) {
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;

    let rowsHtml = "";

    Object.entries(dimensionData).forEach(([jobId, jobData]) => {
      const data = jobData[dimensionType] || {};

      // Create success rate row for this job
      const cells = dimensionList
        .map((dimension) => {
          const successRate = this.getSuccessRateForDimension(
            jobId,
            dimensionType,
            dimension
          );

          // Only show additional metrics if there's actual data (not N/A)
          if (successRate === "N/A") {
            return `<td class="text-muted">N/A</td>`;
          }

          const avgInteraction = this.getAvgInteraction(
            jobId,
            dimensionType,
            dimension
          );
          const avgIaCEdits = this.getAvgIaCEdits(
            jobId,
            dimensionType,
            dimension
          );

          let cellContent = `<div>Success Rate: ${successRate}</div>`;
          if (avgInteraction !== "N/A") {
            cellContent += `<br/><small class="text-muted">Avg interaction: ${avgInteraction}</small>`;
          }
          if (avgIaCEdits !== "N/A") {
            cellContent += `<br/><small class="text-muted">Avg IaC edits: ${avgIaCEdits}</small>`;
          }

          return `<td>${cellContent}</td>`;
        })
        .join("");

      rowsHtml += `<tr><td class="fw-semibold">${jobId}(${this.getJobConfig(
        jobId
      )})</td>${cells}</tr>`;
    });

    tableBody.innerHTML = rowsHtml;
  }
  getJobConfig(jobId) {
    const job = this.jobsData.find(
      (j) => (j.TestJobID || j.JobID || j.id) === jobId
    );
    if (!job) return "";

    // Get all 5 configuration dimensions
    const allConfigs = {
      Tool: job.Tool || "N/A",
      CopilotModel: job.CopilotModel || "N/A",
      DeployType: job.DeployType || "N/A",
      IacType: job.IacType || "N/A",
      ComputingType: job.ComputingType || "N/A",
    };

    // Check which configs are different across all jobs
    const configData = this.comparisonData.config || [];
    const differentConfigs = [];

    configData.forEach((item) => {
      const uniqueValues = [...new Set(item.values.filter((v) => v !== "N/A"))];
      if (uniqueValues.length > 1) {
        // This config is different across jobs - find matching config key
        const property = item.property;
        let configKey = null;

        if (property === "Tool") configKey = "Tool";
        else if (property === "Copilot Model") configKey = "CopilotModel";
        else if (property === "Deploy Type") configKey = "DeployType";
        else if (property === "IaC Type") configKey = "IacType";
        else if (property === "Computing Type") configKey = "ComputingType";

        if (configKey && allConfigs[configKey] !== "N/A") {
          differentConfigs.push(allConfigs[configKey]);
        }
      }
    });

    return differentConfigs.length > 0 ? differentConfigs.join(",") : "";
  }

  getSuccessRateForDimension(jobId, dimensionType, dimension) {
    const job = this.jobsData.find(
      (j) => (j.TestJobID || j.JobID || j.id) === jobId
    );
    if (!job || !job.tasks || job.tasks.length === 0) {
      return "N/A"; // No task data available
    }

    let total = 0;
    let successful = 0;

    job.tasks.forEach((task) => {
      let matches = false;

      if (dimensionType === "repoTypes" && task.RepoType === dimension) {
        matches = true;
      } else if (
        dimensionType === "appPatterns" &&
        task.AppPattern === dimension
      ) {
        matches = true;
      } else if (
        dimensionType === "languages" &&
        task.Languages &&
        Array.isArray(task.Languages) &&
        task.Languages.includes(dimension)
      ) {
        matches = true;
      }

      if (matches) {
        total++;
        if (task.IsSuccessful === true) {
          successful++;
        }
      }
    });

    if (total === 0) {
      return "N/A"; // No tasks match this dimension combination
    }

    const rate = ((successful / total) * 100).toFixed(0);
    return `${rate}%(${successful}/${total})`;
  }
  getAvgInteraction(jobId, dimensionType, dimension) {
    const job = this.jobsData.find(
      (j) => (j.TestJobID || j.JobID || j.id) === jobId
    );
    if (!job || !job.tasks || job.tasks.length === 0) {
      return "N/A";
    }

    let totalIterations = 0;
    let count = 0;

    job.tasks.forEach((task) => {
      let matches = false;

      if (dimensionType === "repoTypes" && task.RepoType === dimension) {
        matches = true;
      } else if (
        dimensionType === "appPatterns" &&
        task.AppPattern === dimension
      ) {
        matches = true;
      } else if (
        dimensionType === "languages" &&
        task.Languages &&
        Array.isArray(task.Languages) &&
        task.Languages.includes(dimension)
      ) {
        matches = true;
      }

      if (
        matches &&
        typeof task.Iterations === "number" &&
        task.Iterations > 0
      ) {
        totalIterations += task.Iterations;
        count++;
      }
    });

    return count > 0 ? (totalIterations / count).toFixed(1) : "N/A";
  }
  getAvgIaCEdits(jobId, dimensionType, dimension) {
    const job = this.jobsData.find(
      (j) => (j.TestJobID || j.JobID || j.id) === jobId
    );
    if (!job || !job.tasks || job.tasks.length === 0) {
      return "N/A";
    }

    let totalEdits = 0;
    let count = 0;

    job.tasks.forEach((task) => {
      let matches = false;

      if (dimensionType === "repoTypes" && task.RepoType === dimension) {
        matches = true;
      } else if (
        dimensionType === "appPatterns" &&
        task.AppPattern === dimension
      ) {
        matches = true;
      } else if (
        dimensionType === "languages" &&
        task.Languages &&
        Array.isArray(task.Languages) &&
        task.Languages.includes(dimension)
      ) {
        matches = true;
      }

      if (
        matches &&
        typeof task.FileEditsNum === "number" &&
        task.FileEditsNum >= 0
      ) {
        totalEdits += task.FileEditsNum;
        count++;
      }
    });

    return count > 0 ? (totalEdits / count).toFixed(1) : "N/A";
  }
  renderDetailedTaskComparison() {
    const taskData = this.comparisonData.results.detailed;

    return taskData
      .map((job) => {
        const { total, completed, failed, pending, running } = job.taskStats;
        const successRate =
          total > 0 ? ((completed / total) * 100).toFixed(0) : 0;
        const successRateDisplay =
          total > 0 ? `${successRate}%(${completed}/${total})` : "N/A";

        return `
        <div class="mb-3">
          <h6>${job.jobId}</h6>
          <div class="row text-center">
            <div class="col-2">
              <div class="text-success">
                <i class="bi bi-check-circle"></i>
                <div class="fw-bold">${completed}</div>
                <small>Completed</small>
              </div>
            </div>
            <div class="col-2">
              <div class="text-danger">
                <i class="bi bi-x-circle"></i>
                <div class="fw-bold">${failed}</div>
                <small>Failed</small>
              </div>
            </div>
            <div class="col-2">
              <div class="text-warning">
                <i class="bi bi-clock"></i>
                <div class="fw-bold">${pending}</div>
                <small>Pending</small>
              </div>
            </div>
            <div class="col-2">
              <div class="text-info">
                <i class="bi bi-play-circle"></i>
                <div class="fw-bold">${running}</div>
                <small>Running</small>
              </div>
            </div>
            <div class="col-2">
              <div class="text-primary">
                <i class="bi bi-graph-up"></i>
                <div class="fw-bold">${successRateDisplay}</div>
                <small>Success Rate</small>
              </div>
            </div>
            <div class="col-2">
              <div class="text-dark">
                <i class="bi bi-list-check"></i>
                <div class="fw-bold">${total}</div>
                <small>Total</small>
              </div>
            </div>
          </div>
          <div class="progress mt-2" style="height: 6px;">
            <div class="progress-bar bg-success" style="width: ${
              (completed / total) * 100
            }%"></div>
            <div class="progress-bar bg-danger" style="width: ${
              (failed / total) * 100
            }%"></div>
            <div class="progress-bar bg-warning" style="width: ${
              (pending / total) * 100
            }%"></div>
            <div class="progress-bar bg-info" style="width: ${
              (running / total) * 100
            }%"></div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  formatPropertyValue(job, key) {
    // Handle nested properties like "computedStats.total"
    let value;
    if (key.includes(".")) {
      const parts = key.split(".");
      value = job;
      for (const part of parts) {
        value = value?.[part];
      }
    } else {
      value = job[key];
    }

    switch (key) {
      case "CreatedTime":
        return value ? formatDateTime(value) : "N/A";
      case "SuccessRate":
        // Calculate success rate in format like "50%(5/10)"
        const successTasks = job.SuccessTasks || 0;
        const totalTasks = job.TaskNum || 0;
        if (totalTasks === 0) {
          return "N/A";
        }
        const rate = ((successTasks / totalTasks) * 100).toFixed(0);
        return `${rate}%(${successTasks}/${totalTasks})`;
      case "UseMCP":
      case "UseTerraform":
        // These are numbers representing counts
        return value !== undefined ? value.toString() : "N/A";
      case "AvgSuccessIteration":
      case "AvgInfraChanges":
      case "AIIntegration":
        // These are decimal numbers, format to 2 decimal places
        return value !== undefined ? Number(value).toFixed(2) : "N/A";
      case "RecommendCalls":
      case "PredeployCalls":
      case "DeployCalls":
      case "RegionCalls":
      case "QuotaCalls":
      case "GetLogsCalls":
        // These are integers
        return value !== undefined ? value.toString() : "N/A";
      case "TaskNum":
      case "SuccessTasks":
      case "FailedTasks":
        return value !== undefined ? value.toString() : "N/A";
      case "TestJobID":
        return value || job.JobID || job.id || "N/A";
      case "InitiatedBy":
      case "PoolName":
      case "JobDiscription":
        return value || "N/A";
      // New configuration fields
      case "Tool":
      case "CopilotModel":
      case "DeployType":
      case "IacType":
      case "ComputingType":
        return value || "N/A";
      default:
        return value !== undefined && value !== null ? value : "N/A";
    }
  }

  // ...existing code...
  exportComparison() {
    if (this.jobsData.length === 0) {
      alert("No jobs to export");
      return;
    }

    const csvContent = this.generateComparisonCSV();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `job-comparison-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  generateComparisonCSV() {
    const headers = [
      "Property",
      ...this.jobsData.map(
        (job) => job.TestJobID || job.JobID || job.id || "Unknown"
      ),
    ];
    const csvRows = [headers.join(",")];

    this.comparisonData.basic.forEach((item) => {
      const row = [
        item.property,
        ...item.values.map((v) => `"${v.replace(/"/g, '""')}"`),
      ];
      csvRows.push(row.join(","));
    });

    return csvRows.join("\n");
  }
  showLoadingState() {
    const elements = [
      { id: "job-compare-loading", display: "block" },
      { id: "job-comparison-section", display: "none" },
      { id: "same-config-section", display: "none" },
      { id: "config-results-section", display: "none" },
      { id: "dimensions-comparison-section", display: "none" },
      { id: "no-jobs-selected", display: "none" },
      { id: "job-compare-error", display: "none" },
    ];

    elements.forEach(({ id, display }) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = display;
      }
    });
  }
  showComparisonState() {
    const elements = [
      { id: "job-compare-loading", display: "none" },
      { id: "job-comparison-section", display: "block" },
      { id: "same-config-section", display: "block" },
      { id: "config-results-section", display: "block" },
      { id: "dimensions-comparison-section", display: "block" },
      { id: "no-jobs-selected", display: "none" },
      { id: "job-compare-error", display: "none" },
    ];

    elements.forEach(({ id, display }) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = display;
      }
    });
  }
  showNoJobsSelected() {
    const elements = [
      { id: "job-compare-loading", display: "none" },
      { id: "job-comparison-section", display: "none" },
      { id: "same-config-section", display: "none" },
      { id: "config-results-section", display: "none" },
      { id: "dimensions-comparison-section", display: "none" },
      { id: "no-jobs-selected", display: "block" },
      { id: "job-compare-error", display: "none" },
    ];

    elements.forEach(({ id, display }) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = display;
      }
    });
  }

  showErrorState() {
    const elements = [
      { id: "job-compare-loading", display: "none" },
      { id: "job-comparison-section", display: "none" },
      { id: "same-config-section", display: "none" },
      { id: "config-results-section", display: "none" },
      { id: "dimensions-comparison-section", display: "none" },
      { id: "no-jobs-selected", display: "none" },
      { id: "job-compare-error", display: "block" },
    ];

    elements.forEach(({ id, display }) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = display;
      }
    });
  }
  validateAndSanitizeJobData(jobData, jobId) {
    console.log(`Validating job data for ${jobId}:`, jobData);

    // Ensure we have basic job properties based on actual API structure
    const sanitized = {
      TestJobID:
        jobData.TestJobID ||
        jobData.TestJobID1 ||
        jobData.JobID ||
        jobData.id ||
        jobId,
      JobID:
        jobData.TestJobID ||
        jobData.TestJobID1 ||
        jobData.JobID ||
        jobData.id ||
        jobId,
      JobName:
        jobData.JobName ||
        jobData.JobDiscription ||
        jobData.name ||
        `Job ${jobId}`,
      CreatedAt:
        jobData.CreatedTime ||
        jobData.CreatedAt ||
        jobData.createdAt ||
        jobData.created_at ||
        "Unknown",
      Status: jobData.Status || jobData.status || "Unknown",
      InitiatedBy:
        jobData.InitiatedBy ||
        jobData.UserID ||
        jobData.userId ||
        jobData.user_id ||
        "Unknown",
      PoolName: jobData.PoolName || jobData.poolName || "Unknown",
      TaskNum: jobData.TaskNum || jobData.TotalTasks || jobData.totalTasks || 0,
      SuccessTasks:
        jobData.SuccessTasks ||
        jobData.CompletedTasks ||
        jobData.completedTasks ||
        0,
      FailedTasks: jobData.FailedTasks || jobData.failedTasks || 0,
      SuccessRate: jobData.SuccessRate || jobData.successRate || "0%",
      UseMCP: jobData.UseMCP || jobData.useMCP || 0,
      UseTerraform: jobData.UseTerraform || jobData.useTerraform || 0,
      AvgSuccessIteration:
        jobData.AvgSuccessIteration || jobData.avgSuccessIteration || 0,
      AvgInfraChanges: jobData.AvgInfraChanges || jobData.avgInfraChanges || 0,
      RecommendCalls: jobData.RecommendCalls || jobData.recommendCalls || 0,
      PredeployCalls: jobData.PredeployCalls || jobData.predeployCalls || 0,
      DeployCalls: jobData.DeployCalls || jobData.deployCalls || 0,
      RegionCalls: jobData.RegionCalls || jobData.regionCalls || 0,
      QuotaCalls: jobData.QuotaCalls || jobData.quotaCalls || 0,
      GetLogsCalls: jobData.GetLogsCalls || jobData.getLogsCalls || 0,
      AIIntegration: jobData.AIIntegration || jobData.aiIntegration || 0,
      // Configuration fields from job-level data
      Tool: jobData.Tool || jobData.tool || "N/A",
      CopilotModel: jobData.CopilotModel || jobData.copilotModel || "N/A",
      DeployType: jobData.DeployType || jobData.deployType || "N/A",
      IacType: jobData.IacType || jobData.iacType || "N/A",
      ComputingType: jobData.ComputingType || jobData.computingType || "N/A",
      tasks: jobData.tasks || [],
      computedStats: jobData.computedStats || {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        running: 0,
        successRate: 0,
        errorSummary: {},
      },
    };

    // Add any additional properties that exist
    Object.keys(jobData).forEach((key) => {
      if (!sanitized.hasOwnProperty(key)) {
        sanitized[key] = jobData[key];
      }
    });

    console.log(`Sanitized job data for ${jobId}:`, sanitized);
    return sanitized;
  }
  generateTaskComparison() {
    return this.jobsData.map((job) => {
      const jobId = job.TestJobID || job.JobID || job.id || "Unknown";
      const stats = job.computedStats || {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        running: 0,
      };

      return {
        jobId: jobId,
        taskStats: stats,
      };
    });
  }
  renderBasicComparison() {
    const tableBody = document.getElementById("comparison-table-body");
    if (!tableBody) return;

    // Update table headers
    this.jobsData.forEach((job, index) => {
      const header = document.getElementById(`job-header-${index}`);
      if (header) {
        header.textContent = job.TestJobID || job.JobID || job.id || "Job";
        header.style.display = "";
      }
    });

    // Hide unused headers
    for (let i = this.jobsData.length; i < 5; i++) {
      const header = document.getElementById(`job-header-${i}`);
      if (header) {
        header.style.display = "none";
      }
    }

    // Generate comparison rows
    const rowsHtml = this.comparisonData.basic
      .map((item) => {
        const cellsHtml = item.values
          .map((value, index) => {
            const cellClass = this.getCellClass(
              item.property,
              value,
              item.values
            );
            return `<td class="${cellClass}">${value}</td>`;
          })
          .join("");

        return `
        <tr>
          <td class="fw-semibold">${item.property}</td>
          ${cellsHtml}
        </tr>
      `;
      })
      .join("");

    tableBody.innerHTML = rowsHtml;
  }

  getCellClass(property, value, allValues) {
    // Highlight best/worst values in certain properties
    if (property === "Success Rate") {
      const numericValues = allValues.map((v) => parseFloat(v) || 0);
      const maxValue = Math.max(...numericValues);
      const currentValue = parseFloat(value) || 0;
      return currentValue === maxValue && currentValue > 0
        ? "table-success"
        : "";
    }

    if (property === "Failed Tasks") {
      const numericValues = allValues.map((v) => parseInt(v) || 0);
      const minValue = Math.min(...numericValues);
      const currentValue = parseInt(value) || 0;
      return currentValue === minValue
        ? "table-success"
        : currentValue > 0
        ? "table-warning"
        : "";
    }

    return "";
  }
}

// Global instance
let jobCompare;

// Initialize Job Compare when the view is shown
function initJobCompare() {
  if (!jobCompare) {
    jobCompare = new JobCompare();
  }
}
