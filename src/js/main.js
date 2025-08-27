/* ============================================================================
   CODEX NOVA NEBULA - Main Application Controller
   Handles app initialization, navigation, and module loading
   ============================================================================ */

// Global app state
const App = {
    currentSection: 'dashboard',
    modules: {},
    isInitialized: false
};

// ============================================================================
// APP INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Codex Nova Nebula - Starting application...');
    
    // Check configuration
    if (!validateConfiguration()) {
        showConfigurationError();
        return;
    }
    
    // Initialize the application
    await initializeApp();
});

/**
 * Validate required configuration
 */
function validateConfiguration() {
    // Check if Airtable is configured
    if (!Config.AIRTABLE.BASE_ID || 
        Config.AIRTABLE.BASE_ID === 'YOUR_BASE_ID_HERE' ||
        Config.AIRTABLE.BASE_ID.startsWith('app') === false) {
        console.error('❌ Invalid Airtable Base ID');
        return false;
    }
    
    if (!Config.AIRTABLE.API_KEY || 
        Config.AIRTABLE.API_KEY === 'YOUR_API_KEY_HERE') {
        console.error('❌ Invalid Airtable API Key');
        return false;
    }
    
    return true;
}

/**
 * Show configuration error message
 */
function showConfigurationError() {
    const contentArea = document.querySelector('.content-inner');
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">⚠️ Configuration Required</h2>
                </div>
                <div class="card-body">
                    <div class="alert alert-danger">
                        <h4>Airtable configuration is missing or invalid</h4>
                        <p>Please configure the following in <code>src/js/config.js</code>:</p>
                        <ul>
                            <li><strong>AIRTABLE.BASE_ID</strong>: Your Airtable Base ID (starts with 'app')</li>
                            <li><strong>AIRTABLE.API_KEY</strong>: Your Airtable API Key (starts with 'key' or 'pat')</li>
                        </ul>
                        <p class="mt-lg">
                            <a href="https://airtable.com/api" target="_blank" class="btn btn-primary">
                                Get Your Airtable API Credentials
                            </a>
                        </p>
                    </div>
                </div>
            </div>`;
    }
}

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        // Set up navigation
        setupNavigation();
        
        // Set up mobile menu
        setupMobileMenu();
        
        // Set up quick actions
        setupQuickActions();
        
        // Set up search
        setupSearch();
        
        // Initialize the current section
        const initialSection = getInitialSection();
        await switchSection(initialSection);
        
        // Mark as initialized
        App.isInitialized = true;
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showInitializationError(error);
    }
}

/**
 * Show initialization error
 */
function showInitializationError(error) {
    const contentArea = document.querySelector('.content-inner');
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">⚠️ Initialization Error</h2>
                </div>
                <div class="card-body">
                    <div class="alert alert-danger">
                        <h4>Failed to initialize the application</h4>
                        <p>${error.message || 'Unknown error occurred'}</p>
                        <p class="mt-lg">
                            <button class="btn btn-primary" onclick="location.reload()">
                                Refresh Page
                            </button>
                        </p>
                    </div>
                </div>
            </div>`;
    }
}

/**
 * Get initial section from URL or default
 */
function getInitialSection() {
    // Check URL hash
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'promocode', 'braze', 'utm', 'data', 'rules', 'history'].includes(hash)) {
        return hash;
    }
    
    // Default to promocode for now since it's the only implemented module
    return 'promocode';
}

// ============================================================================
// NAVIGATION
// ============================================================================

/**
 * Set up navigation handlers
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    
    navItems.forEach(item => {
        item.addEventListener('click', async function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            await switchSection(section);
        });
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', async (e) => {
        const section = e.state?.section || 'dashboard';
        await switchSection(section, false);
    });
}

/**
 * Switch to a different section
 */
async function switchSection(section, updateHistory = true) {
    if (!section || section === App.currentSection) return;
    
    try {
        // Update navigation UI
        updateNavigationUI(section);
        
        // Update header title
        updateHeaderTitle(section);
        
        // Hide all sections
        hideAllSections();
        
        // Show and initialize the target section
        await showSection(section);
        
        // Update current section
        App.currentSection = section;
        
        // Update URL
        if (updateHistory) {
            history.pushState({ section }, '', `#${section}`);
        }
        
        if (Config.FEATURES.DEBUG_MODE) {
            console.log(`📍 Switched to section: ${section}`);
        }
        
    } catch (error) {
        console.error(`Failed to switch to section ${section}:`, error);
        showSectionError(section, error);
    }
}

