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
    this.setupAddRepoModal();
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
      
      // 添加文件大小显示功能
      const fileInput = document.getElementById('repo-upload');
      const fileSizeInfo = document.getElementById('file-size-info');
      
      if (fileInput && fileSizeInfo) {
        fileInput.addEventListener('change', function() {
          if (this.files && this.files[0]) {
            const file = this.files[0];
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            
            // 根据文件大小显示不同颜色
            let sizeClass = 'text-success';
            if (fileSizeMB > 100) sizeClass = 'text-warning';
            if (fileSizeMB > 500) sizeClass = 'text-danger';
            
            fileSizeInfo.innerHTML = `<span class="${sizeClass}">已选择文件大小: ${fileSizeMB} MB</span>`;
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
        
        // 显示文件大小信息在按钮上
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>上传中 (${fileSizeMB}MB)...`;
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

      // 获取文件大小
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
        progressBar.innerHTML = '上传完成!';
        
        // 更新状态信息
        const statusElement = document.getElementById('upload-status');
        if (statusElement) {
          statusElement.textContent = '文件已成功上传，正在处理...';
        }
        
        const result = await response.json();
        console.log('Upload result:', result);
        
        // Check if the result indicates actual success
        if (result.message && result.message.includes('successfully') && 
            (!result.repository || result.repository.success !== false)) {
          // Show success message
          this.showToast('文件上传成功！', 'success');
          
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

    // 不再限制文件大小
    // 但如果文件超过100MB，显示警告信息提示用户上传可能需要较长时间
    const warningSize = 100 * 1024 * 1024; // 100MB
    if (repoFile.size > warningSize) {
      this.showToast(`大文件上传可能需要较长时间，请耐心等待 (${Math.round(repoFile.size / 1024 / 1024)}MB)`, 'info');
      // 不返回false，允许上传继续
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
    // 针对大文件上传，使用更合适的进度显示
    const isLargeFile = fileSize > 100 * 1024 * 1024; // 大于100MB
    const uploadStartTime = Date.now();
    const statusElement = document.getElementById('upload-status');
    
    // 格式化文件大小为人类可读格式
    const formatFileSize = (bytes) => {
      if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
      } else if (bytes < 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      } else {
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      }
    };
    
    // 显示总大小
    const formattedSize = formatFileSize(fileSize);
    progressBar.innerHTML = `0%`;
    if (statusElement) {
      statusElement.textContent = `准备上传: ${formattedSize}`;
    }
    
    let progress = 0;
    let lastUpdate = Date.now();
    let bytesUploaded = 0;
    
    const interval = setInterval(() => {
      // 对大文件，进度增长更慢
      const increment = isLargeFile ? 
        Math.random() * 2 : // 大文件每次增长小一些
        Math.random() * 10;  // 普通文件增长更快
      
      const now = Date.now();
      const elapsed = now - lastUpdate;
      lastUpdate = now;
      
      progress += increment;
      if (progress >= 90) {
        progress = 90;
      }
      
      // 计算模拟已上传大小和速度
      const newBytesUploaded = Math.floor(fileSize * (progress / 100));
      const bytesDelta = newBytesUploaded - bytesUploaded;
      bytesUploaded = newBytesUploaded;
      
      // 计算上传速度 (bytes/second)
      const uploadSpeed = bytesDelta / (elapsed / 1000);
      const uploadSpeedFormatted = formatFileSize(uploadSpeed) + '/s';
      
      // 计算估计剩余时间
      const bytesRemaining = fileSize - bytesUploaded;
      let remainingTimeSeconds = bytesRemaining / uploadSpeed;
      let remainingTimeText = '';
      
      if (remainingTimeSeconds > 60) {
        const mins = Math.floor(remainingTimeSeconds / 60);
        const secs = Math.floor(remainingTimeSeconds % 60);
        remainingTimeText = `${mins}分${secs}秒`;
      } else {
        remainingTimeText = Math.ceil(remainingTimeSeconds) + '秒';
      }
      
      // 更新UI
      progressBar.style.width = `${progress}%`;
      progressBar.innerHTML = `${Math.round(progress)}%`;
      
      if (statusElement && !isNaN(uploadSpeed) && isFinite(uploadSpeed) && uploadSpeed > 0) {
        statusElement.textContent = `速度: ${uploadSpeedFormatted} · 已上传: ${formatFileSize(bytesUploaded)}/${formattedSize} · 剩余时间: ${remainingTimeText}`;
      }
      
      if (progress >= 90) {
        clearInterval(interval);
        if (statusElement) {
          statusElement.textContent = `正在处理文件，请稍等...`;
        }
      }
    }, isLargeFile ? 500 : 200); // 大文件更新间隔更长

    // 大文件不设置自动完成时间，依赖实际上传完成来更新进度
    if (!isLargeFile) {
      // 只为小文件设置自动完成
      setTimeout(() => {
        clearInterval(interval);
        progressBar.style.width = '100%';
        progressBar.innerHTML = '100%';
        if (statusElement) {
          statusElement.textContent = '上传完成，处理中...';
        }
      }, 3000);
    }
    
    return interval; // 返回interval ID以便后续清除
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
  }
}

let reposView;
function initializeReposView() {
  if (!reposView) {
    reposView = new ReposView();
  }
  reposView.initRepoView();
}
