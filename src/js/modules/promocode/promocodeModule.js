/* ============================================================================
   CODEX NOVA NEBULA - Promocode Module
   Main UI controller that connects all services with the interface
   ============================================================================ */

class PromocodeModule {
    constructor() {
        // Service references
        this.brandService = window.brandService;
        this.productService = window.productService;
        this.ratePlanService = window.ratePlanService;
        this.promocodeGenerator = window.promocodeGenerator;
        this.promocodeParser = window.promocodeParser;
        
        // DOM element references
        this.elements = {};
        
        // State
        this.isGenerating = false;
        this.isValidating = false;
        this.currentInputs = {};
        
        // Bind methods
        this.handleBrandChange = this.handleBrandChange.bind(this);
        this.handleProductChange = this.handleProductChange.bind(this);
        this.handleRatePlanChange = this.handleRatePlanChange.bind(this);
        this.handleGenerate = this.handleGenerate.bind(this);
        this.handleValidate = this.handleValidate.bind(this);
        this.handleCopy = this.handleCopy.bind(this);
    }

    /**
     * Initialize the module
     */
    async init() {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Initialize all services
            await this.initializeServices();
            
            // Set up UI elements
            this.setupFormElements();
            
            // Bind event handlers
            this.bindEventHandlers();
            
            // Load initial data
            await this.loadInitialData();
            
            // Hide loading state
            this.showLoading(false);
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log('✅ Promocode Module initialized');
            }
        } catch (error) {
            console.error('Failed to initialize Promocode Module:', error);
            this.showError('Failed to initialize. Please refresh the page.');
        }
    }

    /**
     * Initialize all required services
     */
    async initializeServices() {
        const initPromises = [
            this.brandService.initialize(),
            this.promocodeGenerator.initialize(),
            this.promocodeParser.initialize()
        ];
        
        await Promise.all(initPromises);
    }

    /**
     * Set up DOM element references
     */
    setupFormElements() {
        // Main containers
        this.elements.formContainer = document.getElementById('promocode-form-container');
        this.elements.resultContainer = document.getElementById('result-container');
        this.elements.validationResult = document.getElementById('validation-result');
        this.elements.alertsContainer = document.getElementById('promocode-alerts');
        
        // Form elements - Brand & Product
        this.elements.brandSelect = document.getElementById('brand-select');
        this.elements.productSelect = document.getElementById('product-select');
        this.elements.ratePlanSelect = document.getElementById('rate-plan-select');
        
        // Form elements - Initial Offer
        this.elements.initialLength = document.getElementById('initial-length');
        this.elements.initialPeriod = document.getElementById('initial-period');
        this.elements.discountAmount = document.getElementById('discount-amount');
        this.elements.discountType = document.getElementById('discount-type');
        
        // Form elements - Renewal
        this.elements.renewalTypeTermed = document.getElementById('renewal-type-termed');
        this.elements.renewalTypeEvergreen = document.getElementById('renewal-type-evergreen');
        this.elements.renewalTerm = document.getElementById('renewal-term');
        
        // Form elements - Optional
        this.elements.campaignText = document.getElementById('campaign-text');
        this.elements.codeType = document.getElementById('code-type');
        this.elements.overridePrice = document.getElementById('override-price');
        
        // Buttons
        this.elements.generateBtn = document.getElementById('generate-promocode-btn');
        this.elements.copyBtn = document.getElementById('copy-promocode-btn');
        this.elements.validateBtn = document.getElementById('validate-btn');
        
        // Result elements
        this.elements.generatedCode = document.getElementById('generated-code');
        this.elements.validateInput = document.getElementById('validate-input');
    }

    /**
     * Bind event handlers
     */
    bindEventHandlers() {
        // Brand change event
        if (this.elements.brandSelect) {
            this.elements.brandSelect.addEventListener('change', (e) => {
                this.handleBrandChange(e.target.value);
            });
        }
        
        // Product change event
        if (this.elements.productSelect) {
            this.elements.productSelect.addEventListener('change', (e) => {
                this.handleProductChange(e.target.value);
            });
        }
        
        // Rate plan change event
        if (this.elements.ratePlanSelect) {
            this.elements.ratePlanSelect.addEventListener('change', (e) => {
                this.handleRatePlanChange(e.target.value);
            });
        }
        
        // Generate button click
        if (this.elements.generateBtn) {
            this.elements.generateBtn.addEventListener('click', this.handleGenerate);
        }
        
        // Copy button click
        if (this.elements.copyBtn) {
            this.elements.copyBtn.addEventListener('click', this.handleCopy);
        }
        
        // Validate button click
        if (this.elements.validateBtn) {
            this.elements.validateBtn.addEventListener('click', this.handleValidate);
        }
        
        // Validate on Enter key
        if (this.elements.validateInput) {
            this.elements.validateInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleValidate();
                }
            });
        }
        
        // Campaign text sanitization
        if (this.elements.campaignText) {
            this.elements.campaignText.addEventListener('input', (e) => {
                // Remove non-alphanumeric characters as user types
                const sanitized = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                if (sanitized !== e.target.value) {
                    e.target.value = sanitized;
                }
            });
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Load brands
            await this.loadBrands();
            
            // Check for last selected brand
            const lastBrandId = localStorage.getItem(Config.STORAGE.LAST_BRAND);
            if (lastBrandId && this.brandService.getBrandById(lastBrandId)) {
                this.elements.brandSelect.value = lastBrandId;
                await this.handleBrandChange(lastBrandId);
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load data. Please check your connection.');
        }
    }

    /**
     * Load brands into dropdown
     */
    async loadBrands() {
        try {
            await this.brandService.fetchBrands();
            this.brandService.populateBrandDropdown(this.elements.brandSelect);
        } catch (error) {
            console.error('Failed to load brands:', error);
            this.showError('Failed to load brands');
            throw error;
        }
    }

    /**
     * Handle brand selection change
     */
    async handleBrandChange(brandId) {
        if (!brandId) {
            // Clear dependent dropdowns
            this.clearProductDropdown();
            this.clearRatePlanDropdown();
            return;
        }
        
        try {
            // Show loading state
            this.setDropdownLoading(this.elements.productSelect, true);
            
            // Set current brand
            const brand = this.brandService.setCurrentBrand(brandId);
            
            // Clear rate plans
            this.clearRatePlanDropdown();
            
            // Load products for selected brand
            await this.productService.fetchProductsByBrand(brandId);
            
            // Populate product dropdown
            this.productService.populateProductDropdown(this.elements.productSelect);
            
            // Enable product dropdown
            this.elements.productSelect.disabled = false;
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log('Brand selected:', brand);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
            this.showError('Failed to load products for selected brand');
        } finally {
            this.setDropdownLoading(this.elements.productSelect, false);
        }
    }

    /**
     * Handle product selection change
     */
    async handleProductChange(productId) {
        if (!productId) {
            this.clearRatePlanDropdown();
            return;
        }
        
        try {
            // Show loading state
            this.setDropdownLoading(this.elements.ratePlanSelect, true);
            
            // Set current product
            const product = this.productService.setCurrentProduct(productId);
            
            // Load rate plans for selected product
            await this.ratePlanService.fetchRatePlansByProduct(productId);
            
            // Populate rate plan dropdown
            this.ratePlanService.populateRatePlanDropdown(this.elements.ratePlanSelect);
            
            // Enable rate plan dropdown
            this.elements.ratePlanSelect.disabled = false;
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log('Product selected:', product);
            }
        } catch (error) {
            console.error('Failed to load rate plans:', error);
            // Rate plans are optional, so just log the error
        } finally {
            this.setDropdownLoading(this.elements.ratePlanSelect, false);
        }
    }

    /**
     * Handle rate plan selection change
     */
    handleRatePlanChange(ratePlanId) {
        if (!ratePlanId) {
            // Clear price override placeholder
            if (this.elements.overridePrice) {
                this.elements.overridePrice.placeholder = 'Enter price';
            }
            return;
        }
        
        // Auto-fill renewal fields based on rate plan
        this.ratePlanService.autoFillRenewalFields(
            ratePlanId,
            this.elements.renewalTerm,
            this.elements.overridePrice
        );
        
        const ratePlan = this.ratePlanService.getRatePlanById(ratePlanId);
        
        if (Config.FEATURES.DEBUG_MODE) {
            console.log('Rate plan selected:', ratePlan);
        }
    }

    /**
     * Handle generate button click
     */
    async handleGenerate() {
        if (this.isGenerating) return;
        
        try {
            this.isGenerating = true;
            this.clearAlerts();
            
            // Disable generate button
            this.elements.generateBtn.disabled = true;
            this.elements.generateBtn.textContent = 'Generating...';
            
            // Collect form inputs
            const inputs = this.collectFormInputs();
            
            // Generate promocode
            const promocode = await this.promocodeGenerator.generateCode(inputs);
            
            // Display result
            this.displayGeneratedCode(promocode);
            
            // Save inputs for next time
            this.saveFormState();
            
            // Show success message
            this.showSuccess('Promocode generated successfully!');
            
        } catch (error) {
            console.error('Generation failed:', error);
            this.showError(error.message || 'Failed to generate promocode');
        } finally {
            this.isGenerating = false;
            this.elements.generateBtn.disabled = false;
            this.elements.generateBtn.textContent = 'Generate Promocode';
        }
    }

    /**
     * Collect all form inputs
     */
    collectFormInputs() {
        const inputs = {};
        
        // Get brand
        const brandId = this.elements.brandSelect.value;
        if (!brandId) throw new Error('Please select a brand');
        inputs.brand = this.brandService.getBrandById(brandId);
        
        // Get product
        const productId = this.elements.productSelect.value;
        if (!productId) throw new Error('Please select a product');
        inputs.product = this.productService.getProductById(productId);
        
        // Get initial offer details
        inputs.initialLength = parseInt(this.elements.initialLength.value);
        if (!inputs.initialLength) throw new Error('Please enter initial offer length');
        
        inputs.initialPeriod = this.elements.initialPeriod.value;
        if (!inputs.initialPeriod) throw new Error('Please select initial period');
        
        inputs.discountAmount = parseInt(this.elements.discountAmount.value || 0);
        inputs.discountType = this.elements.discountType.value;
        if (!inputs.discountType) throw new Error('Please select discount type');
        
        // Get renewal settings
        inputs.renewalType = this.elements.renewalTypeTermed.checked ? 'T' : 'E';
        inputs.renewalTerm = this.elements.renewalTerm.value;
        if (!inputs.renewalTerm) throw new Error('Please select renewal term');
        
        // Get optional fields
        inputs.campaignText = this.elements.campaignText.value.trim();
        inputs.codeType = this.elements.codeType.value;
        
        // Get price (from rate plan or override)
        const ratePlanId = this.elements.ratePlanSelect.value;
        const overridePrice = this.elements.overridePrice.value;
        
        if (overridePrice) {
            inputs.overridePrice = parseFloat(overridePrice);
        } else if (ratePlanId) {
            const ratePlan = this.ratePlanService.getRatePlanById(ratePlanId);
            inputs.price = ratePlan?.price || 0;
        } else {
            throw new Error('Please select a rate plan or enter override price');
        }
        
        return inputs;
    }

    /**
     * Display generated promocode
     */
    displayGeneratedCode(promocode) {
        // Show result container
        this.elements.resultContainer.style.display = 'block';
        
        // Set the generated code
        this.elements.generatedCode.textContent = promocode;
        
        // Scroll to result
        this.elements.resultContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
        
        // Add animation
        this.elements.resultContainer.classList.remove('fade-in');
        void this.elements.resultContainer.offsetWidth; // Trigger reflow
        this.elements.resultContainer.classList.add('fade-in');
    }

    /**
     * Handle copy button click
     */
    async handleCopy() {
        const code = this.elements.generatedCode.textContent;
        
        if (!code) return;
        
        try {
            await navigator.clipboard.writeText(code);
            
            // Show success state
            const originalText = this.elements.copyBtn.textContent;
            this.elements.copyBtn.textContent = '✓ Copied!';
            this.elements.copyBtn.classList.add('success');
            
            // Reset after 2 seconds
            setTimeout(() => {
                this.elements.copyBtn.textContent = originalText;
                this.elements.copyBtn.classList.remove('success');
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showError('Failed to copy to clipboard');
        }
    }

    /**
     * Handle validate button click
     */
    async handleValidate() {
        if (this.isValidating) return;
        
        const code = this.elements.validateInput.value.trim();
        
        if (!code) {
            this.showError('Please enter a promocode to validate');
            return;
        }
        
        try {
            this.isValidating = true;
            this.elements.validateBtn.disabled = true;
            this.elements.validateBtn.textContent = 'Validating...';
            
            // Parse the code
            const result = await this.promocodeParser.parseCode(code);
            
            // Display result
            this.displayValidationResult(result);
            
            // Save to history if enabled
            if (result.isValid && Config.FEATURES.ENABLE_HISTORY) {
                this.promocodeParser.saveToHistory(result);
            }
            
        } catch (error) {
            console.error('Validation failed:', error);
            this.displayValidationError(error.message);
        } finally {
            this.isValidating = false;
            this.elements.validateBtn.disabled = false;
            this.elements.validateBtn.textContent = 'Validate';
        }
    }

    /**
     * Display validation result
     */
    displayValidationResult(result) {
        const displayData = this.promocodeParser.formatForDisplay(result);
        
        let html = '';
        
        if (displayData.status === 'success') {
            html = `
                <div class="validation-success">
                    <h4>✓ Valid Promocode</h4>
                    <div class="parsed-result">`;
            
            displayData.breakdown.forEach(item => {
                html += `
                        <div class="parsed-item">
                            <span class="parsed-label">${item.label}</span>
                            <span class="parsed-value">${item.value}</span>
                        </div>`;
            });
            
            html += `
                    </div>
                </div>`;
        } else {
            html = `
                <div class="validation-error">
                    <h4>✗ Invalid Promocode</h4>
                    <p>${displayData.message}</p>
                </div>`;
        }
        
        this.elements.validationResult.innerHTML = html;
        this.elements.validationResult.style.display = 'block';
        
        // Scroll to result
        this.elements.validationResult.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }

    /**
     * Display validation error
     */
    displayValidationError(message) {
        const html = `
            <div class="validation-error">
                <h4>✗ Validation Failed</h4>
                <p>${message}</p>
            </div>`;
        
        this.elements.validationResult.innerHTML = html;
        this.elements.validationResult.style.display = 'block';
    }

    /**
     * Save form state to localStorage
     */
    saveFormState() {
        const state = {
            initialLength: this.elements.initialLength.value,
            initialPeriod: this.elements.initialPeriod.value,
            discountAmount: this.elements.discountAmount.value,
            discountType: this.elements.discountType.value,
            renewalType: this.elements.renewalTypeTermed.checked ? 'T' : 'E',
            renewalTerm: this.elements.renewalTerm.value
        };
        
        localStorage.setItem('promocode_form_state', JSON.stringify(state));
    }

    /**
     * Restore form state from localStorage
     */
    restoreFormState() {
        const stateJson = localStorage.getItem('promocode_form_state');
        if (!stateJson) return;
        
        try {
            const state = JSON.parse(stateJson);
            
            if (state.initialLength) this.elements.initialLength.value = state.initialLength;
            if (state.initialPeriod) this.elements.initialPeriod.value = state.initialPeriod;
            if (state.discountAmount) this.elements.discountAmount.value = state.discountAmount;
            if (state.discountType) this.elements.discountType.value = state.discountType;
            if (state.renewalType === 'E') {
                this.elements.renewalTypeEvergreen.checked = true;
            }
            if (state.renewalTerm) this.elements.renewalTerm.value = state.renewalTerm;
            
        } catch (error) {
            console.error('Failed to restore form state:', error);
        }
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    /**
     * Clear product dropdown
     */
    clearProductDropdown() {
        if (this.elements.productSelect) {
            this.elements.productSelect.innerHTML = '<option value="">Select Product...</option>';
            this.elements.productSelect.disabled = true;
        }
    }

    /**
     * Clear rate plan dropdown
     */
    clearRatePlanDropdown() {
        if (this.elements.ratePlanSelect) {
            this.elements.ratePlanSelect.innerHTML = '<option value="">Select Rate Plan (Optional)...</option>';
            this.elements.ratePlanSelect.disabled = true;
        }
    }

    /**
     * Set dropdown loading state
     */
    setDropdownLoading(selectElement, isLoading) {
        if (!selectElement) return;
        
        if (isLoading) {
            selectElement.innerHTML = '<option value="">Loading...</option>';
            selectElement.disabled = true;
        }
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        // You can implement a loading overlay here
        if (show) {
            document.body.classList.add('loading');
        } else {
            document.body.classList.remove('loading');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showAlert(message, 'danger');
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        if (!this.elements.alertsContainer) {
            // Create alerts container if it doesn't exist
            this.elements.alertsContainer = document.createElement('div');
            this.elements.alertsContainer.id = 'promocode-alerts';
            this.elements.formContainer?.prepend(this.elements.alertsContainer);
        }
        
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible">
                ${message}
                <button type="button" class="btn-close" aria-label="Close">×</button>
            </div>`;
        
        this.elements.alertsContainer.innerHTML = alertHtml;
        
        // Add close button handler
        const closeBtn = this.elements.alertsContainer.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.clearAlerts());
        }
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => this.clearAlerts(), 5000);
    }

    /**
     * Clear all alerts
     */
    clearAlerts() {
        if (this.elements.alertsContainer) {
            this.elements.alertsContainer.innerHTML = '';
        }
    }
}

// Export for use in main.js
window.PromocodeModule = PromocodeModule;

if (Config.FEATURES.DEBUG_MODE) {
    console.log('📦 Promocode Module loaded');
}