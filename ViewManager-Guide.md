# ViewManager Usage Guide

## Overview

The ViewManager utility eliminates repetitive DOM manipulation code for showing/hiding views. Instead of manually managing `getElementById`, `classList.add('d-none')`, `style.display`, and complex view switching logic, you can now use a clean, declarative approach.

## ✅ Benefits

1. **Dramatically Reduced Code**: Turn 20+ lines of DOM manipulation into 1-2 lines
2. **Centralized Configuration**: All view logic in one place
3. **Consistent Behavior**: Standardized show/hide animations and transitions
4. **Error Prevention**: No more missing elements or inconsistent states
5. **Easy Maintenance**: Add new views by just updating configuration
6. **Automatic Cleanup**: Handles modals, dropdowns, and transitions automatically
7. **Callback Support**: Run initialization code when views show/hide
8. **Flexible Selectors**: Support for IDs, classes, and complex CSS selectors

## 🚀 Quick Start

### Step 1: Basic View Switching

**Before (your current code):**
```javascript
const detailView = document.getElementById('job-detail-view');
const jobsView = document.getElementById('jobs-view');
const jobsContent = document.getElementById('jobs-content');
const reposContent = document.getElementById('repos-content');
const repoDetailView = document.getElementById('repo-detail-view');
const jobDetailContent = document.getElementById('job-detail-content');
const taskDetailView = document.getElementById('task-detail-view');

if (detailView) {
    detailView.classList.add('d-none');
    detailView.classList.remove('active');
}
if (jobDetailContent) {
    jobDetailContent.style.display = 'none';
}
if (jobsView) {
    jobsView.classList.add('d-none');
}
if (taskDetailView) {
    taskDetailView.classList.add('d-none');
}
if (jobsContent) {
    jobsContent.style.display = 'none';
}
if (reposContent) {
    reposContent.style.display = 'block';
}
```

**After (with ViewManager):**
```javascript
window.viewManager.showView('repos');
```

### Step 2: View Switching with Data

```javascript
// Show job detail with job data
window.viewManager.showView('job-detail', { 
    data: { jobId: 123, jobData: jobObject } 
});

// Show task detail 
window.viewManager.showView('task-detail', { 
    data: { taskId: 'task-456' } 
});
```

### Step 3: Using Global Helper Functions

```javascript
// Use the pre-configured helper functions
window.showJobsView();
window.showReposView();
window.showJobDetailView(jobData);
window.showRepoDetailView('repo-name');
window.showTaskDetailView('task-123');
window.showErrorCenterView();
```

## 📋 Configuration Examples

### Adding a New View

```javascript
window.viewManager.registerView('new-view', {
    show: ['new-view-container', 'new-view-sidebar'],
    hide: ['other-view', '.old-content'],
    css: {
        'new-view-container': { display: 'flex' },
        '.sidebar': { width: '250px' }
    },
    onShow: async (data) => {
        console.log('New view shown with data:', data);
        // Initialize view-specific components
    },
    onHide: async () => {
        // Cleanup when view is hidden
    }
});
```

### Complex View with Multiple Elements

```javascript
window.viewManager.registerView('complex-dashboard', {
    show: [
        'main-dashboard',
        'dashboard-sidebar', 
        'dashboard-toolbar',
        '.metric-cards',
        '#chart-container'
    ],
    hide: [
        'other-views',
        '.temporary-overlays'
    ],
    css: {
        'main-dashboard': { display: 'grid' },
        '.metric-cards': { opacity: '1' }
    },
    addTransition: true,
    onShow: async (data) => {
        // Load dashboard data
        await loadDashboardData(data);
        // Initialize charts
        initializeCharts();
    }
});
```

## 🔧 Advanced Usage

### Batch Operations

```javascript
// Show multiple views at once
await window.viewManager.showMultipleViews(['sidebar', 'toolbar', 'content']);

// Hide multiple views
await window.viewManager.hideMultipleViews(['modal', 'overlay', 'popup']);

// Switch views with explicit control
await window.viewManager.switchViews('target-view', ['old-view1', 'old-view2']);
```

### Conditional View Logic

```javascript
// Check current view
if (window.viewManager.isViewVisible('jobs')) {
    console.log('Jobs view is currently visible');
}

// Get current view name
const currentView = window.viewManager.getCurrentView();
console.log('Current view:', currentView);

// Get all available views
const allViews = window.viewManager.getViewNames();
console.log('Available views:', allViews);
```

### Direct Element Manipulation

```javascript
// Show specific elements with transition
window.viewManager.showElements(['#modal', '.overlay'], true);

// Hide specific elements
window.viewManager.hideElements(['.temporary', '#popup']);

// Toggle elements
window.viewManager.toggleElements(['#sidebar'], true, true); // show with transition
```

