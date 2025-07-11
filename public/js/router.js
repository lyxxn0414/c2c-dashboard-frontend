// Debug function to check router status
window.checkRouter = function() {
    console.log('Router status:', {
        routerExists: !!window.router,
        currentRoute: window.router ? window.router.currentRoute : 'No router',
        location: window.location.pathname
    });
};

// Global navigation functions
window.navigateToRepos = function() {
    if (window.router) {
        window.router.navigate('/repos');
    }
};

window.navigateToJobs = function() {
    if (window.router) {
        window.router.navigate('/jobs');
    }
};

window.navigateToJobDetail = function(jobId) {
    if (window.router) {
        window.router.navigate(`/job-detail/${jobId}`);
    }
};

window.navigateToRepoDetail = function(repoName) {
    if (window.router) {
        window.router.navigate(`/repoName/${repoName}`);
    }
};

// Test navigation function
window.testNavigation = function() {
    console.log('Testing navigation...');
    console.log('Current elements:');
    console.log('- jobs-content:', document.getElementById('jobs-content'));
    console.log('- repos-content:', document.getElementById('repos-content'));
    console.log('- router:', window.router);
    
    if (window.router) {
        console.log('Attempting to navigate to repos...');
        window.router.navigate('/repos');
    } else {
        console.error('Router not available');
    }
};

// Router for handling page navigation
class Router {
    constructor() {
        this.routes = {
            '/': 'jobs',
            '/jobs': 'jobs',
            '/repos': 'repos',
            '/job-detail': 'job-detail',
            '/repo-detail': 'repoName',
            '/task-detail': 'task-detail'
        };
        
        this.currentRoute = '/';
        this.init();
    }

