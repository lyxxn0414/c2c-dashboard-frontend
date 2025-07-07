// Repo view specific functionality
let reposData = [];
let currentFilters = {
    repoName: '',
    repoType: 'all',
    language: 'all'
};

function initRepoView() {
    loadRepos();
    setupRepoEventListeners();
}

function setupRepoEventListeners() {
    // Search input
    document.getElementById('repoNameFilter').addEventListener('input', (e) => {
        currentFilters.repoName = e.target.value.toLowerCase();
        filterRepos();
    });

    // Repo type filter dropdown
    document.addEventListener('click', (e) => {
        if (e.target.closest('#repo-type-dropdown .dropdown-item')) {
            e.preventDefault();
            const filter = e.target.getAttribute('data-filter');
            currentFilters.repoType = filter;
            updateDropdownButton('repo-type-filter', 'RepoType', filter);
            filterRepos();
        }
        
        if (e.target.closest('#language-dropdown .dropdown-item')) {
            e.preventDefault();
            const filter = e.target.getAttribute('data-filter');
            currentFilters.language = filter;
            updateDropdownButton('language-filter', 'Language', filter);
            filterRepos();
        }
    });
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
        document.getElementById('repos-loading-indicator').classList.remove('d-none');
        
        const response = await fetch('/api/repos');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        reposData = await response.json();
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
            <td>${createSuccessRateBadge(repo.successRate)}</td>
        `;

        tbody.appendChild(tr);
    });

    // Bind repo name click events
    document.querySelectorAll('.repo-name-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const repoName = e.target.dataset.repoName;
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
        window.navigateToRepoDetail(repoName);
    } else if (window.router) {
        window.router.navigate(`/repoName/${encodeURIComponent(repoName)}`);
    } else {
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
