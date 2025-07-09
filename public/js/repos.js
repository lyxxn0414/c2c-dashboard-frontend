// Repo view specific functionality
let reposData = [];
let dropdownsInitialized = false;
let currentFilters = {
    repoName: '',
    repoType: 'all',
    language: 'all'
};

function initRepoView() {
    console.log('Initializing repo view...');
    // Reset initialization flag in case of re-initialization
    dropdownsInitialized = false;
    setupRepoEventListeners();
    loadRepos();
}

// Function to reset dropdowns if needed
function resetDropdowns() {
    console.log('Resetting dropdowns...');
    dropdownsInitialized = false;
    cleanupDropdownListeners();
    document._outsideClickHandlerAdded = false;
}

function setupRepoEventListeners() {
    // Search input
    document.getElementById('repoNameFilter').addEventListener('input', (e) => {
        currentFilters.repoName = e.target.value.toLowerCase();
        filterRepos();
    });

    // Wait for DOM to be ready and ensure Bootstrap is available
    setTimeout(() => {
        // Only initialize dropdowns once
        if (!dropdownsInitialized) {
            // Repo type filter dropdown
            document.addEventListener('click', (e) => {
                if (e.target.closest('#repo-type-dropdown .dropdown-item')) {
                    e.preventDefault();
                    const filter = e.target.getAttribute('data-filter');
                    currentFilters.repoType = filter;
                    updateDropdownButton('repo-type-filter', 'RepoType', filter);
                    filterRepos();
                    
                    // Close the dropdown (Bootstrap or manual)
                    closeDropdown('repo-type-filter', 'repo-type-dropdown');
                }
                
                if (e.target.closest('#language-dropdown .dropdown-item')) {
                    e.preventDefault();
                    const filter = e.target.getAttribute('data-filter');
                    currentFilters.language = filter;
                    updateDropdownButton('language-filter', 'Language', filter);
                    filterRepos();
                    
                    // Close the dropdown (Bootstrap or manual)
                    closeDropdown('language-filter', 'language-dropdown');
                }
            });

            // Initialize Bootstrap dropdowns explicitly
            initializeBootstrapDropdowns();
            dropdownsInitialized = true;
            console.log('Dropdown event listeners and initialization completed');
        } else {
            console.log('Dropdowns already initialized, skipping...');
        }
    }, 100);
}

function closeDropdown(buttonId, dropdownId) {
    try {
        if (typeof bootstrap !== 'undefined') {
            // Use Bootstrap method
            const dropdown = document.getElementById(buttonId);
            const bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
            if (bsDropdown) {
                bsDropdown.hide();
            }
        } else {
            // Use manual method
            const dropdownMenu = document.getElementById(dropdownId);
            if (dropdownMenu) {
                dropdownMenu.classList.remove('show');
            }
        }
    } catch (error) {
        console.error('Error closing dropdown:', error);
        // Fallback: just remove show class
        const dropdownMenu = document.getElementById(dropdownId);
        if (dropdownMenu) {
            dropdownMenu.classList.remove('show');
        }
    }
}

function initializeBootstrapDropdowns() {
    try {
        console.log('Initializing Bootstrap dropdowns...');
        console.log('Bootstrap available:', typeof bootstrap !== 'undefined');
        
        // Clean up any existing manual event listeners first
        cleanupDropdownListeners();
        
        // Initialize repo type dropdown
        const repoTypeButton = document.getElementById('repo-type-filter');
        if (repoTypeButton) {
            if (typeof bootstrap !== 'undefined') {
                // Dispose of any existing Bootstrap dropdown instance
                const existingInstance = bootstrap.Dropdown.getInstance(repoTypeButton);
                if (existingInstance) {
                    existingInstance.dispose();
                }
                new bootstrap.Dropdown(repoTypeButton);
                console.log('Repo type dropdown initialized with Bootstrap');
            } else {
                // Fallback: manual dropdown toggle
                setupManualDropdown(repoTypeButton, 'repo-type-dropdown');
                console.log('Repo type dropdown initialized with manual fallback');
            }
        }

        // Initialize language dropdown
        const languageButton = document.getElementById('language-filter');
        if (languageButton) {
            if (typeof bootstrap !== 'undefined') {
                // Dispose of any existing Bootstrap dropdown instance
                const existingInstance = bootstrap.Dropdown.getInstance(languageButton);
                if (existingInstance) {
                    existingInstance.dispose();
                }
                new bootstrap.Dropdown(languageButton);
                console.log('Language dropdown initialized with Bootstrap');
            } else {
                // Fallback: manual dropdown toggle
                setupManualDropdown(languageButton, 'language-dropdown');
                console.log('Language dropdown initialized with manual fallback');
            }
        }
    } catch (error) {
        console.error('Error initializing dropdowns:', error);
        
        // Fallback initialization
        console.log('Using fallback dropdown initialization...');
        cleanupDropdownListeners();
        const repoTypeButton = document.getElementById('repo-type-filter');
        const languageButton = document.getElementById('language-filter');
        
        if (repoTypeButton) setupManualDropdown(repoTypeButton, 'repo-type-dropdown');
        if (languageButton) setupManualDropdown(languageButton, 'language-dropdown');
    }
}

