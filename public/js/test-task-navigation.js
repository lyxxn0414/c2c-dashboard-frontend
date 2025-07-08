// Test Task Detail Navigation
// Open browser console and run these commands to test the navigation

console.log('🧪 Task Detail Navigation Tests');

// Test 1: Navigate to task detail from repo detail
function testRepoToTaskNavigation() {
    console.log('📝 Test 1: Repo → Task Detail Navigation');
    
    // First navigate to a repo detail
    if (window.router) {
        window.router.navigate('/repoName/azure-samples%2Fcontoso-chat');
        
        setTimeout(() => {
            // Then simulate clicking on a task ID
            const taskId = 'task-repo-01';
            const repoName = 'azure-samples/contoso-chat';
            
            console.log(`Navigating to task ${taskId} from repo ${repoName}`);
            window.navigateToTaskDetail(taskId, null, repoName);
        }, 1000);
    }
}

// Test 2: Navigate to task detail from job detail
function testJobToTaskNavigation() {
    console.log('📝 Test 2: Job → Task Detail Navigation');
    
    // First navigate to a job detail
    if (window.router) {
        window.router.navigate('/job-detail/job-sample');
        
        setTimeout(() => {
            // Then simulate clicking on "See more task details"
            const taskId = '123456';
            const jobId = 'job-sample';
            
            console.log(`Navigating to task ${taskId} from job ${jobId}`);
            window.navigateToTaskDetail(taskId, jobId);
        }, 1000);
    }
}

// Test 3: Test back navigation from task detail
function testBackNavigation() {
    console.log('📝 Test 3: Back Navigation from Task Detail');
    
    // Navigate to task detail with repo context
    if (window.router) {
        window.router.navigate('/task-detail/123456?repoName=azure-samples%2Fcontoso-chat');
        
        setTimeout(() => {
            // Check if back button text is correct
            const backButton = document.getElementById('back-to-job-btn');
            if (backButton) {
                console.log('Back button text:', backButton.textContent);
                console.log('Should say "Back to Repo"');
            }
        }, 1000);
    }
}

// Test 4: Direct task detail URL access
function testDirectAccess() {
    console.log('📝 Test 4: Direct Task Detail URL Access');
    
    // Test different URL patterns
    const testUrls = [
        '/task-detail/123456',
        '/task-detail/123456?jobId=job-sample',
        '/task-detail/123456?repoName=azure-samples%2Fcontoso-chat',
        '/task-detail/123456?jobId=job-sample&repoName=azure-samples%2Fcontoso-chat'
    ];
    
    testUrls.forEach((url, index) => {
        setTimeout(() => {
            console.log(`Testing URL: ${url}`);
            if (window.router) {
                window.router.navigate(url);
            }
        }, index * 2000);
    });
}

// Run all tests
function runAllTests() {
    console.log('🚀 Starting all navigation tests...');
    
    testRepoToTaskNavigation();
    
    setTimeout(() => testJobToTaskNavigation(), 3000);
    setTimeout(() => testBackNavigation(), 6000);
    setTimeout(() => testDirectAccess(), 9000);
    
    console.log('✅ All tests scheduled. Check console and UI for results.');
}

// Make functions available globally for manual testing
window.testTaskNavigation = {
    runAll: runAllTests,
    repoToTask: testRepoToTaskNavigation,
    jobToTask: testJobToTaskNavigation,
    backNav: testBackNavigation,
    directAccess: testDirectAccess
};

console.log('🔧 Test functions available:');
console.log('- window.testTaskNavigation.runAll() - Run all tests');
console.log('- window.testTaskNavigation.repoToTask() - Test repo → task navigation');
console.log('- window.testTaskNavigation.jobToTask() - Test job → task navigation');
console.log('- window.testTaskNavigation.backNav() - Test back navigation');
console.log('- window.testTaskNavigation.directAccess() - Test direct URL access');
