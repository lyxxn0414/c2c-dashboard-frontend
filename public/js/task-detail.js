// Task Detail JavaScript
console.log("[Debug] task-detail.js loaded at:", new Date().toISOString());

class TaskDetail {
  constructor() {
    this.currentTaskId = null;
    this.currentJobId = null;
    this.currentRepoName = null;
    this.taskData = null;

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Download details button
    const downloadBtn = document.getElementById("download-task-details-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        this.downloadTaskDetails();
      });
    }

    // Job link click
    const jobLink = document.getElementById("task-detail-job-link");
    if (jobLink) {
      jobLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.currentJobId) {
          this.navigateToJobDetail(this.currentJobId);
        }
      });
    } // Retry button
    const retryBtn = document.getElementById("retry-task-detail-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        this.loadTaskDetail(this.currentTaskId);
      });
    }
  } // Load task detail data
  async loadTaskDetail(taskId) {
    try {
      console.log("[Debug] loadTaskDetail called with taskId:", taskId);
      this.currentTaskId = taskId;

      this.showLoadingState();

      // Make API call to get task details
      const queryParams = new URLSearchParams();

      const url = `/api/jobs/tasks/${taskId}${
        queryParams.toString() ? "?" + queryParams.toString() : ""
      }`;
      console.log("[Debug] Fetching URL:", url);
      const response = await fetch(url);

      console.log("[Debug] Response status:", response.status);
      console.log("[Debug] Response headers:", response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const taskData = await response.json();
      console.log("[Debug] Received task data:", taskData);
      console.log("[Debug] Task data type:", typeof taskData);
      console.log("[Debug] Task data keys:", Object.keys(taskData));
      this.taskData = taskData;

      console.log("[Debug] Calling populateTaskDetail with:", taskData);
      this.populateTaskDetail(taskData);
      this.populateToolUsage(taskData);
      this.hideLoadingState();

      // Populate tool usage after sections are made visible
      console.log("[Debug] Calling populateToolUsage after hideLoadingState");
    } catch (error) {
      console.error("Error loading task details:", error);
      this.showErrorState(error.message);
    }
  }
  // Populate task detail view with data
  populateTaskDetail(taskData) {
    // Update back button text based on context
    this.updateBackButtonText();

    // Extract TaskDetails if it exists, otherwise use taskData directly
    const details = taskData.TaskDetails || taskData;

    // Basic task information
    this.setElementText(
      "task-detail-title",
      details.TaskID || taskData.name || "Task-sample"
    );
    this.setElementText(
      "task-detail-id",
      details.TaskID || taskData.taskId || "123456"
    );
    this.setElementText(
      "task-detail-creation-time",
      formatDateTime(
        details.CreatedDate || details.Timestamp || taskData.creationTime
      ) || "2025-06-23 14:57"
    );
    this.setElementText(
      "task-detail-repo-name",
      details.RepoName || taskData.repoName || this.currentRepoName || "-"
    );

    // Set job link
    const jobLink = document.getElementById("task-detail-job-link");
    if (jobLink && (details.TestJobID || taskData.jobId)) {
      const jobId = details.TestJobID || taskData.jobId;
      jobLink.textContent = jobId;
      jobLink.href = `#/job-detail/${jobId}`;
      this.currentJobId = jobId;
    }

    // Populate comprehensive task details
    this.setElementText("task-type", details.TaskType || "-");
    this.setElementText("task-deploy-type", details.DeployType || "-");
    this.setElementText("task-computing-type", details.ComputingType || "-");
    this.setElementText("task-copilot-model", details.CopilotModel || "-");
    this.setElementText("task-command-line", details.CommandLine || "-");

    // Success status with color coding
    const successElement = document.getElementById("task-success-status");
    if (successElement) {
      const isSuccessful = details.IsSuccessful;
      if (isSuccessful === true) {
        successElement.textContent = "Success";
        successElement.className = "badge bg-success";
      } else if (isSuccessful === false) {
        successElement.textContent = "Failed";
        successElement.className = "badge bg-danger";
      } else {
        successElement.textContent = "-";
        successElement.className = "";
      }
    }

    // Environment & Configuration
    this.setElementText("task-vscode-version", details.VSCodeVersion || "-");
    this.setElementText(
      "task-extension-versions",
      details.ExtensionVersions || "-"
    );
    this.setElementText(
      "task-use-terraform",
      details.UseTerraform ? "Yes" : "No"
    );
    this.setElementText(
      "task-is-throttled",
      details.IsThrottled ? "Yes" : "No"
    );
    this.setElementText(
      "task-use-bicep-schemas",
      details.UseBicepSchemasTool ? "Yes" : "No"
    );
    this.setElementText(
      "task-use-best-practices",
      details.UseAzureAgentBestPractices ? "Yes" : "No"
    );

    // Task Statistics
    this.setElementText("task-iterations", details.Iterations || "-");
    this.setElementText("task-file-edits-num", details.FileEditsNum || "-");

    // File Edits List
    const fileEditsElement = document.getElementById("task-file-edits-list");
    if (fileEditsElement && details.FileEditsList) {
      if (
        Array.isArray(details.FileEditsList) &&
        details.FileEditsList.length > 0
      ) {
        fileEditsElement.innerHTML = details.FileEditsList.map(
          (file) =>
            `<div class="mb-1"><i class="bi bi-file-earmark-code me-2"></i>${this.escapeHtml(
              file
            )}</div>`
        ).join("");
      } else {
        fileEditsElement.innerHTML =
          '<div class="text-muted">No file edits recorded</div>';
      }
    }

    // Initial Prompt
    const promptElement = document.getElementById("task-initial-prompt");
    if (promptElement && details.InitialPrompt) {
      promptElement.textContent = details.InitialPrompt;
    } else if (promptElement) {
      promptElement.textContent = "No initial prompt available";
    }

    // Populate failure details table
    this.populateFailureDetailsTable(
      details.DeployFailureDetails || taskData.deployFailureDetails || []
    );

    // Populate copilot response table
    this.populateCopilotResponseTable(
      details.DeployIterationData || taskData.copilotResponses || []
    );
  }

  populateToolUsage(taskData) {
    console.log("🔧 ==========================================");
    console.log("🔧 POPULATE TOOL USAGE FUNCTION CALLED");
    console.log("🔧 ==========================================");
    console.log("[Debug] populateToolUsage called with:", taskData);

    const toolUsageContainer = document.getElementById(
      "task-tool-usage-container"
    );

    if (!toolUsageContainer) {
      console.error("CRITICAL: Tool usage container not found!");
      return;
    }

    console.log("[Debug] Container found:", toolUsageContainer);

    // Clear existing content first
    toolUsageContainer.innerHTML = "";

    // Remove any hidden classes
    toolUsageContainer.classList.remove("d-none", "hidden");
    toolUsageContainer.style.display = "";

    console.log(
      "[Debug] Container cleared and unhidden, now checking tool data..."
    );

    // Extract TaskDetails if it exists, otherwise use taskData directly
    const details = taskData.TaskDetails || taskData;

    // Check if we have ToolUsageList or ToolNames
    const toolUsageList = taskData.ToolUsageList || [];
    const toolNames = details.ToolNames || taskData.ToolNames || [];

    console.log("[Debug] ToolUsageList:", toolUsageList);
    console.log("[Debug] ToolNames:", toolNames);

    let toolsToDisplay = [];

    // If we have ToolUsageList, use it directly
    if (
      toolUsageList &&
      Array.isArray(toolUsageList) &&
      toolUsageList.length > 0
    ) {
      console.log(
        "[Debug] ✅ Using ToolUsageList with",
        toolUsageList.length,
        "items"
      );
      toolsToDisplay = toolUsageList;
    }
    // If we have ToolNames, create tool objects with usage counts
    else if (toolNames && Array.isArray(toolNames) && toolNames.length > 0) {
      console.log("[Debug] ✅ Using ToolNames with", toolNames.length, "items");

      // Count occurrences of each tool name
      const toolCounts = {};
      toolNames.forEach((toolName) => {
        toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
      });

      console.log("[Debug] Tool counts calculated:", toolCounts);

      // Convert to display format
      toolsToDisplay = Object.entries(toolCounts).map(([toolName, count]) => ({
        ToolName: toolName,
        TaskCount: count,
      }));

      // Sort by count (descending) then by name
      toolsToDisplay.sort((a, b) => {
        if (b.TaskCount !== a.TaskCount) {
          return b.TaskCount - a.TaskCount;
        }
        return a.ToolName.localeCompare(b.ToolName);
      });
    }

    if (toolsToDisplay.length > 0) {
      console.log("[Debug] ✅ Displaying", toolsToDisplay.length, "tools");

      try {
        // Generate tool usage cards using CSS Grid layout
        const toolElements = toolsToDisplay.map((tool, index) => {
          const toolName = tool.ToolName || tool.name || `Tool ${index + 1}`;
          const taskCount =
            tool.TaskCount !== undefined ? tool.TaskCount : tool.count || 0;

          console.log(
            `[Debug] Processing tool ${index}: ${toolName} = ${taskCount}`
          );

          // Truncate long tool names for display
          const displayName =
            toolName.length > 25 ? toolName.substring(0, 23) + "..." : toolName;

          return `
            <div class="tool-metric-card" title="${this.escapeHtml(toolName)}">
              <div class="tool-metric-label">${this.escapeHtml(
                displayName
              )}</div>
              <div class="tool-metric-value">${taskCount}</div>
            </div>
          `;
        });

        console.log(`[Debug] Generated ${toolElements.length} tool elements`);

        const finalHTML = toolElements.join("");
        console.log("[Debug] Final HTML to insert:", finalHTML);

        toolUsageContainer.innerHTML = finalHTML;

        console.log("[Debug] ✅ HTML inserted into container");

        // Ensure parent tool-call-summary-section is visible
        const summarySection = toolUsageContainer.closest(
          ".tool-call-summary-section"
        );
        if (summarySection) {
          summarySection.classList.remove("d-none");
          console.log("[Debug] Made tool-call-summary-section visible");
        }

        // Force refresh container visibility and layout
        toolUsageContainer.style.visibility = "visible";
        toolUsageContainer.style.display = "";
        toolUsageContainer.offsetHeight; // Force reflow

        // Log final container state
        console.log(
          "[Debug] Container final innerHTML:",
          toolUsageContainer.innerHTML
        );
        console.log("[Debug] Container computed style:", {
          display: window.getComputedStyle(toolUsageContainer).display,
          visibility: window.getComputedStyle(toolUsageContainer).visibility,
        });
      } catch (error) {
        console.error("[Debug] ❌ ERROR processing tool data:", error);
        toolUsageContainer.innerHTML = `
          <div class="text-center py-3">
            <div class="alert alert-danger">
              Error processing tool usage data: ${error.message}
            </div>
          </div>
        `;
      }
    } else {
      // Show message when no tool usage data is available
      console.log("No tool usage data found");
      toolUsageContainer.innerHTML = `
        <div class="text-center py-3">
          <div class="text-muted">
            <i class="bi bi-info-circle me-2"></i>
            No tool usage data available
          </div>
        </div>
      `;
      console.log("[Debug] Set fallback message in container");
    }
  }

  // Populate failure details table
  populateFailureDetailsTable(failureDetails) {
    const tableBody = document.querySelector("#failure-details-table tbody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!failureDetails || failureDetails.length === 0) {
      const row = tableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.className = "text-center text-muted";
      cell.textContent = "No failure details available";
      return;
    }

    failureDetails.forEach((failure) => {
      const row = tableBody.insertRow();
      row.insertCell().textContent =
        failure.IterationNum || failure.iterationNum || "-";
      row.insertCell().textContent =
        formatDateTime(failure.Time || failure.time) || "-";
      row.insertCell().textContent =
        failure.ErrorCategory || failure.errorCategory || "-";
      row.insertCell().textContent =
        failure.ErrorDescription || failure.errorDescription || "-";
      row.insertCell().textContent =
        failure.ErrorDetail || failure.errorDetail || "-";
    });
  }
  // Populate copilot response table
  populateCopilotResponseTable(deployIterationData) {
    const tableBody = document.querySelector("#copilot-response-table tbody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!deployIterationData || deployIterationData.length === 0) {
      const row = tableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 4;
      cell.className = "text-center text-muted";
      cell.textContent = "No copilot responses available";
      return;
    }

    deployIterationData.forEach((iteration, index) => {
      const row = tableBody.insertRow();
      row.insertCell().textContent = iteration.iteration;
      row.insertCell().textContent =
        formatDateTime(iteration.Time || iteration.time) || "-";

      // Input command cell with truncation
      const inputCell = row.insertCell();
      const inputText = iteration.InputCommand || iteration.inputCommand || "-";
      if (inputText.length > 100) {
        inputCell.innerHTML = `
                    <span class="truncated-text" title="${this.escapeHtml(
                      inputText
                    )}">
                        ${this.escapeHtml(inputText.substring(0, 100))}...
                    </span>
                `;
      } else {
        inputCell.textContent = inputText;
      }

      row.insertCell().textContent =
        iteration.ToolCall || iteration.toolCall || "-";

      // Copilot response cell with expandable content
      const responseCell = row.insertCell();
      const responseText =
        iteration.CopilotResponse || iteration.copilotResponse || "-";

      if (responseText !== "-") {
        // Convert \\n to actual line breaks and clean up the text
        const cleanedResponseText = responseText
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .trim();

        // Create expandable content for long responses
        if (cleanedResponseText.length > 200) {
          const truncatedText = cleanedResponseText.substring(0, 200);
          const responseId = `response-${index}`;

          responseCell.innerHTML = `
                        <div class="copilot-response-content">
                            <div class="response-preview" id="${responseId}-preview">
                                <pre class="response-text">${this.escapeHtml(
                                  truncatedText
                                )}...</pre>
                                <button class="btn btn-sm btn-outline-primary mt-2 show-details-btn" 
                                        data-target="${responseId}" 
                                        data-expanded="false">
                                    <i class="bi bi-chevron-down me-1"></i>Show Details
                                </button>
                            </div>
                            <div class="response-full d-none" id="${responseId}-full">
                                <pre class="response-text">${this.escapeHtml(
                                  cleanedResponseText
                                )}</pre>
                                <button class="btn btn-sm btn-outline-secondary mt-2 hide-details-btn" 
                                        data-target="${responseId}" 
                                        data-expanded="true">
                                    <i class="bi bi-chevron-up me-1"></i>Hide Details
                                </button>
                            </div>
                        </div>
                    `;
        } else {
          // For shorter responses, just display with line breaks
          responseCell.innerHTML = `
                        <div class="copilot-response-content">
                            <pre class="response-text">${this.escapeHtml(
                              cleanedResponseText
                            )}</pre>
                        </div>
                    `;
        }
      } else {
        responseCell.textContent = responseText;
      }
    });

    // Add event listeners for show/hide details buttons
    this.bindResponseToggleEvents();
  }

  // Bind event listeners for response toggle buttons
  bindResponseToggleEvents() {
    // Remove existing listeners to prevent duplicates
    document
      .querySelectorAll(".show-details-btn, .hide-details-btn")
      .forEach((btn) => {
        btn.removeEventListener("click", this.handleResponseToggle);
      });

    // Add new listeners using event delegation
    document.addEventListener("click", this.handleResponseToggle.bind(this));
  }

  // Handle show/hide details button clicks
  handleResponseToggle(event) {
    if (event.target.closest(".show-details-btn")) {
      const button = event.target.closest(".show-details-btn");
      const targetId = button.dataset.target;

      // Hide preview and show full content
      document.getElementById(`${targetId}-preview`).classList.add("d-none");
      document.getElementById(`${targetId}-full`).classList.remove("d-none");
    } else if (event.target.closest(".hide-details-btn")) {
      const button = event.target.closest(".hide-details-btn");
      const targetId = button.dataset.target;

      // Show preview and hide full content
      document.getElementById(`${targetId}-preview`).classList.remove("d-none");
      document.getElementById(`${targetId}-full`).classList.add("d-none");
    }
  }

  // Download task details as JSON
  downloadTaskDetails() {
    if (!this.taskData) {
      alert("No task data available to download");
      return;
    }

    try {
      const dataStr = JSON.stringify(this.taskData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(dataBlob);
      link.download = `task-${this.currentTaskId || "details"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error downloading task details:", error);
      alert("Error downloading task details. Please try again.");
    }
  }
  // Show loading state
  showLoadingState() {
    this.hideErrorState();
    document.getElementById("task-detail-loading")?.classList.remove("d-none");
    document
      .querySelectorAll(
        ".task-header-card, .task-details-section, .task-stats-section, .initial-prompt-section, .tool-call-summary-section, .failure-details-section, .copilot-response-section"
      )
      .forEach((section) => section.classList.add("d-none"));
  }
  // Hide loading state
  hideLoadingState() {
    document.getElementById("task-detail-loading")?.classList.add("d-none");
    document
      .querySelectorAll(
        ".task-header-card, .task-details-section, .task-stats-section, .initial-prompt-section, .tool-call-summary-section, .failure-details-section, .copilot-response-section"
      )
      .forEach((section) => section.classList.remove("d-none"));
  }
  // Show error state
  showErrorState(errorMessage) {
    this.hideLoadingState();
    document
      .querySelectorAll(
        ".task-header-card, .task-details-section, .task-stats-section, .initial-prompt-section, .tool-call-summary-section, .failure-details-section, .copilot-response-section"
      )
      .forEach((section) => section.classList.add("d-none"));

    const errorElement = document.getElementById("task-detail-error");
    const errorMessageElement = document.getElementById(
      "task-detail-error-message"
    );

    if (errorElement) {
      errorElement.classList.remove("d-none");
    }

    if (errorMessageElement) {
      errorMessageElement.textContent =
        errorMessage || "An unexpected error occurred.";
    }
  }

  // Hide error state
  hideErrorState() {
    document.getElementById("task-detail-error")?.classList.add("d-none");
  }

  // Navigation helpers
  navigateBack() {
    if (this.currentRepoName) {
      // Navigate back to repo detail
      if (window.router) {
        window.router.navigate(
          `/repoName/${encodeURIComponent(this.currentRepoName)}`
        );
      } else {
        window.location.href = `/repoName/${encodeURIComponent(
          this.currentRepoName
        )}`;
      }
    } else if (this.currentJobId) {
      // Navigate back to job detail
      this.navigateToJobDetail(this.currentJobId);
    } else {
      // Navigate back to jobs list
      this.navigateToJobs();
    }
  }

  navigateToRepoDetail(repoName) {
    if (window.router) {
      window.router.navigate(`/repoName/${repoName}`);
    } else {
      window.location.href = `/repoName/${repoName}`;
    }
  }

  navigateToJobs() {
    if (window.router) {
      window.router.navigate("/jobs");
    } else {
      window.location.href = "/jobs";
    }
  }

  navigateToJobDetail(jobId) {
    if (window.router) {
      window.router.navigate(`/job-detail/jobID=${jobId}`);
    } else {
      window.location.href = `/job-detail/jobID=${jobId}`;
    }
  }

  // Update back button text based on navigation context
  updateBackButtonText() {
    const backButton = document.getElementById("back-to-job-btn");
    if (backButton) {
      const iconHtml = '<i class="bi bi-arrow-left"></i>';
      if (this.currentRepoName) {
        backButton.innerHTML = `${iconHtml} Back to Repo`;
      } else if (this.currentJobId) {
        backButton.innerHTML = `${iconHtml} Back to Job`;
      } else {
        backButton.innerHTML = `${iconHtml} Back to Jobs`;
      }
    }
  }

  // Utility functions
  setElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
    }
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Export TaskDetail class to global scope
window.TaskDetail = TaskDetail;

// Global function to load task detail (for backward compatibility)
window.loadTaskDetail = function (taskId) {
  console.log("Global loadTaskDetail called with:", taskId);

  // Ensure taskDetail instance exists
  if (!window.taskDetail && window.TaskDetail) {
    console.log("Creating TaskDetail instance from global loadTaskDetail");
    window.taskDetail = new window.TaskDetail();
  }

  if (
    window.taskDetail &&
    typeof window.taskDetail.loadTaskDetail === "function"
  ) {
    console.log(
      "Calling window.taskDetail.loadTaskDetail from global function"
    );
    return window.taskDetail.loadTaskDetail(taskId);
  } else {
    console.error("TaskDetail instance not available in global loadTaskDetail");
    return Promise.reject(new Error("TaskDetail instance not available"));
  }
};

// Initialize task detail when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Only initialize if we're on a task detail page
  if (
    window.location.pathname.includes("/task-detail/") ||
    document.getElementById("task-detail-view")
  ) {
    window.taskDetail = new TaskDetail();
  }
});

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = TaskDetail;
}