function cleanupDropdownListeners() {
    // Remove any existing manual click listeners by cloning and replacing elements
    const repoTypeButton = document.getElementById('repo-type-filter');
    const languageButton = document.getElementById('language-filter');
    
    if (repoTypeButton && repoTypeButton._manualListenerAdded) {
        const newRepoTypeButton = repoTypeButton.cloneNode(true);
        repoTypeButton.parentNode.replaceChild(newRepoTypeButton, repoTypeButton);
    }
    
    if (languageButton && languageButton._manualListenerAdded) {
        const newLanguageButton = languageButton.cloneNode(true);
        languageButton.parentNode.replaceChild(newLanguageButton, languageButton);
    }
}

function setupManualDropdown(button, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!button || !dropdown) return;
    
    // Mark this button as having manual listeners to avoid duplicates
    if (button._manualListenerAdded) {
        console.log(`Manual listener already added for ${dropdownId}, skipping...`);
        return;
    }
    
    // Add click handler to button
    const clickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log(`Manual dropdown button clicked: ${dropdownId}`);
        
        // Close other dropdowns first
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            if (menu.id !== dropdownId) {
                menu.classList.remove('show');
            }
        });
        
        // Toggle current dropdown
        const wasVisible = dropdown.classList.contains('show');
        dropdown.classList.toggle('show');
        console.log(`Manual dropdown ${dropdownId} toggled: ${!wasVisible} (was: ${wasVisible})`);
    };
    
    button.addEventListener('click', clickHandler);
    button._manualListenerAdded = true;
    button._clickHandler = clickHandler; // Store reference for potential cleanup
    
    // Close dropdown when clicking outside (only add this once)
    if (!document._outsideClickHandlerAdded) {
        document.addEventListener('click', (e) => {
            // Check if click is outside any dropdown
            const allDropdownButtons = document.querySelectorAll('[data-bs-toggle="dropdown"]');
            const allDropdownMenus = document.querySelectorAll('.dropdown-menu');
            
            let clickedInsideDropdown = false;
            allDropdownButtons.forEach(btn => {
                if (btn.contains(e.target)) clickedInsideDropdown = true;
            });
            allDropdownMenus.forEach(menu => {
                if (menu.contains(e.target)) clickedInsideDropdown = true;
            });
            
            if (!clickedInsideDropdown) {
                allDropdownMenus.forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
        document._outsideClickHandlerAdded = true;
    }
}

function updateDropdownButton(buttonId, label, value) {
    const button = document.getElementById(buttonId);
    const displayValue = value === 'all' ? 'all' : value;
    button.innerHTML = `${label} <span class="badge bg-primary">equals</span> <span class="badge bg-secondary">${displayValue}</span>`;
}

function loadRepoFilters() {
    // Load repo types
    const repoTypes = [...new Set(reposData.map(repo => repo.repoType))];
    const repoTypeDropdown = document.getElementById('repo-type-dropdown');
    
    // Clear existing options except "All"
    repoTypeDropdown.innerHTML = '<li><a class="dropdown-item" href="#" data-filter="all">All</a></li>';
    
    repoTypes.forEach(type => {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="#" data-filter="${type}">${type}</a>`;
        repoTypeDropdown.appendChild(li);
    });

    // Load languages
    const languages = [...new Set(reposData.flatMap(repo => repo.languages))];
    const languageDropdown = document.getElementById('language-dropdown');
    
    // Clear existing options except "All"
    languageDropdown.innerHTML = '<li><a class="dropdown-item" href="#" data-filter="all">All</a></li>';
    
    languages.forEach(lang => {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="#" data-filter="${lang}">${lang}</a>`;
        languageDropdown.appendChild(li);
    });

    console.log('Repo filters loaded - RepoTypes:', repoTypes.length, 'Languages:', languages.length);
}

function filterRepos() {
    const filteredRepos = reposData.filter(repo => {
        const matchName = repo.repoName.toLowerCase().includes(currentFilters.repoName);
        const matchType = currentFilters.repoType === 'all' || repo.repoType === currentFilters.repoType;
        const matchLanguage = currentFilters.language === 'all' || repo.languages.includes(currentFilters.language);
        return matchName && matchType && matchLanguage;
    });

    displayRepos(filteredRepos);
}

async function loadRepos() {
    try {
        console.log('Loading repos...');
        const repoDetailView = document.getElementById('repo-detail-view');
        if (repoDetailView) {
            repoDetailView.classList.add('d-none');
        }
        document.getElementById('repos-loading-indicator').classList.remove('d-none');
        
        const response = await fetch('/api/repos');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        reposData = await response.json();
        console.log('Repos data loaded:', reposData.length, 'repos');
        displayRepos(reposData);
        loadRepoFilters();
        
        document.getElementById('repos-loading-indicator').classList.add('d-none');
    } catch (error) {
        console.error('Error loading repos:', error);
        document.getElementById('repos-loading-indicator').classList.add('d-none');
        
        // Show error message to user
        document.getElementById('reposTableBody').innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-5">
                    <i class="bi bi-exclamation-triangle fs-1 mb-3 d-block"></i>
                    <p class="mb-0">No repos found</p>
                </td>
            </tr>
        `;
    }
}

function displayRepos(repos) {
    const tbody = document.getElementById('reposTableBody');
    
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
    
    tbody.innerHTML = '';

    repos.forEach(repo => {
        const tr = document.createElement('tr');
        
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
    document.querySelectorAll('.repo-name-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const repoName = e.target.dataset.repoName;
            showRepoDetailLoadingState(repoName);
            navigateToRepoDetail(repoName);
        });
    });
}

function createLanguageTags(languages) {
    if (!languages || languages.length === 0) return '<span class="text-muted">-</span>';
    
    return languages.map(lang => 
        `<span class="badge bg-primary me-1">${lang}</span>`
    ).join('');
}

function createSuccessRateBadge(rate) {
    // Handle empty or zero rates
    if (!rate || rate === 0) {
        return '<span class="badge bg-secondary">N/A</span>';
    }
    
    let percentage;
    if (rate <= 1) {
        // Rate is already a decimal (0-1), convert to percentage
        percentage = (rate * 100).toFixed(1);
    } else {
        // Rate is already a percentage (>1), use as is
        percentage = rate.toFixed(1);
    }
    
    const numericRate = parseFloat(percentage) / 100;
    let badgeClass = 'bg-danger';
    if (numericRate >= 0.8) badgeClass = 'bg-success';
    else if (numericRate >= 0.6) badgeClass = 'bg-warning';
    
    return `<span class="badge ${badgeClass}">${percentage}%</span>`;
}

function navigateToRepoDetail(repoName) {
    console.log('Navigating to repo detail:', repoName);
    
    // Use router navigation if available
    if (window.navigateToRepoDetail) {
        console.log('Using global navigateToRepoDetail function');
        window.navigateToRepoDetail(repoName);
    } else if (window.router) {
        console.log('Using window.router for navigation');
        window.router.navigate(`/repoName/${encodeURIComponent(repoName)}`);
    } else {
        console.warn('No router or navigateToRepoDetail function available, falling back to manual navigation');
        // Fallback: update URL manually and show detail view
        const newPath = `/repoName/${encodeURIComponent(repoName)}`;
        history.pushState({ repoName }, '', newPath);
        showRepoDetailView(repoName);
    }
}

function showRepoDetailView(repoName) {
    // Use the global function if available
    if (typeof showRepoDetailPage === 'function') {
        showRepoDetailPage(repoName);
    } else {
        console.error('showRepoDetailPage function not found');
        alert(`Repo detail view for: ${repoName}\n\nThis would navigate to /repoName/${repoName}`);
    }
}

// Initialize when called by router (not automatically)
// document.addEventListener('DOMContentLoaded', initRepoView);
