/**
 * ViewManager - A centralized utility for managing view visibility and navigation
 * Eliminates repetitive DOM manipulation code for showing/hiding views
 */
class ViewManager {
    constructor() {
        this.views = new Map();
        this.currentView = null;
        this.globalHideSelectors = [
            // Default elements that should be hidden when switching views
            '.view-transition',
            '.modal.show',
            '.dropdown-menu.show'
        ];
    }

    /**
     * Register a view with its configuration
     * @param {string} name - Unique view name
     * @param {Object} config - View configuration
     * @param {string|Array} config.show - Element ID(s) or selector(s) to show
     * @param {string|Array} config.hide - Element ID(s) or selector(s) to hide  
     * @param {Function} config.onShow - Callback when view is shown
     * @param {Function} config.onHide - Callback when view is hidden
     * @param {Object} config.css - CSS modifications to apply
     * @param {boolean} config.addTransition - Whether to add transition effects
     */
    registerView(name, config) {
        this.views.set(name, {
            show: this.normalizeSelectors(config.show || []),
            hide: this.normalizeSelectors(config.hide || []),
            onShow: config.onShow || null,
            onHide: config.onHide || null,
            css: config.css || {},
            addTransition: config.addTransition !== false, // Default to true
            ...config
        });
    }

    /**
     * Register multiple views at once
     * @param {Object} viewsConfig - Object with view names as keys and configs as values
     */
    registerViews(viewsConfig) {
        Object.entries(viewsConfig).forEach(([name, config]) => {
            this.registerView(name, config);
        });
    }

    /**
     * Show a specific view and hide others
     * @param {string} viewName - Name of the view to show
     * @param {Object} options - Additional options
     * @param {boolean} options.preserveOthers - Don't auto-hide other views
     * @param {Object} options.data - Data to pass to the view callbacks
     */
    async showView(viewName, options = {}) {
        const config = this.views.get(viewName);
        if (!config) {
            console.warn(`View '${viewName}' not found. Available views:`, Array.from(this.views.keys()));
            return false;
        }

        console.log(`🔄 Switching to view: ${viewName}`);

        // Hide current view if exists
        if (this.currentView && this.currentView !== viewName && !options.preserveOthers) {
            await this.hideView(this.currentView);
        }

        // Global cleanup (close modals, dropdowns, etc.)
        this.performGlobalCleanup();

        // Hide specified elements for this view
        this.hideElements(config.hide);

        // Apply CSS modifications
        this.applyCssChanges(config.css);

        // Show the view elements
        this.showElements(config.show, config.addTransition);

        // Execute onShow callback
        if (config.onShow) {
            try {
                await config.onShow(options.data);
            } catch (error) {
                console.error(`Error in onShow callback for view '${viewName}':`, error);
            }
        }

        this.currentView = viewName;
        console.log(`✅ View switched to: ${viewName}`);
        return true;
    }

    /**
     * Hide a specific view
     * @param {string} viewName - Name of the view to hide
     */
    async hideView(viewName) {
        const config = this.views.get(viewName);
        if (!config) return;

        // Execute onHide callback
        if (config.onHide) {
            try {
                await config.onHide();
            } catch (error) {
                console.error(`Error in onHide callback for view '${viewName}':`, error);
            }
        }

        // Hide the view elements
        this.hideElements(config.show);
    }

    /**
     * Toggle visibility of elements with multiple methods
     * @param {Array} selectors - Array of selectors/IDs
     * @param {boolean} show - Whether to show or hide
     * @param {boolean} addTransition - Whether to add transition effects
     */
    toggleElements(selectors, show, addTransition = false) {
        if (show) {
            this.showElements(selectors, addTransition);
        } else {
            this.hideElements(selectors);
        }
    }

    /**
     * Show elements with various visibility methods
     * @param {Array} selectors - Array of selectors/IDs
     * @param {boolean} addTransition - Whether to add transition effects
     */
    showElements(selectors, addTransition = false) {
        selectors.forEach(selector => {
            const elements = this.getElements(selector);
            elements.forEach(element => {
                // Remove Bootstrap d-none class
                element.classList.remove('d-none');
                
                // Set display style
                element.style.display = this.getDefaultDisplay(element);
                
                // Add transition effects if requested
                if (addTransition) {
                    element.classList.add('view-transition');
                    
                    // Trigger transition after a brief delay
                    setTimeout(() => {
                        element.classList.add('active');
                    }, 10);
                }
            });
        });
    }

