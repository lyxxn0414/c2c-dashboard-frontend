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

    // Wait for DOM to be ready and setup dropdowns
    setTimeout(() => {
      if (!this.dropdownsInitialized) {
        this.initializeRepoDropdowns();
        this.dropdownsInitialized = true;
        console.log("Repo dropdown initialization completed");
      } else {
        console.log("Repo dropdowns already initialized, skipping...");
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

    // Populate repo type dropdown
    window.dropdownManager.populateDropdown("repo-type-filter", repoTypes);

    // Load languages
    const languages = [
      ...new Set(this.reposData.flatMap((repo) => repo.languages)),
    ];

    // Populate language dropdown
    window.dropdownManager.populateDropdown("language-filter", languages);

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

  initializeRepoDropdowns() {
    console.log("=== STARTING REPO DROPDOWN INITIALIZATION ===");
    console.log("DropdownManager available:", !!window.dropdownManager);

    // Check if dropdownManager is available
    if (!window.dropdownManager) {
      console.error(
        "DropdownManager not available! Make sure utils.js is loaded first."
      );
      return;
    }

    // Check if DOM elements exist
    const repoTypeButton = document.getElementById("repo-type-filter");
    const repoTypeDropdown = document.getElementById("repo-type-dropdown");
    const languageButton = document.getElementById("language-filter");
    const languageDropdown = document.getElementById("language-dropdown");

    console.log("DOM Elements Check:");
    console.log("- repo-type-filter button:", !!repoTypeButton);
    console.log("- repo-type-dropdown menu:", !!repoTypeDropdown);
    console.log("- language-filter button:", !!languageButton);
    console.log("- language-dropdown menu:", !!languageDropdown);

    if (!repoTypeButton || !repoTypeDropdown) {
      console.error("Required DOM elements for repo-type-filter not found!");
      return;
    }

    // Register repo type dropdown
    console.log("Registering repo-type-filter...");
    window.dropdownManager.register("repo-type-filter", {
      buttonId: "repo-type-filter",
      dropdownId: "repo-type-dropdown",
      placeholder: "RepoType",
      filterType: "select",
      onSelect: (value, label, id) => {
        console.log(`Repo type filter selected: ${value} (${label})`);
        this.currentFilters.repoType = value;
        this.filterRepos();
      },
    });

    // Register language dropdown
    if (languageButton && languageDropdown) {
      console.log("Registering language-filter...");
      window.dropdownManager.register("language-filter", {
        buttonId: "language-filter",
        dropdownId: "language-dropdown",
        placeholder: "Language",
        filterType: "select",
        onSelect: (value, label, id) => {
          console.log(`Language filter selected: ${value} (${label})`);
          this.currentFilters.language = value;
          this.filterRepos();
        },
      });
    }

    // Initialize both dropdowns
    console.log("Initializing repo-type-filter dropdown...");
    window.dropdownManager.init("repo-type-filter");

    if (languageButton && languageDropdown) {
      console.log("Initializing language-filter dropdown...");
      window.dropdownManager.init("language-filter");
    }

    console.log("=== REPO DROPDOWN INITIALIZATION COMPLETE ===");
  }

  cleanupDropdownListeners() {
    // Use the dropdown manager's cleanup
    window.dropdownManager.cleanup("repo-type-filter");
    window.dropdownManager.cleanup("language-filter");
  }
}

let reposView;
function initializeReposView() {
  if (!reposView) {
    reposView = new ReposView();
  }
  reposView.initRepoView();
}
