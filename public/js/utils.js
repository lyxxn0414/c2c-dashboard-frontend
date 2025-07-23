function closeDropdown(buttonId, dropdownId) {
  try {
    if (typeof bootstrap !== "undefined") {
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
        dropdownMenu.classList.remove("show");
      }
    }
  } catch (error) {
    console.error("Error closing dropdown:", error);
    // Fallback: just remove show class
    const dropdownMenu = document.getElementById(dropdownId);
    if (dropdownMenu) {
      dropdownMenu.classList.remove("show");
    }
  }
}

/**
 * Generic cleanup function for dropdown listeners
 * @param {Array} buttonIds - Array of button IDs to cleanup
 */
function cleanupDropdownListeners(buttonIds) {
  console.log("Cleaning up existing dropdown listeners...");

  buttonIds.forEach((buttonId) => {
    const button = document.getElementById(buttonId);
    if (button && button._manualListenerAdded) {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      console.log(`Cleaned up listeners for ${buttonId}`);
    }
  });
}

/**
 * Advanced Dropdown Manager Class
 * Handles initialization, filtering, and management of dropdown components
 */
class DropdownManager {
  constructor() {
    this.dropdowns = new Map();
    this.isGlobalHandlerSetup = false;
  }

  /**
   * Register a dropdown configuration
   * @param {string} id - Unique identifier for the dropdown
   * @param {Object} config - Dropdown configuration
   */
  register(id, config) {
    const defaultConfig = {
      buttonId: null,
      dropdownId: null,
      filterType: "select", // 'select', 'multi-select', 'search'
      placeholder: "Select option",
      data: [],
      onSelect: null,
      onFilter: null,
      searchable: false,
      clearable: true,
      maxSelections: null,
    };

    this.dropdowns.set(id, { ...defaultConfig, ...config });
    console.log(`Dropdown registered: ${id}`);
  }
  /**
   * Initialize a specific dropdown
   * @param {string} id - Dropdown identifier
   */
  init(id) {
    console.log(`Initializing dropdown: ${id}`);

    const config = this.dropdowns.get(id);
    if (!config) {
      console.warn(`Dropdown configuration not found: ${id}`);
      return;
    }

    console.log(`Configuration found for ${id}:`, config);

    const button = document.getElementById(config.buttonId);
    const dropdown = document.getElementById(config.dropdownId);

    console.log(`Button element for ${config.buttonId}:`, button);
    console.log(`Dropdown element for ${config.dropdownId}:`, dropdown);

    if (!button || !dropdown) {
      console.warn(`Dropdown elements not found for: ${id}`);
      console.warn(
        `Missing button: ${!button}, Missing dropdown: ${!dropdown}`
      );
      return;
    }

    // Clean up existing listeners
    this.cleanup(id);

    // Setup Bootstrap or manual dropdown
    this.setupDropdown(id, button, dropdown, config);

    // Setup global click handler if not done
    if (!this.isGlobalHandlerSetup) {
      this.setupGlobalClickHandler();
      this.isGlobalHandlerSetup = true;
    }

    console.log(`Dropdown initialized successfully: ${id}`);
  }

  /**
   * Initialize all registered dropdowns
   */
  initAll() {
    this.dropdowns.forEach((config, id) => {
      this.init(id);
    });
  }
  /**
   * Setup dropdown with Bootstrap or manual fallback
   */
  setupDropdown(id, button, dropdown, config) {
    try {
      // Dispose existing Bootstrap instance
      if (typeof bootstrap !== "undefined") {
        const existingInstance = bootstrap.Dropdown.getInstance(button);
        if (existingInstance) {
          existingInstance.dispose();
          console.log(`Disposed existing Bootstrap dropdown for ${id}`);
        }
      }

      // Remove Bootstrap dropdown attributes to prevent auto-initialization
      button.removeAttribute("data-bs-toggle");
      button.removeAttribute("data-toggle");
      button.removeAttribute("aria-expanded");
      console.log(`Removed Bootstrap attributes from ${id}`);

      // Setup manual dropdown for better control
      this.setupManualDropdown(id, button, dropdown, config);
    } catch (error) {
      console.error(`Error setting up dropdown ${id}:`, error);
      this.setupManualDropdown(id, button, dropdown, config);
    }
  }

  /**
   * Setup manual dropdown implementation
   */
  setupManualDropdown(id, button, dropdown, config) {
    // Prevent duplicate listeners
    if (button._dropdownManagerId === id) {
      console.log(`Manual dropdown already setup for: ${id}`);
      return;
    }
    const clickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();

      console.log(`Dropdown ${id} button clicked`);

      // Close other dropdowns first
      this.closeAll(id);

      // Toggle current dropdown
      const isCurrentlyVisible = dropdown.classList.contains("show");

      if (isCurrentlyVisible) {
        dropdown.classList.remove("show");
        button.setAttribute("aria-expanded", "false");
        console.log(`Dropdown ${id} closed`);
      } else {
        dropdown.classList.add("show");
        button.setAttribute("aria-expanded", "true");
        console.log(`Dropdown ${id} opened`);
      }
    };

