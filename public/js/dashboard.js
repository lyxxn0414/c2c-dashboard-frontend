// Dashboard JavaScript
class JobDashboard {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.currentSort = { field: 'creationTime', order: 'desc' };
        this.currentFilter = '';
        this.currentUserFilter = 'all';
        this.currentMcpFilter = 'all';
        this.currentTerraformFilter = 'all';
        this.externalServiceStatus = null;
        this.jobDropdownsInitialized = false;
        
        this.init();
    }

    init() {
        // Wait for DOM elements to be available
        setTimeout(() => {
            this.initializeElements();
            this.bindEvents();
            this.initializeJobDropdowns();
            this.setupRouting();
            this.checkExternalServiceStatus();
            this.loadJobs();
            this.loadConfig();
            this.handleInitialRoute();
        }, 200);
    }

    setupRouting() {
        // Listen for browser back/forward button
        window.addEventListener('popstate', (event) => {
            console.log('Popstate event:', event.state);
            this.handleRoute(window.location.pathname + window.location.search);
        });
    }

    handleInitialRoute() {
        // Handle the initial page load route
        const currentPath = window.location.pathname + window.location.search;
        console.log('Initial route:', currentPath);
        this.handleRoute(currentPath);
    }    handleRoute(path) {
        console.log('Handling route:', path);
        
        // Parse job detail routes: /job-detail/jobID=#id or ?jobID=#id
        const jobDetailMatch = path.match(/\/job-detail\/jobID=([^&?#]+)/);
        const jobDetailQueryMatch = path.match(/[?&]jobID=([^&]+)/);
        
        if (jobDetailMatch || jobDetailQueryMatch) {
            const jobId = jobDetailMatch ? jobDetailMatch[1] : jobDetailQueryMatch[1];
            console.log('Routing to job detail:', jobId);
            // Immediately show detail view with loading state instead of jobs view
            this.showJobDetailLoadingState();
            this.navigateToJobDetail(jobId);
        } else if (path === '/repos' || path.startsWith('/repos')) {
            console.log('Routing to repos view');
            this.showReposView();
        } else if (path.startsWith('/repoName/')) {
            const repoName = path.split('/repoName/')[1];
            console.log('Routing to repo detail:', repoName);
            navigateToRepoDetail(repoName);
            showRepoDetailLoadingState();
        }
        else {
            // Default to jobs view
            this.showJobsView();
            // Update URL if needed
            if (path !== '/' && path !== '/jobs' && path !== '') {
                this.updateURL('/');
            }
        }
    }

    async navigateToJobDetail(jobId) {
        try {
            console.log('Navigating to job detail:', jobId);
            
            // Fetch job data
            const response = await fetch(`/api/jobs/${jobId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const jobDetail = await response.json();
            const job = jobDetail.job;
            const taskErrors = jobDetail.taskErrors;
            const classifiedResults = jobDetail.classifiedResults;
            console.log('Fetched job for detail view:', job);
            
            // Show job detail view with actual data
            this.showJobDetailView(job, taskErrors, classifiedResults);

        } catch (error) {
            console.error('Error navigating to job detail:', error);
            this.showError(`Failed to load job details for job ${jobId}.`);
            // Fallback to jobs view on error
            this.showJobsView();
        }
    }

    updateURL(path, replaceState = false) {
        const fullURL = window.location.origin + path;
        console.log('Updating URL to:', fullURL);
        
        if (replaceState) {
            history.replaceState({ path }, '', path);
        } else {
            history.pushState({ path }, '', path);
        }
    }

    initializeElements() {
        // Core view elements
        this.jobsView = document.getElementById('jobs-view');
        this.jobDetailView = document.getElementById('job-detail-view');
        
        // Check if elements exist
        if (!this.jobsView || !this.jobDetailView) {
            console.warn('Views not found, waiting for HTML to load...');
            return;
        }
        
        // Jobs view elements
        this.jobsTableBody = document.getElementById('jobs-table-body');
        this.filterInput = document.getElementById('filter-input');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.pagination = document.getElementById('pagination');
        
        // Job detail elements
        this.jobDetailTitle = document.getElementById('job-detail-title');
        this.jobDetailId = document.getElementById('job-detail-id');
        this.jobDetailCreator = document.getElementById('job-detail-creator');
        this.jobDetailCreationTime = document.getElementById('job-detail-creation-time');
        // this.jobDetailDescription = document.getElementById('job-detail-description');
        
        // Metric elements
        this.jobCompletedTasks = document.getElementById('job-completed-tasks');
        this.jobSuccessTasks = document.getElementById('job-success-tasks');
        this.jobFailedTasks = document.getElementById('job-failed-tasks');
        this.jobSuccessRate = document.getElementById('job-success-rate');
        this.jobAvgIterations = document.getElementById('job-avg-iterations');
        // this.jobAvgAiIntegration = document.getElementById('job-avg-ai-integration');
        this.jobIterationsChanges = document.getElementById('job-iterations-changes');

        // Tool call elements
        this.toolRecommend = document.getElementById('tool-recommend');
        this.toolPredeploy = document.getElementById('tool-predeploy');
        this.toolDeploy = document.getElementById('tool-deploy');
        this.toolRegion = document.getElementById('tool-region');
        this.toolQuota = document.getElementById('tool-quota');

        // Button elements
        this.backToJobsBtn = document.getElementById('back-to-jobs-btn');
        this.testConnectionBtn = document.getElementById('test-connection-btn');
        this.submitJobBtn = document.getElementById('submit-job-btn');
        this.editJobBtn = document.getElementById('edit-job-btn');
        this.createJobBtn = document.getElementById('create-job-btn');
        this.configBtn = document.getElementById('config-btn');
        this.saveConfigBtn = document.getElementById('save-config-btn');
        this.deleteJobDetailBtn = document.getElementById('delete-job-detail-btn');
        
        // Filter elements
        this.createdByFilter = document.getElementById('created-by-filter');
        this.useMcpFilter = document.getElementById('use-mcp-filter');
        this.useTerraformFilter = document.getElementById('use-terraform-filter');
        
        // Form elements
        this.externalApiUrl = document.getElementById('external-api-url');
        this.apiTimeout = document.getElementById('api-timeout');
        this.retryAttempts = document.getElementById('retry-attempts');
        this.connectionTestResult = document.getElementById('connection-test-result');
        this.jobDescription = document.getElementById('job-description');
        this.jobPoolId = document.getElementById('job-pool-id');
    }

    initializeJobDropdowns() {
        if (this.jobDropdownsInitialized) {
            console.log('Job dropdowns already initialized, skipping...');
            return;
        }
        
        console.log('Initializing job dropdowns...');
        
        // Clean up any existing dropdown listeners first
        this.cleanupJobDropdownListeners();
        
        // Initialize Bootstrap dropdowns
        this.initializeBootstrapJobDropdowns();
        
        // Setup manual dropdown fallbacks
        this.setupJobManualDropdowns();
        
        this.jobDropdownsInitialized = true;
        console.log('Job dropdowns initialization complete');
    }
    
    cleanupJobDropdownListeners() {
        console.log('Cleaning up existing job dropdown listeners...');
        
        // Remove existing event listeners by cloning and replacing elements
        const dropdownButtons = ['created-by-filter', 'use-mcp-filter', 'use-terraform-filter'];
        
        dropdownButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button && button._manualListenerAdded) {
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                console.log(`Cleaned up listeners for ${buttonId}`);
            }
        });
        
        // Remove global click handler if it exists
        if (window.jobDropdownOutsideClickHandler) {
            document.removeEventListener('click', window.jobDropdownOutsideClickHandler);
            window.jobDropdownOutsideClickHandler = null;
        }
    }
    
    initializeBootstrapJobDropdowns() {
        console.log('Initializing Bootstrap job dropdowns...');
        
        const dropdownButtons = ['created-by-filter', 'use-mcp-filter', 'use-terraform-filter'];
        
        dropdownButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (!button) {
                console.warn(`Job dropdown button ${buttonId} not found`);
                return;
            }
            
            try {
                // Dispose of existing Bootstrap dropdown instance
                const existingDropdown = bootstrap.Dropdown.getInstance(button);
                if (existingDropdown) {
                    existingDropdown.dispose();
                    console.log(`Disposed existing Bootstrap dropdown for ${buttonId}`);
                }
                
                // Create new Bootstrap dropdown
                const dropdown = new bootstrap.Dropdown(button);
                console.log(`Bootstrap dropdown initialized for ${buttonId}`);
                
                // Add Bootstrap event listeners
                button.addEventListener('shown.bs.dropdown', () => {
                    console.log(`Bootstrap dropdown ${buttonId} shown`);
                });
                
                button.addEventListener('hidden.bs.dropdown', () => {
                    console.log(`Bootstrap dropdown ${buttonId} hidden`);
                });
                
            } catch (error) {
                console.warn(`Failed to initialize Bootstrap dropdown for ${buttonId}:`, error);
            }
        });
    }
    
    setupJobManualDropdowns() {
        console.log('Setting up manual job dropdown fallbacks...');
        
        const dropdownConfigs = [
            { buttonId: 'created-by-filter', menuSelector: '#created-by-filter + .dropdown-menu' },
            { buttonId: 'use-mcp-filter', menuSelector: '#use-mcp-filter + .dropdown-menu' },
            { buttonId: 'use-terraform-filter', menuSelector: '#use-terraform-filter + .dropdown-menu' }
        ];
        
        dropdownConfigs.forEach(config => {
            this.setupJobManualDropdown(config.buttonId, config.menuSelector);
        });
        
        // Global click handler to close dropdowns when clicking outside
        this.setupJobDropdownOutsideClickHandler();
    }
    
    setupJobManualDropdown(buttonId, menuSelector) {
        const button = document.getElementById(buttonId);
        const menu = document.querySelector(menuSelector);
        
        if (!button || !menu) {
            console.warn(`Job dropdown elements not found: ${buttonId}, ${menuSelector}`);
            return;
        }
        
        // Prevent duplicate listeners
        if (button._manualListenerAdded) {
            console.log(`Manual listener already added for ${buttonId}, skipping...`);
            return;
        }
        
        console.log(`Setting up manual dropdown for ${buttonId}`);
        
        const toggleDropdown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Close other dropdowns first
            document.querySelectorAll('.dropdown-menu.show').forEach(otherMenu => {
                if (otherMenu !== menu) {
                    otherMenu.classList.remove('show');
                    console.log('Closed other dropdown menu');
                }
            });
            
            // Toggle current dropdown
            const isCurrentlyOpen = menu.classList.contains('show');
            menu.classList.toggle('show', !isCurrentlyOpen);
            
            console.log(`Manual dropdown ${buttonId} toggled: ${!isCurrentlyOpen}`);
        };
        
        button.addEventListener('click', toggleDropdown);
        button._manualListenerAdded = true;
        
        console.log(`Manual dropdown setup complete for ${buttonId}`);
    }
    
    setupJobDropdownOutsideClickHandler() {
        if (window.jobDropdownOutsideClickHandler) {
            console.log('Job dropdown outside click handler already exists, skipping...');
            return;
        }
        
        window.jobDropdownOutsideClickHandler = (e) => {
            const jobDropdowns = document.querySelectorAll('#jobs-view .dropdown-menu.show');
            
            jobDropdowns.forEach(menu => {
                const button = menu.previousElementSibling;
                if (button && !button.contains(e.target) && !menu.contains(e.target)) {
                    menu.classList.remove('show');
                    console.log('Closed job dropdown via outside click');
                }
            });
        };
        
        document.addEventListener('click', window.jobDropdownOutsideClickHandler);
        console.log('Job dropdown outside click handler setup complete');
    }
    
    resetJobDropdowns() {
        console.log('Resetting job dropdowns...');
        this.jobDropdownsInitialized = false;
        this.cleanupJobDropdownListeners();
        
        // Close all open dropdowns
        document.querySelectorAll('#jobs-view .dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
        
        // Reinitialize
        setTimeout(() => {
            this.initializeJobDropdowns();
        }, 100);
    }

    bindEvents() {
        // Check if elements exist before binding events
        if (!this.filterInput) {
            console.warn('Essential elements not ready for event binding');
            return;
        }

        // Create job button
        this.createJobBtn?.addEventListener('click', () => {
            this.showCreateJobModal();
        });

        // Submit job form
        this.submitJobBtn?.addEventListener('click', () => {
            this.createJob();
        });

        // Filter input
        this.filterInput?.addEventListener('input', (e) => {
            this.currentFilter = e.target.value;
            
            // Use client-side filtering instead of reloading from server
            if (this.allJobs) {
                this.renderJobs(this.allJobs);
            }
        });

        // Back to jobs button
        this.backToJobsBtn?.addEventListener('click', () => {
            this.showJobsView();
        });

        // Configuration button
        this.configBtn?.addEventListener('click', () => {
            this.showConfigModal();
        });

        // Save configuration
        this.saveConfigBtn?.addEventListener('click', () => {
            this.saveConfig();
        });

        // See task details link (delegated event handling since the link is in dynamic content)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'see-task-details-link') {
                e.preventDefault();
                this.showSampleTaskDetail();
            }
        });

        // Edit and delete job buttons
        this.editJobBtn?.addEventListener('click', () => {
            // TODO: Implement edit functionality
            this.showToast('Edit functionality coming soon', 'info');
        });

        this.deleteJobDetailBtn?.addEventListener('click', () => {
            // TODO: Implement delete functionality
            this.showToast('Delete functionality coming soon', 'info');
        });

        // Dropdown filter event handlers using event delegation
        this.setupJobDropdownItemHandlers();

        // Table sorting
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.sort;
                if (this.currentSort.field === field) {
                    this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    this.currentSort.field = field;
                    this.currentSort.order = 'asc';
                }
                this.updateSortDisplay();
                this.loadJobs();
            });
        });

        // Modal form validation
        const jobDescInput = document.getElementById('job-description');
        if (jobDescInput) {
            jobDescInput.addEventListener('input', () => {
                this.validateCreateJobForm();
            });
        }

        // Test connection
        const testConnBtn = document.getElementById('test-connection-btn');
        if (testConnBtn) {
            testConnBtn.addEventListener('click', () => {
                this.testConnection();
            });
        }

        // Back to jobs button
        const backBtn = document.getElementById('back-to-jobs-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showJobsView();
            });
        }

        // Go to repos button
        const gotoReposBtn = document.getElementById('goto-repos-btn');
        if (gotoReposBtn) {
            gotoReposBtn.addEventListener('click', () => {
                this.navigateToRepos();
            });
        }

        // Edit job button in detail view
        const editJobBtn = document.getElementById('edit-job-btn');
        if (editJobBtn) {
            editJobBtn.addEventListener('click', () => {
                this.editCurrentJob();
            });
        }
    }
    
    setupJobDropdownItemHandlers() {
        // Use event delegation for dropdown items to handle dynamic content
        document.addEventListener('click', (e) => {
            // Handle created-by filter
            if (e.target.closest('#created-by-filter + .dropdown-menu .dropdown-item')) {
                e.preventDefault();
                const filter = e.target.dataset.filter;
                this.currentUserFilter = filter;
                this.updateFilterDisplay('created-by-filter', filter);
                
                // Use client-side filtering instead of reloading from server
                if (this.allJobs) {
                    this.renderJobs(this.allJobs);
                }
                
                // Close dropdown
                const menu = e.target.closest('.dropdown-menu');
                if (menu) menu.classList.remove('show');
            }
            
            // Handle use-mcp filter
            if (e.target.closest('#use-mcp-filter + .dropdown-menu .dropdown-item')) {
                e.preventDefault();
                const filter = e.target.dataset.filter;
                this.currentMcpFilter = filter;
                this.updateFilterDisplay('use-mcp-filter', filter);
                
                // Use client-side filtering instead of reloading from server
                if (this.allJobs) {
                    this.renderJobs(this.allJobs);
                }
                
                // Close dropdown
                const menu = e.target.closest('.dropdown-menu');
                if (menu) menu.classList.remove('show');
            }
            
            // Handle use-terraform filter
            if (e.target.closest('#use-terraform-filter + .dropdown-menu .dropdown-item')) {
                e.preventDefault();
                const filter = e.target.dataset.filter;
                this.currentTerraformFilter = filter;
                this.updateFilterDisplay('use-terraform-filter', filter);
                
                // Use client-side filtering instead of reloading from server
                if (this.allJobs) {
                    this.renderJobs(this.allJobs);
                }
                
                // Close dropdown
                const menu = e.target.closest('.dropdown-menu');
                if (menu) menu.classList.remove('show');
            }
        });
    }

    populateCreatedByFilter(jobs) {
        // Extract unique CreatedBy values from the jobs data
        const uniqueCreatedBy = new Set();
        jobs.forEach(job => {
            if (job.InitiatedBy && job.InitiatedBy.trim() !== '' && job.InitiatedBy !== 'Unknown') {
                uniqueCreatedBy.add(job.InitiatedBy);
            }
        });

        // Convert to sorted array
        const sortedCreatedBy = Array.from(uniqueCreatedBy).sort();

        // Find the CreatedBy dropdown menu
        const createdByDropdown = document.querySelector('#created-by-filter').nextElementSibling;
        if (!createdByDropdown) {
            console.warn('CreatedBy dropdown menu not found');
            return;
        }

        // Clear existing options (except "All")
        createdByDropdown.innerHTML = '<li><a class="dropdown-item" href="#" data-filter="all">All</a></li>';

        // Add dynamic options
        sortedCreatedBy.forEach(creator => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<a class="dropdown-item" href="#" data-filter="${this.escapeHtml(creator)}">${this.escapeHtml(creator)}</a>`;
            createdByDropdown.appendChild(listItem);
        });

        console.log(`Populated CreatedBy filter with ${sortedCreatedBy.length} unique creators:`, sortedCreatedBy);
    }

    async loadJobs() {
        this.showLoading(true);
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage.toString(),
                limit: this.pageSize.toString(),
                sortBy: this.currentSort.field,
                sortOrder: this.currentSort.order,
                createdBy: this.currentUserFilter,
                useMcp: this.currentMcpFilter,
                useTerraform: this.currentTerraformFilter
            });

            // Use our backend API endpoint (not direct kusto call)
            const response = await fetch(`/api/jobs?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Store all jobs for dynamic filtering
            this.allJobs = data.jobs || [];
            
            // Populate dynamic CreatedBy filter options
            this.populateCreatedByFilter(this.allJobs);
            
            // Backend already returns mapped data, so we can use it directly
            this.renderJobs(data.jobs);
            this.renderPagination(data);
        } catch (error) {
            console.error('Error loading jobs:', error);
            this.showError('Failed to load jobs. Please check your connection and try again.');
            // Show empty state
            this.renderJobs([]);
        } finally {
            this.showLoading(false);
        }
    }

    renderJobs(jobs) {
        const tbody = document.getElementById('jobs-table-body');
        tbody.innerHTML = '';

        if (jobs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                        No jobs found
                    </td>
                </tr>
            `;
            return;
        }

        // Apply all filters
        let filteredJobs = jobs;
        
        // Apply user filter (check both fields for compatibility)
        if (this.currentUserFilter !== 'all') {
            console.log(`Applying CreatedBy filter: "${this.currentUserFilter}"`);
            
            filteredJobs = filteredJobs.filter(job => {
                const matches = job.InitiatedBy === this.currentUserFilter || 
                               job.createdBy === this.currentUserFilter;
                
                if (matches) {
                    console.log(`Job ${job.TestJobID} matches CreatedBy filter (InitiatedBy: ${job.InitiatedBy}, createdBy: ${job.createdBy})`);
                }
                
                return matches;
            });
            
            console.log(`CreatedBy filter results: ${filteredJobs.length} jobs match "${this.currentUserFilter}"`);
        }
        
        // Apply MCP filter
        if (this.currentMcpFilter !== 'all') {
            const useMcp = this.currentMcpFilter === 'true';
            filteredJobs = filteredJobs.filter(job => {
                // Check if job has MCP usage (you might need to adjust this based on your data structure)
                const mcpRate = parseFloat(job.MCPRate) || 0;
                return useMcp ? mcpRate > 0 : mcpRate === 0;
            });
        }
        
        // Apply Terraform filter
        if (this.currentTerraformFilter !== 'all') {
            const useTerraform = this.currentTerraformFilter === 'true';
            filteredJobs = filteredJobs.filter(job => {
                // Check if job has Terraform usage (you might need to adjust this based on your data structure)
                const terraformRate = parseFloat(job.TerraformRate) || 0;
                return useTerraform ? terraformRate > 0 : terraformRate === 0;
            });
        }
        
        // Apply text filter for any field (including ID)
        if (this.currentFilter && this.currentFilter.trim() !== '') {
            const filterText = this.currentFilter.toLowerCase().trim();
            console.log(`Applying text filter: "${filterText}"`);
            
            filteredJobs = filteredJobs.filter(job => {
                // Search in multiple fields including ID
                const searchFields = [
                    job.TestJobID?.toString() || '',
                    job.InitiatedBy || job.createdBy || '',
                    job.MCPRate?.toString() || '',
                    job.TerraformRate?.toString() || '',
                    job.TaskNum?.toString() || '',
                    job.SuccessRate?.toString() || '',
                    this.formatDateTime(job.CreatedTime || job.creationTime) || ''
                ];
                
                const matches = searchFields.some(field => 
                    field.toLowerCase().includes(filterText)
                );
                
                if (matches) {
                    console.log(`Job ${job.TestJobID} matches filter`);
                }
                
                return matches;
            });
            
            console.log(`Filter results: ${filteredJobs.length} jobs match "${filterText}"`);
        }

        filteredJobs.forEach(job => {
            const row = document.createElement('tr');
            row.className = 'fade-in';
            row.innerHTML = `
                <td>
                    <a href="#" class="job-id-link" data-job-id="${job.TestJobID}">
                        ${job.TestJobID}
                    </a>
                </td>
                <td>${this.escapeHtml(job.InitiatedBy)}</td>
                <td>${this.formatDateTime(job.CreatedTime)}</td>
                <td>${this.escapeHtml(job.MCPRate)}</td>
                <td>${this.escapeHtml(job.TerraformRate)}</td>
                <td>${job.TaskNum}</td>
                <td>
                    <span class="success-rate ${this.getSuccessRateClass(job.SuccessRate)}">
                        ${job.SuccessRate}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Bind job ID click events
        document.querySelectorAll('.job-id-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.viewJob(e.target.dataset.jobId);
            });
        });
    }

    renderPagination(data) {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';

        if (data.totalPages <= 1) return;

        // Previous button
        const prevItem = document.createElement('li');
        prevItem.className = `page-item ${data.page === 1 ? 'disabled' : ''}`;
        prevItem.innerHTML = `
            <a class="page-link" href="#" data-page="${data.page - 1}">
                <i class="bi bi-chevron-left"></i>
            </a>
        `;
        pagination.appendChild(prevItem);

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, data.page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(data.totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item ${i === data.page ? 'active' : ''}`;
            pageItem.innerHTML = `
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            `;
            pagination.appendChild(pageItem);
        }

        // Next button
        const nextItem = document.createElement('li');
        nextItem.className = `page-item ${data.page === data.totalPages ? 'disabled' : ''}`;
        nextItem.innerHTML = `
            <a class="page-link" href="#" data-page="${data.page + 1}">
                <i class="bi bi-chevron-right"></i>
            </a>
        `;
        pagination.appendChild(nextItem);

        // Bind pagination click events
        pagination.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('page-link') && !e.target.closest('.disabled')) {
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadJobs();
                }
            }
        });
    }

    showCreateJobModal() {
        const modal = new bootstrap.Modal(document.getElementById('createJobModal'));
        document.getElementById('create-job-form').reset();
        this.validateCreateJobForm();
        modal.show();
    }

    validateCreateJobForm() {
        const description = document.getElementById('job-description').value.trim();
        const submitBtn = document.getElementById('submit-job-btn');
        if (submitBtn) {
            submitBtn.disabled = !description;
        }
    }

    async createJob() {
        const jobDescription = document.getElementById('job-description');
        const jobPoolId = document.getElementById('job-pool-id');
        
        if (!jobDescription || !jobDescription.value.trim()) {
            this.showToast('Please enter a job description', 'error');
            return;
        }

        try {
            const response = await fetch('/api/jobs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: jobDescription.value.trim(),
                    poolId: jobPoolId?.value || 'default'
                })
            });

            if (response.ok) {
                this.showToast('Job created successfully!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('createJobModal'));
                if (modal) {
                    modal.hide();
                }
                // Refresh jobs list
                this.loadJobs();
            } else {
                throw new Error('Failed to create job');
            }
        } catch (error) {
            console.error('Error creating job:', error);
            this.showToast('Failed to create job', 'error');
        }
    }

    updateFilterDisplay(filterId, value) {
        const button = document.getElementById(filterId);
        const badge = button.querySelector('.badge.bg-secondary');
        badge.textContent = value;
    }

    updateSortDisplay() {
        // Remove previous sort indicators
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sorted-asc', 'sorted-desc');
        });

        // Add current sort indicator
        const currentHeader = document.querySelector(`[data-sort="${this.currentSort.field}"]`);
        if (currentHeader) {
            currentHeader.classList.add(`sorted-${this.currentSort.order}`);
        }
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loading-indicator');
        const table = document.querySelector('.table-responsive');
        
        if (show) {
            loadingIndicator.classList.remove('d-none');
            table.style.opacity = '0.5';
        } else {
            loadingIndicator.classList.add('d-none');
            table.style.opacity = '1';
        }
    }

    showAlert(message, type) {
        // Remove existing alerts
        document.querySelectorAll('.alert').forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Insert at the top of main content
        const main = document.querySelector('main');
        main.insertBefore(alertDiv, main.firstElementChild.nextElementSibling);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    async checkExternalServiceStatus() {
        try {
            // Use our backend API endpoint for health check
            const response = await fetch('/api/jobs/health/external');
            const data = await response.json();
            this.externalServiceStatus = data.external_service || { available: data.status === 'healthy', error: null };
            this.updateServiceStatusIndicator();
        } catch (error) {
            console.error('Failed to check external service status:', error);
            this.externalServiceStatus = { available: false, error: 'Connection failed' };
            this.updateServiceStatusIndicator();
        }
    }

    updateServiceStatusIndicator() {
        // Add a status indicator to the header
        const headerContent = document.querySelector('.d-flex.justify-content-between');
        if (!headerContent) return;

        // Remove existing indicator
        const existingIndicator = document.getElementById('service-status-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create new indicator
        const indicator = document.createElement('div');
        indicator.id = 'service-status-indicator';
        indicator.className = 'service-status-indicator';
        
        if (this.externalServiceStatus?.available) {
            indicator.innerHTML = `
                <div class="d-flex align-items-center text-success">
                    <i class="bi bi-check-circle-fill me-1"></i>
                    <small>External Service Online</small>
                </div>
            `;
        } else {
            indicator.innerHTML = `
                <div class="d-flex align-items-center text-warning">
                    <i class="bi bi-exclamation-triangle-fill me-1"></i>
                    <small>Using Fallback Data</small>
                </div>
            `;
        }

        // Insert before the button toolbar
        const btnToolbar = headerContent.querySelector('.btn-toolbar');
        if (btnToolbar) {
            headerContent.insertBefore(indicator, btnToolbar);
        }
    }

    async showConfigModal() {
        const modal = new bootstrap.Modal(document.getElementById('configModal'));
        modal.show();
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                if (this.externalApiUrl) {
                    this.externalApiUrl.value = config.externalApiUrl || '';
                }
                if (this.apiTimeout) {
                    this.apiTimeout.value = config.timeout || 30;
                }
                if (this.retryAttempts) {
                    this.retryAttempts.value = config.retryAttempts || 3;
                }
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
        }
    }

    async saveConfig() {
        try {
            const config = {
                externalApiUrl: this.externalApiUrl?.value || '',
                timeout: parseInt(this.apiTimeout?.value || '30'),
                retryAttempts: parseInt(this.retryAttempts?.value || '3')
            };

            const response = await fetch('/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                this.showToast('Configuration saved successfully!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('configModal'));
                modal.hide();
                
                // Refresh external service status
                await this.checkExternalServiceStatus();
                this.loadJobs();
            } else {
                throw new Error('Failed to save configuration');
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showToast('Failed to save configuration', 'error');
        }
    }

    async testConnection() {
        if (!this.externalApiUrl?.value) {
            this.showConnectionTestResult('Please enter an API URL first', 'danger');
            return;
        }

        this.testConnectionBtn.disabled = true;
        this.testConnectionBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Testing...';
        
        try {
            const response = await fetch('/api/config/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    externalApiUrl: this.externalApiUrl.value,
                    timeout: parseInt(this.apiTimeout?.value || '30')
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showConnectionTestResult('✅ Connection successful!', 'success');
            } else {
                this.showConnectionTestResult(`❌ Connection failed: ${result.error}`, 'danger');
            }
        } catch (error) {
            this.showConnectionTestResult(`❌ Connection failed: ${error.message}`, 'danger');
        } finally {
            this.testConnectionBtn.disabled = false;
            this.testConnectionBtn.innerHTML = '<i class="bi bi-wifi"></i> Test Connection';
        }
    }

    showConnectionTestResult(message, type) {
        if (this.connectionTestResult) {
            this.connectionTestResult.innerHTML = `<div class="alert alert-${type} py-2 mb-0">${message}</div>`;
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto text-${type}">
                        ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} 
                        ${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info'}
                    </strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Remove toast after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }    // Navigation methods
    navigateToRepos() {
        window.navigateToRepos();
    }

    navigateToJobs() {
        window.navigateToJobs();
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDateTime(dateTime) {
        // Handle the format from the API data
        if (!dateTime) return 'N/A';
        console.log("Formatting date:", dateTime);
        
        try {
            const date = new Date(dateTime);
            
            if (isNaN(date.getTime())) {
                return dateTime; // Return original string if parsing fails
            }
            
            const options = {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };
            console.log("Formatted date:", date.toLocaleString('sv-SE', options));
            
            return date.toLocaleString('sv-SE', options).replace('T', ' ');
            
        } catch (error) {
            console.warn('Error formatting date:', error, dateTime);
            return dateTime; // Return original if formatting fails
        }
    }

    getSuccessRateClass(successRate) {
        const percentage = parseInt(successRate);
        if (percentage >= 90) return 'high';
        if (percentage >= 70) return 'medium';
        return 'low';
    }

    // Job action methods
    async viewJob(jobId) {
        // Use the routing system to navigate to job detail
        console.log('Viewing job:', jobId);
        this.updateURL(`/job-detail/jobID=${jobId}`);
        this.showJobDetailLoadingState();
        await this.navigateToJobDetail(jobId);
    }

    showJobDetailView(job, taskErrors, classifiedResults) {
        // Store current job for editing/deleting
        this.currentJob = job;
        
        // Hide jobs view and show detail view
        document.getElementById('jobs-view').classList.add('d-none');
        document.getElementById('task-detail-view').classList.add('d-none');
        const detailView = document.getElementById('job-detail-view');
        detailView.classList.remove('d-none');
        console.log('Showing job detail view for job:', job.TestJobID);
        detailView.classList.add('view-transition');
        
        // Populate job detail fields
        document.getElementById('job-detail-title').textContent = `Job-${job.TestJobID}`;
        document.getElementById('job-detail-id').textContent = job.TestJobID;
        document.getElementById('job-detail-creator').textContent = job.InitiatedBy;
        document.getElementById('job-detail-creation-time').textContent = this.formatDateTime(job.CreatedTime);
        // document.getElementById('job-detail-description').textContent = job.JobDiscription;
        
        // Populate metrics - handle both new and old field names for compatibility
        document.getElementById('job-completed-tasks').textContent = job.TaskNum || 0;
        document.getElementById('job-success-tasks').textContent = job.SuccessTasks || this.calculateSuccessTasks(job);
        document.getElementById('job-failed-tasks').textContent = job.FailedTasks || this.calculateFailedTasks(job);
        document.getElementById('job-success-rate').textContent = job.SuccessRate || '0%';

        // Additional metrics from backend
        console.log('Job metrics:', job);
        document.getElementById('job-avg-iterations').textContent = job.AvgSuccessIteration || '10';
        // 保留小数点后两位
        // document.getElementById('job-avg-ai-integration').textContent = (job.AIIntegration || '10').toFixed(2);
        document.getElementById('job-iterations-changes').textContent = (job.AvgInfraChanges || 'xx').toFixed(2);

        // Tool call metrics
        document.getElementById('tool-recommend').textContent = job.RecommendCalls || 0;
        document.getElementById('tool-predeploy').textContent = job.PredeployCalls || 0;
        document.getElementById('tool-deploy').textContent = job.DeployCalls || 0;
        document.getElementById('tool-region').textContent = job.RegionCalls || 0;
        document.getElementById('tool-quota').textContent = job.QuotaCalls || 0;

        // Model statistics (using mock data for now - will be replaced with real API data)
        this.populateModelStatistics(classifiedResults);

        // Failed tasks analysis
        this.populateFailedTasks(taskErrors);
        document.querySelectorAll('.task-name-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const taskId = e.target.dataset.taskId;
                navigateToTaskDetail(taskId);
            });
        });

        // Trigger transition effect
        setTimeout(() => {
            detailView.classList.add('active');
        }, 10);
    }    
    showJobDetailLoadingState() {
        // Hide all other views
        document.getElementById('jobs-view').classList.add('d-none');
        const reposContent = document.getElementById('repos-content');
        const repoDetailView = document.getElementById('repo-detail-view');
        const taskDetailView = document.getElementById('task-detail-view');

        if (reposContent) reposContent.style.display = 'none';
        if (repoDetailView) {
            repoDetailView.classList.add('d-none');
            repoDetailView.classList.remove('active');
        }
        if (taskDetailView) {
            taskDetailView.classList.add('d-none');
        }

        // Show detail view with loading state
        const detailView = document.getElementById('job-detail-view');
        const detailContent = document.getElementById('job-detail-content');
        detailContent.style.display = 'block';
        detailView.classList.remove('d-none');
        detailView.classList.add('view-transition');
        
        // Clear previous content and show loading state
        const jobDetailTitle = document.getElementById('job-detail-title');
        const jobDetailId = document.getElementById('job-detail-id');
        const jobDetailCreator = document.getElementById('job-detail-creator');
        const jobDetailCreationTime = document.getElementById('job-detail-creation-time');
        // const jobDetailDescription = document.getElementById('job-detail-description');
        
        if (jobDetailTitle) jobDetailTitle.textContent = 'Loading...';
        if (jobDetailId) jobDetailId.textContent = '...';
        if (jobDetailCreator) jobDetailCreator.textContent = '...';
        if (jobDetailCreationTime) jobDetailCreationTime.textContent = '...';
        // if (jobDetailDescription) jobDetailDescription.textContent = 'Loading job details...';
        
        // Show loading spinner for metrics
        const loadingSpinner = '<span class="spinner-border spinner-border-sm" role="status"></span>';
        
        const metricsElements = [
            'job-completed-tasks', 'job-success-tasks', 'job-failed-tasks', 'job-success-rate',
            'job-avg-iterations', 'job-iterations-changes',
            'tool-recommend', 'tool-predeploy', 'tool-deploy', 'tool-region', 'tool-quota'
        ];
        
        metricsElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = loadingSpinner;
            }
        });
        
        // Clear model statistics and failed tasks content
        const failedTasksContent = document.getElementById('failed-tasks-content');
        if (failedTasksContent) {
            failedTasksContent.innerHTML = '<div class="text-center py-3">' + loadingSpinner + ' Loading failed tasks...</div>';
        }
        
        // Trigger transition effect
        setTimeout(() => {
            detailView.classList.add('active');
        }, 10);
    }    
    showJobsView() {
        // Update URL to root path
        this.updateURL('/');
        
        // Hide detail view and show jobs view
        const detailView = document.getElementById('job-detail-view');
        const reposContent = document.getElementById('repos-content');
        const repoDetailView = document.getElementById('repo-detail-view');
        const taskDetailView = document.getElementById('task-detail-view');
        if (repoDetailView) {
            repoDetailView.classList.add('d-none');
        }
        if (taskDetailView) {
            taskDetailView.classList.add('d-none');
        }

        detailView.classList.remove('active');

        if (reposContent) {
            reposContent.style.display = 'none';
        }
        
        setTimeout(() => {
            detailView.classList.add('d-none');
            detailView.classList.remove('view-transition');
            document.getElementById('jobs-view').classList.remove('d-none');
            
            const jobsContent = document.getElementById('jobs-content');
            if (jobsContent) {
                jobsContent.style.display = 'block';
            }
            
            // Reinitialize job dropdowns when view becomes visible
            this.initializeJobDropdowns();
        }, 300);
        
        // Update navigation active state
        this.updateNavigationState('jobs');
    }

    showReposView() {
        console.log('Showing repos view');
        // Update URL to repos path
        this.updateURL('/repos');
        
        // Hide all other views
        const detailView = document.getElementById('job-detail-view');
        const jobsView = document.getElementById('jobs-view');
        const jobsContent = document.getElementById('jobs-content');
        const reposContent = document.getElementById('repos-content');
        const jobDetailContent = document.getElementById('job-detail-content');
        const taskDetailView = document.getElementById('task-detail-view');
        
        if (detailView) {
            detailView.classList.add('d-none');
            detailView.classList.remove('active');
        }

        if (jobDetailContent) {
            jobDetailContent.style.display = 'none';
        }

        if (jobsView) {
            jobsView.classList.add('d-none');
        }

        if (taskDetailView) {
            taskDetailView.classList.add('d-none');
        }

        if (jobsContent) {
            jobsContent.style.display = 'none';
        }
        
        if (reposContent) {
            reposContent.style.display = 'block';
            
            // Initialize repo view if not already done
            if (!window.reposInitialized) {
                window.reposInitialized = true;
                setTimeout(() => {
                    if (typeof initRepoView === 'function') {
                        console.log('Initializing repo view');
                        initRepoView();
                    } else {
                        console.error('initRepoView function not found');
                    }
                }, 100);
            }
        }
        
        // Update navigation active state
        this.updateNavigationState('repos');
    }

    updateNavigationState(activeView) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current view
        if (activeView === 'repos') {
            document.getElementById('repo-view')?.classList.add('active');
        } else {
            document.getElementById('job-view')?.classList.add('active');
        }
    }

    populateModelStatistics(classifiedResults) {
        const classificationContainer = document.getElementById('classification-container');
        if (!classificationContainer) {
            console.warn('Classification container not found');
            return;
        }

        console.log("Populating model statistics with classified results:", classifiedResults);

        // Define classification categories with their data sources
        const classificationCategories = [
            {
                title: 'Result classified by Model',
                subtitle: '',
                data: classifiedResults['Model']&& classifiedResults['Model'].data || this.getMockModelStats(),
                tags: ['Language model', 'all', 'Compute Resource Note', 'result']
            },
            {
                title: 'Result classified by Language',
                subtitle: '',
                data: classifiedResults['Language']&& classifiedResults['Language'].data || this.getMockLanguageStats(),
                tags: ['Model', 'result', 'all', 'Compute Resource Note']
            },
            {
                title: 'Result classified by Resource Type',
                subtitle: 'Num of Compute Resource + Num of Binding Resource',
                data: classifiedResults['AppPattern']&& classifiedResults['AppPattern'].data || this.getMockResourceStats(),
                tags: ['Language', 'result', 'all', 'Model']
            },
            {
                title: 'Result classified by Repo Type',
                subtitle: 'Task Name',
                data: classifiedResults['RepoType']&& classifiedResults['RepoType'].data || this.getMockRepoStats(),
                tags: ['Model', 'result', 'all']
            }
        ];

        // Clear existing content
        classificationContainer.innerHTML = '';

        // Generate classification cards dynamically

        classificationCategories.forEach(category => {
            console.log(`Processing classification category data: ${category.data}`);
            if (category.data && category.data.length > 0) {
                const cardHTML = this.generateClassificationCard(category);
                classificationContainer.insertAdjacentHTML('beforeend', cardHTML);
                console.log(`Added classification card for: ${category.title}`);
            }
        });
    }

    generateClassificationCard(category) {
        console.log(`Generating classification card for: ${category.title}`);
        const tagsHTML = category.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        const subtitleHTML = category.subtitle ? `<div class="classification-subtitle">${category.subtitle}</div>` : '';
        
        const itemsHTML = category.data.map(item => `
            <div class="classification-item">
                <span class="model-name">${item.Type}</span>
                <span class="model-stats">
                    Tasks: ${item.TaskNum || 0} |
                    Success Rate: ${item.SuccessRate || '0%'} |
                    Avg Iteration: ${item.AvgSuccessIteration || 0}
                </span>
            </div>
        `).join('');

        return `
            <div class="col-md-6 mb-4">
                <div class="classification-card">
                    <div class="classification-header">
                        <h5>${category.title}</h5>
                        <div class="tags">
                            ${tagsHTML}
                        </div>
                    </div>
                    <div class="classification-content">
                        ${subtitleHTML}
                        ${itemsHTML}
                    </div>
                </div>
            </div>
        `;
    }

    // Mock data methods for fallback when real data is not available
    getMockModelStats() {
        return [
            { name: 'Claude-3.5', taskNum: 25, successRate: '85%', avgSuccessIterations: 8.5 },
            { name: 'Claude-3.7', taskNum: 18, successRate: '92%', avgSuccessIterations: 7.2 },
            { name: 'Claude-4.0', taskNum: 20, successRate: '88%', avgSuccessIterations: 6.8 },
            { name: 'GPT-4.1', taskNum: 15, successRate: '90%', avgSuccessIterations: 7.5 }
        ];
    }

    getMockLanguageStats() {
        return [
            { name: 'Java', taskNum: 22, successRate: '88%', avgSuccessIterations: 9.2 },
            { name: 'Dotnet', taskNum: 18, successRate: '85%', avgSuccessIterations: 8.7 },
            { name: 'JavaScript/TypeScript', taskNum: 16, successRate: '90%', avgSuccessIterations: 7.8 },
            { name: 'Python', taskNum: 12, successRate: '92%', avgSuccessIterations: 7.3 }
        ];
    }

    getMockResourceStats() {
        return [
            { name: '1 + 0', taskNum: 15, successRate: '95%', avgSuccessIterations: 6.5 },
            { name: '1 + 1', taskNum: 20, successRate: '88%', avgSuccessIterations: 8.2 },
            { name: '1 + N', taskNum: 12, successRate: '82%', avgSuccessIterations: 9.8 },
            { name: 'N + 0', taskNum: 8, successRate: '75%', avgSuccessIterations: 11.2 },
            { name: 'N + 1', taskNum: 6, successRate: '70%', avgSuccessIterations: 12.5 },
            { name: 'N + N', taskNum: 4, successRate: '65%', avgSuccessIterations: 14.3 }
        ];
    }

    getMockRepoStats() {
        return [
            { name: 'airSonic', taskNum: 12, successRate: '92%', avgSuccessIterations: 7.8 },
            { name: 'assessmentManager', taskNum: 10, successRate: '85%', avgSuccessIterations: 9.1 },
            { name: 'before-container', taskNum: 8, successRate: '78%', avgSuccessIterations: 10.5 },
            { name: 'tasktracker', taskNum: 14, successRate: '89%', avgSuccessIterations: 8.3 },
            { name: 'task-2', taskNum: 9, successRate: '83%', avgSuccessIterations: 9.7 },
            { name: 'task-3', taskNum: 11, successRate: '87%', avgSuccessIterations: 8.9 }
        ];
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
        const totalErrors = Object.values(errorsByCategory)
            .reduce((sum, data) => sum + data.count, 0);
        const percentage = ((topData.count / totalErrors) * 100).toFixed(1);

        this.updateTopErrorDisplay({
            category: topCategory,
            count: topData.count,
            percentage: percentage,
            patterns: this.analyzeErrorPatterns(topData.tasks)
        });
    }

    updateTopErrorDisplay(data) {
        // Update top error category display
        const categoryElem = document.getElementById('top-error-category');
        const countElem = document.getElementById('top-error-count');
        const percentageElem = document.getElementById('top-error-percentage');
        const progressElem = document.getElementById('top-error-progress');
        const patternsElem = document.getElementById('top-error-patterns');

        if (!data) {
            categoryElem.textContent = 'No Errors';
            countElem.innerHTML = '<span class="count">0</span> occurrences';
            percentageElem.textContent = '0%';
            progressElem.style.width = '0%';
            progressElem.setAttribute('aria-valuenow', '0');
            patternsElem.innerHTML = '<div class="error-pattern-item text-success">No error patterns to display</div>';
            return;
        }

        categoryElem.textContent = data.category;
        countElem.innerHTML = `<span class="count">${data.count}</span> occurrence${data.count !== 1 ? 's' : ''}`;
        percentageElem.textContent = `${data.percentage}%`;
        progressElem.style.width = `${data.percentage}%`;
        progressElem.setAttribute('aria-valuenow', data.percentage);

        // Display error patterns
        patternsElem.innerHTML = data.patterns.map(pattern => `
            <div class="error-pattern-item">
                <div class="d-flex justify-content-between">
                    <span>${pattern.pattern}</span>
                    <span class="text-muted">${pattern.count}x</span>
                </div>
            </div>
        `).join('');
    }

    analyzeErrorPatterns(tasks) {
        // Group similar error descriptions
        const patterns = {};
        tasks.forEach(task => {
            const description = task.ErrorDescription || 'Unknown error';
            // Simplified pattern matching - you could make this more sophisticated
            const pattern = this.simplifyErrorDescription(description);
            patterns[pattern] = (patterns[pattern] || 0) + 1;
        });

        // Convert to array and sort by frequency
        return Object.entries(patterns)
            .map(([pattern, count]) => ({ pattern, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3); // Show top 3 patterns
    }

    simplifyErrorDescription(description) {
        // This could be enhanced with more sophisticated pattern matching
        return description
            .replace(/[0-9]+/g, 'N') // Replace numbers with 'N'
            .replace(/(eastus|westus|northeurope|etc)/gi, 'REGION') // Replace regions
            .replace(/("[^"]+"|'[^']+')/g, 'VALUE') // Replace quoted values
            .trim();
    }    populateFailedTasks(taskErrors) {
        const failedTasksContainer = document.getElementById('failed-tasks-content');
        if (!failedTasksContainer) {
            console.warn('Failed tasks container not found');
            return;
        }

        // Ensure taskErrors is always an array
        let failedTasksArr = [];
        if (Array.isArray(taskErrors)) {
            failedTasksArr = taskErrors;
        } else if (taskErrors && typeof taskErrors === 'object' && Array.isArray(taskErrors.data)) {
            failedTasksArr = taskErrors.data;
        } else if (taskErrors == null) {
            failedTasksArr = [];
        } else {
            console.warn('Unexpected taskErrors format:', taskErrors);
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
        const failedTasksCountBadge = document.getElementById('failed-tasks-count');
        if (failedTasksCountBadge) {
            failedTasksCountBadge.textContent = `${failedTasksArr.length} Failed Task${failedTasksArr.length !== 1 ? 's' : ''}`;
        }

        // Populate category filter dropdown
        this.populateCategoryFilter(errorsByCategory);

        // Render failed tasks
        this.renderFailedTasks(failedTasksArr);

        // Setup filter event listeners
        this.setupFilterEventListeners();    }    populateCategoryFilter(errorsByCategory) {
        console.log('populateCategoryFilter called with:', errorsByCategory);
        
        const categoryFilter = document.getElementById('category-filter');
        if (!categoryFilter) return;

        // Get unique categories from the data, filter out undefined/null values
        const categories = Object.keys(errorsByCategory)
            .filter(category => category && category !== 'undefined' && category !== 'null')
            .sort();
        
        console.log('Filtered categories:', categories);
        
        // Clear existing options except "All Categories"
        const options = categoryFilter.querySelectorAll('option:not([value="all"])');
        options.forEach(option => option.remove());

        // Add categories from actual data
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            const count = errorsByCategory[category].count;
            console.log(`Category: ${category}, Count: ${count}`);
            option.textContent = `${category} (${count})`;
            categoryFilter.appendChild(option);
        });
    }

    renderFailedTasks(tasks) {
        const failedTasksContainer = document.getElementById('failed-tasks-content');
        if (!failedTasksContainer) return;

        if (tasks.length === 0) {
            failedTasksContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-search text-muted" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">No failed tasks found for the current filters.</p>
                </div>
            `;
            return;
        }

        // Generate HTML for failed tasks using Bootstrap row/col structure
        const failedTasksHTML = tasks.map(task => {
            // Normalize error category, handle undefined/null cases
            const errorCategory = task.ErrorCategory || 'General Error';
            const taskName = task.TaskID || 'Unknown Task';
            
            return `
                <div class="failed-task-item" data-category="${errorCategory}" data-task-name="${taskName.toLowerCase()}">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <a href="/task-detail/${task.TaskID}" class="task-name-link" data-task-id="${task.TaskID}">${taskName}</a>
                        </div>
                        <div class="col-md-2">
                            <span class="error-category badge bg-danger-subtle text-danger">${errorCategory}</span>
                        </div>
                        <div class="col-md-3">
                            <span class="error-description">${task.ErrorDescription || 'No error description available'}</span>
                        </div>
                        <div class="col-md-5">
                            <span class="error-description">${task.ErrorDetail || 'No error details available'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        failedTasksContainer.innerHTML = failedTasksHTML;
    }

    setupFilterEventListeners() {
        const categoryFilter = document.getElementById('category-filter');
        const clearFilterBtn = document.getElementById('clear-filter-btn');
        const taskSearch = document.getElementById('task-search');

        if (categoryFilter) {
            // Remove existing event listener to avoid duplicates
            categoryFilter.removeEventListener('change', this.handleCategoryFilter);
            
            // Add new event listener
            this.handleCategoryFilter = (e) => {
                const selectedCategory = e.target.value;
                this.applyFilters();
            };
            
            categoryFilter.addEventListener('change', this.handleCategoryFilter);
        }

        if (taskSearch) {
            // Remove existing event listener to avoid duplicates
            taskSearch.removeEventListener('input', this.handleTaskSearch);
            
            // Add new event listener with debounce
            this.handleTaskSearch = this.debounce((e) => {
                this.applyFilters();
            }, 300);
            
            taskSearch.addEventListener('input', this.handleTaskSearch);
        }

        if (clearFilterBtn) {
            // Remove existing event listener to avoid duplicates
            clearFilterBtn.removeEventListener('click', this.handleClearFilter);
            
            // Add new event listener
            this.handleClearFilter = () => {
                this.clearFilters();
            };
            
            clearFilterBtn.addEventListener('click', this.handleClearFilter);
        }
    }

    // Debounce function for search input
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    applyFilters() {
        if (!this.originalFailedTasks) return;

        const categoryFilter = document.getElementById('category-filter');
        const taskSearch = document.getElementById('task-search');
        
        const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
        const searchTerm = taskSearch ? taskSearch.value.toLowerCase().trim() : '';

        let filteredTasks = this.originalFailedTasks;
        
        // Apply category filter
        if (selectedCategory !== 'all') {
            filteredTasks = filteredTasks.filter(task => {
                const errorCategory = task.ErrorCategory || 'General Error';
                return errorCategory === selectedCategory;
            });
        }

        // Apply search filter
        if (searchTerm) {
            filteredTasks = filteredTasks.filter(task => {
                const taskName = (task.TaskID || '').toLowerCase();
                return taskName.includes(searchTerm);
            });
        }

        // Update the display
        this.renderFailedTasks(filteredTasks);

        // Update the count badge
        this.updateTaskCountBadge(filteredTasks.length, selectedCategory, searchTerm);

        // Show/hide clear button
        this.updateClearButtonVisibility(selectedCategory, searchTerm);
    }

    updateTaskCountBadge(filteredCount, selectedCategory, searchTerm) {
        const failedTasksCountBadge = document.getElementById('failed-tasks-count');
        if (!failedTasksCountBadge || !this.originalFailedTasks) return;

        const totalTasks = this.originalFailedTasks.length;
        
        if (selectedCategory === 'all' && !searchTerm) {
            failedTasksCountBadge.textContent = `${totalTasks} Failed Task${totalTasks !== 1 ? 's' : ''}`;
        } else {
            let filterDesc = [];
            if (selectedCategory !== 'all') {
                filterDesc.push(selectedCategory);
            }
            if (searchTerm) {
                filterDesc.push(`"${searchTerm}"`);
            }
            
            failedTasksCountBadge.textContent = `${filteredCount} of ${totalTasks} Failed Tasks (${filterDesc.join(', ')})`;
        }
    }

    updateClearButtonVisibility(selectedCategory, searchTerm) {
        const clearFilterBtn = document.getElementById('clear-filter-btn');
        if (clearFilterBtn) {
            const hasActiveFilters = selectedCategory !== 'all' || searchTerm.length > 0;
            clearFilterBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
        }
    }

    filterTasksByCategory(category) {
        // This method is kept for backward compatibility
        // but now delegates to the unified applyFilters method
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.value = category;
        }
        this.applyFilters();
    }

    clearFilters() {
        const categoryFilter = document.getElementById('category-filter');
        const taskSearch = document.getElementById('task-search');
        
        if (categoryFilter) {
            categoryFilter.value = 'all';
        }
        
        if (taskSearch) {
            taskSearch.value = '';
        }

        // Reset to show all tasks
        this.applyFilters();
    }

    calculateSuccessTasks(job) {
        // Use backend field if available, otherwise calculate
        if (job.SuccessTasks !== undefined) {
            return job.SuccessTasks;
        }
        
        if (!job.successRate || !job.finishedTaskNum) return 0;
        const rate = parseFloat(job.successRate.replace('%', '')) / 100;
        return Math.round(job.finishedTaskNum * rate);
    }

    calculateFailedTasks(job) {
        // Use backend field if available, otherwise calculate
        if (job.FailedTasks !== undefined) {
            return job.FailedTasks;
        }
        
        if (!job.finishedTaskNum) return 0;
        const successTasks = this.calculateSuccessTasks(job);
        return job.finishedTaskNum - successTasks;
    }

    // Map backend response fields to frontend compatible format
    mapBackendJob(backendJob) {
        if (!backendJob) return {};
        
        return {
            id: backendJob.TestJobID || backendJob.id || 'N/A',
            name: backendJob.TestJobName || backendJob.name || 'Unnamed Job',
            description: backendJob.JobDiscription || backendJob.description || 'No description',
            creationTime: backendJob.CreatedTime || backendJob.creationTime || new Date().toISOString(),
            user: backendJob.InitiatedBy || backendJob.user || 'Unknown',
            createdBy: backendJob.InitiatedBy || 'Unknown',
            poolName: backendJob.PoolName || backendJob.poolName || 'Default',
            taskNum: backendJob.TaskNum || backendJob.taskNum || 0,
            finishedTaskNum: backendJob.FinishedTaskNum || backendJob.finishedTaskNum || 0,
            successRate: this.formatSuccessRate(backendJob.SuccessRate || backendJob.successRate),
            // Backend fields for direct access
            TestJobID: backendJob.TestJobID,
            InitiatedBy: backendJob.InitiatedBy,
            CreatedTime: backendJob.CreatedTime,
            JobDiscription: backendJob.JobDiscription,
            PoolName: backendJob.PoolName,
            TaskNum: backendJob.TaskNum,
            SuccessTasks: backendJob.SuccessTasks,
            SuccessRate: backendJob.SuccessRate,
            FailedTasks: backendJob.FailedTasks,
            AvgSuccessIteration: backendJob.AvgSuccessIteration,
            AIIntegration: backendJob.AIIntegration,
            AvgInfraChanges: backendJob.AvgInfraChanges
        };
    }

    formatSuccessRate(rate) {
        if (!rate) return '0%';
        if (typeof rate === 'string' && rate.includes('%')) return rate;
        if (typeof rate === 'number') return `${rate}%`;
        return '0%';
    }

    editCurrentJob() {
        if (this.currentJob) {
            // Use the mapped ID field
            const jobId = this.currentJob.TestJobID || this.currentJob.id;
            this.editJob(jobId);
        }
    }

    deleteCurrentJob() {
        if (this.currentJob) {
            // Use the mapped ID field
            const jobId = this.currentJob.TestJobID || this.currentJob.id;
            this.deleteJob(jobId);
        }
    }

    editJob(jobId) {
        // Placeholder for edit functionality
        this.showAlert('Edit functionality coming soon!', 'info');
    }

    async deleteJob(jobId) {
    }    groupErrorsByCategory(failedTasks) {
        const categories = {};
        failedTasks.forEach(task => {
            // Normalize category, handle undefined/null/empty cases
            let category = task.ErrorCategory;
            if (!category || category === 'undefined' || category === 'null' || category.trim() === '') {
                category = 'General Error';
            }
            
            if (!categories[category]) {
                categories[category] = {
                    count: 0,
                    tasks: []
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

    populateAllErrorCategories(errorsByCategory) {
        const errorCategoriesContainer = document.getElementById('error-categories-container');
        if (!errorCategoriesContainer) {
            console.warn('Error categories container not found');
            return;
        }

        const totalErrors = Object.values(errorsByCategory)
            .reduce((sum, data) => sum + data.count, 0);

        const categoriesHTML = Object.entries(errorsByCategory).map(([category, data]) => {
            const percentage = ((data.count / totalErrors) * 100).toFixed(1);
            const patterns = this.analyzeErrorPatterns(data.tasks);
            const patternsHTML = patterns.map(pattern => `
                <div class="error-pattern-item">
                    <div class="d-flex justify-content-between">
                        <span>${pattern.pattern}</span>
                        <span class="text-muted">${pattern.count}x</span>
                    </div>
                </div>
            `).join('');

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
                                        ${data.count} occurrence${data.count !== 1 ? 's' : ''} (${percentage}%)
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
        }).join('');

        errorCategoriesContainer.innerHTML = categoriesHTML;
    }

    showSampleTaskDetail() {
        // Navigate to a sample task detail page
        const sampleTaskId = '123456';
        const currentJobId = this.getCurrentJobId(); // Get current job ID if available
        
        if (window.router) {
            const route = currentJobId ? `/task-detail/${sampleTaskId}?jobId=${currentJobId}` : `/task-detail/${sampleTaskId}`;
            window.router.navigate(route);
        } else {
            // Fallback navigation
            window.location.href = `/task-detail/${sampleTaskId}`;
        }
    }

    getCurrentJobId() {
        // Try to get current job ID from the detail view
        const jobIdElement = document.getElementById('job-detail-id');
        if (jobIdElement) {
            return jobIdElement.textContent;
        }
        
        // Try to get from URL if we're in job detail view
        const path = window.location.pathname;
        if (path.startsWith('/job-detail/')) {
            return path.split('/job-detail/')[1];
        }
        
        return null;
    }    // Test function for filter functionality (can be removed in production)
    testCategoryFilter() {
        console.log('Testing enhanced filter functionality...');
        
        // Mock test data with various scenarios including undefined categories
        const testTasks = [
            { TaskID: 'deploy-task-1', ErrorCategory: 'Deployment Error', ErrorDescription: 'Failed to deploy container', ErrorDetail: 'Resource quota exceeded' },
            { TaskID: 'config-task-2', ErrorCategory: 'Configuration Error', ErrorDescription: 'Invalid configuration', ErrorDetail: 'Missing required parameter' },
            { TaskID: 'deploy-task-3', ErrorCategory: 'Deployment Error', ErrorDescription: 'Deploy timeout', ErrorDetail: 'Network timeout occurred' },
            { TaskID: 'network-task-4', ErrorCategory: 'Network Error', ErrorDescription: 'Connection failed', ErrorDetail: 'DNS resolution failed' },
            { TaskID: 'undefined-task-5', ErrorCategory: undefined, ErrorDescription: 'Unknown error', ErrorDetail: 'No details available' },
            { TaskID: 'null-task-6', ErrorCategory: null, ErrorDescription: 'Null category error', ErrorDetail: 'Category is null' },
            { TaskID: 'empty-task-7', ErrorCategory: '', ErrorDescription: 'Empty category error', ErrorDetail: 'Category is empty' },
            { TaskID: 'validation-task-8', ErrorCategory: 'Validation Error', ErrorDescription: 'Schema validation failed', ErrorDetail: 'Invalid input format' },
            { TaskID: 'search-test-task', ErrorCategory: 'Deployment Error', ErrorDescription: 'Search test task', ErrorDetail: 'For testing search functionality' }
        ];
        
        // Populate with test data
        this.populateFailedTasks(testTasks);
        
        console.log('Enhanced filter test data loaded with the following features:');
        console.log('✅ Category filter with proper undefined handling');
        console.log('✅ Task name search functionality'); 
        console.log('✅ Combined filtering capabilities');
        console.log('✅ Clear filters button');
        console.log('');
        console.log('Test scenarios:');
        console.log('1. Try filtering by different categories');
        console.log('2. Search for "deploy" or "search" in task names');
        console.log('3. Combine category and search filters');
        console.log('4. Notice undefined categories are handled as "General Error"');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for HTML partials to load before initializing dashboard
    const initDashboard = () => {
        if (document.getElementById('jobs-view') && document.getElementById('job-detail-view')) {
            window.jobDashboard = new JobDashboard();
        } else {
            // Retry after a short delay if partials haven't loaded yet
            setTimeout(initDashboard, 100);
        }
    };
    
    // Small delay to ensure HTML loader has started
    setTimeout(initDashboard, 50);
});

// Handle navigation (placeholder)
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            e.target.classList.add('active');
            
            const linkId = e.target.id;
            
            // Both home-page and job-view show the jobs view
            if (linkId === 'home-page' || linkId === 'job-view') {
                // If we're in job detail view, go back to jobs view
                if (window.jobDashboard && !document.getElementById('job-detail-view').classList.contains('d-none')) {
                    window.jobDashboard.showJobsView();
                }
            }
        });
    });
});
