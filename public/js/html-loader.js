// HTML Template loader - loads templates from external files
const HTMLTemplates = {
  // Templates will be loaded from files
  jobsView: "",
  jobDetail: "",
  modals: "",
  reposView: "",
};

// Function to load HTML from file
async function loadTemplate(templateName, filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.status}`);
    }
    const html = await response.text();
    HTMLTemplates[templateName] = html;
    console.log(`✅ ${templateName} template loaded from ${filePath}`);
    return html;
  } catch (error) {
    console.error(`❌ Failed to load ${templateName} template:`, error);
    return "";
  }
}

// Initialize page by loading templates from files
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Loading HTML templates from files...");

  try {
    // Load all templates
    await Promise.all([
      loadTemplate("jobsView", "/partials/jobs-view.html"),
      loadTemplate("jobDetail", "/partials/job-detail.html"),
      loadTemplate("modals", "/partials/modals.html"),
      loadTemplate("reposView", "/partials/repos-view.html"),
      loadTemplate("repoDetail", "/partials/repo-detail.html"),
      loadTemplate("taskDetail", "/partials/task-detail.html"),
      loadTemplate("errorCenter", "/partials/error-center.html"),
    ]);
    // Load templates into the page
    const jobsContent = document.getElementById("jobs-content");
    const jobDetailContent = document.getElementById("job-detail-content");
    const modalsContent = document.getElementById("modals-content");
    const reposContent = document.getElementById("repos-content");
    const repoDetailContent = document.getElementById("repo-detail-view");
    const errorCenterContent = document.getElementById("error-center-content");

    if (jobsContent && HTMLTemplates.jobsView) {
      jobsContent.innerHTML = HTMLTemplates.jobsView;
      console.log("✅ Jobs view template loaded");
    } else {
      console.error("❌ jobs-content element not found or template not loaded");
    }

    if (jobDetailContent && HTMLTemplates.jobDetail) {
      jobDetailContent.innerHTML = HTMLTemplates.jobDetail;
      console.log("✅ Job detail template loaded");
    } else {
      console.error(
        "❌ job-detail-content element not found or template not loaded"
      );
    }

    if (modalsContent && HTMLTemplates.modals) {
      modalsContent.innerHTML = HTMLTemplates.modals;
      console.log("✅ Modals template loaded");
    } else {
      console.error(
        "❌ modals-content element not found or template not loaded"
      );
    }

    if (reposContent && HTMLTemplates.reposView) {
      reposContent.innerHTML = HTMLTemplates.reposView;
      console.log("✅ Repos view template loaded");
    } else {
      console.error(
        "❌ repos-content element not found or template not loaded"
      );
    }

    if (repoDetailContent && HTMLTemplates.repoDetail) {
      repoDetailContent.innerHTML = HTMLTemplates.repoDetail;
      console.log("✅ Repo detail template loaded");
    } else {
      console.error(
        "❌ repo-detail-view element not found or template not loaded"
      );
    }
    const taskDetailContent = document.getElementById("task-detail-view");
    if (taskDetailContent && HTMLTemplates.taskDetail) {
      taskDetailContent.innerHTML = HTMLTemplates.taskDetail;
      console.log("✅ Task detail template loaded");
      console.log(
        "Task detail content length:",
        HTMLTemplates.taskDetail.length
      );
    } else {
      console.error(
        "❌ task-detail-view element not found or template not loaded"
      );
      console.log("task-detail-view element:", taskDetailContent);
      console.log("taskDetail template exists:", !!HTMLTemplates.taskDetail);
      if (HTMLTemplates.taskDetail) {
        console.log(
          "taskDetail template length:",
          HTMLTemplates.taskDetail.length
        );
      }
    }

    if (errorCenterContent && HTMLTemplates.errorCenter) {
      errorCenterContent.innerHTML = HTMLTemplates.errorCenter;
      console.log("✅ Error Center template loaded");
    } else {
      console.error(
        "❌ error-center-content element not found or template not loaded"
      );
    }
    // Initialize dashboard after templates are loaded
    setTimeout(() => {
      console.log("🔧 Initializing JobDashboard...");

      // Initialize TaskDetail
      console.log("🔧 Initializing TaskDetail...");
      if (window.TaskDetail) {
        window.taskDetail = new TaskDetail();
        console.log("✅ TaskDetail initialized");
      } else {
        console.error("❌ TaskDetail class not found");
      }
    }, 100);
  } catch (error) {
    console.error("❌ Error loading templates:", error);
  }
});

// Setup navigation handlers when dashboard is ready
window.addEventListener("load", () => {
  setTimeout(() => {
    console.log("Setting up navigation handlers...");
    document.addEventListener("click", (e) => {
      // Handle navigation links
      if (e.target.closest("#job-view")) {
        e.preventDefault();
        console.log("Job view clicked");
        window.navigateToJobs();
      }
      if (e.target.closest("#repo-view")) {
        e.preventDefault();
        console.log("Repo view clicked");
        window.navigateToRepos();
      }

      if (e.target.closest("#error-center-view-nav")) {
        e.preventDefault();
        console.log("Error Center view clicked");
        window.navigateToErrorCenter();
      }
    });
    console.log("✅ Navigation handlers set up");
  }, 200);
});

// Export for use in other scripts
window.HTMLTemplates = HTMLTemplates;
