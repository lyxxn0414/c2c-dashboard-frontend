/**
 * Summary View Implementation
 * Handles the summary dashboard with charts and comparison tables
 */

// Global summary state
window.summaryView = {
  initialized: false,
  chartInstance: null,
  currentFilters: {
    copilotModel: "all",
    iacType: "all",
    deployTool: "all",
    computeResource: "all",
    mcpType: "all",
  },
  currentTab: "end-to-end",
};

/**
 * Initialize Summary View
 */
function initializeSummaryView() {
  if (window.summaryView.initialized) {
    console.log("Summary view already initialized");
    return;
  }

  console.log("Initializing Summary View...");

  // Load summary HTML content
  loadSummaryHTML();

  window.summaryView.initialized = true;
  console.log("✅ Summary view initialized");
}

/**
 * Load Summary HTML Content
 */
async function loadSummaryHTML() {
  try {
    const response = await fetch("/partials/summary-view.html");
    if (!response.ok) {
      throw new Error(`Failed to load summary view: ${response.status}`);
    }

    const html = await response.text();
    const summaryContent = document.getElementById("summary-content");
    if (summaryContent) {
      summaryContent.innerHTML = html;

      // Initialize UI components after HTML is loaded
      initializeSummaryUI();
    } else {
      console.error("Summary content container not found");
    }
  } catch (error) {
    console.error("Error loading summary view:", error);
    showSummaryError("Failed to load summary view");
  }
}

/**
 * Initialize Summary UI Components
 */
function initializeSummaryUI() {
  console.log("Initializing Summary UI components...");

  // Initialize tab navigation
  initializeTabs();

  // Initialize chart filters
  initializeFilters();

  // Initialize chart
  initializeChart();

  // Initialize comparison table
  initializeComparisonTable();

  // Bind event listeners
  bindSummaryEventListeners();

  console.log("✅ Summary UI components initialized");
}

/**
 * Initialize Tab Navigation
 */
function initializeTabs() {
  const tabButtons = document.querySelectorAll(".summary-tab-btn");

  tabButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const targetTab = e.target.getAttribute("data-bs-target");
      if (targetTab) {
        window.summaryView.currentTab = targetTab
          .replace("#", "")
          .replace("-content", "");
        console.log("Switched to tab:", window.summaryView.currentTab);

        // Refresh data for the new tab
        refreshTabData(window.summaryView.currentTab);
      }
    });
  });
}

/**
 * Initialize Chart Filters
 */
function initializeFilters() {
  const filterSelects = [
    "copilot-model-filter",
    "iac-type-filter",
    "deploy-tool-filter",
    "compute-resource-filter",
    "mcp-type-filter",
  ];

  filterSelects.forEach((filterId) => {
    const filterElement = document.getElementById(filterId);
    if (filterElement) {
      filterElement.addEventListener("change", (e) => {
        const filterKey = filterId.replace("-filter", "").replace("-", "");
        window.summaryView.currentFilters[filterKey] = e.target.value;
        console.log("Filter updated:", filterKey, e.target.value);
      });
    }
  });
}

/**
 * Initialize Performance Chart
 */
function initializeChart() {
  const chartCanvas = document.getElementById("performance-chart");
  if (!chartCanvas) {
    console.error("Chart canvas not found");
    return;
  }

  // Destroy existing chart if it exists
  if (window.summaryView.chartInstance) {
    window.summaryView.chartInstance.destroy();
  }

  // Sample data for demonstration
  const sampleData = {
    labels: ["v1.0", "v1.1", "v1.2", "v1.3", "v1.4"],
    successRateData: [85, 78, 92, 88, 94],
    iterationsData: [15, 18, 12, 16, 11],
  };

  // Create Chart.js chart
  const ctx = chartCanvas.getContext("2d");
  window.summaryView.chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: sampleData.labels,
      datasets: [
        {
          label: "Success Rate (%)",
          data: sampleData.successRateData,
          borderColor: "#28a745",
          backgroundColor: "rgba(40, 167, 69, 0.1)",
          borderWidth: 3,
          fill: true,
          yAxisID: "y",
          tension: 0.4,
        },
        {
          label: "Avg Iterations",
          data: sampleData.iterationsData,
          type: "bar",
          backgroundColor: "rgba(0, 123, 255, 0.7)",
          borderColor: "#007bff",
          borderWidth: 1,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: "Performance Trends by Version",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Version",
          },
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: true,
            text: "Success Rate (%)",
          },
          min: 0,
          max: 100,
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: {
            display: true,
            text: "Average Iterations",
          },
          grid: {
            drawOnChartArea: false,
          },
          min: 0,
        },
      },
    },
  });
}

