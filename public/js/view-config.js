/**
 * View Configuration for the Dashboard Application
 * This file configures all views using the ViewManager utility
 */

// Wait for DOM and ViewManager to be ready
document.addEventListener("DOMContentLoaded", () => {
  // Small delay to ensure ViewManager is loaded
  setTimeout(() => {
    setupViewConfiguration();
  }, 100);
});

function setupViewConfiguration() {
  if (!window.viewManager) {
    console.error(
      "ViewManager not found! Make sure view-manager.js is loaded first."
    );
    return;
  }

  // Configure all application views
  window.viewManager.registerViews({    // Jobs List View
    jobs: {
      show: ["jobs-view", "jobs-content"],
      hide: [
        "job-detail-view",
        "repos-content",
        "repo-detail-view",
        "task-detail-view",
        "error-center-content",
        "job-compare-view",
      ],
      css: {
        "jobs-content": { display: "block" },
      },
      onShow: async () => {
        console.log("Jobs view shown");
      },
      onHide: async () => {
        console.log("Jobs view hidden");
      },
    },// Job Detail View
    "job-detail": {
      show: ["job-detail-view", "job-detail-content"],
      hide: [
        "jobs-view",
        "repos-content",
        "repo-detail-view",
        "task-detail-view",
        "error-center-content",
        "job-compare-view",
      ],
      css: {
        "job-detail-content": { display: "block" },
      },
      addTransition: true,
      onShow: async (data) => {
        console.log("Job detail view shown", data);
        // Additional job detail initialization if needed
      },
      onHide: async () => {
        console.log("Job detail view hidden");
      },
    },    // Job Comparison View
    "job-compare": {
      show: ["job-compare-view"],
      hide: [
        "jobs-view",
        "job-detail-view",
        "repos-content",
        "repo-detail-view",
        "task-detail-view",
        "error-center-content",
      ],
      css: {
        "job-compare-view": { display: "block" },
      },
      addTransition: true,
      onShow: async (data) => {
        console.log("Job comparison view shown", data);
        // Initialize will be handled by the router
      },
      onHide: async () => {
        console.log("Job comparison view hidden");
      },
    },// Repos List View
    repos: {
      show: ["repos-content"],
      hide: [
        "job-detail-view",
        "jobs-view",
        "jobs-content",
        "repo-detail-view",
        "job-detail-content",
        "task-detail-view",
        "error-center-content",
        "job-compare-view",
      ],
      css: {
        "repos-content": { display: "block" },
      },
      onShow: async () => {
        console.log("Repos view shown");
        // Initialize repo view if not already done
        if (!window.reposInitialized) {
          window.reposInitialized = true;
          setTimeout(() => {
            if (typeof initializeReposView === "function") {
              console.log("Initializing repo view");
              initializeReposView();
            } else {
              console.error("initializeReposView function not found");
            }
          }, 100);
        }
      },
      onHide: async () => {
        console.log("Repos view hidden");
      },
    },    // Repo Detail View
    "repo-detail": {
      show: ["repo-detail-view"],
      hide: [
        "job-detail-view",
        "jobs-view",
        "jobs-content",
        "repos-content",
        "task-detail-view",
        "error-center-content",
        "job-compare-view",
      ],
      addTransition: true,
      onShow: async (data) => {
        console.log("Repo detail view shown", data);
        // Initialize repo detail if needed
        if (data && data.repoName && typeof showRepoDetailPage === "function") {
          showRepoDetailPage(data.repoName);
        }
      },
      onHide: async () => {
        console.log("Repo detail view hidden");
      },
    },    // Task Detail View
    "task-detail": {
      show: ["task-detail-view"],
      hide: [
        "job-detail-view",
        "jobs-view",
        "jobs-content",
        "repos-content",
        "repo-detail-view",
        "error-center-content",
        "job-compare-view",
      ],
      addTransition: true,
      onShow: async (data) => {
        console.log("Task detail view shown", data);
        // Initialize task detail if needed
        if (window.taskDetail && data && data.taskId) {
          await window.taskDetail.loadTaskDetail(data.taskId);
        }
      },
      onHide: async () => {
        console.log("Task detail view hidden");
      },
    },    // Error Center View
    "error-center": {
      show: ["error-center-content"],
      hide: [
        "job-detail-view",
        "jobs-view",
        "jobs-content",
        "repos-content",
        "repo-detail-view",
        "job-detail-content",
        "task-detail-view",
        "job-compare-view",
      ],
      css: {
        "error-center-content": { display: "block" },
      },
      onShow: async () => {
        console.log("Error center view shown");
        // Initialize Error Center if not already done
        if (!window.errorCenterInitialized) {
          window.errorCenterInitialized = true;
          setTimeout(() => {
            if (typeof initErrorCenter === "function") {
              console.log("Initializing Error Center");
              initErrorCenter();
            } else {
              console.error("initErrorCenter function not found");
            }
          }, 100);
        }
      },
      onHide: async () => {
        console.log("Error center view hidden");
      },
    },

    // Loading state view (can be used to show loading screens)
    loading: {
      show: ["loading-indicator"],
      hide: [],
      css: {
        "loading-indicator": { display: "block" },
      },
      addTransition: false,
    },
  });

  console.log(
    "✅ View configuration completed. Available views:",
    window.viewManager.getViewNames()
  );
}

// Export for use in other scripts
window.viewConfig = {
  setupViewConfiguration,
};
