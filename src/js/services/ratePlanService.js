/* ============================================================================
   CODEX NOVA NEBULA - Rate Plan Service
   Manages rate plan data fetching and filtering by product
   ============================================================================ */

class RatePlanService {
    constructor() {
        this.allRatePlans = [];
        this.filteredRatePlans = [];
        this.currentRatePlan = null;
        this.currentProductId = null;
        this.isLoading = false;
        this.error = null;
    }

    /**
     * Initialize service (optional - rate plans are usually fetched per product)
     */
    async initialize() {
        // Rate plans are typically fetched on demand per product
        // But we can pre-fetch if needed
        return this.filteredRatePlans;
    }

    /**
     * Fetch rate plans filtered by product
     */
    async fetchRatePlansByProduct(productId) {
        if (!productId) {
            this.filteredRatePlans = [];
            this.currentProductId = null;
            return [];
        }

        this.isLoading = true;
        this.error = null;
        this.currentProductId = productId;

        try {
            if (Config.FEATURES.DEBUG_MODE) {
                console.log(`💰 Fetching rate plans for product: ${productId}`);
            }

            this.filteredRatePlans = await airtableService.fetchRatePlansByProduct(productId);
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log(`✅ Fetched ${this.filteredRatePlans.length} rate plans`, this.filteredRatePlans);
            }

            // Sort rate plans by price (ascending)
            this.filteredRatePlans.sort((a, b) => {
                const priceA = a.price || 0;
                const priceB = b.price || 0;
                return priceA - priceB;
            });

            return this.filteredRatePlans;

        } catch (error) {
            this.error = error.message || 'Failed to fetch rate plans';
            console.error('Rate plan fetch error:', error);
            
            // Return empty array on error
            this.filteredRatePlans = [];
            throw new Error(this.error);
            
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get rate plan by ID
     */
    getRatePlanById(ratePlanId) {
        return this.filteredRatePlans.find(plan => plan.id === ratePlanId);
    }

    /**
     * Get rate plan by code
     */
    getRatePlanByCode(planCode) {
        return this.filteredRatePlans.find(plan => plan.code === planCode);
    }

    /**
     * Set current rate plan
     */
    setCurrentRatePlan(ratePlanId) {
        const ratePlan = this.getRatePlanById(ratePlanId);
        if (ratePlan) {
            this.currentRatePlan = ratePlan;
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log('💰 Current rate plan set:', ratePlan);
            }
            
            return ratePlan;
        }
        return null;
    }

    /**
     * Clear current rate plan
     */
    clearCurrentRatePlan() {
        this.currentRatePlan = null;
    }

    /**
     * Get rate plan display name
     */
    getRatePlanDisplayName(ratePlan) {
        if (!ratePlan) return '';
        
        const parts = [];
        
        // Add plan name
        if (ratePlan.name) {
            parts.push(ratePlan.name);
        }
        
        // Add price
        if (ratePlan.price !== undefined && ratePlan.price !== null) {
            parts.push(`${ratePlan.price} kr`);
        }
        
        // Add term code if different from name
        if (ratePlan.code && !ratePlan.name?.includes(ratePlan.code)) {
            parts.push(`(${ratePlan.code})`);
        }
        
        return parts.join(' - ');
    }

    /**
     * Get renewal term from rate plan
     */
    getRenewalTerm(ratePlan) {
        if (!ratePlan) return '';
        
        // Map plan code to renewal term
        const termMap = {
            'M': 'M',  // Monthly
            'Q': 'Q',  // Quarterly
            'Y': 'Y',  // Yearly
            'U': 'U'   // Unknown/Weekly
        };
        
        // Try to extract from plan code
        if (ratePlan.code && termMap[ratePlan.code]) {
            return termMap[ratePlan.code];
        }
        
        // Try to extract from plan ID (e.g., "M249" -> "M")
        if (ratePlan.planId) {
            const match = ratePlan.planId.match(/^([MQYU])/);
            if (match) {
                return match[1];
            }
        }
        
        // Default to monthly
        return 'M';
    }

    /**
     * Format price for display
     */
    formatPrice(price) {
        if (price === undefined || price === null) return '';
        
        // Ensure it's a number
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) return '';
        