    button.addEventListener("click", clickHandler);
    button._dropdownManagerId = id;
    button._clickHandler = clickHandler;

    // Setup item selection handlers
    this.setupSelectionHandlers(id, dropdown, config);
  }

  /**
   * Setup selection handlers for dropdown items
   */
  setupSelectionHandlers(id, dropdown, config) {
    dropdown.addEventListener("click", (e) => {
      const item = e.target.closest(".dropdown-item");
      if (!item) return;

      e.preventDefault();
      e.stopPropagation();

      const value =
        item.getAttribute("data-filter") || item.getAttribute("data-value");
      const label = item.textContent.trim();

      // Handle selection based on type
      if (config.filterType === "multi-select") {
        this.handleMultiSelect(id, value, label, config);
      } else {
        this.handleSingleSelect(id, value, label, config);
      }

      // Close dropdown for single select
      if (config.filterType !== "multi-select") {
        dropdown.classList.remove("show");
      }
    });
  }

  /**
   * Handle single selection
   */
  handleSingleSelect(id, value, label, config) {
    const button = document.getElementById(config.buttonId);

    // Update button display
    this.updateButtonDisplay(button, config.placeholder, value, label);

    // Call selection callback
    if (config.onSelect) {
      config.onSelect(value, label, id);
    }

    console.log(`Single selection made in ${id}: ${value}`);
  }

  /**
   * Handle multi-selection
   */
  handleMultiSelect(id, value, label, config) {
    const dropdown = this.dropdowns.get(id);
    if (!dropdown.selectedValues) {
      dropdown.selectedValues = new Set();
    }

    // Toggle selection
    if (dropdown.selectedValues.has(value)) {
      dropdown.selectedValues.delete(value);
    } else {
      // Check max selections
      if (
        config.maxSelections &&
        dropdown.selectedValues.size >= config.maxSelections
      ) {
        console.warn(
          `Maximum selections (${config.maxSelections}) reached for ${id}`
        );
        return;
      }
      dropdown.selectedValues.add(value);
    }

    // Update button display
    const button = document.getElementById(config.buttonId);
    const selectedArray = Array.from(dropdown.selectedValues);
    this.updateButtonDisplayMulti(button, config.placeholder, selectedArray);

    // Update item visual state
    this.updateMultiSelectItems(config.dropdownId, dropdown.selectedValues);

    // Call selection callback
    if (config.onSelect) {
      config.onSelect(selectedArray, null, id);
    }

    console.log(`Multi-selection updated in ${id}:`, selectedArray);
  } /**
   * Update button display for single select
   */
  updateButtonDisplay(button, placeholder, value, label) {
    const displayValue = value === "all" || !value ? "all" : label || value;

    // Extract the base text from placeholder (e.g., "Created By" from "Created By")
    // Handle cases like "Use MCP", "Use Terraform", "Created By"
    const baseText = placeholder.replace(/\s*(filter|Filter)?$/, "").trim();

    button.innerHTML = `${baseText} <span class="badge bg-primary">equals</span> <span class="badge bg-secondary">${displayValue}</span>`;
  }

  /**
   * Update button display for multi-select
   */
  updateButtonDisplayMulti(button, placeholder, selectedValues) {
    if (selectedValues.length === 0) {
      button.innerHTML = placeholder;
    } else if (selectedValues.length === 1) {
      button.innerHTML = `${placeholder.split(" ")[0]} <span class="badge bg-primary">equals</span> <span class="badge bg-secondary">${selectedValues[0]}</span>`;
    } else {
      button.innerHTML = `${placeholder.split(" ")[0]} <span class="badge bg-primary">${selectedValues.length} selected</span>`;
    }
  }

  /**
   * Update visual state of multi-select items
   */
  updateMultiSelectItems(dropdownId, selectedValues) {
    const dropdown = document.getElementById(dropdownId);
    const items = dropdown.querySelectorAll(".dropdown-item");

    items.forEach((item) => {
      const value =
        item.getAttribute("data-filter") || item.getAttribute("data-value");
      const icon =
        item.querySelector(".selection-icon") || this.createSelectionIcon();

      if (!item.querySelector(".selection-icon")) {
        item.prepend(icon);
      }

      if (selectedValues.has(value)) {
        item.classList.add("selected");
        icon.className =
          "selection-icon bi bi-check-square-fill text-primary me-2";
      } else {
        item.classList.remove("selected");
        icon.className = "selection-icon bi bi-square text-muted me-2";
      }
    });
  }

  /**
   * Create selection icon for multi-select items
   */
  createSelectionIcon() {
    const icon = document.createElement("i");
    icon.className = "selection-icon bi bi-square text-muted me-2";
    return icon;
  }

  /**
   * Populate dropdown with data
   */
  populateDropdown(id, data) {
    const config = this.dropdowns.get(id);
    if (!config) return;

    const dropdown = document.getElementById(config.dropdownId);
    if (!dropdown) return;

    // Clear existing items except "All" option
    const allOption = dropdown.querySelector('[data-filter="all"]');
    dropdown.innerHTML = "";

    if (allOption) {
      dropdown.appendChild(allOption.parentElement);
    } else {
      // Create "All" option if it doesn't exist
      const allLi = document.createElement("li");
      allLi.innerHTML =
        '<a class="dropdown-item" href="#" data-filter="all">All</a>';
      dropdown.appendChild(allLi);
    }

    // Add new items
    data.forEach((item) => {
      const li = document.createElement("li");
      const value = typeof item === "string" ? item : item.value;
      const label = typeof item === "string" ? item : item.label;

      li.innerHTML = `<a class="dropdown-item" href="#" data-filter="${value}">${label}</a>`;
      dropdown.appendChild(li);
    });

    console.log(`Dropdown ${id} populated with ${data.length} items`);
  }

  /**
   * Clear selection for a dropdown
   */
  clearSelection(id) {
    const config = this.dropdowns.get(id);
    if (!config) return;

    const button = document.getElementById(config.buttonId);
    button.innerHTML = config.placeholder;

    // Clear multi-select state
    if (config.selectedValues) {
      config.selectedValues.clear();
      this.updateMultiSelectItems(config.dropdownId, config.selectedValues);
    }

    console.log(`Selection cleared for dropdown: ${id}`);
  }
  /**
   * Close all dropdowns except specified one
   */
  closeAll(exceptId = null) {
    this.dropdowns.forEach((config, id) => {
      if (id !== exceptId) {
        const dropdown = document.getElementById(config.dropdownId);
        const button = document.getElementById(config.buttonId);
        if (dropdown) {
          dropdown.classList.remove("show");
        }
        if (button) {
          button.setAttribute("aria-expanded", "false");
        }
      }
    });
  }

  /**
   * Cleanup specific dropdown
   */
  cleanup(id) {
    const config = this.dropdowns.get(id);
    if (!config) return;

    const button = document.getElementById(config.buttonId);
    if (button && button._dropdownManagerId === id) {
      // Remove event listeners by cloning the element
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      console.log(`Cleaned up dropdown: ${id}`);
    }
  }

  /**
   * Cleanup all dropdowns
   */
  cleanupAll() {
    this.dropdowns.forEach((config, id) => {
      this.cleanup(id);
    });
  }
  /**
   * Setup global click handler
   */
  setupGlobalClickHandler() {
    document.addEventListener("click", (e) => {
      // Check if click is outside any dropdown
      let clickedInsideDropdown = false;
      
      // Also check if click is on a sortable column or sort icon
      const isSortableClick = e.target.closest('.sortable') || 
                             e.target.closest('th.sortable i.bi');
      
      // Don't close dropdowns when interacting with the sorting functionality
      if (isSortableClick) {
        return;
      }

      this.dropdowns.forEach((config) => {
        const button = document.getElementById(config.buttonId);
        const dropdown = document.getElementById(config.dropdownId);

        if (button && button.contains(e.target)) clickedInsideDropdown = true;
        if (dropdown && dropdown.contains(e.target))
          clickedInsideDropdown = true;
      });
      if (!clickedInsideDropdown) {
        console.log("Clicked outside dropdowns, closing all");
        this.closeAll();
      }
    });

    console.log("Global dropdown click handler setup");
  }

  /**
   * Get current selection for a dropdown
   */
  getSelection(id) {
    const config = this.dropdowns.get(id);
    if (!config) return null;

    if (config.filterType === "multi-select" && config.selectedValues) {
      return Array.from(config.selectedValues);
    }

    // For single select, we'd need to track the current value
    // This would require extending the implementation
    return null;
  }
}