## 🎯 Migration Strategy

### 1. Identify View Methods
Look for methods like:
- `showJobsView()`
- `showJobDetailView()`
- `showReposView()`
- Any method with multiple `getElementById` and `classList` calls

### 2. Replace Step by Step

**Original Method:**
```javascript
showCustomView() {
    // 15-20 lines of DOM manipulation
    const elem1 = document.getElementById('elem1');
    if (elem1) elem1.classList.add('d-none');
    // ... more repetitive code
}
```

**Migrated Method:**
```javascript
showCustomView() {
    if (window.viewManager) {
        window.viewManager.showView('custom');
        this.updateURL('/custom');
        this.updateNavigationState('custom');
    } else {
        // Keep original as fallback
        this.showCustomViewFallback();
    }
}

// Keep original method as fallback
showCustomViewFallback() {
    // Original 15-20 lines here
}
```

### 3. Update Configuration
Add your view to `view-config.js`:

```javascript
window.viewManager.registerView('custom', {
    show: ['custom-container'],
    hide: ['other-views'],
    onShow: async () => {
        // Any initialization code
    }
});
```

## 🔍 Real Examples from Your Code

### Example 1: Error Center View
**Before:**
```javascript
showErrorCenterView() {
    console.log('Showing Error Center view');
    this.updateURL('/error-center');
    
    const detailView = document.getElementById('job-detail-view');
    const jobsView = document.getElementById('jobs-view');
    const jobsContent = document.getElementById('jobs-content');
    const reposContent = document.getElementById('repos-content');
    const repoDetailView = document.getElementById('repo-detail-view');
    const jobDetailContent = document.getElementById('job-detail-content');
    const taskDetailView = document.getElementById('task-detail-view');
    const errorCenterContent = document.getElementById('error-center-content');
    
    if (detailView) {
        detailView.classList.add('d-none');
        detailView.classList.remove('active');
    }
    if (jobDetailContent) {
        jobDetailContent.style.display = 'none';
    }
    // ... 10 more similar blocks
}
```

**After:**
```javascript
showErrorCenterView() {
    window.viewManager.showView('error-center');
    this.updateURL('/error-center');
    this.updateNavigationState('error-center');
}
```

### Example 2: Repo Detail Navigation
**Before:**
```javascript
function showRepoDetailPage(repoName) {
    console.log('Showing repo detail page for:', repoName);
    
    const jobsContent = document.getElementById('jobs-content');
    const reposContent = document.getElementById('repos-content');
    const jobDetailView = document.getElementById('job-detail-view');
    
    if (jobsContent) jobsContent.style.display = 'none';
    if (reposContent) reposContent.style.display = 'none';
    if (jobDetailView) jobDetailView.classList.add('d-none');
    
    const repoDetailView = document.getElementById('repo-detail-view');
    if (repoDetailView) {
        repoDetailView.classList.remove('d-none');
        repoDetailView.classList.add('repo-detail-transition');
        
        initRepoDetailView(repoName);
        
        setTimeout(() => {
            repoDetailView.classList.add('active');
        }, 10);
    }
}
```

**After:**
```javascript
function showRepoDetailPage(repoName) {
    window.viewManager.showView('repo-detail', { 
        data: { repoName } 
    });
}
```

## 🎨 CSS Transitions

The ViewManager automatically handles transition classes:

```css
/* These classes are automatically applied */
.view-transition {
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.4s ease;
}

.view-transition.active {
    opacity: 1;
    transform: translateY(0);
}
```

## 🛠️ Best Practices

1. **Use Descriptive View Names**: `'job-detail'` instead of `'view1'`
2. **Keep Initialization in onShow**: Don't initialize until the view is visible
3. **Clean Up in onHide**: Remove event listeners, stop timers, etc.
4. **Use CSS for Styling**: Prefer CSS configuration over manual style changes
5. **Test Fallbacks**: Always provide fallback methods for critical functionality
6. **Group Related Elements**: Put related elements in the same view configuration

## 🔧 Troubleshooting

### ViewManager Not Found
```javascript
if (!window.viewManager) {
    console.error('ViewManager not found! Check script loading order.');
    return;
}
```

### Element Not Found
```javascript
// ViewManager will log warnings for missing elements
// Check browser console for detailed information
```

### View Not Switching
```javascript
// Check if view is registered
console.log('Available views:', window.viewManager.getViewNames());

// Check current view
console.log('Current view:', window.viewManager.getCurrentView());
```

This approach will make your code much cleaner, more maintainable, and easier to extend!
