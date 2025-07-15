/**
 * View Configuration for the Dashboard Application
 * This file configures all views using the ViewManager utility
 */

// Wait for DOM and ViewManager to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure ViewManager is loaded
    setTimeout(() => {
        setupViewConfiguration();
    }, 100);
});

function setupViewConfiguration() {
    if (!window.viewManager) {
        console.error('ViewManager not found! Make sure view-manager.js is loaded first.');
        return;
    }

    // Configure all application views
    window.viewManager.registerViews({
        // Jobs List View
        'jobs': {
            show: ['jobs-view', 'jobs-content'],
            hide: ['job-detail-view', 'repos-content', 'repo-detail-view', 'task-detail-view', 'error-center-content'],
            css: {
                'jobs-content': { display: 'block' }
            },
            onShow: async () => {
                console.log('Jobs view shown');
                // Reinitialize job dropdowns when view becomes visible
                if (window.jobDashboard && window.jobDashboard.initializeJobDropdowns) {
                    window.jobDashboard.initializeJobDropdowns();
                }
            },
            onHide: async () => {
                console.log('Jobs view hidden');
            }
        },

        // Job Detail View
        'job-detail': {
            show: ['job-detail-view', 'job-detail-content'],
            hide: ['jobs-view', 'repos-content', 'repo-detail-view', 'task-detail-view', 'error-center-content'],
            css: {
                'job-detail-content': { display: 'block' }
            },
            addTransition: true,
            onShow: async (data) => {
                console.log('Job detail view shown', data);
                // Additional job detail initialization if needed
            },
            onHide: async () => {
                console.log('Job detail view hidden');
            }
        },

        // Repos List View
        'repos': {
            show: ['repos-content'],
            hide: ['job-detail-view', 'jobs-view', 'jobs-content', 'repo-detail-view', 'job-detail-content', 'task-detail-view', 'error-center-content'],
            css: {
                'repos-content': { display: 'block' }
            },
            onShow: async () => {
                console.log('Repos view shown');
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
            },
            onHide: async () => {
                console.log('Repos view hidden');
            }
        },

        // Repo Detail View
        'repo-detail': {
            show: ['repo-detail-view'],
            hide: ['job-detail-view', 'jobs-view', 'jobs-content', 'repos-content', 'task-detail-view', 'error-center-content'],
            addTransition: true,
            onShow: async (data) => {
                console.log('Repo detail view shown', data);
                // Initialize repo detail if needed
                if (data && data.repoName && typeof initRepoDetailView === 'function') {
                    initRepoDetailView(data.repoName);
                }
            },
            onHide: async () => {
                console.log('Repo detail view hidden');
            }
        },

        // Task Detail View
        'task-detail': {
            show: ['task-detail-view'],
            hide: ['job-detail-view', 'jobs-view', 'jobs-content', 'repos-content', 'repo-detail-view', 'error-center-content'],
            addTransition: true,
            onShow: async (data) => {
                console.log('Task detail view shown', data);
                // Initialize task detail if needed
                if (window.taskDetail && data && data.taskId) {
                    await window.taskDetail.loadTaskDetail(data.taskId);
                }
            },
            onHide: async () => {
                console.log('Task detail view hidden');
            }
        },

        // Error Center View
        'error-center': {
            show: ['error-center-content'],
            hide: ['job-detail-view', 'jobs-view', 'jobs-content', 'repos-content', 'repo-detail-view', 'job-detail-content', 'task-detail-view'],
            css: {
                'error-center-content': { display: 'block' }
            },
            onShow: async () => {
                console.log('Error center view shown');
                // Initialize Error Center if not already done
                if (!window.errorCenterInitialized) {
                    window.errorCenterInitialized = true;
                    setTimeout(() => {
                        if (typeof initErrorCenter === 'function') {
                            console.log('Initializing Error Center');
                            initErrorCenter();
                        } else {
                            console.error('initErrorCenter function not found');
                        }
                    }, 100);
                }
            },
            onHide: async () => {
                console.log('Error center view hidden');
            }
        },

        // Loading state view (can be used to show loading screens)
        'loading': {
            show: ['loading-indicator'],
            hide: [],
            css: {
                'loading-indicator': { display: 'block' }
            },
            addTransition: false
        }
    });

    console.log('✅ View configuration completed. Available views:', window.viewManager.getViewNames());
}

/**
 * Convenience functions for common view operations
 */

// Navigation helper functions
window.showJobsView = () => {
    window.viewManager.showView('jobs');
    updateURL('/');
    updateNavigationState('jobs');
};

window.showJobDetailView = (jobData) => {
    window.viewManager.showView('job-detail', { data: jobData });
    updateNavigationState('jobs');
};

window.showReposView = () => {
    window.viewManager.showView('repos');
    updateURL('/repos');
    updateNavigationState('repos');
};

window.showRepoDetailView = (repoName) => {
    window.viewManager.showView('repo-detail', { data: { repoName } });
    updateNavigationState('repos');
};

window.showTaskDetailView = (taskId) => {
    window.viewManager.showView('task-detail', { data: { taskId } });
    // Task detail doesn't have a specific nav item, keep current nav state
};

window.showErrorCenterView = () => {
    window.viewManager.showView('error-center');
    updateURL('/error-center');
    updateNavigationState('error-center');
};

// Utility functions
function updateURL(path) {
    if (window.history && window.history.pushState) {
        window.history.pushState(null, '', path);
    }
}

function updateNavigationState(activeView) {
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to current view
    const navMap = {
        'jobs': 'job-view',
        'repos': 'repo-view', 
        'error-center': 'error-center-view-nav'
    };
    
    const navId = navMap[activeView];
    if (navId) {
        const navElement = document.getElementById(navId);
        if (navElement) {
            navElement.classList.add('active');
        }
    }
}

// Export for use in other scripts
window.viewConfig = {
    setupViewConfiguration,
    updateURL,
    updateNavigationState
};
