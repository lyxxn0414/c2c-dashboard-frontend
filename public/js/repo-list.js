class ReposView {
  constructor() {
    this.reposData = [];
    this.dropdownsInitialized = false;
    this.currentFilters = {
      repoName: "",
      repoType: "all",
      language: "all",
      appPattern: "all",
      repoGroup: "all",
    };
    // Add sort state to track current sorting
    this.currentSort = {
      column: null,
      direction: "asc"
    };
    // Initialize the click processing flag
    this.isProcessingClick = false;
  }

  initRepoView() {
    console.log("Initializing repo view...");
    // Reset initialization flag in case of re-initialization
    this.dropdownsInitialized = false;
    this.setupRepoEventListeners();
    this.setupAddRepoModal();
    this.loadRepos();
  }

  setupRepoEventListeners() {
    // Search input
    document.getElementById("repoNameFilter").addEventListener("input", (e) => {
      this.currentFilters.repoName = e.target.value.toLowerCase();
      this.filterRepos();
    });

    // Setup sort functionality for sortable columns
    this.setupSortableColumns();

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
  
  // Add a new method to set up the sortable columns
  setupSortableColumns() {
    console.log("Setting up sortable columns...");
    const headers = document.querySelectorAll("th.sortable");
    
    headers.forEach(header => {
      // Get the icon element within this header
      const icon = header.querySelector("i.bi");
      
      // Only add one event listener to the icon (not both header and icon)
      if (icon) {
        // Click handler for the icon only
        icon.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent event bubbling
          e.preventDefault(); // Prevent default behavior
          
          // Prevent rapid successive clicks
          if (this.isProcessingClick) {
            return;
          }
          this.isProcessingClick = true;
          
          const column = header.getAttribute("data-sort");
          
          // Set the column if it's different, or toggle direction if it's the same
          if (this.currentSort.column !== column) {
            this.currentSort.column = column;
            this.currentSort.direction = "desc"; // Start with desc when clicking icon on new column
          } else {
            // Toggle direction when clicking the same column's icon
            this.currentSort.direction = this.currentSort.direction === "asc" ? "desc" : "asc";
          }
          
          console.log(`Icon click to toggle sort for ${column} to ${this.currentSort.direction}`);
          
          // Update sort indicators and display
          this.updateSortIndicators();
          this.sortAndDisplayRepos();
          
          // Reset flag after a delay
          setTimeout(() => {
            this.isProcessingClick = false;
          }, 300);
        });
      }
      
      // Regular click handler for the header (only for non-icon clicks)
      header.addEventListener("click", (e) => {
        // Only handle clicks that are NOT on the icon
        if (e.target === icon || e.target.closest('i.bi')) {
          return; // Let the icon handler take care of it
        }
        
        // Prevent rapid successive clicks
        if (this.isProcessingClick) {
          return;
        }
        this.isProcessingClick = true;
        
        const column = header.getAttribute("data-sort");
        
        // Toggle direction if clicking the same column, or default to ascending for a new column
        if (this.currentSort.column === column) {
          this.currentSort.direction = this.currentSort.direction === "asc" ? "desc" : "asc";
        } else {
          this.currentSort.column = column;
          this.currentSort.direction = "asc";
        }
        
        console.log(`Header click to sort by ${column} in ${this.currentSort.direction} order`);
        
        // Update sort icons and tooltips in headers
        this.updateSortIndicators();
        
        // Sort and display the data
        this.sortAndDisplayRepos();
        
        // Reset flag after a delay
        setTimeout(() => {
          this.isProcessingClick = false;
        }, 300);
      });
    });
  }
  
  // Add a new method to update the sort indicators in the table headers
  updateSortIndicators() {
    // Remove any existing sort indicators and active-sort classes
    document.querySelectorAll("th.sortable").forEach(header => {
      header.classList.remove("active-sort");
      const icon = header.querySelector("i.bi");
      if (icon) {
        icon.className = "bi bi-arrow-down-up ms-1";
        icon.title = `Click to sort ascending, double-click to sort descending`;
      }
      // Reset header tooltip
      const columnName = header.textContent.trim();
      header.title = `Click to sort by ${columnName.toLowerCase()}`;
    });
    
    // If we have an active sort, update the relevant icon, class and tooltips
    if (this.currentSort.column) {
      const activeHeader = document.querySelector(`th[data-sort="${this.currentSort.column}"]`);
      if (activeHeader) {
        // Add active-sort class to the header
        activeHeader.classList.add("active-sort");
        
        const icon = activeHeader.querySelector("i.bi");
        if (icon) {
          const columnName = activeHeader.textContent.trim();
          const isAscending = this.currentSort.direction === "asc";
          
          // Up arrow for ascending (A→Z), down arrow for descending (Z→A)
          icon.className = `bi bi-arrow-${isAscending ? "up" : "down"} ms-1`;
          
          // Add a brief animation effect to indicate the sort has changed
          // First remove any existing animation
          icon.style.animation = 'none';
          
          // Force a reflow to ensure the animation will play even if the class was just removed
          void icon.offsetWidth;
          
          // Apply the animation
          icon.style.animation = 'sortAnimation 0.3s ease';
          
          // Update tooltips to reflect current sort state
          icon.title = `Click to toggle sort direction (currently ${isAscending ? 'ascending' : 'descending'})`;
          
          activeHeader.title = isAscending ? 
            `Click to sort ${columnName.toLowerCase()} in descending order` : 
            `Click to sort ${columnName.toLowerCase()} in ascending order`;
        }
      }
    }
  }
  
  // Add a new method to sort and display the repos
  sortAndDisplayRepos() {
    if (!this.currentSort.column) {
      return;
    }
    
    const startTime = performance.now();
    
    // First filter the repos based on the current filters
    const filteredRepos = this.getFilteredRepos();
    
    // Then sort the filtered repos
    const sortedRepos = this.sortRepos(filteredRepos);
    
    // Display the sorted repos
    this.displayRepos(sortedRepos);
    
    const endTime = performance.now();
    console.log(`Sorted ${sortedRepos.length} repos by ${this.currentSort.column} (${this.currentSort.direction}) in ${(endTime - startTime).toFixed(2)}ms`);
  }
  
  // Add a helper method to get filtered repos
  getFilteredRepos() {
    return this.reposData.filter((repo) => {
      const matchName = repo.repoName
        .toLowerCase()
        .includes(this.currentFilters.repoName);
      const matchType =
        this.currentFilters.repoType === "all" ||
        repo.repoType === this.currentFilters.repoType;
      const matchLanguage =
        this.currentFilters.language === "all" ||
        repo.languages.includes(this.currentFilters.language);
      const matchAppPattern = 
        this.currentFilters.appPattern === "all" || 
        repo.appPattern === this.currentFilters.appPattern;
      
      // Hierarchical RepoGroup filtering logic
      let matchRepoGroup = true;
      if (this.currentFilters.repoGroup !== "all") {
        if (this.currentFilters.repoGroup === "Minimal") {
          // Only show Minimal repos
          matchRepoGroup = repo.repoGroup === "Minimal";
        } else if (this.currentFilters.repoGroup === "Medium") {
          // Show Minimal + Medium repos
          matchRepoGroup = repo.repoGroup === "Minimal" || repo.repoGroup === "Medium";
        } else if (this.currentFilters.repoGroup === "Full") {
          // Show all repos (Minimal + Medium + Full)
          matchRepoGroup = true;
        } else {
          // For any other specific group, show exact match
          matchRepoGroup = repo.repoGroup === this.currentFilters.repoGroup;
        }
      }
      
      return matchName && matchType && matchLanguage && matchAppPattern && matchRepoGroup;
    });
  }
  
  // Add a method to sort repos based on the current sort state
  sortRepos(repos) {
    if (!this.currentSort.column || !repos.length) {
      return repos;
    }
    
    const column = this.currentSort.column;
    const direction = this.currentSort.direction;
    
    return [...repos].sort((a, b) => {
      let valueA, valueB;
      
      // Special handling for different column types
      if (column === "languages") {
        // For languages, sort by the first language in the array or empty string
        valueA = a.languages && a.languages.length ? a.languages[0] : "";
        valueB = b.languages && b.languages.length ? b.languages[0] : "";
      } else if (column === "successRate") {
        // For success rate, convert to numbers
        valueA = parseFloat(a.successRate || 0);
        valueB = parseFloat(b.successRate || 0);
      } else {
        // For all other columns, use the column value directly
        valueA = a[column] || "";
        valueB = b[column] || "";
      }
      
      // For string comparisons
      if (typeof valueA === "string" && typeof valueB === "string") {
        return direction === "asc" 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      // For numeric comparisons
      return direction === "asc" ? valueA - valueB : valueB - valueA;
    });
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
      
      // Apply default sorting by repoName ascending
      this.currentSort = {
        column: "repoName",
        direction: "asc"
      };
      this.updateSortIndicators();
      this.sortAndDisplayRepos();
      console.log("Applied default sorting: repoName ascending");
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
    
    // Load app patterns
    const appPatterns = [...new Set(this.reposData.map((repo) => repo.appPattern))].filter(pattern => pattern);

    // Populate app pattern dropdown
    window.dropdownManager.populateDropdown("app-pattern-filter", appPatterns);

    // Load repo groups
    const repoGroups = [...new Set(this.reposData.map((repo) => repo.repoGroup))].filter(group => group);

    // Populate repo group dropdown
    window.dropdownManager.populateDropdown("repo-group-filter", repoGroups);

    console.log(
      "Repo filters loaded - RepoTypes:",
      repoTypes.length,
      "Languages:",
      languages.length,
      "AppPatterns:",
      appPatterns.length,
      "RepoGroups:",
      repoGroups.length
    );
  }

  filterRepos() {
    const filteredRepos = this.getFilteredRepos();
    
    // If we have a sorting applied, sort the filtered repos
    if (this.currentSort.column) {
      const sortedRepos = this.sortRepos(filteredRepos);
      this.displayRepos(sortedRepos);
    } else {
      this.displayRepos(filteredRepos);
    }
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
    const appPatternButton = document.getElementById("app-pattern-filter");
    const appPatternDropdown = document.getElementById("app-pattern-dropdown");
    const repoGroupButton = document.getElementById("repo-group-filter");
    const repoGroupDropdown = document.getElementById("repo-group-dropdown");

    console.log("DOM Elements Check:");
    console.log("- repo-type-filter button:", !!repoTypeButton);
    console.log("- repo-type-dropdown menu:", !!repoTypeDropdown);
    console.log("- language-filter button:", !!languageButton);
    console.log("- language-dropdown menu:", !!languageDropdown);
    console.log("- app-pattern-filter button:", !!appPatternButton);
    console.log("- app-pattern-dropdown menu:", !!appPatternDropdown);
    console.log("- repo-group-filter button:", !!repoGroupButton);
    console.log("- repo-group-dropdown menu:", !!repoGroupDropdown);

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
    
    // Register app pattern dropdown
    if (appPatternButton && appPatternDropdown) {
      console.log("Registering app-pattern-filter...");
      window.dropdownManager.register("app-pattern-filter", {
        buttonId: "app-pattern-filter",
        dropdownId: "app-pattern-dropdown",
        placeholder: "AppPattern",
        filterType: "select",
        onSelect: (value, label, id) => {
          console.log(`AppPattern filter selected: ${value} (${label})`);
          this.currentFilters.appPattern = value;
          this.filterRepos();
        },
      });
    }

    // Register repo group dropdown
    if (repoGroupButton && repoGroupDropdown) {
      console.log("Registering repo-group-filter...");
      window.dropdownManager.register("repo-group-filter", {
        buttonId: "repo-group-filter",
        dropdownId: "repo-group-dropdown",
        placeholder: "RepoGroup",
        filterType: "select",
        onSelect: (value, label, id) => {
          console.log(`RepoGroup filter selected: ${value} (${label})`);
          this.currentFilters.repoGroup = value;
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
    
    if (appPatternButton && appPatternDropdown) {
      console.log("Initializing app-pattern-filter dropdown...");
      window.dropdownManager.init("app-pattern-filter");
    }

    if (repoGroupButton && repoGroupDropdown) {
      console.log("Initializing repo-group-filter dropdown...");
      window.dropdownManager.init("repo-group-filter");
    }

    console.log("=== REPO DROPDOWN INITIALIZATION COMPLETE ===");
  }

  setupAddRepoModal() {
    // Only set up the button click handler - no form submit handler
    const submitBtn = document.getElementById('submit-repo-btn');
    
    if (submitBtn) {
      // Store reference to this for proper context in event handler
      const self = this;
      
      // Remove existing handlers (if any) by replacing with a new one
      submitBtn.onclick = function(e) {
        e.preventDefault();
        // Only proceed if button isn't disabled
        if (!this.disabled) {
          self.handleAddRepo();
        }
      };
      
      // show file size info when file input changes
      const fileInput = document.getElementById('repo-upload');
      const fileSizeInfo = document.getElementById('file-size-info');
      
      if (fileInput && fileSizeInfo) {
        fileInput.addEventListener('change', function() {
          if (this.files && this.files[0]) {
            const file = this.files[0];
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            let sizeClass = 'text-success';
            if (fileSizeMB > 100) sizeClass = 'text-warning';
            if (fileSizeMB > 500) sizeClass = 'text-danger';
            
            fileSizeInfo.innerHTML = `<span class="${sizeClass}">File size: ${fileSizeMB} MB</span>`;
          } else {
            fileSizeInfo.innerHTML = '';
          }
        });
      }
    }
  }

  // Track whether a submission is in progress
  isSubmitting = false;

  async handleAddRepo() {
    // Prevent duplicate submissions
    if (this.isSubmitting) {
      console.log('Submission already in progress, ignoring duplicate call');
      return;
    }
    
    this.isSubmitting = true;
    
    try {
      const form = document.getElementById('add-repo-form');
      const submitBtn = document.getElementById('submit-repo-btn');
      const progressContainer = document.getElementById('upload-progress');
      const progressBar = progressContainer.querySelector('.progress-bar');
      
      // Check HTML5 form validation before proceeding
      if (form && !form.checkValidity()) {
        form.reportValidity();
        this.isSubmitting = false;
        return;
      }

      // Validate form
      if (!this.validateAddRepoForm()) {
        return;
      }

      // Disable submit button and show progress
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Uploading...';
      progressContainer.classList.remove('d-none');

      // Collect form data
      const formData = new FormData();
      
      // File upload
      const fileInput = document.getElementById('repo-upload');
      if (fileInput.files[0]) {
        const file = fileInput.files[0];
        formData.append('repoFile', file);
        
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Uploading (${fileSizeMB}MB)...`;
      }

      // Generate repository name from uploaded file
      const fileName = fileInput.files[0].name;
      const repoName = fileName.replace(/\.(zip|tar\.gz|tar|rar)$/i, '').replace(/[^a-zA-Z0-9-_]/g, '-');

      // Repository details
      formData.append('repoName', repoName);
      formData.append('repoType', document.getElementById('repo-type').value);
      formData.append('appPattern', document.getElementById('app-pattern').value);
      formData.append('repoUrl', document.getElementById('repo-url').value);
      formData.append('grouping', document.querySelector('input[name="grouping"]:checked').value);

      // Languages (multiple selection)
      const selectedLanguages = Array.from(document.querySelectorAll('.repo-language:checked'))
        .map(checkbox => checkbox.value);
      formData.append('languages', JSON.stringify(selectedLanguages));

      // get file size
      const fileSize = fileInput.files[0].size;
      
      // Simulate upload progress based on file size
      const progressInterval = this.simulateUploadProgress(progressBar, fileSize);

      // Submit to API
      const response = await fetch('/api/repos', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        // 清除进度条模拟定时器
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        
        // 完成进度条并显示成功信息
        progressBar.style.width = '100%';
        progressBar.classList.add('bg-success');
        progressBar.innerHTML = 'Upload complete!';
        
        // 更新状态信息
        const statusElement = document.getElementById('upload-status');
        if (statusElement) {
          statusElement.textContent = 'File uploaded successfully, processing...';
        }
        
        const result = await response.json();
        console.log('Upload result:', result);
        
        // Check if the result indicates actual success
        if (result.message && result.message.includes('successfully') && 
            (!result.repository || result.repository.success !== false)) {
          // Show success message
          this.showToast('File uploaded successfully!', 'success');
          
          // Close modal and reset form
          const modal = bootstrap.Modal.getInstance(document.getElementById('addRepoModal'));
          modal.hide();
          form.reset();
          
          // Reload repos list
          await this.loadRepos();
        } else {
          // Even with 200 status, the operation might have failed
          const errorMessage = result.error || 
                              result.message || 
                              (result.repository && result.repository.message) ||
                              'Repository upload failed - please check the file and try again';
          throw new Error(errorMessage);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to add repository');
      }

    } catch (error) {
      console.error('Error adding repository:', error);
      this.showToast(error.message || 'Failed to add repository', 'error');
    } finally {
      // Reset button and hide progress
      const submitBtn = document.getElementById('submit-repo-btn');
      const progressContainer = document.getElementById('upload-progress');
      
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Add Repository';
      progressContainer.classList.add('d-none');
      
      // Reset submission tracking flag after a short delay
      setTimeout(() => {
        this.isSubmitting = false;
      }, 500);
    }
  }

  validateAddRepoForm() {
    const repoFile = document.getElementById('repo-upload').files[0];
    const repoType = document.getElementById('repo-type').value;
    const appPattern = document.getElementById('app-pattern').value;
    const repoUrl = document.getElementById('repo-url').value.trim();
    const selectedLanguages = document.querySelectorAll('.repo-language:checked');
    const selectedGrouping = document.querySelector('input[name="grouping"]:checked');

    // Validate file upload
    if (!repoFile) {
      this.showToast('Please select a repository file to upload', 'error');
      return false;
    }

    // Validate file type
    const allowedTypes = ['.zip', '.tar.gz', '.tar', '.rar'];
    const fileName = repoFile.name.toLowerCase();
    const isValidType = allowedTypes.some(type => fileName.endsWith(type));
    
    if (!isValidType) {
      this.showToast('Please upload a valid file format (.zip, .tar.gz, .tar, .rar)', 'error');
      return false;
    }

    const warningSize = 100 * 1024 * 1024; // 100MB
    if (repoFile.size > warningSize) {
      this.showToast(`Large file uploads may take longer, please be patient (${Math.round(repoFile.size / 1024 / 1024)}MB)`, 'info');
    }

    // Validate repository type
    if (!repoType) {
      this.showToast('Please select a repository type', 'error');
      return false;
    }

    // Validate app pattern
    if (!appPattern) {
      this.showToast('Please select an app pattern', 'error');
      return false;
    }

    // Validate repository URL
    if (!repoUrl) {
      this.showToast('Please enter a repository URL', 'error');
      return false;
    }

    // Validate URL format
    try {
      new URL(repoUrl);
    } catch (error) {
      this.showToast('Please enter a valid URL', 'error');
      return false;
    }

    // Validate languages
    if (selectedLanguages.length === 0) {
      this.showToast('Please select at least one language', 'error');
      return false;
    }

    // Validate grouping
    if (!selectedGrouping) {
      this.showToast('Please select a grouping option', 'error');
      return false;
    }

    return true;
  }

  simulateUploadProgress(progressBar, fileSize) {
    const isLargeFile = fileSize > 100 * 1024 * 1024;
    const uploadStartTime = Date.now();
    const statusElement = document.getElementById('upload-status');

    const formatFileSize = (bytes) => {
      if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
      } else if (bytes < 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      } else {
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      }
    };
    
    const formattedSize = formatFileSize(fileSize);
    progressBar.innerHTML = `0%`;
    if (statusElement) {
      statusElement.textContent = `Preparing to upload: ${formattedSize}`;
    }
    
    let progress = 0;
    let lastUpdate = Date.now();
    let bytesUploaded = 0;
    
    const interval = setInterval(() => {
      const increment = isLargeFile ? 
        Math.random() * 2 :
        Math.random() * 10; 
      
      const now = Date.now();
      const elapsed = now - lastUpdate;
      lastUpdate = now;
      
      progress += increment;
      if (progress >= 90) {
        progress = 90;
      }
      
      const newBytesUploaded = Math.floor(fileSize * (progress / 100));
      const bytesDelta = newBytesUploaded - bytesUploaded;
      bytesUploaded = newBytesUploaded;
      
      const uploadSpeed = bytesDelta / (elapsed / 1000);
      const uploadSpeedFormatted = formatFileSize(uploadSpeed) + '/s';
      
      const bytesRemaining = fileSize - bytesUploaded;
      let remainingTimeSeconds = bytesRemaining / uploadSpeed;
      let remainingTimeText = '';
      
      if (remainingTimeSeconds > 60) {
        const mins = Math.floor(remainingTimeSeconds / 60);
        const secs = Math.floor(remainingTimeSeconds % 60);
        remainingTimeText = `${mins}Minutes ${secs}Seconds`;
      } else {
        remainingTimeText = Math.ceil(remainingTimeSeconds) + 'Seconds';
      }
      
      progressBar.style.width = `${progress}%`;
      progressBar.innerHTML = `${Math.round(progress)}%`;
      
      if (statusElement && !isNaN(uploadSpeed) && isFinite(uploadSpeed) && uploadSpeed > 0) {
        statusElement.textContent = `Speed: ${uploadSpeedFormatted} · Uploaded: ${formatFileSize(bytesUploaded)}/${formattedSize} · Remaining Time: ${remainingTimeText}`;
      }
      
      if (progress >= 90) {
        clearInterval(interval);
        if (statusElement) {
          statusElement.textContent = `Processing file, please wait...`;
        }
      }
    }, isLargeFile ? 500 : 200);

    if (!isLargeFile) {
      setTimeout(() => {
        clearInterval(interval);
        progressBar.style.width = '100%';
        progressBar.innerHTML = '100%';
        if (statusElement) {
          statusElement.textContent = 'Upload complete, processing...';
        }
      }, 3000);
    }
    
    return interval;
  }

  showToast(message, type = 'info') {
    // Create toast element
    const toastContainer = document.getElementById('toast-container');
    const toastId = 'toast-' + Date.now();
    
    const toastHTML = `
      <div class="toast" id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header">
          <i class="bi ${type === 'success' ? 'bi-check-circle text-success' : 
                        type === 'error' ? 'bi-exclamation-triangle text-danger' : 
                        'bi-info-circle text-primary'} me-2"></i>
          <strong class="me-auto">Repository</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    // Show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  }

  cleanupDropdownListeners() {
    // Use the dropdown manager's cleanup
    window.dropdownManager.cleanup("repo-type-filter");
    window.dropdownManager.cleanup("language-filter");
    window.dropdownManager.cleanup("app-pattern-filter");
    window.dropdownManager.cleanup("repo-group-filter");
  }
}

let reposView;
function initializeReposView() {
  if (!reposView) {
    reposView = new ReposView();
  }
  reposView.initRepoView();
}
