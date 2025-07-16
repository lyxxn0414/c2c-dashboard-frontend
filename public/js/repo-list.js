class ReposView {
  constructor() {
    this.reposData = [];
    this.dropdownsInitialized = false;
    this.currentFilters = {
      repoName: "",
      repoType: "all",
      language: "all",
    };
  }

  initRepoView() {
    console.log("Initializing repo view...");
    // Reset initialization flag in case of re-initialization
    this.dropdownsInitialized = false;
    this.setupRepoEventListeners();
    this.loadRepos();
  }

  setupRepoEventListeners() {
    // Search input
    document.getElementById("repoNameFilter").addEventListener("input", (e) => {
      this.currentFilters.repoName = e.target.value.toLowerCase();
      this.filterRepos();
    });

    // Wait for DOM to be ready and ensure Bootstrap is available
    setTimeout(() => {
      // Only initialize dropdowns once
      if (!this.dropdownsInitialized) {
        // Repo type filter dropdown
        document.addEventListener("click", (e) => {
          // filter for repo type
          if (e.target.closest("#repo-type-dropdown .dropdown-item")) {
            e.preventDefault();
            const filter = e.target.getAttribute("data-filter");
            this.currentFilters.repoType = filter;
            updateDropdownButton("repo-type-filter", "RepoType", filter);
            this.filterRepos();
            closeDropdown("repo-type-filter", "repo-type-dropdown");
          }
          // filter for language
          if (e.target.closest("#language-dropdown .dropdown-item")) {
            e.preventDefault();
            const filter = e.target.getAttribute("data-filter");
            this.currentFilters.language = filter;
            updateDropdownButton("language-filter", "Language", filter);
            this.filterRepos();
            closeDropdown("language-filter", "language-dropdown");
          }
        });

        // Initialize Bootstrap dropdowns explicitly
        this.initializeBootstrapDropdowns();
        this.dropdownsInitialized = true;
        console.log("Dropdown event listeners and initialization completed");
      } else {
        console.log("Dropdowns already initialized, skipping...");
      }
    }, 100);
  }

  async loadRepos() {
    try {
      console.log("Loading repos...");
      const repoDetailView = document.getElementById("repo-detail-view");
      if (repoDetailView) {
        repoDetailView.classList.add("d-none");
      }
      document
        .getElementById("repos-loading-indicator")
        .classList.remove("d-none");

      const response = await fetch("/api/repos");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.reposData = await response.json();
      console.log("Repos data loaded:", this.reposData.length, "repos");
      this.displayRepos();
      this.loadRepoFilters();

      document
        .getElementById("repos-loading-indicator")
        .classList.add("d-none");
    } catch (error) {
      console.error("Error loading repos:", error);
      document
        .getElementById("repos-loading-indicator")
        .classList.add("d-none");

      // Show error message to user
      document.getElementById("reposTableBody").innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-5">
                    <i class="bi bi-exclamation-triangle fs-1 mb-3 d-block"></i>
                    <p class="mb-0">No repos found</p>
                </td>
            </tr>
        `;
    }
  }

  displayRepos(repos = this.reposData) {
    const tbody = document.getElementById("reposTableBody");

    if (repos.length === 0) {
      tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-5">
                    <i class="bi bi-inbox fs-1 mb-3 d-block"></i>
                    <p class="mb-0">No repos found</p>
                </td>
            </tr>
        `;
      return;
    }

    tbody.innerHTML = "";

    repos.forEach((repo) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
            <td>
                <a href="#" class="repo-name-link" data-repo-name="${repo.repoName}">
                    ${repo.repoName}
                </a>
            </td>
            <td>${createLanguageTags(repo.languages)}</td>
            <td>${repo.repoType}</td>
            <td>${repo.appPattern}</td>
            <td>${createSuccessRateBadge(repo.successRate)}  (${repo.successfulTasks}/${repo.totalTasks})</td>
        `;

      tbody.appendChild(tr);
    });

    // Bind repo name click events
    document.querySelectorAll(".repo-name-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const repoName = e.target.dataset.repoName;
        window.navigateToRepoDetail(repoName);
      });
    });
  }

  loadRepoFilters() {
    // Load repo types
    const repoTypes = [...new Set(this.reposData.map((repo) => repo.repoType))];
    const repoTypeDropdown = document.getElementById("repo-type-dropdown");

    // Clear existing options except "All"
    repoTypeDropdown.innerHTML =
      '<li><a class="dropdown-item" href="#" data-filter="all">All</a></li>';

    repoTypes.forEach((type) => {
      const li = document.createElement("li");
      li.innerHTML = `<a class="dropdown-item" href="#" data-filter="${type}">${type}</a>`;
      repoTypeDropdown.appendChild(li);
    });

    // Load languages
    const languages = [
      ...new Set(this.reposData.flatMap((repo) => repo.languages)),
    ];
    const languageDropdown = document.getElementById("language-dropdown");

    // Clear existing options except "All"
    languageDropdown.innerHTML =
      '<li><a class="dropdown-item" href="#" data-filter="all">All</a></li>';

    languages.forEach((lang) => {
      const li = document.createElement("li");
      li.innerHTML = `<a class="dropdown-item" href="#" data-filter="${lang}">${lang}</a>`;
      languageDropdown.appendChild(li);
    });

    console.log(
      "Repo filters loaded - RepoTypes:",
      repoTypes.length,
      "Languages:",
      languages.length
    );
  }

  filterRepos() {
    const filteredRepos = this.reposData.filter((repo) => {
      const matchName = repo.repoName
        .toLowerCase()
        .includes(this.currentFilters.repoName);
      const matchType =
        this.currentFilters.repoType === "all" ||
        repo.repoType === this.currentFilters.repoType;
      const matchLanguage =
        this.currentFilters.language === "all" ||
        repo.languages.includes(this.currentFilters.language);
      return matchName && matchType && matchLanguage;
    });

    this.displayRepos(filteredRepos);
  }

  initializeBootstrapDropdowns() {
    const dropdownConfigs = [
      { buttonId: "repo-type-filter", dropdownId: "repo-type-dropdown" },
      { buttonId: "language-filter", dropdownId: "language-dropdown" },
    ];

    initializeDropdowns(
      dropdownConfigs,
      this.setupManualDropdown.bind(this),
      this.cleanupDropdownListeners.bind(this)
    );
  }

  cleanupDropdownListeners() {
    const buttonIds = ["repo-type-filter", "language-filter"];
    cleanupDropdownListeners(buttonIds);
  }

  setupManualDropdown(button, dropdownId) {
    setupGenericManualDropdown(button, dropdownId);
  }
}

let reposView;
function initializeReposView() {
  if (!reposView) {
    reposView = new ReposView();
  }
  reposView.initRepoView();
}
