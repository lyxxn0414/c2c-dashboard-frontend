// Dashboard JavaScript
class JobDashboard {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.currentSort = { field: 'creationTime', order: 'desc' };
        this.currentFilter = '';
        this.currentUserFilter = 'all';
        this.externalServiceStatus = null;
        
        this.init();
    }

    init() {
        // Wait for DOM elements to be available
        setTimeout(() => {
            this.initializeElements();
            this.bindEvents();
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
    }

    handleRoute(path) {
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
        } else {
            // Default to jobs view
            this.showJobsView();
            // Update URL if needed
            if (path !== '/' && path !== '') {
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
        this.jobDetailDescription = document.getElementById('job-detail-description');
        
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
        
        // Form elements
        this.externalApiUrl = document.getElementById('external-api-url');
        this.apiTimeout = document.getElementById('api-timeout');
        this.retryAttempts = document.getElementById('retry-attempts');
        this.connectionTestResult = document.getElementById('connection-test-result');
        this.jobDescription = document.getElementById('job-description');
        this.jobPoolId = document.getElementById('job-pool-id');
    }

    bindEvents() {
        // Check if elements exist before binding events
        if (!this.createJobBtn) {
            console.warn('Elements not ready for event binding');
            return;
        }

        // Create job button
        this.createJobBtn.addEventListener('click', () => {
            this.showCreateJobModal();
        });

        // Submit job form
        this.submitJobBtn?.addEventListener('click', () => {
            this.createJob();
        });

        // Filter input
        this.filterInput?.addEventListener('input', (e) => {
            this.currentFilter = e.target.value;
            this.currentPage = 1;
            this.loadJobs();
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

        // Test connection
        this.testConnectionBtn?.addEventListener('click', () => {
            this.testConnection();
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

        // Created by filter
        document.querySelectorAll('#created-by-filter + .dropdown-menu .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = e.target.dataset.filter;
                this.currentUserFilter = filter;
                this.updateFilterDisplay('created-by-filter', filter);
                this.currentPage = 1;
                this.loadJobs();
            });
        });

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
        document.getElementById('job-description').addEventListener('input', () => {
            this.validateCreateJobForm();
        });

        // Test connection
        document.getElementById('test-connection-btn').addEventListener('click', () => {
            this.testConnection();
        });

        // Back to jobs button
        document.getElementById('back-to-jobs-btn').addEventListener('click', () => {
            this.showJobsView();
        });

        // Edit job button in detail view
        document.getElementById('edit-job-btn').addEventListener('click', () => {
            this.editCurrentJob();
        });
    }

    async loadJobs() {
        this.showLoading(true);
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage.toString(),
                limit: this.pageSize.toString(),
                sortBy: this.currentSort.field,
                sortOrder: this.currentSort.order,
                filter: this.currentFilter
            });

            // Use our backend API endpoint (not direct kusto call)
            const response = await fetch(`/api/jobs?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
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

        // Apply user filter
        let filteredJobs = jobs;
        if (this.currentUserFilter !== 'all') {
            filteredJobs = jobs.filter(job => job.InitiatedBy === this.currentUserFilter);
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
                <td>${this.escapeHtml(job.JobDiscription)}</td>
                <td>${job.TaskNum}</td>
                <td>
                    <span class="success-rate ${this.getSuccessRateClass(job.SuccessRate)}">
                        ${job.SuccessRate}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" onclick="jobDashboard.viewJob('${job.TestJobID}')" title="View Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="jobDashboard.editJob('${job.TestJobID}')" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="jobDashboard.deleteJob('${job.TestJobID}')" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
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
        submitBtn.disabled = !description;
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
        await this.navigateToJobDetail(jobId);
    }

    showJobDetailView(job, taskErrors, classifiedResults) {
        // Store current job for editing/deleting
        this.currentJob = job;
        
        // Hide jobs view and show detail view
        document.getElementById('jobs-view').classList.add('d-none');
        const detailView = document.getElementById('job-detail-view');
        detailView.classList.remove('d-none');
        detailView.classList.add('view-transition');
        
        // Populate job detail fields
        document.getElementById('job-detail-title').textContent = `Job-${job.TestJobID}`;
        document.getElementById('job-detail-id').textContent = job.TestJobID;
        document.getElementById('job-detail-creator').textContent = job.InitiatedBy;
        document.getElementById('job-detail-creation-time').textContent = this.formatDateTime(job.CreatedTime);
        document.getElementById('job-detail-description').textContent = job.JobDiscription;
        
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

        // Trigger transition effect
        setTimeout(() => {
            detailView.classList.add('active');
        }, 10);
    }

    showJobDetailLoadingState() {
        // Hide jobs view immediately
        document.getElementById('jobs-view').classList.add('d-none');
        
        // Show detail view with loading state
        const detailView = document.getElementById('job-detail-view');
        detailView.classList.remove('d-none');
        detailView.classList.add('view-transition');
        
        // Clear previous content and show loading state
        const jobDetailTitle = document.getElementById('job-detail-title');
        const jobDetailId = document.getElementById('job-detail-id');
        const jobDetailCreator = document.getElementById('job-detail-creator');
        const jobDetailCreationTime = document.getElementById('job-detail-creation-time');
        const jobDetailDescription = document.getElementById('job-detail-description');
        
        if (jobDetailTitle) jobDetailTitle.textContent = 'Loading...';
        if (jobDetailId) jobDetailId.textContent = '...';
        if (jobDetailCreator) jobDetailCreator.textContent = '...';
        if (jobDetailCreationTime) jobDetailCreationTime.textContent = '...';
        if (jobDetailDescription) jobDetailDescription.textContent = 'Loading job details...';
        
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
        detailView.classList.remove('active');
        
        setTimeout(() => {
            detailView.classList.add('d-none');
            detailView.classList.remove('view-transition');
            document.getElementById('jobs-view').classList.remove('d-none');
        }, 300);
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

    populateFailedTasks(taskErrors) {
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

        // Update failed tasks count badge
        const failedTasksCountBadge = document.getElementById('failed-tasks-count');
        if (failedTasksCountBadge) {
            failedTasksCountBadge.textContent = `${failedTasksArr.length} Failed Task${failedTasksArr.length !== 1 ? 's' : ''}`;
        }

        // Generate HTML for failed tasks using Bootstrap row/col structure
        const failedTasksHTML = failedTasksArr.map(task => `
            <div class="failed-task-item">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <span class="task-name">${task.TaskID || 'Unknown Task'}</span>
                    </div>
                    <div class="col-md-3">
                        <span class="error-category badge bg-danger-subtle text-danger">${task.ErrorCategory || 'General Error'}</span>
                    </div>
                    <div class="col-md-6">
                        <span class="error-description">${task.ErrorDescription || 'No error description available'}</span>
                    </div>
                </div>
            </div>
        `).join('');

        failedTasksContainer.innerHTML = failedTasksHTML;
    }

    // generateMockFailedTasks(failedCount) {
    //     // Generate mock failed tasks for demonstration when real data isn't available
    //     const mockErrorCategories = ['Network', 'Timeout', 'Validation', 'Configuration', 'Dependency'];
    //     const mockTaskNames = [
    //         'Azure Resource Deployment',
    //         'Container Registry Setup',
    //         'Database Configuration',
    //         'API Gateway Setup',
    //         'Load Balancer Configuration',
    //         'SSL Certificate Installation',
    //         'DNS Configuration',
    //         'Monitoring Setup'
    //     ];
    //     const mockErrorDescriptions = [
    //         'Connection timeout while establishing connection to Azure Resource Manager',
    //         'Invalid configuration parameters provided for the service setup',
    //         'Required dependencies are missing or incompatible versions detected',
    //         'Authentication failed due to expired or invalid credentials',
    //         'Resource quota exceeded for the specified subscription tier',
    //         'Network security group rules blocking required communication ports',
    //         'Service endpoint configuration conflicts with existing setup',
    //         'Validation failed for resource naming conventions'
    //     ];

    //     const failedTasks = [];
    //     for (let i = 0; i < Math.min(failedCount, 8); i++) {
    //         failedTasks.push({
    //             taskName: mockTaskNames[i % mockTaskNames.length],
    //             errorCategory: mockErrorCategories[i % mockErrorCategories.length],
    //             errorDescription: mockErrorDescriptions[i % mockErrorDescriptions.length]
    //         });
    //     }

    //     return failedTasks;
    // }

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
            createdBy: backendJob.InitiatedBy || backendJob.createdBy || backendJob.user || 'Unknown',
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