    init() {
        // Handle initial page load
        this.handleRoute();
        
        // Listen for browser back/forward buttons
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });
    }

    handleRoute() {
        const path = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        console.log('Handling route:', path);
        
        // Handle dynamic routes
        if (path.startsWith('/repoName/')) {
            const repoName = path.split('/repoName/')[1];
            if (repoName) {
                this.currentRoute = path;
                this.showRepoDetailPage(repoName);
                this.updateNavigation();
                return;
            }
        }
        
        if (path.startsWith('/job-detail/')) {
            const jobId = path.split('/job-detail/jobID=')[1];
            if (jobId) {
                this.currentRoute = path;
                this.showJobDetailPage(jobId);
                this.updateNavigation();
                return;
            }
        }
          if (path.startsWith('/task-detail/')) {
            const taskId = path.split('/task-detail/')[1];
            if (taskId) {
                this.currentRoute = path;
                this.showTaskDetailPage(taskId);
                this.updateNavigation();
                return;
            }
        }
        
        // Handle static routes
        const route = this.routes[path] || this.routes['/'];
        this.currentRoute = path;
        this.showPage(route);
        this.updateNavigation();
    }    showPage(pageName) {
        console.log('Showing page:', pageName);
          // Hide all pages
        const pages = ['jobs-content', 'repos-content', 'job-detail-content', 'task-detail-content'];
        pages.forEach(pageId => {
            const element = document.getElementById(pageId);
            if (element) {
                element.style.display = 'none';
                console.log('Hiding:', pageId);
            }
        });
        
        // Hide all detail views
        const detailViews = ['job-detail-view', 'repo-detail-view', 'task-detail-view'];
        detailViews.forEach(viewId => {
            const element = document.getElementById(viewId);
            if (element) {
                element.classList.add('d-none');
            }
        });

        // Show the requested page
        const targetPage = document.getElementById(`${pageName}-content`);
        console.log('Target page:', targetPage);
        if (targetPage) {
            targetPage.style.display = 'block';
            console.log('Showing:', `${pageName}-content`);
            
            // Initialize page-specific functionality
            if (pageName === 'repos' && !window.reposInitialized) {
                console.log('Initializing repo view');
                window.reposInitialized = true;
                // Wait for repos.js to be loaded
                setTimeout(() => {
                    if (typeof initRepoView === 'function') {
                        console.log('Calling initRepoView');
                        initRepoView();
                    } else {
                        console.error('initRepoView function not found');
                    }
                }, 200);
            }
        } else {
            console.error('Target page not found:', `${pageName}-content`);
        }
    }

    showRepoDetailPage(repoName) {
        console.log('Router: Showing repo detail page for:', repoName);
          // Hide all standard pages
        const pages = ['jobs-content', 'repos-content', 'job-detail-content'];
        pages.forEach(pageId => {
            const element = document.getElementById(pageId);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Hide all detail views
        const detailViews = ['task-detail-view'];
        detailViews.forEach(viewId => {
            const element = document.getElementById(viewId);
            if (element) {
                element.classList.add('d-none');
            }
        });

        // Show repo detail page if function exists
        if (typeof showRepoDetailPage === 'function') {
            showRepoDetailPage(repoName);
        } else {
            console.error('showRepoDetailPage function not found');
        }
    }

    showJobDetailPage(jobId) {
        console.log('Router: Showing job detail page for:', jobId);
          // Hide all standard pages
        const pages = ['jobs-content', 'repos-content', 'repo-detail-content'];
        pages.forEach(pageId => {
            const element = document.getElementById(pageId);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Hide all detail views
        const detailViews = ['task-detail-view'];
        detailViews.forEach(viewId => {
            const element = document.getElementById(viewId);
            if (element) {
                element.classList.add('d-none');
            }
        });

        // Show job detail page if function exists
        if (typeof window.jobDashboard.viewJob === 'function') {
            console.log('Calling window.jobDashboard.viewJob with:', jobId);
            window.jobDashboard.viewJob(jobId);
        } else {
            console.error('showJobDetail function not found');
        }
    }    
    showTaskDetailPage(taskId) {
        console.log('Router: Showing task detail page for:', taskId);
        
        // Hide all standard pages
        const pages = ['jobs-content', 'repos-content', 'job-detail-content', 'repo-detail-content'];
        pages.forEach(pageId => {
            const element = document.getElementById(pageId);
            if (element) {
                element.style.display = 'none';
                console.log('Hiding page:', pageId);
            }
        });

        // Hide all detail views
        const detailViews = ['job-detail-view', 'repo-detail-view'];
        detailViews.forEach(viewId => {
            const element = document.getElementById(viewId);
            if (element) {
                element.classList.add('d-none');
                console.log('Hiding detail view:', viewId);
            }
        });        // Show task detail view
        const taskDetailView = document.getElementById('task-detail-view');
        console.log('Task detail view element:', taskDetailView);
        
        if (taskDetailView) {            
            taskDetailView.classList.remove('d-none');
            
            // Initialize taskDetail instance if not exists
            if (!window.taskDetail) {
                console.log('Creating new TaskDetail instance');
                window.taskDetail = new window.TaskDetail();
            }
            
            // Load task detail
            if (window.taskDetail && typeof window.taskDetail.loadTaskDetail === 'function') {
                console.log('Calling window.taskDetail.loadTaskDetail with:', taskId);
                window.taskDetail.loadTaskDetail(taskId);
            } else if (typeof window.loadTaskDetail === 'function') {
                console.log('Calling global loadTaskDetail with:', taskId);
                window.loadTaskDetail(taskId);
            } else {
                console.error('TaskDetail instance or loadTaskDetail method not found');
                console.log('window.taskDetail:', window.taskDetail);
                console.log('window.TaskDetail:', window.TaskDetail);
                
                // Try to create TaskDetail instance if class exists
                if (window.TaskDetail) {
                    console.log('TaskDetail class found, creating instance...');
                    window.taskDetail = new window.TaskDetail();
                    if (typeof window.taskDetail.loadTaskDetail === 'function') {
                        window.taskDetail.loadTaskDetail(taskId);
                    }
                } else {
                    console.error('TaskDetail class not found - ensure task-detail.js is loaded');
                }
            }
        } else {
            console.error('task-detail-view element not found');
            // Let's check what elements are available
            console.log('Available elements with "task" in ID:', 
                Array.from(document.querySelectorAll('[id*="task"]')).map(el => el.id));
        }
    }

    updateNavigation() {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Set active based on current route
        if (this.currentRoute === '/' || this.currentRoute === '/jobs') {
            document.getElementById('job-view')?.classList.add('active');
        } else if (this.currentRoute === '/repos') {
            document.getElementById('repo-view')?.classList.add('active');
        }else if (this.currentRoute.startsWith('/job-detail/')) {
            document.getElementById('job-detail-view')?.classList.add('active');
        } else if (this.currentRoute.startsWith('/repoName/')) {
            document.getElementById('repo-detail-view')?.classList.add('active');
        } else if (this.currentRoute.startsWith('/task-detail/')) {
            document.getElementById('task-detail-view')?.classList.add('active');
        }
    }    
    navigate(path) {
        console.log('Navigating to:', path, 'from:', this.currentRoute);
        history.pushState({}, '', path);
        this.handleRoute();
    }

    back() {
        history.back();
    }

    forward() {
        history.forward();
    }
}

// Initialize router when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for templates to be loaded before initializing router
    setTimeout(() => {
        window.router = new Router();
        console.log('✅ Router initialized');
        
        // Notify that router is ready
        window.dispatchEvent(new CustomEvent('routerReady'));
    }, 500);
});
