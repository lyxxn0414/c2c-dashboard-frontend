// HTML Template loader - loads templates from external files
const HTMLTemplates = {
    // Templates will be loaded from files
    jobsView: '',
    jobDetail: '',
    modals: '',
    reposView: ''
};

// Function to load HTML from file
async function loadTemplate(templateName, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${response.status}`);
        }
        const html = await response.text();
        HTMLTemplates[templateName] = html;
        console.log(`✅ ${templateName} template loaded from ${filePath}`);
        return html;
    } catch (error) {
        console.error(`❌ Failed to load ${templateName} template:`, error);
        return '';
    }
}

// Initialize page by loading templates from files
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Loading HTML templates from files...');
    
    try {        // Load all templates
        await Promise.all([
            loadTemplate('jobsView', '/partials/jobs-view.html'),
            loadTemplate('jobDetail', '/partials/job-detail.html'),
            loadTemplate('modals', '/partials/modals.html'),
            loadTemplate('reposView', '/partials/repos-view.html')
        ]);
        
        // Load templates into the page
        const jobsContent = document.getElementById('jobs-content');
        const jobDetailContent = document.getElementById('job-detail-content');
        const modalsContent = document.getElementById('modals-content');
        
        if (jobsContent && HTMLTemplates.jobsView) {
            jobsContent.innerHTML = HTMLTemplates.jobsView;
            console.log('✅ Jobs view template loaded');
        } else {
            console.error('❌ jobs-content element not found or template not loaded');
        }
        
        if (jobDetailContent && HTMLTemplates.jobDetail) {
            jobDetailContent.innerHTML = HTMLTemplates.jobDetail;
            console.log('✅ Job detail template loaded');
        } else {
            console.error('❌ job-detail-content element not found or template not loaded');
        }
          if (modalsContent && HTMLTemplates.modals) {
            modalsContent.innerHTML = HTMLTemplates.modals;
            console.log('✅ Modals template loaded');
        } else {
            console.error('❌ modals-content element not found or template not loaded');
        }

        const reposContent = document.getElementById('repos-content');
        if (reposContent && HTMLTemplates.reposView) {
            reposContent.innerHTML = HTMLTemplates.reposView;
            console.log('✅ Repos view template loaded');
        } else {
            console.error('❌ repos-content element not found or template not loaded');
        }
          // Initialize dashboard after templates are loaded
        setTimeout(() => {
            console.log('🔧 Initializing JobDashboard...');
            if (window.JobDashboard) {
                window.jobDashboard = new JobDashboard();
                console.log('✅ JobDashboard initialized');
            } else {
                console.error('❌ JobDashboard class not found');
            }

            // Setup navigation handlers
            document.getElementById('job-view').addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('jobs-content').style.display = 'block';
                document.getElementById('repos-content').style.display = 'none';
            });

            document.getElementById('repo-view').addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('jobs-content').style.display = 'none';
                document.getElementById('repos-content').style.display = 'block';
                // Initialize repo view
                if (!window.reposInitialized) {
                    window.reposInitialized = true;
                    initRepoView();
                }
            });
        }, 100);
        
    } catch (error) {
        console.error('❌ Error loading templates:', error);
    }
});

// Export for use in other scripts
window.HTMLTemplates = HTMLTemplates;

// Export for use in other scripts
window.HTMLTemplates = HTMLTemplates;
