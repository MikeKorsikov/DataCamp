/*
 * Laserovo - Laser Hair Removal Clinic Management System
 * Frontend JavaScript Module
 * 
 * This module handles all client-side functionality including:
 * - Client management (add, edit, search, view all)
 * - Appointment scheduling and management
 * - Modal management and UI interactions
 * - API communication with error handling
 * 
 * Author: Laserovo Development Team
 * Version: 2.0.0
 * Last Updated: 2025-09-13
 */

// Welcome message logged to console on script load
console.log("Welcome to Laserovo!");

// =============================================================================
// GLOBAL CONFIGURATION
// =============================================================================

const CONFIG = {
    API_BASE_URL: '', // Empty string for same-origin requests (backend on same domain)
    MODAL_ANIMATION_DURATION: 200, // Milliseconds for modal open/close animations
    DEBOUNCE_DELAY: 300, // Milliseconds to wait before executing debounced functions
    DATE_FORMAT_OPTIONS: { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    }, // Date formatting options for toLocaleDateString (DD/MM/YYYY)
    TIME_FORMAT_OPTIONS: { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    }, // Time formatting options for toLocaleTimeString (24-hour format)
    // Treatment areas with recommended number of procedures for completion
    AREAS: [
        { area_id: 1, area: 'face', recommended_procedures: 9 },
        { area_id: 2, area: 'underarms', recommended_procedures: 10 },
        { area_id: 3, area: 'arms', recommended_procedures: 10 },
        { area_id: 4, area: 'legs', recommended_procedures: 10 },
        { area_id: 5, area: 'bikini', recommended_procedures: 10 },
        { area_id: 6, area: 'back', recommended_procedures: 10 },
        { area_id: 7, area: 'chest', recommended_procedures: 10 },
        { area_id: 8, area: 'full-body', recommended_procedures: 10 },
        { area_id: 9, area: 'head', recommended_procedures: 10 },
        { area_id: 10, area: 'belly', recommended_procedures: 10 }
    ],
    // Expense categories with their IDs, names, and descriptions for financial tracking
    EXPENSES: [
        { expense_id: 1, expense_category: 'Rent', description: 'Monthly rent payment' },
        { expense_id: 2, expense_category: 'Accounting services', description: 'Monthly accounting services' },
        { expense_id: 3, expense_category: 'Ultrasound gel', description: 'Ultrasound gel' },
        { expense_id: 4, expense_category: 'Marketing', description: 'Ad hoc marketing and advertising' },
        { expense_id: 5, expense_category: 'Insurance', description: 'Insurance payments' },
        { expense_id: 6, expense_category: 'Taxes', description: 'Taxes payments' },
        { expense_id: 7, expense_category: 'Social security', description: 'Social security ZUS payments' },
        { expense_id: 8, expense_category: 'Panthenol', description: 'Panthenol' },
        { expense_id: 8, expense_category: 'Maintenance', description: 'Maintenance for lazer' }
    ],
    // Minimum waiting periods between laser treatment sessions (in weeks)
    // Each session number maps to the minimum weeks required after the previous session
    // Used to calculate "Next Visit" dates based on last completed procedure
    SESSION_WAIT: {
        1: { label: 'Initial session', min_weeks_after_previous: 0 },
        2: { min_weeks_after_previous: 4 },
        3: { min_weeks_after_previous: 6 },
        4: { min_weeks_after_previous: 8 },
        5: { min_weeks_after_previous: 10 },
        6: { min_weeks_after_previous: 12 },
        7: { min_weeks_after_previous: 14 },
        8: { min_weeks_after_previous: 16 },
        9: { min_weeks_after_previous: 18 },
        10: { min_weeks_after_previous: 20 }
    }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Debounce function to limit API calls and improve performance.
 * Delays function execution until after wait time has elapsed since last call.
 * Useful for search inputs to avoid excessive API requests while user is typing.
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
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

/**
 * Display user-friendly error message with console logging.
 * Shows alert dialog to user and logs detailed error to console for debugging.
 * 
 * @param {string} message - Error message to display
 * @param {Error} error - Original error object (optional)
 */
function showError(message, error = null) {
    console.error('Error:', message, error);
    alert(message);
}

/**
 * Display success message with console logging.
 * Shows alert dialog to user and logs success to console.
 * 
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    console.log('Success:', message);
    alert(message);
}

/**
 * Make API request with comprehensive error handling.
 * Wraps fetch API with JSON headers and status checking.
 * Throws error if response is not ok or status field is not 'ok'.
 * 
 * @param {string} url - API endpoint (relative or absolute URL)
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If request fails or response indicates error
 */
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        // Check both HTTP status and application-level status field
        if (!response.ok || data.status === 'error') {
            const error = new Error(data.message || 'API request failed');
            error.response = response;
            error.data = data;
            // If it's a time slot error, use the message as is
            if (data.message && data.message.includes('Time slot is not available')) {
                throw new Error(data.message);
            }
            throw error;
        }
        
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

/**
 * Format date and time from ISO datetime string.
 * Converts ISO datetime to localized date and time strings.
 * Returns 'N/A' for invalid or missing datetime values.
 * 
 * @param {string} datetimeString - ISO datetime string (e.g., '2025-01-15T14:30:00')
 * @returns {Object} Object with formatted date and time { date: 'DD/MM/YYYY', time: 'HH:MM' }
 */
function formatDateTime(datetimeString) {
    if (!datetimeString) {
        return { date: 'N/A', time: 'N/A' };
    }
    
    const datetime = new Date(datetimeString);
    if (isNaN(datetime.getTime())) {
        return { date: 'N/A', time: 'N/A' };
    }
    
    return {
        date: datetime.toLocaleDateString('en-GB', CONFIG.DATE_FORMAT_OPTIONS),
        time: datetime.toLocaleTimeString('en-GB', CONFIG.TIME_FORMAT_OPTIONS)
    };
}

/**
 * Check if current page matches the specified page name.
 * Used to conditionally initialize page-specific functionality.
 * 
 * @param {string} pageName - Name of the page to check (e.g., 'clients.html')
 * @returns {boolean} True if current page pathname includes the page name
 */
function isCurrentPage(pageName) {
    return window.location.pathname.includes(pageName);
}

/**
 * Create HTML element with specified content and class.
 * Helper function to simplify dynamic element creation.
 * 
 * @param {string} tag - HTML tag name (e.g., 'div', 'button')
 * @param {string} className - CSS class name to apply
 * @param {string} innerHTML - HTML content to insert (default: empty string)
 * @returns {HTMLElement} Created and configured element
 */
function createElement(tag, className, innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
}

// =============================================================================
// MODAL MANAGEMENT
// =============================================================================

/**
 * Centralized modal manager for consistent modal operations.
 * Handles opening, closing, and backdrop clicks for all modals.
 * Ensures only one modal is active at a time.
 */
class ModalManager {
    constructor() {
        this.activeModal = null; // Reference to currently open modal element
    }
    
    /**
     * Open a modal by ID with optional focus management.
     * Removes 'hidden' attribute to display modal.
     * Optionally focuses a specific input field for better UX.
     * 
     * @param {string} modalId - ID of the modal element to open
     * @param {string} focusElementId - ID of element to focus after opening (optional)
     */
    open(modalId, focusElementId = null) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with ID '${modalId}' not found`);
            return;
        }
        
        this.activeModal = modal;
        modal.removeAttribute('hidden'); // Show modal by removing hidden attribute
        
        // Focus management for accessibility and better user experience
        if (focusElementId) {
            const focusElement = document.getElementById(focusElementId);
            if (focusElement) {
                setTimeout(() => focusElement.focus(), 100); // Delay to ensure modal is rendered
            }
        }
    }
    
    /**
     * Close the currently active modal.
     * Adds 'hidden' attribute to hide modal and clears active reference.
     */
    close() {
        if (this.activeModal) {
            this.activeModal.setAttribute('hidden', ''); // Hide modal
            this.activeModal = null; // Clear reference
        }
    }
    
    /**
     * Handle backdrop click to close modal.
     * Closes modal only if user clicks on the backdrop (not modal content).
     * 
     * @param {Event} event - Click event from modal overlay
     * @param {string} modalId - ID of the modal to check
     */
    handleBackdropClick(event, modalId) {
        const modal = document.getElementById(modalId);
        // Only close if click target is the modal overlay itself (not child elements)
        if (event.target === modal) {
            this.close();
        }
    }
}

// Initialize global modal manager
const modalManager = new ModalManager();

// =============================================================================
// BASE MANAGER CLASS
// =============================================================================

/**
 * Base class for all managers with common functionality.
 * Provides reusable methods for form handling, modal setup, and item display.
 * Extended by ClientManager and AppointmentManager.
 */
class BaseManager {
    /**
     * Get form data as object from form element.
     * Extracts all form field values and returns as key-value pairs.
     * 
     * @param {string} formId - ID of the form element
     * @returns {Object} Form data as key-value pairs (field name: field value)
     */
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        
        const formData = new FormData(form);
        return Object.fromEntries(formData.entries()); // Convert FormData to plain object
    }
    
    /**
     * Reset and clear form fields to their default values.
     * 
     * @param {string} formId - ID of the form element to reset
     */
    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset(); // Clear all form fields
        }
    }
    
    /**
     * Setup modal event listeners with consistent behavior.
     * Configures open, close, backdrop click, and form submission handlers.
     * 
     * @param {Object} config - Configuration object with modal elements and callbacks
     * @param {HTMLElement} config.button - Button that opens the modal
     * @param {HTMLElement} config.modal - Modal overlay element
     * @param {HTMLElement} config.cancelButton - Button that closes the modal
     * @param {HTMLElement} config.form - Form element (optional)
     * @param {string} config.focusElementId - ID of element to focus on open (optional)
     * @param {Function} config.openCallback - Function to call when modal opens (optional)
     * @param {Function} config.closeCallback - Function to call when modal closes (optional)
     * @param {Function} config.submitCallback - Function to call on form submit (optional)
     */
    setupModalListeners(config) {
        const { 
            button, modal, cancelButton, form, 
            openCallback, closeCallback, submitCallback 
        } = config;
        
        if (!button || !modal) return;
        
        // Open modal button handler
        button.addEventListener('click', () => {
            modalManager.open(modal.id, config.focusElementId);
            if (openCallback) openCallback(); // Execute custom logic on open
        });
        
        // Close modal button handler
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                modalManager.close();
                if (closeCallback) closeCallback(); // Execute custom logic on close
            });
        }
        
        // Backdrop click handler (close when clicking outside modal content)
        modal.addEventListener('click', (e) => {
            modalManager.handleBackdropClick(e, modal.id);
        });
        
        // Form submission handler
        if (form && submitCallback) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault(); // Prevent default form submission
                await submitCallback(); // Execute custom submit logic
            });
        }
    }
    
    /**
     * Display list items with consistent formatting.
     * Clears container and renders each item using provided callback.
     * Shows "No items found" message if array is empty.
     * 
     * @param {Array} items - Array of items to display
     * @param {HTMLElement} container - Container element to append items to
     * @param {Function} renderCallback - Function that takes an item and returns HTMLElement
     */
    displayItems(items, container, renderCallback) {
        if (!container) return;
        
        container.innerHTML = ''; // Clear existing content
        
        if (items.length === 0) {
            container.innerHTML = '<p>No items found.</p>';
            return;
        }
        
        // Render each item using the provided callback function
        items.forEach(item => {
            const element = renderCallback(item);
            if (element) {
                container.appendChild(element);
            }
        });
    }
}

// =============================================================================
// CLIENT MANAGEMENT
// =============================================================================

/**
 * Manages all client-related operations.
 * Handles adding, searching, editing, viewing, and displaying client statistics.
 * Extends BaseManager for common functionality.
 */
class ClientManager extends BaseManager {
    constructor() {
        super();
        this.currentClientId = null; // Stores ID of client being edited
        this.initializeEventListeners();
    }
    
    /**
     * Initialize all client management event listeners.
     * Sets up handlers for add, search, edit, and show all functionality.
     */
    initializeEventListeners() {
        this.initializeAddClient(); // Setup add new client modal
        this.initializeSearchClient(); // Setup client search modal
        this.initializeEditClient(); // Setup edit client modal
        this.initializeShowAllClients(); // Setup show all clients modal (clients.html only)
    }
    
    /**
     * Initialize add new client functionality.
     * Sets up modal and form for creating new client records.
     */
    initializeAddClient() {
        const button = document.getElementById('add-new');
        const modal = document.getElementById('client-modal-overlay');
        const form = document.getElementById('client-form');
        const cancelButton = document.getElementById('client-cancel');
        
        this.setupModalListeners({
            button, modal, form, cancelButton,
            focusElementId: 'client-name',
            submitCallback: () => this.saveClient()
        });
    }
    
    /**
     * Save new client to database via API.
     * Validates required fields and sends POST request to create client.
     */
    async saveClient() {
        try {
            const data = this.getFormData('client-form');
            const response = await apiRequest('/clients', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            modalManager.close();
            this.resetForm('client-form');
            showSuccess(`Client saved successfully! ID: ${response.id}`);
            
        } catch (error) {
            showError('Failed to save client. Please ensure the backend is running.', error);
        }
    }
    
    /**
     * Initialize client search functionality.
     * Sets up modal and form for searching existing clients by various fields.
     */
    initializeSearchClient() {
        const button = document.getElementById('modify');
        const modal = document.getElementById('search-modal-overlay');
        const form = document.getElementById('search-form');
        const cancelButton = document.getElementById('search-cancel');
        
        this.setupModalListeners({
            button, modal, form, cancelButton,
            focusElementId: 'search-term',
            openCallback: () => this.clearSearchResults(),
            closeCallback: () => this.closeSearchModal(),
            submitCallback: () => this.searchClients()
        });
    }
    
    /**
     * Search for clients based on selected field and search term.
     * Makes API request and displays matching results.
     */
    async searchClients() {
        try {
            const field = document.getElementById('search-field').value;
            const term = document.getElementById('search-term').value.trim();
            
            if (!field || !term) {
                showError('Please select a field and enter a search term');
                return;
            }
            
            const response = await apiRequest(`/clients/search?field=${encodeURIComponent(field)}&term=${encodeURIComponent(term)}`);
            this.displaySearchResults(response.results);
            
        } catch (error) {
            showError('Failed to search clients. Please ensure the backend is running.', error);
        }
    }
    
    /**
     * Display search results in the UI
     * @param {Array} results - Array of client search results
     */
    displaySearchResults(results) {
        const searchResults = document.getElementById('search-results');
        const resultsList = document.getElementById('results-list');
        
        if (!searchResults || !resultsList) return;
        
        searchResults.removeAttribute('hidden');
        
        this.displayItems(results, resultsList, (client) => {
            return createElement('div', 'result-item', `
                <div class="result-info">
                    <div class="name">${client.name} ${client.surname}</div>
                    <div class="details">${client.email || 'No email'} • ${client.phone || 'No phone'}</div>
                </div>
                <button class="stats-btn" data-client-id="${client.id}">Stats</button>
                <button class="edit-btn" data-client-id="${client.id}">Edit</button>
            `);
        });
    }
    
    /**
     * Clear search results and hide results container.
     * Resets UI to initial state before search.
     */
    clearSearchResults() {
        const searchResults = document.getElementById('search-results');
        const resultsList = document.getElementById('results-list');
        
        if (searchResults) searchResults.setAttribute('hidden', '');
        if (resultsList) resultsList.innerHTML = '';
    }
    
    /**
     * Close search modal and reset all search state.
     * Clears form, results, and hides modal.
     */
    closeSearchModal() {
        const searchModal = document.getElementById('search-modal-overlay');
        
        if (searchModal) {
            searchModal.setAttribute('hidden', '');
        }
        this.resetForm('search-form');
        this.clearSearchResults();
    }
    
    /**
     * Initialize edit client functionality.
     * Sets up modal, form, and event handlers for editing client information.
     * Also handles stats button clicks to show client statistics.
     */
    initializeEditClient() {
        const modal = document.getElementById('edit-modal-overlay');
        const form = document.getElementById('edit-form');
        const cancelButton = document.getElementById('edit-cancel');
        const statsCloseButton = document.getElementById('stats-close');
        
        if (!modal || !form) return;
        
        // Handle edit and stats button clicks from search results using event delegation
        const resultsList = document.getElementById('results-list');
        if (resultsList) {
            resultsList.addEventListener('click', async (e) => {
                if (e.target.classList.contains('edit-btn')) {
                    const clientId = e.target.getAttribute('data-client-id');
                    this.openEditModal(clientId); // Open edit modal with client data
                } else if (e.target.classList.contains('stats-btn')) {
                    const clientId = e.target.getAttribute('data-client-id');
                    await this.showClientStats(clientId); // Show client statistics modal
                }
            });
        }
        
        // Setup form submission and cancel
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                modalManager.close();
                this.resetForm('edit-form');
            });
        }

        // Setup stats modal close button
        if (statsCloseButton) {
            statsCloseButton.addEventListener('click', () => {
                document.getElementById('stats-modal-overlay').setAttribute('hidden', '');
            });
        }
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateClient();
        });
        
        // Backdrop click for edit modal
        modal.addEventListener('click', (e) => {
            modalManager.handleBackdropClick(e, 'edit-modal-overlay');
        });

        // Backdrop click for stats modal
        const statsModal = document.getElementById('stats-modal-overlay');
        if (statsModal) {
            statsModal.addEventListener('click', (e) => {
                if (e.target === statsModal) {
                    statsModal.setAttribute('hidden', '');
                }
            });
        }
    }
    
    /**
     * Open edit modal and populate with client data.
     * Fetches client details from API and fills form fields.
     * 
     * @param {string} clientId - ID of client to edit
     */
    async openEditModal(clientId) {
        try {
            const response = await apiRequest(`/clients/${clientId}`);
            const client = response.client;
            
            // Populate form fields with client data
            const fields = ['name', 'surname', 'phone', 'email', 'facebook', 'instagram', 'booksy', 'dob'];
            fields.forEach(field => {
                const element = document.getElementById(`edit-${field}`);
                if (element) {
                    element.value = client[field] || ''; // Set value or empty string if null
                }
            });
            
            this.currentClientId = clientId;
            modalManager.open('edit-modal-overlay', 'edit-name');
            
        } catch (error) {
            showError('Failed to load client data for editing.', error);
        }
    }
    
    /**
     * Update client information via API.
     * Sends PUT request with modified client data.
     */
    async updateClient() {
        try {
            const data = this.getFormData('edit-form');
            
            await apiRequest(`/clients/${this.currentClientId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            modalManager.close();
            this.closeSearchModal();
            this.resetForm('edit-form');
            this.currentClientId = null;
            
            showSuccess('Client updated successfully!');
            
        } catch (error) {
            showError('Failed to update client.', error);
        }
    }
    
    /**
     * Initialize show all clients functionality.
     * Only runs on clients.html page to avoid unnecessary initialization.
     * Sets up modal to display all clients in a sortable table.
     */
    initializeShowAllClients() {
        if (!isCurrentPage('clients.html')) return; // Page-specific functionality
        
        const button = document.getElementById('show-all');
        const modal = document.getElementById('show-all-modal-overlay');
        const cancelButton = document.getElementById('show-all-cancel');
        const list = document.getElementById('show-all-list');
        
        this.setupModalListeners({
            button, modal, cancelButton,
            openCallback: () => this.loadAllClients(),
            closeCallback: () => { if (list) list.innerHTML = ''; }
        });
        
        // Handle edit and stats button clicks from show all modal using event delegation
        if (list) {
            list.addEventListener('click', async (e) => {
                if (e.target.classList.contains('edit-btn')) {
                    const clientId = e.target.getAttribute('data-client-id');
                    this.openEditModal(clientId); // Open edit modal
                    modalManager.close(); // Close show all modal
                } else if (e.target.classList.contains('stats-btn')) {
                    const clientId = e.target.getAttribute('data-client-id');
                    await this.showClientStats(clientId); // Show stats modal
                }
            });
        }
    }
    
    /**
     * Load and display all clients in a table.
     * Fetches all clients from API and renders them sorted by name.
     */
    async loadAllClients() {
        try {
            const response = await apiRequest('/clients');
            const showAllList = document.getElementById('show-all-list');
            
            if (!showAllList) return;
            
            showAllList.innerHTML = '';
            
            if (response.results.length === 0) {
                showAllList.innerHTML = '<p>No clients found.</p>';
                return;
            }
            
            // Create table header row with column names
            const headerElement = createElement('div', 'show-all-clients-header', `
                <div class="show-all-header-cell">Name</div>
                <div class="show-all-header-cell">Surname</div>
                <div class="show-all-header-cell">Phone</div>
                <div class="show-all-header-cell">Email</div>
                <div class="show-all-header-cell">DOB</div>
                <div class="show-all-header-cell">STATS</div>
                <div class="show-all-header-cell">Action</div>
            `);
            
            if (headerElement) {
                showAllList.appendChild(headerElement);
            }
            
            // Sort clients alphabetically by Name (A→Z), then by Surname
            const sortedClients = [...response.results].sort((a, b) => {
                const n = (a.name || '').localeCompare(b.name || '');
                return n !== 0 ? n : (a.surname || '').localeCompare(b.surname || '');
            });
            
            // Create individual client rows with data and action buttons
            for (const client of sortedClients) {
                const clientElement = createElement('div', 'show-all-clients-row', `
                    <div class="show-all-cell">${client.name || 'N/A'}</div>
                    <div class="show-all-cell">${client.surname || 'N/A'}</div>
                    <div class="show-all-cell">${client.phone || 'N/A'}</div>
                    <div class="show-all-cell">${client.email || 'N/A'}</div>
                    <div class="show-all-cell">${client.dob || 'N/A'}</div>
                    <div class="show-all-cell">
                        <button class="stats-btn" data-client-id="${client.id}">Stats</button>
                    </div>
                    <div class="show-all-cell">
                        <button class="edit-btn" data-client-id="${client.id}">Edit</button>
                    </div>
                `);
                
                if (clientElement) {
                    showAllList.appendChild(clientElement);
                }
            }
            
        } catch (error) {
            showError('Failed to load clients.', error);
        }
    }
    
    /**
     * Show client statistics in a modal.
     * Displays treatment progress, procedure counts, last visit dates, and next visit recommendations.
     * Calculates progress percentages and overdue status for each treatment area.
     * 
     * @param {string} clientId - ID of the client to show statistics for
     */
    async showClientStats(clientId) {
        try {
            // Fetch client details and statistics in parallel for better performance
            const [clientResponse, statsResponse] = await Promise.all([
                apiRequest(`/clients/${clientId}`),
                apiRequest(`/clients/${clientId}/stats`)
            ]);

            const client = clientResponse.client;
            const stats = statsResponse.stats || {}; // Visit counts per area
            const lastVisits = statsResponse.last_visits || {}; // Last visit dates per area
            const lastProcedures = statsResponse.last_procedures || {}; // Last procedure numbers per area

            // Set client name in the modal header
            document.getElementById('client-stats-name').textContent = `${client.name} ${client.surname}`;

            // Build treatment area data with visit counts, progress, and next visit calculations
            const treatmentAreas = CONFIG.AREAS.map(cfg => {
                const key = cfg.area.toLowerCase(); // Normalize area name for lookup
                const name = cfg.area.charAt(0).toUpperCase() + cfg.area.slice(1); // Capitalize for display
                const visits = stats[key] || 0; // Total confirmed visits for this area
                const lastRaw = lastVisits[key] || ''; // ISO date string of last visit
                let lastDisplay = ''; // Formatted last visit date for display
                let nextDisplay = ''; // Formatted next visit date for display
                let nextOverdue = false; // Flag if next visit date has passed
                // Calculate next visit date if client has had at least one visit
                if (lastRaw) {
                    const dt = new Date(lastRaw);
                    if (!isNaN(dt.getTime())) {
                        lastDisplay = dt.toLocaleDateString('en-GB', CONFIG.DATE_FORMAT_OPTIONS);
                        
                        // Calculate next recommended visit date based on SESSION_WAIT configuration
                        const lastProcNum = lastProcedures[key] || 0;
                        const nextSession = lastProcNum + 1; // Next procedure number
                        const waitCfg = CONFIG.SESSION_WAIT && CONFIG.SESSION_WAIT[nextSession];
                        const weeks = waitCfg && typeof waitCfg.min_weeks_after_previous === 'number' ? waitCfg.min_weeks_after_previous : null;
                        
                        if (weeks !== null) {
                            // Add waiting period to last visit date
                            const nextDt = new Date(dt);
                            nextDt.setDate(nextDt.getDate() + (weeks * 7));
                            
                            if (!isNaN(nextDt.getTime())) {
                                nextDisplay = nextDt.toLocaleDateString('en-GB', CONFIG.DATE_FORMAT_OPTIONS);
                                
                                // Check if next visit date has passed (mark as overdue)
                                const today = new Date();
                                // Compare by date only (ignore time) to avoid timezone issues
                                const nextDateOnly = new Date(nextDt.getFullYear(), nextDt.getMonth(), nextDt.getDate());
                                const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                nextOverdue = nextDateOnly < todayDateOnly;
                            }
                        }
                    }
                }
                // Calculate treatment progress percentage
                const procedureNumber = lastProcedures[key] || ''; // Latest procedure number
                const recommendedProcedures = cfg.recommended_procedures || 0; // Total recommended procedures
                
                // Calculate percentage: (current procedure / recommended) * 100, clamped to 0-100
                const pctNum = (procedureNumber && recommendedProcedures)
                    ? Math.round(Math.min(100, Math.max(0, (procedureNumber / recommendedProcedures) * 100)))
                    : null;
                const progressPct = pctNum !== null ? `${pctNum}%` : '';
                
                // Determine progress level for color coding: low (<50%), mid (50-79%), high (80%+)
                const progressLevel = pctNum === null ? '' : (pctNum < 50 ? 'level-low' : (pctNum < 80 ? 'level-mid' : 'level-high'));
                return {
                    key,
                    name,
                    visits,
                    procedureNumber,
                    recommendedProcedures,
                    progressPct,
                    progressLevel,
                    lastDisplay,
                    nextDisplay,
                    nextOverdue,
                };
            });

            // Sort treatment areas alphabetically by name for consistent display
            treatmentAreas.sort((a, b) => a.name.localeCompare(b.name));

            // Populate treatment areas list in the modal
            const treatmentList = document.getElementById('treatment-areas-list');
            treatmentList.innerHTML = ''; // Clear existing content

            // Render each treatment area as a row with statistics
            treatmentAreas.forEach(area => {
                const li = document.createElement('li');
                li.className = 'stats-row';
                li.innerHTML = `
                    <span class="area">${area.name}</span>
                    <span class="visits">${area.visits}</span>
                    <span class="procedure">${area.procedureNumber}</span>
                    <span class="progress">
                        <span class="progress-track"><span class="progress-fill ${area.progressLevel}" style="width: ${area.progressPct}"></span></span>
                        <span class="progress-text">${area.progressPct}</span>
                    </span>
                    <span class="last-visit">${area.lastDisplay}</span>
                    <span class="next-visit ${area.nextOverdue ? 'overdue' : ''}">${area.nextDisplay || ''}</span>
                `;
                treatmentList.appendChild(li);
            });

            // Display the statistics modal
            document.getElementById('stats-modal-overlay').removeAttribute('hidden');

        } catch (error) {
            showError('Failed to load client statistics.', error);
        }
    }
}