// Create global instance
window.dropdownManager = new DropdownManager();

function createLanguageTags(languages) {
  if (!languages || languages.length === 0)
    return '<span class="text-muted">-</span>';

  return languages
    .map((lang) => `<span class="badge bg-primary me-1">${lang}</span>`)
    .join("");
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
  let badgeClass = "bg-danger";
  if (numericRate >= 0.8) badgeClass = "bg-success";
  else if (numericRate >= 0.6) badgeClass = "bg-warning";

  return `<span class="badge ${badgeClass}">${percentage}%</span>`;
}

function formatDateTime(dateTime) {
  // Handle the format from the API data
  if (!dateTime) return "N/A";
  console.log("Formatting date:", dateTime);

  try {
    const date = new Date(dateTime);

    if (isNaN(date.getTime())) {
      return dateTime; // Return original string if parsing fails
    }

    const options = {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    console.log("Formatted date:", date.toLocaleString("sv-SE", options));

    return date.toLocaleString("sv-SE", options).replace("T", " ");
  } catch (error) {
    console.warn("Error formatting date:", error, dateTime);
    return dateTime; // Return original if formatting fails
  }
}

function showAlert(message, type) {
  // Remove existing alerts
  document.querySelectorAll(".alert").forEach((alert) => alert.remove());

  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

  // Insert at the top of main content
  const main = document.querySelector("main");
  main.insertBefore(alertDiv, main.firstElementChild.nextElementSibling);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getSuccessRateClass(successRate) {
  const percentage = parseInt(successRate);
  if (percentage >= 90) return "high";
  if (percentage >= 70) return "medium";
  return "low";
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
