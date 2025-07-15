// Error Center JavaScript
class ErrorCenter {
    constructor() {
        this.currentPeriod = 3;
        this.currentCategory = 'all';
        this.currentSearch = '';
        this.allErrors = [];
        this.filteredErrors = [];
        this.errorsByCategory = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadErrorData();
    }

    bindEvents() {
        // Period selector
        const periodSelect = document.getElementById('error-period-select');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.currentPeriod = parseInt(e.target.value);
                this.loadErrorData();
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('error-category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.applyFilters();
            });
        }

        // Search input
        const searchInput = document.getElementById('error-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.currentSearch = e.target.value.toLowerCase().trim();
                this.applyFilters();
            }, 300));
        }

        // Clear search
        const clearSearchBtn = document.getElementById('clear-error-search-btn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                document.getElementById('error-search-input').value = '';
                this.currentSearch = '';
                this.applyFilters();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-errors-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadErrorData();
            });
        }

        // Export button
        const exportBtn = document.getElementById('export-errors-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportErrors();
            });
        }

        // Retry button
        const retryBtn = document.getElementById('retry-load-errors-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.loadErrorData();
            });
        }

        // Try different period button
        const tryPeriodBtn = document.getElementById('try-different-period-btn');
        if (tryPeriodBtn) {
            tryPeriodBtn.addEventListener('click', () => {
                document.getElementById('error-period-select').value = '7';
                this.currentPeriod = 7;
                this.loadErrorData();
            });
        }
    }

    async loadErrorData() {
        this.showLoadingState();

        try {
            console.log(`Loading error data for period: ${this.currentPeriod} days`);
            
            const response = await fetch('/api/jobs/errors/recent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Period: this.currentPeriod
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Error data received:', data);

            this.allErrors = data.data || [];
            this.processErrorData();
            this.populateCategoryFilter();
            this.applyFilters();
            this.showDataState();

        } catch (error) {
            console.error('Error loading error data:', error);
            this.showErrorState();
        }
    }

    processErrorData() {
        // Group errors by category
        this.errorsByCategory = {};
        
        this.allErrors.forEach(error => {
            const category = error.ErrorCategory || 'General Error';
            
            if (!this.errorsByCategory[category]) {
                this.errorsByCategory[category] = {
                    count: 0,
                    errors: [],
                    latestDate: null
                };
            }
            
            this.errorsByCategory[category].count++;
            this.errorsByCategory[category].errors.push(error);
            
            const errorDate = new Date(error.CreatedDate);
            if (!this.errorsByCategory[category].latestDate || errorDate > this.errorsByCategory[category].latestDate) {
                this.errorsByCategory[category].latestDate = errorDate;
            }
        });

        // Sort categories by count (descending)
        this.errorsByCategory = Object.entries(this.errorsByCategory)
            .sort(([,a], [,b]) => b.count - a.count)
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});
    }

    populateCategoryFilter() {
        const categoryFilter = document.getElementById('error-category-filter');
        if (!categoryFilter) return;

        // Clear existing options except "All Categories"
        categoryFilter.innerHTML = '<option value="all">All Categories</option>';

        // Add categories
        Object.keys(this.errorsByCategory).forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `${category} (${this.errorsByCategory[category].count})`;
            categoryFilter.appendChild(option);
        });
    }

    applyFilters() {
        let filtered = [...this.allErrors];

        // Apply category filter
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(error => 
                (error.ErrorCategory || 'General Error') === this.currentCategory
            );
        }

        // Apply search filter
        if (this.currentSearch) {
            filtered = filtered.filter(error => {
                const searchFields = [
                    error.TaskID || '',
                    error.TestJobID || '',
                    error.ErrorDescription || '',
                    error.ErrorDetail || '',
                    error.ErrorCategory || ''
                ];
                
                return searchFields.some(field => 
                    field.toLowerCase().includes(this.currentSearch)
                );
            });
        }

        this.filteredErrors = filtered;
        this.updateSummary();
        this.renderErrorCategories();
        this.updateFilteredCount();
    }

    updateSummary() {
        const totalCount = document.getElementById('total-errors-count');
        const categoriesCount = document.getElementById('total-categories-count');
        const mostRecent = document.getElementById('most-recent-error');
        const topCategory = document.getElementById('top-error-category');

        if (totalCount) totalCount.textContent = this.filteredErrors.length;
        if (categoriesCount) categoriesCount.textContent = Object.keys(this.errorsByCategory).length;

        // Find most recent error
        if (this.filteredErrors.length > 0) {
            const mostRecentError = this.filteredErrors.reduce((latest, error) => {
                const errorDate = new Date(error.CreatedDate);
                const latestDate = new Date(latest.CreatedDate);
                return errorDate > latestDate ? error : latest;
            });

            if (mostRecent) {
                mostRecent.textContent = this.formatDateTime(mostRecentError.CreatedDate);
            }
        } else {
            if (mostRecent) mostRecent.textContent = 'No errors';
        }

        // Top category
        const categories = Object.entries(this.errorsByCategory);
        if (categories.length > 0 && topCategory) {
            const [categoryName, categoryData] = categories[0];
            topCategory.textContent = `${categoryName} (${categoryData.count})`;
        } else if (topCategory) {
            topCategory.textContent = 'No errors';
        }
    }

    renderErrorCategories() {
        const container = document.getElementById('error-categories-list');
        if (!container) return;

        if (this.filteredErrors.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-search text-muted" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">No errors found matching current filters.</p>
                </div>
            `;
            return;
        }

        // Group filtered errors by category
        const filteredByCategory = {};
        this.filteredErrors.forEach(error => {
            const category = error.ErrorCategory || 'General Error';
            if (!filteredByCategory[category]) {
                filteredByCategory[category] = [];
            }
            filteredByCategory[category].push(error);
        });

        // Sort categories by count
        const sortedCategories = Object.entries(filteredByCategory)
            .sort(([,a], [,b]) => b.length - a.length);

        let html = '';
        
        sortedCategories.forEach(([category, errors]) => {
            const categoryClass = this.getCategoryClass(category);
            const percentage = ((errors.length / this.filteredErrors.length) * 100).toFixed(1);
            
            html += `
                <div class="error-category-card mb-4">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center ${categoryClass}">
                            <h5 class="mb-0">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                ${category}
                            </h5>
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge bg-light text-dark">${errors.length} error${errors.length !== 1 ? 's' : ''}</span>
                                <span class="badge bg-primary">${percentage}%</span>
                                <button class="btn btn-sm btn-outline-secondary" onclick="errorCenter.toggleCategory('${category}')">
                                    <i class="bi bi-chevron-down" id="chevron-${category}"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-body collapse" id="category-${category}">
                            <div class="row">
                                ${this.renderErrorItems(errors)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderErrorItems(errors) {
        return errors.map(error => `
            <div class="col-12 mb-3">
                <div class="error-item p-3 border rounded">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <strong>Task ID:</strong><br>
                            <a href="#" class="task-link" data-task-id="${error.TaskID}">${error.TaskID}</a>
                        </div>
                        <div class="col-md-2">
                            <strong>Job ID:</strong><br>
                            <a href="#" class="job-link" data-job-id="${error.TestJobID}">${error.TestJobID}</a>
                        </div>
                        <div class="col-md-2">
                            <strong>Date:</strong><br>
                            <small>${this.formatDateTime(error.CreatedDate)}</small>
                        </div>
                        <div class="col-md-3">
                            <strong>Description:</strong><br>
                            <span class="text-muted">${this.truncateText(error.ErrorDescription || 'No description', 50)}</span>
                        </div>
                        <div class="col-md-2">
                            <strong>Terraform:</strong><br>
                            <span class="badge ${error.UseTerraform ? 'bg-success' : 'bg-secondary'}">${error.UseTerraform ? 'Yes' : 'No'}</span>
                        </div>
                        <div class="col-md-1 text-end">
                            <button class="btn btn-sm btn-outline-primary" onclick="errorCenter.showErrorDetail('${error.TaskID}')">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getCategoryClass(category) {
        const categoryLower = category.toLowerCase();
        if (categoryLower.includes('docker')) return 'bg-danger text-white';
        if (categoryLower.includes('bicep') || categoryLower.includes('terraform')) return 'bg-warning text-dark';
        if (categoryLower.includes('network') || categoryLower.includes('connection')) return 'bg-info text-white';
        if (categoryLower.includes('permission') || categoryLower.includes('auth')) return 'bg-dark text-white';
        return 'bg-secondary text-white';
    }

    updateFilteredCount() {
        const countElement = document.getElementById('filtered-errors-count');
        if (countElement) {
            countElement.textContent = `${this.filteredErrors.length} error${this.filteredErrors.length !== 1 ? 's' : ''}`;
        }
    }

    toggleCategory(category) {
        const categoryBody = document.getElementById(`category-${category}`);
        const chevron = document.getElementById(`chevron-${category}`);
        
        if (categoryBody && chevron) {
            if (categoryBody.classList.contains('show')) {
                categoryBody.classList.remove('show');
                chevron.classList.remove('bi-chevron-up');
                chevron.classList.add('bi-chevron-down');
            } else {
                categoryBody.classList.add('show');
                chevron.classList.remove('bi-chevron-down');
                chevron.classList.add('bi-chevron-up');
            }
        }
    }

    showErrorDetail(taskId) {
        const error = this.allErrors.find(e => e.TaskID === taskId);
        if (!error) return;

        // Populate modal
        document.getElementById('modal-task-id').textContent = error.TaskID;
        document.getElementById('modal-job-id').textContent = error.TestJobID;
        document.getElementById('modal-error-date').textContent = this.formatDateTime(error.CreatedDate);
        document.getElementById('modal-error-category').textContent = error.ErrorCategory || 'General Error';
        document.getElementById('modal-task-type').textContent = error.TaskType || 'Unknown';
        document.getElementById('modal-use-terraform').textContent = error.UseTerraform ? 'Yes' : 'No';
        document.getElementById('modal-error-description').textContent = error.ErrorDescription || 'No description available';
        document.getElementById('modal-error-detail').textContent = error.ErrorDetail || 'No details available';

        // Setup view task button
        const viewTaskBtn = document.getElementById('view-task-detail-btn');
        if (viewTaskBtn) {
            viewTaskBtn.onclick = () => {
                // Navigate to task detail
                window.navigateToTaskDetail(error.TaskID);
                bootstrap.Modal.getInstance(document.getElementById('errorDetailModal')).hide();
            };
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('errorDetailModal'));
        modal.show();
    }

    exportErrors() {
        if (this.filteredErrors.length === 0) {
            alert('No errors to export');
            return;
        }

        const csvContent = this.generateCSV(this.filteredErrors);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `error-report-${this.currentPeriod}days-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    generateCSV(errors) {
        const headers = ['TaskID', 'TestJobID', 'CreatedDate', 'TaskType', 'UseTerraform', 'ErrorCategory', 'ErrorDescription', 'ErrorDetail'];
        const csvRows = [headers.join(',')];

        errors.forEach(error => {
            const row = [
                error.TaskID || '',
                error.TestJobID || '',
                error.CreatedDate || '',
                error.TaskType || '',
                error.UseTerraform ? 'Yes' : 'No',
                error.ErrorCategory || '',
                `"${(error.ErrorDescription || '').replace(/"/g, '""')}"`,
                `"${(error.ErrorDetail || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    showLoadingState() {
        document.getElementById('error-center-loading').style.display = 'block';
        document.getElementById('error-summary-section').style.display = 'none';
        document.getElementById('error-categories-section').style.display = 'none';
        document.getElementById('error-center-empty').style.display = 'none';
        document.getElementById('error-center-error').style.display = 'none';
    }

    showDataState() {
        document.getElementById('error-center-loading').style.display = 'none';
        document.getElementById('error-center-error').style.display = 'none';
        
        if (this.allErrors.length === 0) {
            document.getElementById('error-center-empty').style.display = 'block';
            document.getElementById('error-summary-section').style.display = 'none';
            document.getElementById('error-categories-section').style.display = 'none';
        } else {
            document.getElementById('error-center-empty').style.display = 'none';
            document.getElementById('error-summary-section').style.display = 'block';
            document.getElementById('error-categories-section').style.display = 'block';
        }
    }

    showErrorState() {
        document.getElementById('error-center-loading').style.display = 'none';
        document.getElementById('error-summary-section').style.display = 'none';
        document.getElementById('error-categories-section').style.display = 'none';
        document.getElementById('error-center-empty').style.display = 'none';
        document.getElementById('error-center-error').style.display = 'block';
    }

    // Utility methods
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

    formatDateTime(dateTime) {
        if (!dateTime) return 'N/A';
        
        try {
            const date = new Date(dateTime);
            if (isNaN(date.getTime())) {
                return dateTime;
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
            
            return date.toLocaleString('sv-SE', options).replace('T', ' ');
            
        } catch (error) {
            console.warn('Error formatting date:', error, dateTime);
            return dateTime;
        }
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// Global instance
let errorCenter;

// Initialize Error Center when the view is shown
function initErrorCenter() {
    if (!errorCenter) {
        errorCenter = new ErrorCenter();
    }
}