    /**
     * Hide elements with various methods
     * @param {Array} selectors - Array of selectors/IDs
     */
    hideElements(selectors) {
        selectors.forEach(selector => {
            const elements = this.getElements(selector);
            elements.forEach(element => {
                // Add Bootstrap d-none class
                element.classList.add('d-none');
                
                // Remove active transition class
                element.classList.remove('active');
                
                // Set display none
                element.style.display = 'none';
            });
        });
    }

    /**
     * Apply CSS changes to elements
     * @param {Object} cssConfig - CSS configuration object
     */
    applyCssChanges(cssConfig) {
        Object.entries(cssConfig).forEach(([selector, styles]) => {
            const elements = this.getElements(selector);
            elements.forEach(element => {
                Object.assign(element.style, styles);
            });
        });
    }

    /**
     * Get elements by selector or ID
     * @param {string} selector - CSS selector or element ID
     * @returns {Array} Array of DOM elements
     */
    getElements(selector) {
        // If it looks like an ID (no special characters), try getElementById first
        if (/^[a-zA-Z][\w-]*$/.test(selector)) {
            const byId = document.getElementById(selector);
            if (byId) return [byId];
        }
        
        // Fallback to querySelectorAll
        return Array.from(document.querySelectorAll(selector));
    }

    /**
     * Get the default display value for an element
     * @param {Element} element - DOM element
     * @returns {string} Default display value
     */
    getDefaultDisplay(element) {
        const tagDefaults = {
            'div': 'block',
            'span': 'inline',
            'table': 'table',
            'tr': 'table-row',
            'td': 'table-cell',
            'th': 'table-cell',
            'ul': 'block',
            'ol': 'block',
            'li': 'list-item'
        };
        
        return tagDefaults[element.tagName.toLowerCase()] || 'block';
    }

    /**
     * Normalize selectors to array format
     * @param {string|Array} selectors - Selectors to normalize
     * @returns {Array} Array of selectors
     */
    normalizeSelectors(selectors) {
        if (typeof selectors === 'string') {
            return [selectors];
        }
        return Array.isArray(selectors) ? selectors : [];
    }

    /**
     * Perform global cleanup (close modals, dropdowns, etc.)
     */
    performGlobalCleanup() {
        // Close Bootstrap modals
        document.querySelectorAll('.modal.show').forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });

        // Close dropdowns
        document.querySelectorAll('.dropdown-menu.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });

        // Remove any temporary classes
        document.querySelectorAll('.view-transition.active').forEach(element => {
            element.classList.remove('active');
        });
    }

    /**
     * Get the currently active view
     * @returns {string|null} Current view name
     */
    getCurrentView() {
        return this.currentView;
    }

    /**
     * Check if a view is currently visible
     * @param {string} viewName - View name to check
     * @returns {boolean} Whether the view is visible
     */
    isViewVisible(viewName) {
        return this.currentView === viewName;
    }

    /**
     * Get all registered view names
     * @returns {Array} Array of view names
     */
    getViewNames() {
        return Array.from(this.views.keys());
    }

    /**
     * Batch operation: show multiple views
     * @param {Array} viewNames - Array of view names to show
     */
    async showMultipleViews(viewNames) {
        for (const viewName of viewNames) {
            await this.showView(viewName, { preserveOthers: true });
        }
    }

    /**
     * Batch operation: hide multiple views
     * @param {Array} viewNames - Array of view names to hide
     */
    async hideMultipleViews(viewNames) {
        for (const viewName of viewNames) {
            await this.hideView(viewName);
        }
    }

    /**
     * Utility method for common view switching pattern
     * @param {string} showView - View to show
     * @param {Array} hideViews - Views to hide
     */
    async switchViews(showView, hideViews = []) {
        // Hide specified views
        await this.hideMultipleViews(hideViews);
        
        // Show the target view
        await this.showView(showView);
    }
}

// Create global instance
window.viewManager = new ViewManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViewManager;
}