/**
 * Update navigation UI
 */
function updateNavigationUI(activeSection) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current nav item
    const activeItem = document.querySelector(`.nav-item[data-section="${activeSection}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

/**
 * Update header title
 */
function updateHeaderTitle(section) {
    const headerTitle = document.querySelector('.header-title');
    if (!headerTitle) return;
    
    const titles = {
        'dashboard': 'Naming Standards Platform',
        'promocode': 'Generate Offercodes',
        'braze': 'Braze Naming Standards',
        'utm': 'UTM Link Builder',
        'data': 'Data Management Naming',
        'rules': 'Naming Rules Overview',
        'history': 'Generation History'
    };
    
    headerTitle.textContent = titles[section] || 'Naming Standards Platform';
}

/**
 * Hide all sections
 */
function hideAllSections() {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
}

/**
 * Show and initialize a section
 */
async function showSection(section) {
    // Get or create the section element
    let sectionElement = document.getElementById(`${section}-section`);
    
    if (!sectionElement) {
        // Create section if it doesn't exist
        sectionElement = createSection(section);
    }
    
    // Show the section
    sectionElement.style.display = 'block';
    sectionElement.classList.add('active');
    
    // Initialize section-specific module
    await initializeSectionModule(section);
}

/**
 * Create a new section element
 */
function createSection(section) {
    const contentInner = document.querySelector('.content-inner');
    const sectionElement = document.createElement('div');
    sectionElement.id = `${section}-section`;
    sectionElement.className = 'tab-content';
    contentInner.appendChild(sectionElement);
    return sectionElement;
}

/**
 * Initialize section-specific module
 */
async function initializeSectionModule(section) {
    switch (section) {
        case 'promocode':
            await loadPromocodeModule();
            break;
        case 'braze':
            await loadBrazeModule();
            break;
        case 'utm':
            await loadUTMModule();
            break;
        case 'data':
            await loadDataModule();
            break;
        case 'rules':
            await loadRulesModule();
            break;
        case 'history':
            await loadHistoryModule();
            break;
        case 'dashboard':
        default:
            // Dashboard doesn't need a module
            break;
    }
}

/**
 * Show section error
 */
function showSectionError(section, error) {
    const sectionElement = document.getElementById(`${section}-section`);
    if (sectionElement) {
        sectionElement.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Error Loading Section</h2>
                </div>
                <div class="card-body">
                    <div class="alert alert-danger">
                        <p>${error.message || 'Failed to load this section'}</p>
                    </div>
                </div>
            </div>`;
    }
}

// ============================================================================
// MODULE LOADERS
// ============================================================================

/**
 * Load Promocode Module
 */
async function loadPromocodeModule() {
    // Check if already loaded
    if (App.modules.promocode) {
        return App.modules.promocode;
    }
    
    const container = document.getElementById('promocode-section');
    
    // Create the HTML structure
    container.innerHTML = getPromocodeHTML();
    
    // Initialize the module
    if (window.PromocodeModule) {
        App.modules.promocode = new PromocodeModule();
        await App.modules.promocode.init();
    } else {
        throw new Error('Promocode module not found');
    }
}

/**
 * Get Promocode HTML structure
 */