        // Format with no decimals if whole number, otherwise 2 decimals
        if (numPrice % 1 === 0) {
            return numPrice.toString();
        } else {
            return numPrice.toFixed(2);
        }
    }

    /**
     * Populate rate plan dropdown
     */
    populateRatePlanDropdown(selectElement, selectedRatePlanId = null) {
        if (!selectElement) return;

        // Clear existing options
        selectElement.innerHTML = '<option value="">Select Rate Plan (Optional)...</option>';

        // Add loading state
        if (this.isLoading) {
            selectElement.innerHTML = '<option value="">Loading rate plans...</option>';
            selectElement.disabled = true;
            return;
        }

        // Add error state
        if (this.error) {
            selectElement.innerHTML = '<option value="">Error loading rate plans</option>';
            selectElement.disabled = true;
            return;
        }

        // Check if we have rate plans
        if (this.filteredRatePlans.length === 0) {
            selectElement.innerHTML = '<option value="">No rate plans available</option>';
            // Don't disable - rate plan is optional
            selectElement.disabled = false;
            return;
        }

        // Enable select
        selectElement.disabled = false;

        // Group rate plans by category if available
        const plansByCategory = {};
        const uncategorized = [];
        
        this.filteredRatePlans.forEach(plan => {
            if (plan.category) {
                if (!plansByCategory[plan.category]) {
                    plansByCategory[plan.category] = [];
                }
                plansByCategory[plan.category].push(plan);
            } else {
                uncategorized.push(plan);
            }
        });

        // Add categorized plans
        Object.keys(plansByCategory).sort().forEach(category => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            
            plansByCategory[category].forEach(plan => {
                const option = document.createElement('option');
                option.value = plan.id;
                option.textContent = this.getRatePlanDisplayName(plan);
                option.setAttribute('data-price', plan.price || '');
                option.setAttribute('data-term', this.getRenewalTerm(plan));
                
                if (selectedRatePlanId && plan.id === selectedRatePlanId) {
                    option.selected = true;
                }
                
                optgroup.appendChild(option);
            });
            
            selectElement.appendChild(optgroup);
        });

        // Add uncategorized plans
        uncategorized.forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.id;
            option.textContent = this.getRatePlanDisplayName(plan);
            option.setAttribute('data-price', plan.price || '');
            option.setAttribute('data-term', this.getRenewalTerm(plan));
            
            if (selectedRatePlanId && plan.id === selectedRatePlanId) {
                option.selected = true;
            }
            
            selectElement.appendChild(option);
        });

        // Set current rate plan if exists
        if (this.currentRatePlan && !selectedRatePlanId) {
            selectElement.value = this.currentRatePlan.id;
        }
    }

    /**
     * Auto-fill renewal fields based on rate plan selection
     */
    autoFillRenewalFields(ratePlanId, renewalTermSelect, overridePriceInput) {
        const ratePlan = this.getRatePlanById(ratePlanId);
        
        if (!ratePlan) return;

        // Auto-fill renewal term
        if (renewalTermSelect) {
            const renewalTerm = this.getRenewalTerm(ratePlan);
            if (renewalTerm) {
                renewalTermSelect.value = renewalTerm;
                
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                renewalTermSelect.dispatchEvent(event);
            }
        }

        // Show price in override field placeholder
        if (overridePriceInput && ratePlan.price) {
            overridePriceInput.placeholder = `Default: ${this.formatPrice(ratePlan.price)} kr`;
            
            // Clear the override value to use default
            overridePriceInput.value = '';
        }
    }

    /**
     * Get price for code generation
     */
    getPriceForGeneration(ratePlanId, overridePrice) {
        // If override price is provided, use it
        if (overridePrice !== undefined && overridePrice !== null && overridePrice !== '') {
            const price = parseFloat(overridePrice);
            if (!isNaN(price)) {
                return Math.round(price); // Round to nearest integer for code
            }
        }

        // Otherwise use rate plan price
        const ratePlan = this.getRatePlanById(ratePlanId);
        if (ratePlan && ratePlan.price !== undefined && ratePlan.price !== null) {
            return Math.round(ratePlan.price);
        }

        // Default to 0 if no price available
        return 0;
    }

    /**
     * Clear filtered rate plans
     */
    clearFilteredRatePlans() {
        this.filteredRatePlans = [];
        this.currentProductId = null;
        this.clearCurrentRatePlan();
    }

    /**
     * Refresh rate plans (force fetch)
     */
    async refresh(productId) {
        // Clear cache for rate plans
        airtableService.clearCache(Config.AIRTABLE.TABLES.RATE_PLANS);
        
        // Clear current state
        this.filteredRatePlans = [];
        
        // Fetch fresh data if product ID provided
        if (productId) {
            return this.fetchRatePlansByProduct(productId);
        }
        
        return [];
    }
}

// Create singleton instance
const ratePlanService = new RatePlanService();

// Export for use in other modules
window.ratePlanService = ratePlanService;

if (Config.FEATURES.DEBUG_MODE) {
    console.log('💰 Rate Plan Service initialized', ratePlanService);
}