/**
 * Refresh Chart
 */
function refreshChart() {
  console.log(
    "Refreshing chart with filters:",
    window.summaryView.currentFilters
  );

  // In a real implementation, you would fetch new data based on filters
  // For now, we'll update the chart with new sample data
  if (window.summaryView.chartInstance) {
    // Generate new sample data based on filters
    const newData = generateSampleChartData(window.summaryView.currentFilters);

    // Update chart data
    window.summaryView.chartInstance.data.labels = newData.labels;
    window.summaryView.chartInstance.data.datasets[0].data =
      newData.successRateData;
    window.summaryView.chartInstance.data.datasets[1].data =
      newData.iterationsData;

    // Update chart
    window.summaryView.chartInstance.update();
  } else {
    // Reinitialize chart if instance doesn't exist
    initializeChart();
  }
}

/**
 * Generate Sample Chart Data
 */
function generateSampleChartData(filters) {
  // This would normally fetch data from an API based on filters
  // For demo purposes, we'll generate slightly different data based on filters
  const baseData = {
    labels: ["v1.0", "v1.1", "v1.2", "v1.3", "v1.4"],
    successRateData: [85, 78, 92, 88, 94],
    iterationsData: [15, 18, 12, 16, 11],
  };

  // Modify data slightly based on filters to show interactivity
  let modifier = 1;
  if (filters.copilotModel !== "all") modifier *= 0.95;
  if (filters.iacType !== "all") modifier *= 1.05;
  if (filters.deployTool !== "all") modifier *= 0.98;

  return {
    labels: baseData.labels,
    successRateData: baseData.successRateData.map((val) =>
      Math.min(100, Math.round(val * modifier))
    ),
    iterationsData: baseData.iterationsData.map((val) =>
      Math.round(val / modifier)
    ),
  };
}

/**
 * Refresh Comparison Table
 */
function refreshComparisonTable() {
  console.log("Refreshing comparison table");

  // Show loading state
  showTableLoading(true);

  // Simulate API call delay
  setTimeout(() => {
    showTableLoading(false);
    // Table data would be updated here in a real implementation
  }, 800);
}

/**
 * Export Table
 */
function exportTable() {
  console.log("Exporting comparison table");

  // In a real implementation, this would export the table data
  // For now, just show a notification
  alert("Export functionality would be implemented here");
}

/**
 * Refresh Tab Data
 */
function refreshTabData(tabName) {
  console.log("Refreshing data for tab:", tabName);

  // Different tabs might have different data requirements
  switch (tabName) {
    case "end-to-end":
      refreshChart();
      refreshComparisonTable();
      break;
    case "deploy-existing":
      // Load deploy-to-existing specific data
      break;
    case "containerization":
      // Load containerization specific data
      break;
    default:
      console.warn("Unknown tab:", tabName);
  }
}

/**
 * Show Chart Loading State
 */
function showChartLoading(show) {
  const loadingElement = document.getElementById("chart-loading");
  const chartContainer = document.querySelector(".chart-container");

  if (loadingElement && chartContainer) {
    if (show) {
      loadingElement.style.display = "block";
      chartContainer.style.display = "none";
    } else {
      loadingElement.style.display = "none";
      chartContainer.style.display = "block";
    }
  }
}

/**
 * Show Table Loading State
 */
function showTableLoading(show) {
  const loadingElement = document.getElementById("table-loading");
  const tableContainer = document.querySelector(".table-responsive");

  if (loadingElement && tableContainer) {
    if (show) {
      loadingElement.style.display = "block";
      tableContainer.style.display = "none";
    } else {
      loadingElement.style.display = "none";
      tableContainer.style.display = "block";
    }
  }
}

/**
 * Show Summary Error
 */