function getPromocodeHTML() {
    return `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Generate Offercode</h2>
            </div>
            
            <div id="promocode-form-container">
                <div id="promocode-alerts"></div>
                
                <div class="promocode-form">
                    <!-- Product Section -->
                    <div class="form-section-header">
                        <h4>Product Information</h4>
                    </div>
                    <div class="form-row product-section">
                        <div class="form-group">
                            <label class="form-label">Brand <span class="required">*</span></label>
                            <select id="brand-select" class="form-control form-select">
                                <option value="">Select Brand...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Product <span class="required">*</span></label>
                            <select id="product-select" class="form-control form-select" disabled>
                                <option value="">Select Product...</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Offer Details -->
                    <div class="form-section-header">
                        <h4>Offer Details</h4>
                    </div>
                    <div class="form-row offer-section">
                        <div class="form-group">
                            <label class="form-label">Length <span class="required">*</span></label>
                            <input type="number" id="initial-length" class="form-control" min="1" max="12" value="3">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Period <span class="required">*</span></label>
                            <select id="initial-period" class="form-control form-select">
                                <option value="M" selected>Months</option>
                                <option value="U">Weeks</option>
                                <option value="Q">Quarters</option>
                                <option value="Y">Years</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Rate Plan</label>
                            <select id="rate-plan-select" class="form-control form-select" disabled>
                                <option value="">Select Rate Plan (Optional)...</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Discount -->
                    <div class="form-section-header">
                        <h4>Discount</h4>
                    </div>
                    <div class="form-row discount-section">
                        <div class="form-group">
                            <label class="form-label">Discount Amount <span class="required">*</span></label>
                            <input type="number" id="discount-amount" class="form-control" min="0" value="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Discount Type <span class="required">*</span></label>
                            <select id="discount-type" class="form-control form-select">
                                <option value="K" selected>Kroner (K)</option>
                                <option value="P">Percent (P)</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Renewal Settings -->
                    <div class="form-section-header">
                        <h4>Renewal Settings</h4>
                    </div>
                    <div class="form-row renewal-section">
                        <div class="form-group">
                            <label class="form-label">Renewal Type <span class="required">*</span></label>
                            <div style="display: flex; gap: 20px; margin-top: 8px;">
                                <label style="display: flex; align-items: center; cursor: pointer;">
                                    <input type="radio" id="renewal-type-termed" name="renewal-type" value="T" checked style="margin-right: 8px;">
                                    Termed (T)
                                </label>
                                <label style="display: flex; align-items: center; cursor: pointer;">
                                    <input type="radio" id="renewal-type-evergreen" name="renewal-type" value="E" style="margin-right: 8px;">
                                    Evergreen (E)
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Renewal Term <span class="required">*</span></label>
                            <select id="renewal-term" class="form-control form-select">
                                <option value="M" selected>Monthly</option>
                                <option value="Q">Quarterly</option>
                                <option value="Y">Yearly</option>
                                <option value="U">Weekly</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Optional Fields -->
                    <div class="form-section-header">
                        <h4>Optional Fields</h4>
                    </div>
                    <div class="form-row classification-section">
                        <div class="form-group">
                            <label class="form-label">Campaign Text</label>
                            <input type="text" id="campaign-text" class="form-control" maxlength="15" placeholder="Max 15 chars (A-Z, 0-9)">
                            <span class="form-helper-text">Alphanumeric only, will be uppercased</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Code Type</label>
                            <select id="code-type" class="form-control form-select">
                                <option value="">None</option>
                                <option value="WB">Winback (WB)</option>
                                <option value="HB">Holdback (HB)</option>
                                <option value="CMP">Campaign (CMP)</option>
                                <option value="FREE">Free (FREE)</option>
                                <option value="EMP">Employee (EMP)</option>
                                <option value="KS">Kompis (KS)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row options-section">
                        <div class="form-group">
                            <label class="form-label">Override Price</label>
                            <input type="number" id="override-price" class="form-control" min="0" placeholder="Leave empty to use rate plan price">
                            <span class="form-helper-text">Override the rate plan price if needed</span>
                        </div>
                    </div>
                    
                    <!-- Generate Button -->
                    <div class="button-row">
                        <button id="generate-promocode-btn" class="generate-btn">
                            <span class="rocket-icon">🚀</span>
                            <span>Generate Promocode</span>
                        </button>
                    </div>
                </div>
                
                <!-- Result Container -->
                <div id="result-container" style="display: none;">
                    <div class="result-card">
                        <h3>Generated Promocode</h3>
                        <div class="code-display">
                            <div id="generated-code"></div>
                            <button id="copy-promocode-btn">📋 Copy</button>
                        </div>
                    </div>
                </div>
                
                <!-- Validation Section -->
                <div class="validation-section">
                    <h3>Validate Existing Code</h3>
                    <div class="validation-container">
                        <div class="validation-input-group">
                            <input type="text" id="validate-input" class="validation-input" placeholder="Paste code here to validate...">
                            <button id="validate-btn" class="validate-btn">Validate</button>
                        </div>
                        <div id="validation-result" style="display: none;"></div>
                    </div>
                </div>
            </div>
        </div>`;
}

/**
 * Load Braze Module (placeholder)
 */
