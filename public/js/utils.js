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

function updateDropdownButton(buttonId, label, value) {
  const button = document.getElementById(buttonId);
  const displayValue = value === "all" ? "all" : value;
  button.innerHTML = `${label} <span class="badge bg-primary">equals</span> <span class="badge bg-secondary">${displayValue}</span>`;
}

/**
 * Initialize a single dropdown with Bootstrap or manual fallback
 * @param {string} buttonId - The ID of the dropdown button
 * @param {string} dropdownId - The ID of the dropdown menu (for manual fallback)
 * @param {Function} setupManualDropdownFn - Function to setup manual dropdown fallback
 * @param {Function} cleanupFn - Function to cleanup existing listeners
 */
function initializeDropdown(
  buttonId,
  dropdownId,
  setupManualDropdownFn,
  cleanupFn
) {
  const button = document.getElementById(buttonId);
  if (!button) {
    console.warn(`Dropdown button ${buttonId} not found`);
    return;
  }

  try {
    if (typeof bootstrap !== "undefined") {
      // Dispose of any existing Bootstrap dropdown instance
      const existingInstance = bootstrap.Dropdown.getInstance(button);
      if (existingInstance) {
        existingInstance.dispose();
      }
      new bootstrap.Dropdown(button);
      console.log(`${buttonId} dropdown initialized with Bootstrap`);
    } else {
      // Fallback: manual dropdown toggle
      if (setupManualDropdownFn) {
        setupManualDropdownFn(button, dropdownId);
      }
      console.log(`${buttonId} dropdown initialized with manual fallback`);
    }
  } catch (error) {
    console.error(`Error initializing dropdown ${buttonId}:`, error);

    // Fallback initialization
    console.log(`Using fallback dropdown initialization for ${buttonId}...`);
    if (cleanupFn) cleanupFn();
    if (setupManualDropdownFn) {
      setupManualDropdownFn(button, dropdownId);
    }
  }
}

/**
 * Initialize multiple dropdowns with Bootstrap or manual fallback
 * @param {Array} dropdownConfigs - Array of dropdown configuration objects
 * @param {Function} setupManualDropdownFn - Function to setup manual dropdown fallback
 * @param {Function} cleanupFn - Function to cleanup existing listeners
 *
 * dropdownConfigs format: [{ buttonId: 'id', dropdownId: 'dropdown-id' }, ...]
 */
function initializeDropdowns(
  dropdownConfigs,
  setupManualDropdownFn,
  cleanupFn
) {
  try {
    console.log("Initializing Bootstrap dropdowns...");

    // Clean up any existing manual event listeners first
    if (cleanupFn) cleanupFn();

    dropdownConfigs.forEach((config) => {
      initializeDropdown(
        config.buttonId,
        config.dropdownId,
        setupManualDropdownFn,
        null
      );
    });
  } catch (error) {
    console.error("Error initializing dropdowns:", error);

    // Fallback initialization for all dropdowns
    console.log("Using fallback dropdown initialization...");
    if (cleanupFn) cleanupFn();

    dropdownConfigs.forEach((config) => {
      const button = document.getElementById(config.buttonId);
      if (button && setupManualDropdownFn) {
        setupManualDropdownFn(button, config.dropdownId);
      }
    });
  }
}

/**
 * Generic manual dropdown setup function
 * @param {HTMLElement} button - The dropdown button element
 * @param {string} dropdownId - The ID of the dropdown menu
 */
function setupGenericManualDropdown(button, dropdownId) {
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
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      if (menu.id !== dropdownId) {
        menu.classList.remove("show");
      }
    });

    // Toggle current dropdown
    const wasVisible = dropdown.classList.contains("show");
    dropdown.classList.toggle("show");
    console.log(
      `Manual dropdown ${dropdownId} toggled: ${!wasVisible} (was: ${wasVisible})`
    );
  };

  button.addEventListener("click", clickHandler);
  button._manualListenerAdded = true;
  button._clickHandler = clickHandler; // Store reference for potential cleanup

  // Setup outside click handler to close dropdowns (only add once globally)
  setupGlobalOutsideClickHandler();
}

/**
 * Setup global outside click handler to close dropdowns when clicking outside
 * This function ensures the handler is only added once per page
 */
function setupGlobalOutsideClickHandler() {
  if (!document._outsideClickHandlerAdded) {
    document.addEventListener("click", (e) => {
      // Check if click is outside any dropdown
      const allDropdownButtons = document.querySelectorAll(
        '[data-bs-toggle="dropdown"]'
      );
      const allDropdownMenus = document.querySelectorAll(".dropdown-menu");

      let clickedInsideDropdown = false;
      allDropdownButtons.forEach((btn) => {
        if (btn.contains(e.target)) clickedInsideDropdown = true;
      });
      allDropdownMenus.forEach((menu) => {
        if (menu.contains(e.target)) clickedInsideDropdown = true;
      });

      if (!clickedInsideDropdown) {
        allDropdownMenus.forEach((menu) => {
          menu.classList.remove("show");
        });
      }
    });
    document._outsideClickHandlerAdded = true;
    console.log("Global outside click handler setup complete");
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
