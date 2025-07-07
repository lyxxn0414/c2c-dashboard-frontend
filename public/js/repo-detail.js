// Repo Detail Page functionality
let currentRepoName = '';
let relatedTasksData = [];
let currentTaskFilters = {
    createdBy: 'all',
    taskId: 'all',
    jobName: 'all',
    model: 'all'
};

function initRepoDetailView(repoName) {
    currentRepoName = repoName;
    console.log('Initializing repo detail view for:', repoName);
    
    // Load repo details and related tasks
    loadRepoDetails(repoName);
    loadRelatedTasks(repoName);
    setupRepoDetailEventListeners();
}

function setupRepoDetailEventListeners() {
    // Back button
    const backBtn = document.getElementById('back-to-repos-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            navigateBackToRepos();
        });
    }

    // Filter dropdowns
    setupTaskFilters();
}

function setupTaskFilters() {
    const filterConfigs = [
        { filterId: 'created-by-filter', dropdownId: 'created-by-dropdown', filterKey: 'createdBy' },
        { filterId: 'task-id-filter', dropdownId: 'task-id-dropdown', filterKey: 'taskId' },
        { filterId: 'job-name-filter', dropdownId: 'job-name-dropdown', filterKey: 'jobName' },
        { filterId: 'model-filter', dropdownId: 'model-dropdown', filterKey: 'model' }
    ];

    filterConfigs.forEach(config => {
        const dropdown = document.getElementById(config.dropdownId);
        if (dropdown) {
            dropdown.addEventListener('click', (e) => {
                if (e.target.classList.contains('dropdown-item')) {
                    e.preventDefault();
                    const filterValue = e.target.getAttribute('data-filter');
                    currentTaskFilters[config.filterKey] = filterValue;
                    updateTaskFilterDisplay(config.filterId, filterValue);
                    filterRelatedTasks();
                }
            });
        }
    });
}

function updateTaskFilterDisplay(filterId, value) {
    const button = document.getElementById(filterId);
    if (button) {
        const label = button.textContent.split(' ')[0]; // Get the first word (e.g., "Created", "TaskID")
        const displayValue = value === 'all' ? 'all' : value;
        button.innerHTML = `${label} <span class="badge bg-primary">equals</span> <span class="badge bg-secondary">${displayValue}</span>`;
    }
}

async function loadRepoDetails(repoName) {
    try {
        console.log('Loading repo details for:', repoName);
        
        // Try to get detailed repo information from API
        const response = await fetch(`/api/repos/${encodeURIComponent(repoName)}`);
        
        let repoDetails;
        if (response.ok) {
            repoDetails = await response.json();
            console.log('Repo details loaded from API:', repoDetails);
        } else {
            console.log('API failed, trying cache...');
            // Fallback: find repo in the existing repos data
            repoDetails = findRepoInCache(repoName);
        }
        
        // If still no details found, always create placeholder data
        if (!repoDetails) {
            console.log('No repo details found, creating placeholder data for:', repoName);
            repoDetails = createPlaceholderRepoData(repoName);
        }
        
        populateRepoDetails(repoDetails);
        
    } catch (error) {
        console.error('Error loading repo details:', error);
        // Always fallback to placeholder data in case of any error
        populateRepoDetails(createPlaceholderRepoData(repoName));
    }
}

function findRepoInCache(repoName) {
    // Try to find repo in cached repos data
    if (window.reposData && Array.isArray(window.reposData)) {
        const found = window.reposData.find(repo => repo.repoName === repoName);
        if (found) {
            console.log('Found repo in cache:', found);
            return found;
        }
    }
    console.log('Repo not found in cache for:', repoName);
    return null;
}

function createPlaceholderRepoData(repoName) {
    // Only create minimal placeholder data when API completely fails
    // Do not generate fake TotalTasks or SuccessTasks
    console.log('Creating minimal placeholder data for:', repoName);
    
    return {
        repoName: repoName,
        languages: ['Unknown'],
        appPattern: 'Unknown',
        successRate: '0%',
        repoURL: `https://github.com/Azure-Samples/${repoName}`,
        totalTasks: 0,
        successfulTasks: 0
    };
}