async function loadBrazeModule() {
    const container = document.getElementById('braze-section');
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Braze Naming Standards</h2>
            </div>
            <div class="placeholder">
                <div class="placeholder-icon">📧</div>
                <h3>Braze Campaign Naming</h3>
                <p>Generate consistent names for your Braze campaigns, canvases, and segments.</p>
                <button class="btn btn-primary mt-lg">Coming Soon</button>
            </div>
        </div>`;
}

/**
 * Load UTM Module (placeholder)
 */
async function loadUTMModule() {
    const container = document.getElementById('utm-section');
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">UTM Link Builder</h2>
            </div>
            <div class="placeholder">
                <div class="placeholder-icon">🔗</div>
                <h3>UTM Parameter Builder</h3>
                <p>Create properly formatted UTM links for tracking your campaigns.</p>
                <button class="btn btn-primary mt-lg">Coming Soon</button>
            </div>
        </div>`;
}

/**
 * Load Data Module (placeholder)
 */
async function loadDataModule() {
    const container = document.getElementById('data-section');
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Data Management Naming</h2>
            </div>
            <div class="placeholder">
                <div class="placeholder-icon">💾</div>
                <h3>Data Entity Naming</h3>
                <p>Standardize naming conventions for your data management entities.</p>
                <button class="btn btn-primary mt-lg">Coming Soon</button>
            </div>
        </div>`;
}

/**
 * Load Rules Module (placeholder)
 */
async function loadRulesModule() {
    const container = document.getElementById('rules-section');
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Naming Rules Overview</h2>
            </div>
            <div class="placeholder">
                <div class="placeholder-icon">📋</div>
                <h3>Active Naming Rules</h3>
                <p>View and understand the current naming rules and standards applied across all tools.</p>
            </div>
        </div>`;
}

/**
 * Load History Module (placeholder)
 */
async function loadHistoryModule() {
    const container = document.getElementById('history-section');
    
    // Get history from localStorage
    const history = promocodeGenerator?.getHistory(50) || [];
    
    let historyHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Generation History</h2>
            </div>`;
    
    if (history.length > 0) {
        historyHTML += `
            <div class="activity-list">`;
        
        history.forEach(entry => {
            const date = new Date(entry.timestamp).toLocaleString();
            historyHTML += `
                <div class="activity-item">
                    <div class="activity-icon success">✓</div>
                    <div class="activity-content">
                        <div class="activity-title font-mono">${entry.code}</div>
                        <div class="activity-time text-muted">${date}</div>
                    </div>
                </div>`;
        });
        
        historyHTML += `</div>`;
    } else {
        historyHTML += `
            <div class="placeholder">
                <div class="placeholder-icon">🕐</div>
                <h3>No History Yet</h3>
                <p>Your generated promocodes will appear here.</p>
            </div>`;
    }
    
    historyHTML += `</div>`;
    container.innerHTML = historyHTML;
}

// ============================================================================
// MOBILE MENU
// ============================================================================

/**
 * Set up mobile menu handlers
 */
function setupMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar?.classList.toggle('mobile-open');
            mobileOverlay?.classList.toggle('active');
        });
    }
    
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', function() {
            sidebar?.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
        });
    }
    
    // Close mobile menu when nav item is clicked
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                sidebar?.classList.remove('mobile-open');
                mobileOverlay?.classList.remove('active');
            });
        });
    }
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

/**
 * Set up quick action cards
 */
function setupQuickActions() {
    const actionCards = document.querySelectorAll('.action-card[data-action]');
    
    actionCards.forEach(card => {
        card.addEventListener('click', async function() {
            const action = this.getAttribute('data-action');
            
            switch(action) {
                case 'generate-promocode':
                    await switchSection('promocode');
                    break;
                case 'validate-code':
                    await switchSection('promocode');
                    // Focus validation input after a delay
                    setTimeout(() => {
                        const validateInput = document.getElementById('validate-input');
                        if (validateInput) {
                            validateInput.focus();
                            validateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 300);
                    break;
                case 'create-campaign':
                    await switchSection('braze');
                    break;
                case 'build-utm':
                    await switchSection('utm');
                    break;
            }
        });
    });
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Set up search functionality
 */
function setupSearch() {
    const searchInput = document.querySelector('.search-input');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const navItems = document.querySelectorAll('.nav-item[data-section]');
        
        navItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (searchTerm === '' || text.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Debounce function
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
 * Format date
 */
function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(date).toLocaleDateString('en-US', options);
}

// Export for debugging
window.App = App;

console.log('📄 Main application controller loaded');