// =============================================================================
// APPOINTMENT MANAGEMENT
// =============================================================================

/**
 * Manages all appointment-related operations.
 * Handles creating, searching, editing, and viewing appointments.
 * Includes client search within appointment creation and upcoming appointments tracking.
 * Extends BaseManager for common functionality.
 */
class AppointmentManager extends BaseManager {
    constructor() {
        super();
        this.currentAppointmentId = null; // Stores ID of appointment being edited
        this.currentClientId = null; // Stores client ID associated with current appointment
        this.initializeEventListeners();
    }
    
    /**
     * Initialize all appointment management event listeners.
     * Sets up handlers for creating, finding, viewing, and tracking appointments.
     */
    initializeEventListeners() {
        this.initializeMakeAppointment(); // Setup appointment creation modal
        this.initializeFindAppointment(); // Setup appointment search modal
        this.initializeShowAllAppointments(); // Setup show all appointments modal (appointments.html only)
        this.initializeUpcomingAppointments(); // Setup upcoming appointments tracking modal
    }
    
    /**
     * Initialize make appointment functionality.
     * Sets up modal and form for creating new appointments with client search.
     */
    initializeMakeAppointment() {
        const button = document.getElementById('make-appointment');
        const modal = document.getElementById('appointment-modal-overlay');
        const form = document.getElementById('appointment-form');
        const cancelButton = document.getElementById('appointment-cancel');
        
        this.setupModalListeners({
            button, modal, form, cancelButton,
            focusElementId: 'appointment-name',
            openCallback: () => this.clearClientSearchResults(),
            closeCallback: () => this.clearClientSearchResults(),
            submitCallback: () => this.saveAppointment()
        });
        
        this.initializeClientSearch();
    }
    