function showSummaryError(message) {
  const summaryContent = document.getElementById("summary-content");
  if (summaryContent) {
    summaryContent.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <h4 class="alert-heading">Error Loading Summary</h4>
        <p>${message}</p>
        <hr>
        <p class="mb-0">Please try refreshing the page or contact support if the problem persists.</p>
      </div>
    `;
  }
}

/**
 * Initialize Comparison Table
 */
function initializeComparisonTable() {
  const tableControls = document.querySelectorAll(
    "#show-percentage, #color-coding, #group-by-select"
  );

  tableControls.forEach((control) => {
    control.addEventListener("change", () => {
      refreshComparisonTable();
    });
  });
}

/**
 * Bind Event Listeners
 */
function bindSummaryEventListeners() {
  // Apply Filters Button
  const applyFiltersBtn = document.getElementById("apply-filters-btn");
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener("click", applyFilters);
  }

  // Reset Filters Button
  const resetFiltersBtn = document.getElementById("reset-filters-btn");
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", resetFilters);
  }

  // Refresh Chart Button
  const refreshChartBtn = document.getElementById("refresh-chart-btn");
  if (refreshChartBtn) {
    refreshChartBtn.addEventListener("click", refreshChart);
  }

  // Export Table Button
  const exportTableBtn = document.getElementById("export-table-btn");
  if (exportTableBtn) {
    exportTableBtn.addEventListener("click", exportTable);
  }

  // Refresh Table Button
  const refreshTableBtn = document.getElementById("refresh-table-btn");
  if (refreshTableBtn) {
    refreshTableBtn.addEventListener("click", refreshComparisonTable);
  }
}

/**
 * Apply Filters
 */
function applyFilters() {
  console.log("Applying filters:", window.summaryView.currentFilters);

  // Show loading state
  showChartLoading(true);

  // Simulate API call delay
  setTimeout(() => {
    showChartLoading(false);
    refreshChart();
  }, 1000);
}

/**
 * Reset Filters
 */
function resetFilters() {
  console.log("Resetting filters");

  // Reset filter values
  window.summaryView.currentFilters = {
    copilotModel: "all",
    iacType: "all",
    deployTool: "all",
    computeResource: "all",
    mcpType: "all",
  };

  // Update UI
  Object.keys(window.summaryView.currentFilters).forEach((key) => {
    const filterId = key.replace(/([A-Z])/g, "-$1").toLowerCase() + "-filter";
    const filterElement = document.getElementById(filterId);
    if (filterElement) {
      filterElement.value = "all";
    }
  });

  // Refresh chart
  refreshChart();
}

/**
 * Refresh Comparison Table
 */
function refreshComparisonTable() {
  console.log("Refreshing comparison table");

  // Show loading state
  showTableLoading(true);

  // Simulate API call delay
  setTimeout(() => {
    showTableLoading(false);
    // Table data would be updated here in a real implementation
  }, 800);
}

/**
 * Export Table
 */
function exportTable() {
  console.log("Exporting comparison table");

  // In a real implementation, this would export the table data
  // For now, just show a notification
  alert("Export functionality would be implemented here");
}

/**
 * Refresh Tab Data
 */
function refreshTabData(tabName) {
  console.log("Refreshing data for tab:", tabName);

  // Different tabs might have different data requirements
  switch (tabName) {
    case "end-to-end":
      refreshChart();
      refreshComparisonTable();
      break;
    case "deploy-existing":
      // Load deploy-to-existing specific data
      break;
    case "containerization":
      // Load containerization specific data
      break;
    default:
      console.warn("Unknown tab:", tabName);
  }
}

/**
 * Show Chart Loading State
 */
function showChartLoading(show) {
  const loadingElement = document.getElementById("chart-loading");
  const chartContainer = document.querySelector(".chart-container");

  if (loadingElement && chartContainer) {
    if (show) {
      loadingElement.style.display = "block";
      chartContainer.style.display = "none";
    } else {
      loadingElement.style.display = "none";
      chartContainer.style.display = "block";
    }
  }
}

/**
 * Show Table Loading State
 */
function showTableLoading(show) {
  const loadingElement = document.getElementById("table-loading");
  const tableContainer = document.querySelector(".table-responsive");

  if (loadingElement && tableContainer) {
    if (show) {
      loadingElement.style.display = "block";
      tableContainer.style.display = "none";
    } else {
      loadingElement.style.display = "none";
      tableContainer.style.display = "block";
    }
  }
}

/**
 * Show Summary Error
 */
function showSummaryError(message) {
  const summaryContent = document.getElementById("summary-content");
  if (summaryContent) {
    summaryContent.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <h4 class="alert-heading">Error Loading Summary</h4>
        <p>${message}</p>
        <hr>
        <p class="mb-0">Please try refreshing the page or contact support if the problem persists.</p>
      </div>
    `;
  }
}

// Initialize summary view when the script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSummaryView);
} else {
  initializeSummaryView();
}

// Set up navigation click handler
document.addEventListener("DOMContentLoaded", () => {
  const summaryNavLink = document.getElementById("summary-view-nav");
  if (summaryNavLink) {
    summaryNavLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.navigateToSummary) {
        window.navigateToSummary();
      } else if (window.router) {
        window.router.navigate("/summary");
      }
    });
  }
});

// Export functions for global access
window.summaryViewFunctions = {
  initializeSummaryView,
  refreshChart,
  refreshComparisonTable,
  applyFilters,
  resetFilters,
};
