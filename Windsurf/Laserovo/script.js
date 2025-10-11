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

console.log("Welcome to Laserovo!");

// =============================================================================
// GLOBAL CONFIGURATION
// =============================================================================

const CONFIG = {
    API_BASE_URL: '', // Empty for same-origin requests
    MODAL_ANIMATION_DURATION: 200,
    DEBOUNCE_DELAY: 300,
    DATE_FORMAT_OPTIONS: { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    },
    TIME_FORMAT_OPTIONS: { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    },
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
    // Expense categories with their IDs and names
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
    // Minimum waiting periods between sessions (in weeks) for the same treatment zone
    // Session 1 is initial; subsequent sessions require a minimum wait after the previous session
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
 * Debounce function to limit API calls and improve performance
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
 * Display user-friendly error message with console logging
 * @param {string} message - Error message to display
 * @param {Error} error - Original error object (optional)
 */
function showError(message, error = null) {
    console.error('Error:', message, error);
    alert(`Error: ${message}`);
}

/**
 * Display success message with console logging
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    console.log('Success:', message);
    alert(message);
}

/**
 * Make API request with comprehensive error handling
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Parsed JSON response
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
        
        if (!response.ok || data.status !== 'ok') {
            throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
    } catch (error) {
        throw new Error(`API request failed: ${error.message}`);
    }
}

/**
 * Format date and time from datetime string
 * @param {string} datetimeString - ISO datetime string
 * @returns {Object} Object with formatted date and time
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
 * Check if current page matches the specified page name
 * @param {string} pageName - Name of the page to check
 * @returns {boolean} True if current page matches
 */
function isCurrentPage(pageName) {
    return window.location.pathname.includes(pageName);
}

/**
 * Create HTML element with specified content and class
 * @param {string} tag - HTML tag name
 * @param {string} className - CSS class name
 * @param {string} innerHTML - HTML content
 * @returns {HTMLElement} Created element
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
 * Centralized modal manager for consistent modal operations
 */
class ModalManager {
    constructor() {
        this.activeModal = null;
    }
    
    /**
     * Open a modal by ID with optional focus management
     * @param {string} modalId - ID of the modal element
     * @param {string} focusElementId - ID of element to focus (optional)
     */
    open(modalId, focusElementId = null) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with ID '${modalId}' not found`);
            return;
        }
        
        this.activeModal = modal;
        modal.removeAttribute('hidden');
        
        // Focus management for accessibility
        if (focusElementId) {
            const focusElement = document.getElementById(focusElementId);
            if (focusElement) {
                setTimeout(() => focusElement.focus(), 100);
            }
        }
    }
    
    /**
     * Close the currently active modal
     */
    close() {
        if (this.activeModal) {
            this.activeModal.setAttribute('hidden', '');
            this.activeModal = null;
        }
    }
    
    /**
     * Handle backdrop click to close modal
     * @param {Event} event - Click event
     * @param {string} modalId - ID of the modal
     */
    handleBackdropClick(event, modalId) {
        const modal = document.getElementById(modalId);
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
 * Base class for all managers with common functionality
 */
class BaseManager {
    /**
     * Get form data as object from form element
     * @param {string} formId - ID of the form element
     * @returns {Object} Form data as key-value pairs
     */
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        
        const formData = new FormData(form);
        return Object.fromEntries(formData.entries());
    }
    
    /**
     * Reset and clear form
     * @param {string} formId - ID of the form element
     */
    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }
    
    /**
     * Setup modal event listeners with consistent behavior
     * @param {Object} config - Configuration object
     */
    setupModalListeners(config) {
        const { 
            button, modal, cancelButton, form, 
            openCallback, closeCallback, submitCallback 
        } = config;
        
        if (!button || !modal) return;
        
        // Open modal
        button.addEventListener('click', () => {
            modalManager.open(modal.id, config.focusElementId);
            if (openCallback) openCallback();
        });
        
        // Close modal
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                modalManager.close();
                if (closeCallback) closeCallback();
            });
        }
        
        // Backdrop click
        modal.addEventListener('click', (e) => {
            modalManager.handleBackdropClick(e, modal.id);
        });
        
        // Form submission
        if (form && submitCallback) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await submitCallback();
            });
        }
    }
    
    /**
     * Display list items with consistent formatting
     * @param {Array} items - Array of items to display
     * @param {HTMLElement} container - Container element
     * @param {Function} renderCallback - Function to render each item
     */
    displayItems(items, container, renderCallback) {
        if (!container) return;
        
        container.innerHTML = '';
        
        if (items.length === 0) {
            container.innerHTML = '<p>No items found.</p>';
            return;
        }
        
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
 * Manages all client-related operations
 */
class ClientManager extends BaseManager {
    constructor() {
        super();
        this.currentClientId = null;
        this.initializeEventListeners();
    }
    
    /**
     * Initialize all client management event listeners
     */
    initializeEventListeners() {
        this.initializeAddClient();
        this.initializeSearchClient();
        this.initializeEditClient();
        this.initializeShowAllClients();
    }
    
    /**
     * Initialize add new client functionality
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
     * Save new client to database
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
     * Initialize client search functionality
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
     * Search for clients based on field and term
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
     * Clear search results and hide container
     */
    clearSearchResults() {
        const searchResults = document.getElementById('search-results');
        const resultsList = document.getElementById('results-list');
        
        if (searchResults) searchResults.setAttribute('hidden', '');
        if (resultsList) resultsList.innerHTML = '';
    }
    
    /**
     * Close search modal and reset state
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
     * Initialize edit client functionality
     */
    initializeEditClient() {
        const modal = document.getElementById('edit-modal-overlay');
        const form = document.getElementById('edit-form');
        const cancelButton = document.getElementById('edit-cancel');
        const statsCloseButton = document.getElementById('stats-close');
        
        if (!modal || !form) return;
        
        // Handle edit and stats button clicks from search results
        const resultsList = document.getElementById('results-list');
        if (resultsList) {
            resultsList.addEventListener('click', async (e) => {
                if (e.target.classList.contains('edit-btn')) {
                    const clientId = e.target.getAttribute('data-client-id');
                    this.openEditModal(clientId);
                } else if (e.target.classList.contains('stats-btn')) {
                    const clientId = e.target.getAttribute('data-client-id');
                    await this.showClientStats(clientId);
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
     * Open edit modal and populate with client data
     * @param {string} clientId - ID of client to edit
     */
    async openEditModal(clientId) {
        try {
            const response = await apiRequest(`/clients/${clientId}`);
            const client = response.client;
            
            // Populate form fields
            const fields = ['name', 'surname', 'phone', 'email', 'facebook', 'instagram', 'booksy', 'dob'];
            fields.forEach(field => {
                const element = document.getElementById(`edit-${field}`);
                if (element) {
                    element.value = client[field] || '';
                }
            });
            
            this.currentClientId = clientId;
            modalManager.open('edit-modal-overlay', 'edit-name');
            
        } catch (error) {
            showError('Failed to load client data for editing.', error);
        }
    }
    
    /**
     * Update client information
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
     * Initialize show all clients functionality (clients.html only)
     */
    initializeShowAllClients() {
        if (!isCurrentPage('clients.html')) return;
        
        const button = document.getElementById('show-all');
        const modal = document.getElementById('show-all-modal-overlay');
        const cancelButton = document.getElementById('show-all-cancel');
        const list = document.getElementById('show-all-list');
        
        this.setupModalListeners({
            button, modal, cancelButton,
            openCallback: () => this.loadAllClients(),
            closeCallback: () => { if (list) list.innerHTML = ''; }
        });
        
        // Handle edit button clicks from show all modal
        if (list) {
            list.addEventListener('click', (e) => {
                if (e.target.classList.contains('edit-btn')) {
                    const clientId = e.target.getAttribute('data-client-id');
                    this.openEditModal(clientId);
                    modalManager.close();
                }
            });
        }
    }
    
    /**
     * Load and display all clients
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
            
            // Create table header
            const headerElement = createElement('div', 'show-all-clients-header', `
                <div class="show-all-header-cell">Name</div>
                <div class="show-all-header-cell">Surname</div>
                <div class="show-all-header-cell">Phone</div>
                <div class="show-all-header-cell">Email</div>
                <div class="show-all-header-cell">DOB</div>
                <div class="show-all-header-cell">Action</div>
            `);
            
            if (headerElement) {
                showAllList.appendChild(headerElement);
            }
            
            // Sort clients by Name (A→Z), then Surname
            const sortedClients = [...response.results].sort((a, b) => {
                const n = (a.name || '').localeCompare(b.name || '');
                return n !== 0 ? n : (a.surname || '').localeCompare(b.surname || '');
            });
            
            // Create client rows
            for (const client of sortedClients) {
                const clientElement = createElement('div', 'show-all-clients-row', `
                    <div class="show-all-cell">${client.name || 'N/A'}</div>
                    <div class="show-all-cell">${client.surname || 'N/A'}</div>
                    <div class="show-all-cell">${client.phone || 'N/A'}</div>
                    <div class="show-all-cell">${client.email || 'N/A'}</div>
                    <div class="show-all-cell">${client.dob || 'N/A'}</div>
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
     * Show client statistics in a modal
     * @param {string} clientId - ID of the client
     */
    async showClientStats(clientId) {
        try {
            // Get client details and stats in parallel
            const [clientResponse, statsResponse] = await Promise.all([
                apiRequest(`/clients/${clientId}`),
                apiRequest(`/clients/${clientId}/stats`)
            ]);

            const client = clientResponse.client;
            const stats = statsResponse.stats || {};
            const lastVisits = statsResponse.last_visits || {};
            const lastProcedures = statsResponse.last_procedures || {};

            // Set client name in the modal
            document.getElementById('client-stats-name').textContent = `${client.name} ${client.surname}`;

            // Build areas with counts, last visit and next visit estimation
            const treatmentAreas = CONFIG.AREAS.map(cfg => {
                const key = cfg.area.toLowerCase();
                const name = cfg.area.charAt(0).toUpperCase() + cfg.area.slice(1);
                const visits = stats[key] || 0;
                const lastRaw = lastVisits[key] || '';
                let lastDisplay = '';
                let nextDisplay = '';
                let nextOverdue = false;
                if (lastRaw) {
                    const dt = new Date(lastRaw);
                    if (!isNaN(dt.getTime())) {
                        lastDisplay = dt.toLocaleDateString('en-GB', CONFIG.DATE_FORMAT_OPTIONS);
                        // Determine next session number and required wait (in weeks) based on last procedure number
                        const lastProcNum = lastProcedures[key] || 0;
                        const nextSession = lastProcNum + 1;
                        const waitCfg = CONFIG.SESSION_WAIT && CONFIG.SESSION_WAIT[nextSession];
                        const weeks = waitCfg && typeof waitCfg.min_weeks_after_previous === 'number' ? waitCfg.min_weeks_after_previous : null;
                        if (weeks !== null) {
                            const nextDt = new Date(dt);
                            nextDt.setDate(nextDt.getDate() + (weeks * 7));
                            if (!isNaN(nextDt.getTime())) {
                                nextDisplay = nextDt.toLocaleDateString('en-GB', CONFIG.DATE_FORMAT_OPTIONS);
                                // Mark overdue if next visit date is earlier than today
                                const today = new Date();
                                // Compare by date only (ignore time) to avoid timezone surprises
                                const nextDateOnly = new Date(nextDt.getFullYear(), nextDt.getMonth(), nextDt.getDate());
                                const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                nextOverdue = nextDateOnly < todayDateOnly;
                            }
                        }
                    }
                }
                // Procedure # is the actual procedure_number of the latest confirmed, non-future visit for this area
                const procedureNumber = lastProcedures[key] || '';
                const recommendedProcedures = cfg.recommended_procedures || 0;
                const pctNum = (procedureNumber && recommendedProcedures)
                    ? Math.round(Math.min(100, Math.max(0, (procedureNumber / recommendedProcedures) * 100)))
                    : null;
                const progressPct = pctNum !== null ? `${pctNum}%` : '';
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

            // Sort areas alphabetically
            treatmentAreas.sort((a, b) => a.name.localeCompare(b.name));

            // Populate treatment areas list
            const treatmentList = document.getElementById('treatment-areas-list');
            treatmentList.innerHTML = '';

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

            // Show the modal
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
 * Manages all appointment-related operations
 */
class AppointmentManager extends BaseManager {
    constructor() {
        super();
        this.currentAppointmentId = null;
        this.currentClientId = null;
        this.initializeEventListeners();
    }
    
    /**
     * Initialize all appointment management event listeners
     */
    initializeEventListeners() {
        this.initializeMakeAppointment();
        this.initializeFindAppointment();
        this.initializeShowAllAppointments();
        this.initializeUpcomingAppointments();
    }
    
    /**
     * Initialize make appointment functionality
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
     * Initialize client search within appointment modal
     */
    initializeClientSearch() {
        const searchBtn = document.getElementById('search-client-btn');
        const searchResults = document.getElementById('client-search-results');
        const resultsList = document.getElementById('client-results-list');
        const searchTermField = document.getElementById('client-search-term');
        
        if (!searchBtn || !searchResults || !resultsList) return;
        
        // Search button click
        searchBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.searchClientForAppointment();
        });
        
        // Client selection from results
        resultsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('select-client-btn')) {
                const clientId = e.target.getAttribute('data-client-id');
                this.selectClientForAppointment(clientId);
            }
        });
        
        // Enter key support and input clearing
        if (searchTermField) {
            searchTermField.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    await this.searchClientForAppointment();
                }
            });
            
            searchTermField.addEventListener('input', () => {
                if (!searchResults.hasAttribute('hidden')) {
                    this.clearClientSearchResults();
                }
            });
        }
    }
    
    /**
     * Search for clients within appointment modal
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
            
            // Handle combined search (both name and surname)
            if (searchField === 'both') {
                allResults = await this.performCombinedClientSearch(searchTerm);
            } else {
                const response = await apiRequest(`/clients/search?field=${encodeURIComponent(searchField)}&term=${encodeURIComponent(searchTerm)}`);
                allResults = response.results;
            }
            
            this.displayClientSearchResults(allResults);
            
        } catch (error) {
            showError('Failed to search clients.', error);
        }
    }
    
    /**
     * Perform combined search by name and surname
     * @param {string} searchTerm - Term to search for
     * @returns {Array} Combined unique results
     */
    async performCombinedClientSearch(searchTerm) {
        let allResults = [];
        
        // Search by name
        try {
            const nameResponse = await apiRequest(`/clients/search?field=name&term=${encodeURIComponent(searchTerm)}`);
            allResults = [...nameResponse.results];
        } catch (error) {
            console.warn('Name search failed:', error);
        }
        
        // Search by surname and merge unique results
        try {
            const surnameResponse = await apiRequest(`/clients/search?field=surname&term=${encodeURIComponent(searchTerm)}`);
            const existingIds = new Set(allResults.map(client => client.id));
            const newResults = surnameResponse.results.filter(client => !existingIds.has(client.id));
            allResults = [...allResults, ...newResults];
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
            
            // Populate name and surname fields
            const nameField = document.getElementById('appointment-name');
            const surnameField = document.getElementById('appointment-surname');
            
            if (nameField) nameField.value = client.name || '';
            if (surnameField) surnameField.value = client.surname || '';
            
            this.clearClientSearchResults();
            
            // Focus next field
            const dateField = document.getElementById('appointment-date');
            if (dateField) dateField.focus();
            
        } catch (error) {
            showError('Failed to load client data.', error);
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
            }
            
            const response = await apiRequest('/appointments', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            modalManager.close();
            this.resetForm('appointment-form');
            showSuccess(response.message || `Appointment saved successfully! Procedure #${response.procedure_number}`);
            
        } catch (error) {
            showError('Failed to save appointment. Please ensure the backend is running.', error);
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
    }
    
    /**
     * Load and display all appointments with client data
     */
    async loadAllAppointments() {
        try {
            const response = await apiRequest('/appointments');
            const appointmentsList = document.getElementById('show-all-appointments-list');
            
            if (!appointmentsList) return;
            
            appointmentsList.innerHTML = '';
            
            if (response.results.length === 0) {
                appointmentsList.innerHTML = '<p>No appointments found.</p>';
                return;
            }
            
            // Also fetch clients to map names for sorting by Name (A→Z)
            const clientsResp = await apiRequest('/clients');
            const clientById = new Map((clientsResp.results || []).map(c => [c.id, c]));
            
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
            
            // Sort by client's Name (A→Z), then Surname
            const sortedAppointments = [...response.results].sort((a, b) => {
                const ca = clientById.get(a.client_id) || {}; 
                const cb = clientById.get(b.client_id) || {};
                const n = (ca.name || '').localeCompare(cb.name || '');
                return n !== 0 ? n : (ca.surname || '').localeCompare(cb.surname || '');
            });
            
            // Create appointment rows (use existing rendering expectations)
            for (const appointment of sortedAppointments) {
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
 * Initialize application when DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Laserovo application...');
    
    try {
        // Initialize managers
        const clientManager = new ClientManager();
        const appointmentManager = new AppointmentManager();
        
        // Make managers globally available for debugging
        window.laserovo = {
            clientManager,
            appointmentManager,
            modalManager,
            utils: {
                showError,
                showSuccess,
                apiRequest,
                formatDateTime,
                isCurrentPage
            }
        };
        
        console.log('Laserovo application initialized successfully!');
        
    } catch (error) {
        console.error('Failed to initialize Laserovo application:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
});