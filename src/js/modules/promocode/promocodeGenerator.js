/* ============================================================================
   CODEX NOVA NEBULA - Promocode Generator
   Core logic for generating promocodes based on rules and inputs
   ============================================================================ */

class PromocodeGenerator {
    constructor() {
        this.ruleset = null;
        this.lastGeneratedCode = null;
    }

    /**
     * Initialize generator with ruleset
     */
    async initialize() {
        try {
            // Fetch active ruleset from Airtable
            this.ruleset = await airtableService.fetchPromocodeRuleset();
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log('📋 Promocode ruleset loaded:', this.ruleset);
            }
        } catch (error) {
            console.error('Failed to load ruleset, using defaults:', error);
            
            // Use default ruleset if fetch fails
            this.ruleset = {
                separator: Config.PROMOCODE.SEPARATOR,
                casing: Config.PROMOCODE.CASING,
                periodMap: Config.PROMOCODE.PERIODS,
                termMap: Config.PROMOCODE.TERMS,
                priceTypeMap: Config.PROMOCODE.DISCOUNT_TYPES,
                freetextMaxLength: Config.PROMOCODE.MAX_LENGTHS.FREETEXT
            };
        }
    }

    /**
     * Generate promocode from form inputs
     */
    async generateCode(inputs) {
        // Validate required inputs
        const validation = this.validateInputs(inputs);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Ensure ruleset is loaded
        if (!this.ruleset) {
            await this.initialize();
        }

        const segments = [];

        // 1. Brand segment
        const brandSegment = this.generateBrandSegment(inputs.brand);
        if (brandSegment) segments.push(brandSegment);

        // 2. Product segment
        const productSegment = this.generateProductSegment(inputs.product);
        if (productSegment) segments.push(productSegment);

        // 3. Initial Offer segment
        const initialOfferSegment = this.generateInitialOfferSegment(
            inputs.initialLength,
            inputs.initialPeriod,
            inputs.discountAmount,
            inputs.discountType
        );
        if (initialOfferSegment) segments.push(initialOfferSegment);

        // 4. Renewal Type segment
        const renewalTypeSegment = this.generateRenewalTypeSegment(inputs.renewalType);
        if (renewalTypeSegment) segments.push(renewalTypeSegment);

        // 5. Freetext segment (optional)
        if (inputs.campaignText && inputs.campaignText.trim()) {
            const freetextSegment = this.generateFreetextSegment(inputs.campaignText);
            if (freetextSegment) segments.push(freetextSegment);
        }

        // 6. Code Type segment (optional)
        if (inputs.codeType && inputs.codeType !== '') {
            const codeTypeSegment = this.generateCodeTypeSegment(inputs.codeType);
            if (codeTypeSegment) segments.push(codeTypeSegment);
        }

        // 7. Renewal Plan segment
        const renewalPlanSegment = this.generateRenewalPlanSegment(
            inputs.renewalTerm,
            inputs.price || inputs.overridePrice
        );
        if (renewalPlanSegment) segments.push(renewalPlanSegment);

        // Join segments with separator
        let promocode = segments.join(this.ruleset.separator || '-');

        // Apply casing rules
        promocode = this.applyCasing(promocode, this.ruleset.casing);

        // Store for history
        this.lastGeneratedCode = promocode;

        // Save to history if enabled
        if (Config.FEATURES.ENABLE_HISTORY) {
            this.saveToHistory(promocode, inputs);
        }

        if (Config.FEATURES.DEBUG_MODE) {
            console.log('✅ Generated promocode:', promocode);
            console.log('Segments:', segments);
        }

        return promocode;
    }

    /**
     * Validate required inputs
     */
    validateInputs(inputs) {
        const errors = [];

        if (!inputs.brand || !inputs.brand.code) {
            errors.push('Brand is required');
        }

        if (!inputs.product) {
            errors.push('Product is required');
        }

        if (!inputs.initialLength || inputs.initialLength <= 0) {
            errors.push('Initial offer length must be greater than 0');
        }

        if (!inputs.initialPeriod) {
            errors.push('Initial offer period is required');
        }

        if (inputs.discountAmount === undefined || inputs.discountAmount === null || inputs.discountAmount < 0) {
            errors.push('Discount amount must be 0 or greater');
        }

        if (!inputs.discountType) {
            errors.push('Discount type is required');
        }

        if (!inputs.renewalType) {
            errors.push('Renewal type is required');
        }

        if (!inputs.renewalTerm) {
            errors.push('Renewal term is required');
        }

        // Price is required (either from rate plan or override)
        if (inputs.price === undefined && inputs.overridePrice === undefined) {
            errors.push('Price is required (select a rate plan or enter override price)');
        }

        return {
            isValid: errors.length === 0,
            error: errors.join(', ')
        };
    }

    /**
     * Generate brand segment
     */
    generateBrandSegment(brand) {
        if (!brand || !brand.code) return '';
        return brand.code.toUpperCase();
    }

    /**
     * Generate product segment
     */
    generateProductSegment(product) {
        if (!product) return '';

        // Use product service to get the code
        const code = productService.getProductCode(product);
        
        if (code) {
            return code.toUpperCase();
        }

        // Fallback: generate from name
        return productService.generateProductShortcode(product.name);
    }

    /**
     * Generate initial offer segment
     */
    generateInitialOfferSegment(length, period, discountAmount, discountType) {
        // Format: {length}{period}{discount}{type}
        // Example: 3M199K, 6M99P
        
        const segments = [];
        
        // Length (number)
        segments.push(Math.round(length).toString());
        
        // Period (M/U/Q/Y)
        segments.push(period.toUpperCase());
        
        // Discount amount (number)
        segments.push(Math.round(discountAmount).toString());
        
        // Discount type (K/P)
        segments.push(discountType.toUpperCase());
        
        return segments.join('');
    }

    /**
     * Generate renewal type segment
     */
    generateRenewalTypeSegment(renewalType) {
        // T = Termed, E = Evergreen
        return renewalType.toUpperCase();
    }

    /**
     * Generate freetext segment
     */
    generateFreetextSegment(text) {
        if (!text) return '';

        // Sanitize: uppercase, alphanumeric only, max length
        let sanitized = text
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');

        // Apply max length
        const maxLength = this.ruleset.freetextMaxLength || Config.PROMOCODE.MAX_LENGTHS.FREETEXT;
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        return sanitized;
    }

    /**
     * Generate code type segment
     */
    generateCodeTypeSegment(codeType) {
        if (!codeType) return '';
        
        // Validate against allowed code types
        const allowedTypes = Config.PROMOCODE.CODE_TYPES;
        const upperCodeType = codeType.toUpperCase();
        
        if (allowedTypes.includes(upperCodeType)) {
            return upperCodeType;
        }
        
        return '';
    }

    /**
     * Generate renewal plan segment
     */
    generateRenewalPlanSegment(renewalTerm, price) {
        // Format: {term}{price}
        // Example: M249, Q399, Y2999
        
        const segments = [];
        
        // Renewal term (M/Q/Y/U)
        segments.push(renewalTerm.toUpperCase());
        
        // Price (number)
        const priceValue = price !== undefined && price !== null && price !== '' 
            ? Math.round(parseFloat(price)) 
            : 0;
        segments.push(priceValue.toString());
        
        return segments.join('');
    }

    /**
     * Apply casing rules to the final code
     */
    applyCasing(text, casing) {
        switch (casing) {
            case 'UPPER':
                return text.toUpperCase();
            case 'LOWER':
                return text.toLowerCase();
            case 'CAMEL':
                // First letter lowercase, capitalize after separators
                return text.toLowerCase().replace(/-([a-z])/g, (match, letter) => 
                    '-' + letter.toUpperCase()
                );
            case 'KEBAB':
                return text.toLowerCase();
            default:
                return text.toUpperCase(); // Default to uppercase
        }
    }

    /**
     * Save generated code to history
     */
    saveToHistory(code, inputs) {
        try {
            // Get existing history
            const historyJson = localStorage.getItem(Config.STORAGE.HISTORY);
            const history = historyJson ? JSON.parse(historyJson) : [];

            // Create history entry
            const entry = {
                id: Date.now().toString(),
                code: code,
                timestamp: new Date().toISOString(),
                inputs: {
                    brand: inputs.brand?.name,
                    product: inputs.product?.name,
                    initialOffer: `${inputs.initialLength}${inputs.initialPeriod} ${inputs.discountAmount}${inputs.discountType}`,
                    renewalType: inputs.renewalType,
                    campaignText: inputs.campaignText,
                    codeType: inputs.codeType,
                    renewalPlan: `${inputs.renewalTerm}${inputs.price || inputs.overridePrice}`
                }
            };

            // Add to beginning of history
            history.unshift(entry);

            // Keep only last 50 entries
            if (history.length > 50) {
                history.splice(50);
            }

            // Save back to localStorage
            localStorage.setItem(Config.STORAGE.HISTORY, JSON.stringify(history));

            if (Config.FEATURES.DEBUG_MODE) {
                console.log('💾 Saved to history:', entry);
            }
        } catch (error) {
            console.error('Failed to save to history:', error);
        }
    }

    /**
     * Get generation history
     */
    getHistory(limit = 10) {
        try {
            const historyJson = localStorage.getItem(Config.STORAGE.HISTORY);
            const history = historyJson ? JSON.parse(historyJson) : [];
            return history.slice(0, limit);
        } catch (error) {
            console.error('Failed to get history:', error);
            return [];
        }
    }

    /**
     * Clear history
     */
    clearHistory() {
        localStorage.removeItem(Config.STORAGE.HISTORY);
        if (Config.FEATURES.DEBUG_MODE) {
            console.log('🧹 History cleared');
        }
    }
}

// Create singleton instance
const promocodeGenerator = new PromocodeGenerator();

// Export for use in other modules
window.promocodeGenerator = promocodeGenerator;

if (Config.FEATURES.DEBUG_MODE) {
    console.log('🎯 Promocode Generator initialized', promocodeGenerator);
}