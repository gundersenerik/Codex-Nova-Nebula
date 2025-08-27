// ============================================================================
// MAIN JAVASCRIPT - Navigation and Basic Interactions
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================================================
    // NAVIGATION HANDLING
    // ============================================================================
    
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const tabContents = document.querySelectorAll('.tab-content');
    const headerTitle = document.querySelector('.header-title');
    
    // Handle navigation clicks
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');
            
            // Remove active class from all nav items and sections
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked nav item
            this.classList.add('active');
            
            // Show the corresponding section
            const sectionId = targetSection + '-section';
            const targetContent = document.getElementById(sectionId);
            
            if (targetContent) {
                targetContent.classList.add('active');
                
                // Update header title based on section
                updateHeaderTitle(targetSection);
            } else {
                // If section doesn't exist, show dashboard
                document.getElementById('dashboard-section').classList.add('active');
                updateHeaderTitle('dashboard');
            }
        });
    });
    
    // Update header title based on active section
    function updateHeaderTitle(section) {
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
    
    // ============================================================================
    // QUICK ACTION CARDS
    // ============================================================================
    
    const actionCards = document.querySelectorAll('.action-card[data-action]');
    
    actionCards.forEach(card => {
        card.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            
            switch(action) {
                case 'generate-promocode':
                    // Navigate to promocode section
                    const promocodeNav = document.querySelector('.nav-item[data-section="promocode"]');
                    if (promocodeNav) promocodeNav.click();
                    break;
                case 'validate-code':
                    // Navigate to promocode section and focus validation
                    const promocodeNavVal = document.querySelector('.nav-item[data-section="promocode"]');
                    if (promocodeNavVal) {
                        promocodeNavVal.click();
                        // Focus validation input after navigation
                        setTimeout(() => {
                            const validationInput = document.querySelector('.validation-input');
                            if (validationInput) validationInput.focus();
                        }, 300);
                    }
                    break;
                case 'create-campaign':
                    // Navigate to Braze section
                    const brazeNav = document.querySelector('.nav-item[data-section="braze"]');
                    if (brazeNav) brazeNav.click();
                    break;
                case 'build-utm':
                    // Navigate to UTM section
                    const utmNav = document.querySelector('.nav-item[data-section="utm"]');
                    if (utmNav) utmNav.click();
                    break;
            }
        });
    });
    
    // ============================================================================
    // MOBILE MENU TOGGLE
    // ============================================================================
    
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
            mobileOverlay.classList.toggle('active');
        });
    }
    
    // Close mobile menu when overlay is clicked
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', function() {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
        });
    }
    
    // Close mobile menu when a nav item is clicked (on mobile)
    if (window.innerWidth <= 768) {
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                sidebar.classList.remove('mobile-open');
                mobileOverlay.classList.remove('active');
            });
        });
    }
    
    // ============================================================================
    // COPY TO CLIPBOARD FUNCTIONALITY
    // ============================================================================
    
    function setupCopyButton() {
        const copyBtn = document.getElementById('copy-promocode-btn');
        const generatedCode = document.getElementById('generated-code');
        
        if (copyBtn && generatedCode) {
            copyBtn.addEventListener('click', function() {
                const codeText = generatedCode.textContent;
                
                // Copy to clipboard
                navigator.clipboard.writeText(codeText).then(() => {
                    // Show success state
                    copyBtn.classList.add('success');
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '✓ Copied!';
                    
                    // Reset after 2 seconds
                    setTimeout(() => {
                        copyBtn.classList.remove('success');
                        copyBtn.innerHTML = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                });
            });
        }
    }
    
    // Call setup for copy button
    setupCopyButton();
    
    // ============================================================================
    // PLACEHOLDER PROMOCODE FORM (for demonstration)
    // ============================================================================
    
    const promocodeContainer = document.getElementById('promocode-form-container');
    if (promocodeContainer) {
        // Create a simple form for now
        promocodeContainer.innerHTML = `
            <div class="promocode-form">
                <div class="form-section-header">
                    <h4>Product Information</h4>
                </div>
                <div class="form-row product-section">
                    <div class="form-group">
                        <label class="form-label">Brand <span class="required">*</span></label>
                        <select class="form-control form-select">
                            <option value="">Select Brand...</option>
                            <option value="AP">Aftenposten</option>
                            <option value="VG">VG</option>
                            <option value="BT">Bergens Tidende</option>
                            <option value="SA">Stavanger Aftenblad</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Product <span class="required">*</span></label>
                        <select class="form-control form-select">
                            <option value="">Select Product...</option>
                            <option value="PLUS">Plus</option>
                            <option value="DIGI">Digital</option>
                            <option value="SOLO">Solo</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-section-header">
                    <h4>Offer Details</h4>
                </div>
                <div class="form-row offer-section">
                    <div class="form-group">
                        <label class="form-label">Length <span class="required">*</span></label>
                        <input type="number" class="form-control" min="1" max="12" placeholder="3">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Period <span class="required">*</span></label>
                        <select class="form-control form-select">
                            <option value="M">Months</option>
                            <option value="U">Weeks</option>
                            <option value="Q">Quarters</option>
                            <option value="Y">Years</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Price</label>
                        <input type="number" class="form-control" min="0" placeholder="199">
                    </div>
                </div>
                
                <div class="form-section-header">
                    <h4>Discount</h4>
                </div>
                <div class="form-row discount-section">
                    <div class="form-group">
                        <label class="form-label">Discount Amount</label>
                        <input type="number" class="form-control" min="0" placeholder="50">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Discount Type</label>
                        <select class="form-control form-select">
                            <option value="K">Kroner (K)</option>
                            <option value="P">Percent (P)</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-section-header">
                    <h4>Renewal Settings</h4>
                </div>
                <div class="form-row renewal-section">
                    <div class="form-group">
                        <label class="form-label">Renewal Type <span class="required">*</span></label>
                        <select class="form-control form-select">
                            <option value="T">Termed (T)</option>
                            <option value="E">Evergreen (E)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Renewal Term</label>
                        <select class="form-control form-select">
                            <option value="M">Monthly</option>
                            <option value="Q">Quarterly</option>
                            <option value="Y">Yearly</option>
                            <option value="U">Weekly</option>
                        </select>
                    </div>
                </div>
                
                <div class="button-row">
                    <button id="generate-promocode-btn" class="generate-btn">
                        <span class="rocket-icon">🚀</span>
                        <span>Generate Promocode</span>
                    </button>
                </div>
                
                <div id="result-container" style="display: none;">
                    <div class="result-card">
                        <h3>Generated Promocode</h3>
                        <div class="code-display">
                            <div id="generated-code">AP-PLUS-3M199K-T-WB-M249</div>
                            <button id="copy-promocode-btn">📋 Copy</button>
                        </div>
                    </div>
                </div>
                
                <div class="validation-section">
                    <h3>Validate Existing Code</h3>
                    <div class="validation-container">
                        <div class="validation-input-group">
                            <input type="text" class="validation-input" placeholder="Paste code here to validate...">
                            <button class="validate-btn">Validate</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add generate button functionality
        const generateBtn = document.getElementById('generate-promocode-btn');
        const resultContainer = document.getElementById('result-container');
        
        if (generateBtn) {
            generateBtn.addEventListener('click', function() {
                // Show result (for demonstration)
                if (resultContainer) {
                    resultContainer.style.display = 'block';
                    setupCopyButton(); // Re-setup copy button for new element
                }
            });
        }
    }
    
    // ============================================================================
    // SEARCH FUNCTIONALITY (Basic)
    // ============================================================================
    
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            navItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Show all if search is empty
            if (searchTerm === '') {
                navItems.forEach(item => {
                    item.style.display = 'flex';
                });
            }
        });
    }
});