    /**
     * Initialize client search within appointment modal.
     * Allows searching for existing clients when creating appointments.
     * Supports search by name, surname, phone, or combined name/surname.
     */
    initializeClientSearch() {
        const searchBtn = document.getElementById('search-client-btn');
        const searchResults = document.getElementById('client-search-results');
        const resultsList = document.getElementById('client-results-list');
        const searchTermField = document.getElementById('client-search-term');
        
        if (!searchBtn || !searchResults || !resultsList) return;
        
        // Set the search button type to button to prevent form submission
        searchBtn.type = 'button';
        
        // Search button click handler
        searchBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.searchClientForAppointment();
        });
        
        // Client selection from search results using event delegation
        resultsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('select-client-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const clientId = e.target.getAttribute('data-client-id');
                await this.selectClientForAppointment(clientId);
            }
        });
        
        // Enter key support for search and auto-clear results on input change
        if (searchTermField) {
            // Allow Enter key to trigger search
            searchTermField.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    await this.searchClientForAppointment();
                }
            });
            
            // Clear results when user starts typing new search term
            searchTermField.addEventListener('input', () => {
                if (!searchResults.hasAttribute('hidden')) {
                    this.clearClientSearchResults();
                }
            });
        }
    }
    
    /**
     * Search for clients within appointment modal.
     * Handles both single field search and combined name/surname search.
     */
    async searchClientForAppointment() {
        try {
            const searchField = document.getElementById('client-search-field').value;
            const searchTerm = document.getElementById('client-search-term').value.trim();
            
            if (!searchTerm) {
                showError('Please enter a search term');
                return;
            }
            
            let allResults = [];
            
            // Handle combined search (searches both name and surname fields)
            if (searchField === 'both') {
                allResults = await this.performCombinedClientSearch(searchTerm);
            } else {
                // Single field search
                const response = await apiRequest(`/clients/search?field=${encodeURIComponent(searchField)}&term=${encodeURIComponent(searchTerm)}`);
                allResults = response.results;
            }
            
            this.displayClientSearchResults(allResults);
            
        } catch (error) {
            showError('Failed to search clients.', error);
        }
    }
    
    /**
     * Perform combined search by name and surname.
     * Searches both fields and merges results, removing duplicates.
     * 
     * @param {string} searchTerm - Term to search for
     * @returns {Array} Combined unique results from both name and surname searches
     */
    async performCombinedClientSearch(searchTerm) {
        let allResults = [];
        
        // Search by name field
        try {
            const nameResponse = await apiRequest(`/clients/search?field=name&term=${encodeURIComponent(searchTerm)}`);
            allResults = [...nameResponse.results];
        } catch (error) {
            console.warn('Name search failed:', error);
        }
        
        // Search by surname field and merge unique results (avoid duplicates)
        try {
            const surnameResponse = await apiRequest(`/clients/search?field=surname&term=${encodeURIComponent(searchTerm)}`);
            const existingIds = new Set(allResults.map(client => client.id)); // Track already found IDs
            const newResults = surnameResponse.results.filter(client => !existingIds.has(client.id)); // Filter out duplicates
            allResults = [...allResults, ...newResults]; // Merge results
        } catch (error) {
            console.warn('Surname search failed:', error);
        }
        
        return allResults;
    }
    
    /**
     * Display client search results in appointment modal
     * @param {Array} results - Array of client search results
     */
    displayClientSearchResults(results) {
        const searchResults = document.getElementById('client-search-results');
        const resultsList = document.getElementById('client-results-list');
        
        if (!searchResults || !resultsList) return;
        
        searchResults.removeAttribute('hidden');
        
        this.displayItems(results, resultsList, (client) => {
            return createElement('div', 'client-search-item', `
                <div class="client-info">
                    <div class="name">${client.name} ${client.surname}</div>
                    <div class="details">${client.email || 'No email'} • ${client.phone || 'No phone'}</div>
                </div>
                <button class="select-client-btn" data-client-id="${client.id}">Select</button>
            `);
        });
    }
    
    /**
     * Select client for appointment and populate form
     * @param {string} clientId - ID of selected client
     */
    async selectClientForAppointment(clientId) {
        try {
            const response = await apiRequest(`/clients/${clientId}`);
            const client = response.client;
            
            // Store the client ID
            this.currentClientId = clientId;
            
            // Populate name and surname fields
            const nameField = document.getElementById('appointment-name');
            const surnameField = document.getElementById('appointment-surname');
            
            if (nameField) nameField.value = client.name || '';
            if (surnameField) surnameField.value = client.surname || '';
            
            this.clearClientSearchResults();
            
            // Focus next field
            const dateField = document.getElementById('appointment-date');
            if (dateField) dateField.focus();
            
            return true;
            
        } catch (error) {
            showError('Failed to load client data.', error);
            return false;
        }
    }
    
    /**
     * Clear client search results in appointment modal
     */
    clearClientSearchResults() {
        const searchResults = document.getElementById('client-search-results');
        const resultsList = document.getElementById('client-results-list');
        
        if (searchResults) searchResults.setAttribute('hidden', '');
        if (resultsList) resultsList.innerHTML = '';
    }
    
    /**
     * Save new appointment to database
     */
    async saveAppointment() {
        try {
            const data = this.getFormData('appointment-form');
            
            // Combine date and time into datetime field
            if (data.appointment_date && data.appointment_time) {
                data.appointment_datetime = `${data.appointment_date}T${data.appointment_time}`;
                delete data.appointment_date;
                delete data.appointment_time;
            } else {
                throw new Error('Appointment date and time are required');
            }
            
            const response = await apiRequest('/appointments', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            // Close the modal and reset the form
            modalManager.close();
            this.resetForm('appointment-form');
            showSuccess(response.message || `Appointment saved successfully! Procedure #${response.procedure_number}`);
            
            // Refresh the calendar if it's open
            const calendarEl = document.getElementById('calendar');
            if (calendarEl && calendarEl._fullCalendar) {
                calendarEl._fullCalendar.refetchEvents();
            }
            
        } catch (error) {
            showError(error.message || 'Failed to save appointment. Please try again.');
        }
    }
    
    /**
     * Initialize find appointment functionality
     */
    initializeFindAppointment() {
        const button = document.getElementById('find-appointment');
        const modal = document.getElementById('find-appointment-modal-overlay');
        const form = document.getElementById('find-appointment-form');
        const cancelButton = document.getElementById('find-appointment-cancel');
        const searchTermField = document.getElementById('appointment-search-term');
        
        this.setupModalListeners({
            button, modal, form, cancelButton,
            focusElementId: 'appointment-search-term',
            openCallback: () => this.clearAppointmentSearchResults(),
            closeCallback: () => this.clearAppointmentSearchResults(),
            submitCallback: () => this.searchAppointments()
        });
        
        // Handle edit button clicks from search results
        const resultsList = document.getElementById('appointment-results-list');
        if (resultsList) {
            resultsList.addEventListener('click', (e) => {
                if (e.target.classList.contains('edit-appointment-btn')) {
                    const appointmentId = e.target.getAttribute('data-appointment-id');
                    this.openEditAppointmentModal(appointmentId);
                }
            });
        }
        
        // Enter key support and input clearing
        if (searchTermField) {
            searchTermField.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    await this.searchAppointments();
                }
            });
            
            searchTermField.addEventListener('input', () => {
                const searchResults = document.getElementById('appointment-search-results');
                if (searchResults && !searchResults.hasAttribute('hidden')) {
                    this.clearAppointmentSearchResults();
                }
            });
        }
        
        this.initializeEditAppointment();
    }
    
    /**
     * Search for appointments based on field and term
     */
    async searchAppointments() {
        try {
            const field = document.getElementById('appointment-search-field').value;
            const term = document.getElementById('appointment-search-term').value.trim();
            
            if (!field || !term) {
                showError('Please select a field and enter a search term');
                return;
            }
            
            let appointments = [];
            
            if (field === 'date') {
                // Search appointments by date
                const response = await apiRequest('/appointments');
                const searchDate = new Date(term).toISOString().split('T')[0];
                appointments = response.results.filter(appointment => {
                    const appointmentDate = new Date(appointment.appointment_datetime).toISOString().split('T')[0];
                    return appointmentDate === searchDate;
                });
            } else {
                // Search by client fields (name, surname, phone)
                const clientResponse = await apiRequest(`/clients/search?field=${encodeURIComponent(field)}&term=${encodeURIComponent(term)}`);
                const clientIds = clientResponse.results.map(client => client.id);
                
                if (clientIds.length === 0) {
                    appointments = [];
                } else {
                    const appointmentResponse = await apiRequest('/appointments');
                    appointments = appointmentResponse.results.filter(appointment => 
                        clientIds.includes(appointment.client_id)
                    );
                }
            }
            
            await this.displayAppointmentSearchResults(appointments);
            
        } catch (error) {
            showError('Failed to search appointments.', error);
        }
    }
    
    /**
     * Display appointment search results with client data
     * @param {Array} appointments - Array of appointment search results
     */
    async displayAppointmentSearchResults(appointments) {
        const searchResults = document.getElementById('appointment-search-results');
        const resultsList = document.getElementById('appointment-results-list');
        
        if (!searchResults || !resultsList) return;
        
        searchResults.removeAttribute('hidden');
        resultsList.innerHTML = '';
        
        if (appointments.length === 0) {
            resultsList.innerHTML = '<p>No appointments found.</p>';
            return;
        }
        
        // Create table header
        const headerElement = createElement('div', 'appointment-results-header', `
            <div class="appointment-header-cell">Name</div>
            <div class="appointment-header-cell">Surname</div>
            <div class="appointment-header-cell">Area</div>
            <div class="appointment-header-cell">Procedure #</div>
            <div class="appointment-header-cell">Date</div>
            <div class="appointment-header-cell">Time</div>
            <div class="appointment-header-cell">Action</div>
            <div class="appointment-header-cell">Reminder</div>
        `);
        resultsList.appendChild(headerElement);
        
        // Also fetch clients to map names for sorting by Name (A→Z)
        const clientsResp = await apiRequest('/clients');
        const clientById = new Map((clientsResp.results || []).map(c => [c.id, c]));
        
        // Sort by client's Name (A→Z), then Surname
        const sortedAppointments = [...appointments].sort((a, b) => {
            const ca = clientById.get(a.client_id) || {}; 
            const cb = clientById.get(b.client_id) || {};
            const n = (ca.name || '').localeCompare(cb.name || '');
            return n !== 0 ? n : (ca.surname || '').localeCompare(cb.surname || '');
        });
        
        // Create appointment rows (use existing rendering expectations)
        for (const appointment of sortedAppointments) {
            const client = clientById.get(appointment.client_id) || { name: 'N/A', surname: 'N/A' };
            const { date, time } = formatDateTime(appointment.appointment_datetime);
            const appointmentElement = createElement('div', 'appointment-results-row', `
                <div class="appointment-cell">${client.name}</div>
                <div class="appointment-cell">${client.surname}</div>
                <div class="appointment-cell">${appointment.area || 'N/A'}</div>
                <div class="appointment-cell">${appointment.procedure_number || '1'}</div>
                <div class="appointment-cell">${date}</div>
                <div class="appointment-cell">${time}</div>
                <div class="appointment-cell">
                    <button class="edit-appointment-btn" data-appointment-id="${appointment.visit_id}">Edit</button>
                </div>
                <div class="appointment-cell">
                    <button class="send-sms-btn" type="button">Send SMS</button>
                </div>
            `);
            if (appointmentElement) resultsList.appendChild(appointmentElement);
        }
    }
    
    /**
     * Clear appointment search results
     */
    clearAppointmentSearchResults() {
        const searchResults = document.getElementById('appointment-search-results');
        const resultsList = document.getElementById('appointment-results-list');
        
        if (searchResults) searchResults.setAttribute('hidden', '');
        if (resultsList) resultsList.innerHTML = '';
    }
    
    /**
     * Initialize edit appointment functionality
     */
    initializeEditAppointment() {
        const modal = document.getElementById('edit-appointment-modal-overlay');
        const form = document.getElementById('edit-appointment-form');
        const cancelButton = document.getElementById('edit-appointment-cancel');
        
        if (!modal || !form) return;
        
        // Setup form submission and cancel
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                modalManager.close();
                this.resetForm('edit-appointment-form');
            });
        }
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateAppointment();
        });
        
        // Backdrop click
        modal.addEventListener('click', (e) => {
            modalManager.handleBackdropClick(e, 'edit-appointment-modal-overlay');
        });
    }
    
    /**
     * Open edit appointment modal and populate with data
     * @param {string} appointmentId - ID of appointment to edit
     */
    async openEditAppointmentModal(appointmentId) {
        try {
            // Fetch appointment data
            const appointmentResponse = await apiRequest('/appointments');
            const appointment = appointmentResponse.results.find(apt => apt.visit_id === appointmentId);
            
            if (!appointment) {
                showError('Appointment not found');
                return;
            }
            
            // Fetch client data
            let clientData = { name: '', surname: '' };
            if (appointment.client_id) {
                try {
                    const clientResponse = await apiRequest(`/clients/${appointment.client_id}`);
                    if (clientResponse.client) {
                        clientData = clientResponse.client;
                    }
                } catch (error) {
                    console.warn('Failed to fetch client data:', error);
                }
            }
            
            // Populate form fields
            const nameField = document.getElementById('edit-appointment-name');
            const surnameField = document.getElementById('edit-appointment-surname');
            const dateField = document.getElementById('edit-appointment-date');
            const timeField = document.getElementById('edit-appointment-time');
            const areaField = document.getElementById('edit-appointment-area');
            const powerField = document.getElementById('edit-appointment-power');
            const confirmedField = document.getElementById('edit-appointment-confirmed');
            const amountField = document.getElementById('edit-appointment-amount');
            
            // Populate client information (readonly)
            if (nameField) nameField.value = clientData.name || '';
            if (surnameField) surnameField.value = clientData.surname || '';
            
            // Populate appointment details (editable)
            if (areaField && appointment.area) {
                // Find the option that matches the appointment area (case-insensitive)
                const areaValue = appointment.area.toLowerCase();
                const option = Array.from(areaField.options).find(
                    opt => opt.value.toLowerCase() === areaValue
                );
                
                if (option) {
                    option.selected = true;
                } else {
                    // If no matching option found, set the value directly as fallback
                    areaField.value = areaValue;
                }
            }
            if (powerField) powerField.value = appointment.power || '';
            if (confirmedField) confirmedField.value = appointment.confirmed || 'no';
            if (amountField) amountField.value = appointment.amount_pln || '';
            
            // Parse and set date/time
            if (appointment.appointment_datetime) {
                const datetime = new Date(appointment.appointment_datetime);
                if (dateField) dateField.value = datetime.toISOString().split('T')[0];
                if (timeField) timeField.value = datetime.toTimeString().slice(0, 5);
            }
            
            // Store appointment ID for update
            this.currentAppointmentId = appointmentId;
            this.currentClientId = appointment.client_id;
            
            // Close find modal and open edit modal
            modalManager.close();
            modalManager.open('edit-appointment-modal-overlay', 'edit-appointment-date');
            
        } catch (error) {
            showError('Failed to load appointment data.', error);
        }
    }
    
    /**
     * Update appointment information
     */
    async updateAppointment() {
        try {
            const data = this.getFormData('edit-appointment-form');
            
            // Combine date and time into datetime field
            if (data.appointment_date && data.appointment_time) {
                data.appointment_datetime = `${data.appointment_date}T${data.appointment_time}`;
                delete data.appointment_date;
                delete data.appointment_time;
            }
            
            // Remove readonly client fields from appointment data
            delete data.name;
            delete data.surname;
            
            // Update appointment data with all editable fields
            await apiRequest(`/appointments/${this.currentAppointmentId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            modalManager.close();
            this.resetForm('edit-appointment-form');
            this.currentAppointmentId = null;
            this.currentClientId = null;
            
            showSuccess('Appointment updated successfully!');
            
        } catch (error) {
            showError('Failed to update appointment.', error);
        }
    }
    
    /**
     * Initialize show all appointments functionality (appointments.html only)
     */
    initializeShowAllAppointments() {
        if (!isCurrentPage('appointments.html')) return;
        
        const button = document.getElementById('show-all');
        const modal = document.getElementById('show-all-appointments-modal-overlay');
        const cancelButton = document.getElementById('show-all-appointments-cancel');
        const next7Button = document.getElementById('show-all-next7');
        const next30Button = document.getElementById('show-all-next30');
        const clearButton = document.getElementById('show-all-clear');
        const list = document.getElementById('show-all-appointments-list');
        
        this.setupModalListeners({
            button, modal, cancelButton,
            openCallback: () => this.loadAllAppointments(),
            closeCallback: () => { if (list) list.innerHTML = ''; }
        });
        
        // Handle edit button clicks from show all modal
        if (list) {
            list.addEventListener('click', (e) => {
                if (e.target.classList.contains('edit-appointment-btn')) {
                    const appointmentId = e.target.getAttribute('data-appointment-id');
                    this.openEditAppointmentModal(appointmentId);
                }
            });
        }

        // Add event listener for Next 7 days button
        if (next7Button) {
            next7Button.addEventListener('click', () => {
                this.loadAllAppointments({ daysAhead: 7 });
            });
        }

        // Add event listener for Next 30 days button
        if (next30Button) {
            next30Button.addEventListener('click', () => {
                this.loadAllAppointments({ daysAhead: 30 });
            });
        }

        // Add event listener for Clear filter button
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.loadAllAppointments();
            });
        }
    }
    
    /**
     * Load and display all appointments with client data
     * @param {Object} options - Filtering options
     * @param {number} [options.daysAhead] - Number of days ahead to filter appointments
     */
    async loadAllAppointments(options = {}) {
        const appointmentsList = document.getElementById('show-all-appointments-list');
        if (!appointmentsList) return;

        appointmentsList.innerHTML = '<p>Loading appointments...</p>';
        
        try {
            const response = await apiRequest('/appointments');
            const clientsResp = await apiRequest('/clients');
            const clientById = new Map((clientsResp.results || []).map(c => [c.id, c]));
            
            // Filter appointments based on date range if daysAhead is specified
            let appointments = response.results || [];
            
            if (options.daysAhead) {
                const now = new Date();
                const endDate = new Date();
                endDate.setDate(now.getDate() + options.daysAhead);
                
                appointments = appointments.filter(appt => {
                    const apptDate = new Date(appt.appointment_datetime);
                    return apptDate >= now && apptDate <= endDate;
                });
                
                // Sort by date and time
                appointments.sort((a, b) => {
                    return new Date(a.appointment_datetime) - new Date(b.appointment_datetime);
                });
            }
            
            // Clear previous content
            appointmentsList.innerHTML = '';
            
            // Create table header
            const headerElement = createElement('div', 'show-all-appointments-header', `
                <div class="show-all-header-cell">Name</div>
                <div class="show-all-header-cell">Surname</div>
                <div class="show-all-header-cell">Area</div>
                <div class="show-all-header-cell">Procedure #</div>
                <div class="show-all-header-cell">Date</div>
                <div class="show-all-header-cell">Time</div>
                <div class="show-all-header-cell">Action</div>
            `);
            if (headerElement) appointmentsList.appendChild(headerElement);
            
            // If no appointments found
            if (appointments.length === 0) {
                const noResults = createElement('div', 'no-results', 'No appointments found' + 
                    (options.daysAhead ? ` in the next ${options.daysAhead} days` : ''));
                appointmentsList.appendChild(noResults);
                return;
            }
            
            // Sort by client's Name (A→Z), then Surname if not already sorted by date
            if (!options.daysAhead) {
                appointments.sort((a, b) => {
                    const ca = clientById.get(a.client_id) || {}; 
                    const cb = clientById.get(b.client_id) || {};
                    const n = (ca.name || '').localeCompare(cb.name || '');
                    return n !== 0 ? n : (ca.surname || '').localeCompare(cb.surname || '');
                });
            }
            
            // Create appointment rows
            for (const appointment of appointments) {
                const client = clientById.get(appointment.client_id) || { name: 'N/A', surname: 'N/A' };
                const { date, time } = formatDateTime(appointment.appointment_datetime);
                const appointmentElement = createElement('div', 'show-all-appointments-row', `
                    <div class="show-all-cell">${client.name}</div>
                    <div class="show-all-cell">${client.surname}</div>
                    <div class="show-all-cell">${appointment.area || 'N/A'}</div>
                    <div class="show-all-cell">${appointment.procedure_number || '1'}</div>
                    <div class="show-all-cell">${date}</div>
                    <div class="show-all-cell">${time}</div>
                    <div class="show-all-cell">
                        <button class="edit-appointment-btn" data-appointment-id="${appointment.visit_id}">Edit</button>
                    </div>
                `);
                if (appointmentElement) appointmentsList.appendChild(appointmentElement);
            }
            
        } catch (error) {
            showError('Failed to load appointments.', error);
        }
    }
    
    /**
     * Handle appointment selection for drill-down functionality
     * @param {string} appointmentId - ID of selected appointment
     */
    selectAppointment(appointmentId) {
        modalManager.close();
        // TODO: Implement drill-down functionality
        // This could open a detailed appointment view or edit modal
    }

    /**
     * Initialize upcoming appointments modal open/close behavior
     */
    initializeUpcomingAppointments() {
        const button = document.getElementById('upcoming-appointments');
        const modal = document.getElementById('upcoming-appointments-modal-overlay');
        const cancelButton = document.getElementById('upcoming-appointments-cancel');
        const tableBody = document.querySelector('#upcoming-appointments-table tbody');
        const next7Button = document.getElementById('upcoming-appointments-next7');
        const next30Button = document.getElementById('upcoming-appointments-next30');
        const clearButton = document.getElementById('upcoming-appointments-clear');

        this.setupModalListeners({
            button, modal, cancelButton,
            openCallback: () => {
                this.loadUniqueAppointmentClients();
            },
            closeCallback: () => {
                if (tableBody) tableBody.innerHTML = '';
            }
        });

        // Filter for next 7 days
        if (next7Button) {
            next7Button.addEventListener('click', () => {
                this.loadUniqueAppointmentClients({ days: 7 });
            });
        }

        // Filter for next 30 days
        if (next30Button) {
            next30Button.addEventListener('click', () => {
                this.loadUniqueAppointmentClients({ days: 30 });
            });
        }

        // Clear filter
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.loadUniqueAppointmentClients();
            });
        }
    }

    /**
     * Load unique client-area pairs found in appointments (past and/or future).
     * Render columns: Name, Surname, Area, Last Visit, Procedure #, Next Visit.
     */
    async loadUniqueAppointmentClients(options = {}) {
        const tbody = document.querySelector('#upcoming-appointments-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        try {
            const [appointmentsResp, clientsResp] = await Promise.all([
                apiRequest('/appointments'),
                apiRequest('/clients')
            ]);

            const appointments = Array.isArray(appointmentsResp.results) ? appointmentsResp.results : [];
            const clients = Array.isArray(clientsResp.results) ? clientsResp.results : [];

            // Map clients by id for quick lookup
            const clientById = new Map(clients.map(c => [c.id, c]));

            // Collect unique (client_id, area) pairs from appointments
            const pairSet = new Set(
                appointments
                    .filter(a => a && a.client_id && a.area)
                    .map(a => `${a.client_id}||${a.area}`)
            );

            const now = new Date();
            const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const windowDays = typeof options.days === 'number' ? options.days : null;
            const maxDateOnly = windowDays !== null ? new Date(todayDateOnly) : null;
            if (maxDateOnly) maxDateOnly.setDate(maxDateOnly.getDate() + windowDays);

            // Build rows with name, surname, area, last visit date (<= today) and its procedure_number
            let rows = Array.from(pairSet).map(key => {
                const [clientId, area] = key.split('||');
                const client = clientById.get(clientId) || { name: '', surname: '' };

                // Find latest past (<= now) CONFIRMED appointment for this client and area
                const lastPast = appointments
                    .filter(a => a.client_id === clientId && a.area === area && a.appointment_datetime && a.confirmed === 'yes')
                    .map(a => ({ a, dt: new Date(a.appointment_datetime) }))
                    .filter(({ dt }) => !isNaN(dt.getTime()) && dt <= now)
                    .sort((x, y) => y.dt - x.dt)[0];

                const lastVisit = lastPast
                    ? lastPast.dt.toLocaleDateString('en-GB', CONFIG.DATE_FORMAT_OPTIONS)
                    : '';
                const procedureNumber = lastPast && lastPast.a && lastPast.a.procedure_number
                    ? lastPast.a.procedure_number
                    : '';

                // Compute Next Visit using SESSION_WAIT rules based on next session after last procedure
                let nextVisit = '';
                let nextOverdue = false;
                let nextDateOnlyTs = null;
                if (lastPast && procedureNumber !== '') {
                    const procNum = Number(procedureNumber);
                    if (!Number.isNaN(procNum)) {
                        const nextSession = procNum + 1;
                        const waitCfg = CONFIG.SESSION_WAIT && CONFIG.SESSION_WAIT[nextSession];
                        const weeks = waitCfg && typeof waitCfg.min_weeks_after_previous === 'number' ? waitCfg.min_weeks_after_previous : null;
                        if (weeks !== null) {
                            const nextDt = new Date(lastPast.dt);
                            nextDt.setDate(nextDt.getDate() + weeks * 7);
                            if (!isNaN(nextDt.getTime())) {
                                nextVisit = nextDt.toLocaleDateString('en-GB', CONFIG.DATE_FORMAT_OPTIONS);
                                // Compare date-only to mark overdue
                                const nextDateOnly = new Date(nextDt.getFullYear(), nextDt.getMonth(), nextDt.getDate());
                                nextDateOnlyTs = nextDateOnly.getTime();
                                nextOverdue = nextDateOnly < todayDateOnly;
                            }
                        }
                    }
                }

                return {
                    name: client.name || '',
                    surname: client.surname || '',
                    area: area || '',
                    lastVisit,
                    procedure: procedureNumber,
                    nextVisit,
                    nextOverdue,
                    _nextDateOnlyTs: nextDateOnlyTs
                };
            });

            // Optional filter: show rows with Next Visit within [today, today + days] or overdue
            if (windowDays !== null) {
                const minTs = todayDateOnly.getTime();
                const maxTs = maxDateOnly.getTime();
                // Include appointments that are either:
                // 1. Within the date range [today, today + days], or
                // 2. Overdue (next visit date is before today) and the next visit date is not too far in the past (within 30 days)
                const thirtyDaysAgo = new Date(todayDateOnly);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const thirtyDaysAgoTs = thirtyDaysAgo.getTime();
                
                rows = rows.filter(r => {
                    if (typeof r._nextDateOnlyTs !== 'number') return false;
                    
                    // Include if within the date range
                    if (r._nextDateOnlyTs >= minTs && r._nextDateOnlyTs <= maxTs) {
                        return true;
                    }
                    
                    // Include if overdue but not too far in the past (within last 30 days)
                    if (r.nextOverdue && r._nextDateOnlyTs >= thirtyDaysAgoTs) {
                        return true;
                    }
                    
                    return false;
                });
            } else {
                // Default view: exclude rows with blank Last Visit
                rows = rows.filter(r => !!r.lastVisit);
            }

            // Sort by Name (A→Z), then Surname, then Area
            rows.sort((a, b) => {
                const n = a.name.localeCompare(b.name);
                if (n !== 0) return n;
                const s = a.surname.localeCompare(b.surname);
                if (s !== 0) return s;
                return a.area.localeCompare(b.area);
            });

            // Render rows
            if (rows.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = 6;
                td.textContent = 'No appointment records found.';
                tr.appendChild(td);
                tbody.appendChild(tr);
                return;
            }

            for (const r of rows) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.name}</td>
                    <td>${r.surname}</td>
                    <td>${r.area}</td>
                    <td>${r.lastVisit}</td>
                    <td>${r.procedure}</td>
                    <td><span class="next-visit ${r.nextOverdue ? 'overdue' : ''}">${r.nextVisit}</span></td>
                    <td>
                        <button class="send-sms-btn" type="button">Send SMS</button>
                    </td>
                    <td>
                        <button class="send-email-btn" type="button">Send E-mail</button>
                    </td>
                    <td>
                        <button class="send-msg-btn" type="button">Send msg</button>
                    </td>
                    <td>
                        <button class="send-ig-btn" type="button">Send ig</button>
                    </td>
                `;
                tbody.appendChild(tr);
            }

        } catch (error) {
            showError('Failed to load upcoming appointments.', error);
        }
    }
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

/**
 * Initialize application when DOM is fully loaded.
 * Creates manager instances and exposes them globally for debugging.
 * This is the main entry point for the application.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Laserovo application...');
    
    try {
        // Initialize manager instances for client and appointment operations
        const clientManager = new ClientManager();
        const appointmentManager = new AppointmentManager();
        
        // Expose managers and utilities globally for debugging and console access
        window.laserovo = {
            clientManager,           // Client management operations
            appointmentManager,      // Appointment management operations
            modalManager,            // Modal control
            utils: {                 // Utility functions
                showError,           // Error display
                showSuccess,         // Success display
                apiRequest,          // API communication
                formatDateTime,      // Date/time formatting
                isCurrentPage        // Page detection
            }
        };
        
        console.log('Laserovo application initialized successfully!');
        
    } catch (error) {
        console.error('Failed to initialize Laserovo application:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
});