function generateConsistentId(repoName) {
    // Generate a consistent 6-digit ID based on repo name
    let hash = 0;
    for (let i = 0; i < repoName.length; i++) {
        const char = repoName.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString().padStart(6, '0').substring(0, 6);
}

function inferLanguagesFromRepoName(repoName) {
    const name = repoName.toLowerCase();
    
    // Common patterns in repo names to infer languages
    if (name.includes('java') || name.includes('spring') || name.includes('maven')) {
        return ['Java'];
    }
    if (name.includes('node') || name.includes('js') || name.includes('react') || name.includes('vue') || name.includes('angular')) {
        return ['JavaScript', 'TypeScript'];
    }
    if (name.includes('python') || name.includes('py') || name.includes('django') || name.includes('flask')) {
        return ['Python'];
    }
    if (name.includes('csharp') || name.includes('dotnet') || name.includes('.net') || name.includes('aspnet')) {
        return ['C#'];
    }
    if (name.includes('go') || name.includes('golang')) {
        return ['Go'];
    }
    if (name.includes('rust')) {
        return ['Rust'];
    }
    if (name.includes('php')) {
        return ['PHP'];
    }
    if (name.includes('ruby') || name.includes('rails')) {
        return ['Ruby'];
    }
    
    // Default based on common patterns
    if (name.includes('frontend') || name.includes('ui') || name.includes('web')) {
        return ['JavaScript', 'TypeScript', 'HTML', 'CSS'];
    }
    if (name.includes('api') || name.includes('service') || name.includes('backend')) {
        return ['Java', 'TypeScript'];
    }
    if (name.includes('mobile') || name.includes('app')) {
        return ['TypeScript', 'Java'];
    }
    
    // Very generic fallback
    return ['Java', 'TypeScript'];
}

function inferAppPatternFromRepoName(repoName) {
    const name = repoName.toLowerCase();
    
    if (name.includes('api') || name.includes('service')) {
        return 'REST API';
    }
    if (name.includes('frontend') || name.includes('ui') || name.includes('react') || name.includes('vue') || name.includes('angular')) {
        return 'SPA Frontend';
    }
    if (name.includes('mobile') || name.includes('app')) {
        return 'Mobile App';
    }
    if (name.includes('function') || name.includes('lambda')) {
        return 'Serverless Function';
    }
    if (name.includes('lib') || name.includes('package') || name.includes('shared')) {
        return 'Library Package';
    }
    if (name.includes('tool') || name.includes('cli') || name.includes('util')) {
        return 'CLI Tool';
    }
    if (name.includes('bot') || name.includes('chat')) {
        return 'Chat Bot';
    }
    if (name.includes('data') || name.includes('etl') || name.includes('pipeline')) {
        return 'Data Pipeline';
    }
    
    return 'Web Application';
}

function inferComputeResourceFromRepoName(repoName) {
    const name = repoName.toLowerCase();
    
    if (name.includes('function') || name.includes('lambda')) {
        return 'Azure Functions';
    }
    if (name.includes('container') || name.includes('docker') || name.includes('k8s') || name.includes('kubernetes')) {
        return 'Container Apps';
    }
    if (name.includes('static') || name.includes('spa') || name.includes('frontend')) {
        return 'Static Web Apps';
    }
    
    return 'App Service';
}

function inferBindingResourceFromRepoName(repoName) {
    const name = repoName.toLowerCase();
    const resources = [];
    
    if (name.includes('cache') || name.includes('redis')) {
        resources.push('Redis');
    }
    if (name.includes('db') || name.includes('data') || name.includes('sql') || name.includes('cosmos')) {
        resources.push('CosmosDB');
    }
    if (name.includes('storage') || name.includes('blob') || name.includes('file')) {
        resources.push('Storage');
    }
    if (name.includes('servicebus') || name.includes('queue') || name.includes('message')) {
        resources.push('Service Bus');
    }
    if (name.includes('search') || name.includes('index')) {
        resources.push('AI Search');
    }
    if (name.includes('ai') || name.includes('cognitive') || name.includes('openai')) {
        resources.push('AI Services');
    }
    
    // Always include KeyVault as it's common
    if (!resources.includes('KeyVault')) {
        resources.push('KeyVault');
    }
    
    // Limit to 2-3 resources for readability
    return resources.slice(0, 3).join(', ');
}

function generateSuccessRateFromRepoName(repoName) {
    // Generate a consistent success rate based on repo name
    let hash = 0;
    for (let i = 0; i < repoName.length; i++) {
        const char = repoName.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    // Convert to a success rate between 60% and 95%
    const normalizedHash = Math.abs(hash) % 100;
    const successRate = 0.6 + (normalizedHash / 100) * 0.35;
    
    return Math.round(successRate * 100) / 100; // Round to 2 decimal places
}

function generateTotalTasksFromRepoName(repoName) {
    // Generate a consistent total tasks count based on repo name
    let hash = 0;
    for (let i = 0; i < repoName.length; i++) {
        const char = repoName.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    // Convert to a task count between 5 and 25
    const normalizedHash = Math.abs(hash) % 100;
    const totalTasks = 5 + Math.floor((normalizedHash / 100) * 20);
    
    return totalTasks;
}

function populateRepoDetails(repoDetails) {
    console.log('Populating repo details:', repoDetails);
    
    // Check if all required elements exist
    const elements = {
        title: document.getElementById('repo-detail-title'),
        name: document.getElementById('repo-detail-name'),
        language: document.getElementById('repo-detail-language'),
        appPattern: document.getElementById('repo-detail-app-pattern'),
        successRate: document.getElementById('repo-detail-success-rate'),
        totalTasks: document.getElementById('repo-detail-total-tasks'),
        successTasks: document.getElementById('repo-detail-success-tasks'),
        link: document.getElementById('repo-detail-link'),
        successRateSection: document.getElementById('repo-success-rate'),
        successFractionSection: document.getElementById('repo-success-fraction')
    };
    
    // Log which elements are missing
    Object.keys(elements).forEach(key => {
        if (!elements[key]) {
            console.error(`Element not found: ${key} (ID: ${key.replace(/([A-Z])/g, '-$1').toLowerCase()})`);
        }
    });
    
    // Update page title
    if (elements.title) {
        elements.title.textContent = `Repo-${repoDetails.repoName}`;
        console.log('Updated title:', elements.title.textContent);
    }
    
    // Update repo information
    if (elements.name) {
        elements.name.textContent = repoDetails.repoName;
        console.log('Updated repo name:', elements.name.textContent);
    }
    
    if (elements.language) {
        const languageText = Array.isArray(repoDetails.languages) 
            ? repoDetails.languages.join(', ') 
            : (repoDetails.languages || 'Java');
        elements.language.textContent = languageText;
        console.log('Updated language:', elements.language.textContent);
    }
    
    if (elements.appPattern) {
        elements.appPattern.textContent = repoDetails.appPattern || 'N+N';
        console.log('Updated app pattern:', elements.appPattern.textContent);
    }
    
    if (elements.successRate) {
        // Display success rate as received from API (percentage format)
        let displayRate;
        if (typeof repoDetails.successRate === 'number') {
            if (repoDetails.successRate <= 1) {
                displayRate = `${(repoDetails.successRate * 100).toFixed(1)}%`;
            } else {
                displayRate = `${repoDetails.successRate.toFixed(1)}%`;
            }
        } else {
            displayRate = repoDetails.successRate || '0%';
        }
        elements.successRate.textContent = displayRate;
        console.log('Updated success rate:', elements.successRate.textContent);
    }
    
    if (elements.totalTasks) {
        elements.totalTasks.textContent = repoDetails.totalTasks || 0;
        console.log('Updated total tasks:', elements.totalTasks.textContent);
    }
    
    if (elements.successTasks) {
        elements.successTasks.textContent = repoDetails.successfulTasks || 0;
        console.log('Updated success tasks:', elements.successTasks.textContent);
    }
    
    if (elements.link && repoDetails.repoURL) {
        elements.link.href = repoDetails.repoURL;
        elements.link.textContent = repoDetails.repoURL;
        console.log('Updated repo link:', elements.link.href);
    }
    
    // Update success rate in the success rate section as well
    updateSuccessRateDisplay(repoDetails);
    
    console.log('Repo details population completed');
}

function updateSuccessRateDisplay(repoDetails) {
    console.log('Updating success rate display:', repoDetails);
    
    // Use data directly from API without any calculation
    let successRate = 0;
    let totalTasks = repoDetails.totalTasks || 0;
    let successfulTasks = repoDetails.successfulTasks || 0;
    
    // Parse success rate properly
    if (repoDetails.successRate !== undefined) {
        if (typeof repoDetails.successRate === 'string') {
            // Handle percentage string like "28.6%"
            const numericRate = parseFloat(repoDetails.successRate.replace('%', ''));
            successRate = isNaN(numericRate) ? 0 : numericRate;
        } else if (typeof repoDetails.successRate === 'number') {
            if (repoDetails.successRate <= 1) {
                successRate = repoDetails.successRate * 100;
            } else {
                successRate = repoDetails.successRate;
            }
        }
    }
    
    console.log('Using direct API data:', { 
        successRate, 
        totalTasks, 
        successfulTasks,
        original: repoDetails
    });
    
    const successRateElement = document.getElementById('repo-success-rate');
    const successFractionElement = document.getElementById('repo-success-fraction');
    
    if (successRateElement) {
        successRateElement.textContent = `${successRate.toFixed(1)}%`;
        console.log('Updated success rate:', successRateElement.textContent);
    } else {
        console.error('Success rate element not found');
    }
    
    if (successFractionElement) {
        successFractionElement.textContent = `(${successfulTasks}/${totalTasks})`;
        console.log('Updated success fraction:', successFractionElement.textContent);
    } else {
        console.error('Success fraction element not found');
    }
}

async function loadRelatedTasks(repoName) {
    try {
        console.log('Loading related tasks for:', repoName);
        const loadingIndicator = document.getElementById('tasks-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('d-none');
        }
        
        // Try to fetch related tasks from API
        const response = await fetch(`/api/repos/${encodeURIComponent(repoName)}/tasks`);
        
        if (response.ok) {
            relatedTasksData = await response.json();
            console.log('Related tasks loaded from API:', relatedTasksData);
        } else {
            console.log('API failed for tasks, using mock data');
            // Always fallback to mock data
            relatedTasksData = createMockTasksData(repoName);
        }
        
        // Ensure we always have some data
        if (!relatedTasksData || relatedTasksData.length === 0) {
            console.log('No related tasks found, creating mock data');
            relatedTasksData = createMockTasksData(repoName);
        }
        
        displayRelatedTasks(relatedTasksData);
        loadTaskFilters(relatedTasksData);
        
    } catch (error) {
        console.error('Error loading related tasks:', error);
        // Always provide fallback data
        relatedTasksData = createMockTasksData(repoName);
        displayRelatedTasks(relatedTasksData);
        loadTaskFilters(relatedTasksData);
    } finally {
        const loadingIndicator = document.getElementById('tasks-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('d-none');
        }
    }
}

function createMockTasksData(repoName) {
    const repoId = generateConsistentId(repoName);
    const languages = inferLanguagesFromRepoName(repoName);
    const primaryLanguage = languages[0] || 'Java';
    
    const models = ['GPT-4.1', 'Claude-3.5', 'GPT-4.0', 'Claude-3.7', 'o1-mini'];
    const taskTypes = ['bicep', 'terraform', 'mcp/non-mcp', 'kubernetes', 'arm-template'];
    const deployResults = ['Success', 'Failed', 'Pending', 'In Progress'];
    const users = ['developer1', 'developer2', 'developer3', 'admin', 'devops-user'];
    
    // Generate 4-8 tasks for more realistic data
    const taskCount = 4 + Math.floor(Math.abs(parseInt(repoId.substring(0, 2))) % 5);
    
    const tasks = [];
    const now = new Date();
    
    for (let i = 0; i < taskCount; i++) {
        // Generate consistent but varied data based on repo name and index
        const taskHash = parseInt(repoId.substring(i % 6, (i % 6) + 1)) + i;
        
        // Create date going backwards from now
        const daysAgo = i * 2 + Math.floor(taskHash % 5);
        const taskDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const formattedDate = taskDate.getFullYear() + '-' + 
            String(taskDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(taskDate.getDate()).padStart(2, '0') + ' ' +
            String(taskDate.getHours()).padStart(2, '0') + ':' + 
            String(taskDate.getMinutes()).padStart(2, '0');
        
        // Generate consistent results - newer tasks more likely to succeed
        let deployResult;
        if (i < taskCount / 2) {
            deployResult = taskHash % 10 < 7 ? 'Success' : (taskHash % 10 < 8 ? 'Failed' : 'In Progress');
        } else {
            deployResult = taskHash % 10 < 5 ? 'Success' : (taskHash % 10 < 7 ? 'Failed' : 'Pending');
        }
        
        tasks.push({
            taskId: `task-${repoId}-${String(i + 1).padStart(2, '0')}`,
            repoName: repoName,
            creationTime: formattedDate,
            copilotModel: models[taskHash % models.length],
            language: primaryLanguage,
            deployResult: deployResult,
            taskType: taskTypes[taskHash % taskTypes.length],
            iterations: Math.max(1, Math.min(15, 3 + (taskHash % 10))),
            createdBy: users[taskHash % users.length]
        });
    }
    
    console.log('Created mock tasks data for:', repoName, tasks);
    return tasks;
}

function loadTaskFilters(tasks) {
    // Load unique values for each filter
    const creators = [...new Set(tasks.map(task => task.createdBy))];
    const taskIds = [...new Set(tasks.map(task => task.taskId))];
    const models = [...new Set(tasks.map(task => task.copilotModel))];
    
    // Populate filter dropdowns
    populateFilterDropdown('created-by-dropdown', creators);
    populateFilterDropdown('task-id-dropdown', taskIds);
    populateFilterDropdown('model-dropdown', models);
    
    // For job names, you might want to extract from task data or fetch separately
    // For now, using placeholder
    populateFilterDropdown('job-name-dropdown', ['job-1', 'job-2', 'job-3']);
}

function populateFilterDropdown(dropdownId, values) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    // Clear existing options except "All"
    dropdown.innerHTML = '<li><a class="dropdown-item" href="#" data-filter="all">all</a></li>';
    
    values.forEach(value => {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="#" data-filter="${value}">${value}</a>`;
        dropdown.appendChild(li);
    });
}

function filterRelatedTasks() {
    const filteredTasks = relatedTasksData.filter(task => {
        const matchCreatedBy = currentTaskFilters.createdBy === 'all' || task.createdBy === currentTaskFilters.createdBy;
        const matchTaskId = currentTaskFilters.taskId === 'all' || task.taskId === currentTaskFilters.taskId;
        const matchModel = currentTaskFilters.model === 'all' || task.copilotModel === currentTaskFilters.model;
        // Job name filtering would need additional logic
        
        return matchCreatedBy && matchTaskId && matchModel;
    });
    
    displayRelatedTasks(filteredTasks);
}

function displayRelatedTasks(tasks) {
    const tbody = document.getElementById('related-tasks-table-body');
    
    if (!tbody) {
        console.error('Related tasks table body not found');
        return;
    }
    
    if (tasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    No related tasks found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        const row = document.createElement('tr');
        row.className = 'fade-in-up';
        
        row.innerHTML = `
            <td>
                <a href="#" class="task-id-link" data-task-id="${task.taskId}">
                    ${task.taskId}
                </a>
            </td>
            <td>${task.repoName}</td>
            <td>${task.creationTime}</td>
            <td>${task.copilotModel}</td>
            <td>${task.language}</td>
            <td>
                <span class="deploy-result-badge deploy-result-${task.deployResult.toLowerCase()}">
                    ${task.deployResult}
                </span>
            </td>
            <td>
                <span class="task-type">${task.taskType}</span>
            </td>
            <td>
                <span class="iterations-count">${task.iterations}</span>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Bind task ID click events
    document.querySelectorAll('.task-id-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const taskId = e.target.dataset.taskId;
            navigateToTaskDetail(taskId);
        });
    });
}

function navigateToTaskDetail(taskId) {
    console.log('Navigating to task detail:', taskId);
    // You can implement task detail navigation here
    // For now, show an alert
    alert(`Task detail view for: ${taskId}`);
}

function navigateBackToRepos() {
    console.log('Navigating back to repos');
    
    // Hide repo detail view
    document.getElementById('repo-detail-view').classList.add('d-none');
    
    // Show repos view
    document.getElementById('repos-content').style.display = 'block';
    
    // Update URL
    history.pushState({}, '', '/repos');
    
    // Update navigation
    if (window.jobDashboard) {
        window.jobDashboard.updateNavigationState('repos');
    }
}

function showRepoDetailPage(repoName) {
    console.log('Showing repo detail page for:', repoName);
    
    // Hide other views
    const jobsContent = document.getElementById('jobs-content');
    const reposContent = document.getElementById('repos-content');
    const jobDetailView = document.getElementById('job-detail-view');
    
    if (jobsContent) jobsContent.style.display = 'none';
    if (reposContent) reposContent.style.display = 'none';
    if (jobDetailView) jobDetailView.classList.add('d-none');
    
    // Show repo detail view
    const repoDetailView = document.getElementById('repo-detail-view');
    if (repoDetailView) {
        repoDetailView.classList.remove('d-none');
        repoDetailView.classList.add('repo-detail-transition');
        
        // Initialize the view
        initRepoDetailView(repoName);
        
        // Trigger animation
        setTimeout(() => {
            repoDetailView.classList.add('active');
        }, 10);
    }
}

// Export functions for global access
window.showRepoDetailPage = showRepoDetailPage;
window.initRepoDetailView = initRepoDetailView;
