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
            '/job-detail': 'job-detail'
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
            const jobId = path.split('/job-detail/')[1];
            if (jobId) {
                this.currentRoute = path;
                this.showJobDetailPage(jobId);
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
        const pages = ['jobs-content', 'repos-content', 'job-detail-content'];
        pages.forEach(pageId => {
            const element = document.getElementById(pageId);
            if (element) {
                element.style.display = 'none';
                console.log('Hiding:', pageId);
            }
        });

        // Hide repo detail view if it exists
        const repoDetailView = document.getElementById('repo-detail-view');
        if (repoDetailView) {
            repoDetailView.classList.add('d-none');
        }

        // Show the requested page
        const targetPage = document.getElementById(`${pageName}-content`);
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
        const pages = ['jobs-content', 'repos-content'];
        pages.forEach(pageId => {
            const element = document.getElementById(pageId);
            if (element) {
                element.style.display = 'none';
            }
        });

        // Hide repo detail view if it exists
        const repoDetailView = document.getElementById('repo-detail-view');
        if (repoDetailView) {
            repoDetailView.classList.add('d-none');
        }

        // Show job detail page if function exists
        if (typeof showJobDetail === 'function') {
            showJobDetail(jobId);
        } else {
            console.error('showJobDetail function not found');
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
        }
    }    navigate(path) {
        console.log('Navigating to:', path, 'from:', this.currentRoute);
        if (path !== this.currentRoute) {
            history.pushState({}, '', path);
            this.handleRoute();
        }
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
