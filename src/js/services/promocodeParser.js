/* ============================================================================
   CODEX NOVA NEBULA - Promocode Parser
   Validates and reverses promocodes to extract their components
   ============================================================================ */

class PromocodeParser {
    constructor() {
        this.ruleset = null;
        this.lastParsedCode = null;
        this.lastParsedResult = null;
    }

    /**
     * Initialize parser with ruleset
     */
    async initialize() {
        try {
            // Fetch active ruleset from Airtable
            this.ruleset = await airtableService.fetchPromocodeRuleset();
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log('📋 Parser ruleset loaded:', this.ruleset);
            }
        } catch (error) {
            console.error('Failed to load ruleset, using defaults:', error);
            
            // Use default ruleset if fetch fails
            this.ruleset = {
                separator: Config.PROMOCODE.SEPARATOR,
                periodMap: Config.PROMOCODE.PERIODS,
                termMap: Config.PROMOCODE.TERMS,
                priceTypeMap: Config.PROMOCODE.DISCOUNT_TYPES,
                initialOfferRegex: Config.PROMOCODE.PATTERNS.INITIAL_OFFER.source,
                renewalPlanRegex: Config.PROMOCODE.PATTERNS.RENEWAL_PLAN.source
            };
        }
    }

    /**
     * Parse and validate a promocode
     */
    async parseCode(code) {
        if (!code || typeof code !== 'string') {
            throw new Error('Invalid promocode: empty or not a string');
        }

        // Ensure ruleset is loaded
        if (!this.ruleset) {
            await this.initialize();
        }

        // Store original code
        this.lastParsedCode = code;

        // Split by separator
        const segments = code.split(this.ruleset.separator || '-');
        
        if (segments.length < 5) {
            throw new Error('Invalid promocode format: insufficient segments');
        }

        const result = {
            isValid: false,
            originalCode: code,
            segments: segments,
            parsed: {},
            humanReadable: {}
        };

        try {
            // Parse segments in order
            let segmentIndex = 0;

            // 1. Brand segment (required)
            result.parsed.brand = segments[segmentIndex];
            result.humanReadable.brand = await this.decodeBrand(segments[segmentIndex]);
            segmentIndex++;

            // 2. Product segment (required)
            result.parsed.product = segments[segmentIndex];
            result.humanReadable.product = await this.decodeProduct(segments[segmentIndex]);
            segmentIndex++;

            // 3. Initial Offer segment (required)
            const initialOfferParsed = this.parseInitialOffer(segments[segmentIndex]);
            result.parsed.initialOffer = segments[segmentIndex];
            result.parsed.initialLength = initialOfferParsed.length;
            result.parsed.initialPeriod = initialOfferParsed.period;
            result.parsed.discountAmount = initialOfferParsed.discount;
            result.parsed.discountType = initialOfferParsed.type;
            result.humanReadable.initialOffer = this.formatInitialOffer(initialOfferParsed);
            segmentIndex++;

            // 4. Renewal Type segment (required)
            result.parsed.renewalType = segments[segmentIndex];
            result.humanReadable.renewalType = this.decodeRenewalType(segments[segmentIndex]);
            segmentIndex++;

            // Now we need to identify optional segments and the final renewal plan
            // The last segment should always be the renewal plan
            const lastSegment = segments[segments.length - 1];
            const renewalPlanParsed = this.parseRenewalPlan(lastSegment);
            
            if (renewalPlanParsed) {
                result.parsed.renewalPlan = lastSegment;
                result.parsed.renewalTerm = renewalPlanParsed.term;
                result.parsed.price = renewalPlanParsed.price;
                result.humanReadable.renewalPlan = this.formatRenewalPlan(renewalPlanParsed);
            } else {
                throw new Error('Invalid renewal plan segment');
            }

            // Process optional middle segments (between renewal type and renewal plan)
            const middleSegments = segments.slice(segmentIndex, segments.length - 1);
            
            for (const segment of middleSegments) {
                // Check if it's a code type
                if (this.isCodeType(segment)) {
                    result.parsed.codeType = segment;
                    result.humanReadable.codeType = this.decodeCodeType(segment);
                } else {
                    // Treat as freetext/campaign text
                    if (!result.parsed.campaignText) {
                        result.parsed.campaignText = segment;
                        result.humanReadable.campaignText = segment;
                    }
                }
            }

            // Mark as valid if we got this far
            result.isValid = true;
            
            // Generate summary
            result.summary = this.generateSummary(result);

        } catch (error) {
            result.isValid = false;
            result.error = error.message;
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.error('Parse error:', error);
            }
        }

        // Store result
        this.lastParsedResult = result;

        return result;
    }

    /**
     * Parse initial offer segment
     */
    parseInitialOffer(segment) {
        const regex = new RegExp(this.ruleset.initialOfferRegex || '^(\\d+)([MUQY])(\\d+)([KP])$');
        const match = segment.match(regex);
        
        if (!match) {
            throw new Error(`Invalid initial offer format: ${segment}`);
        }

        return {
            length: parseInt(match[1], 10),
            period: match[2],
            discount: parseInt(match[3], 10),
            type: match[4]
        };
    }

    /**
     * Parse renewal plan segment
     */
    parseRenewalPlan(segment) {
        const regex = new RegExp(this.ruleset.renewalPlanRegex || '^([MQYU])(\\d+)$');
        const match = segment.match(regex);
        
        if (!match) {
            return null;
        }

        return {
            term: match[1],
            price: parseInt(match[2], 10)
        };
    }

    /**
     * Check if segment is a valid code type
     */
    isCodeType(segment) {
        const validTypes = Config.PROMOCODE.CODE_TYPES;
        return validTypes.includes(segment.toUpperCase());
    }

    /**
     * Decode brand code to name
     */
    async decodeBrand(brandCode) {
        try {
            // Try to find brand in service
            await brandService.initialize();
            const brand = brandService.getBrandByCode(brandCode);
            
            if (brand) {
                return `${brand.name} (${brandCode})`;
            }
        } catch (error) {
            console.error('Failed to decode brand:', error);
        }
        
        return brandCode;
    }

    /**
     * Decode product code to name
     */
    async decodeProduct(productCode) {
        try {
            // Try to find product in service
            await productService.initialize();
            const product = productService.getProductByCode(productCode);
            
            if (product) {
                return `${product.name} (${productCode})`;
            }
        } catch (error) {
            console.error('Failed to decode product:', error);
        }
        
        return productCode;
    }

    /**
     * Decode renewal type
     */
    decodeRenewalType(type) {
        const types = Config.PROMOCODE.RENEWAL_TYPES;
        return types[type] || type;
    }

    /**
     * Decode code type
     */
    decodeCodeType(code) {
        const codeMap = {
            'WB': 'Winback',
            'HB': 'Holdback',
            'CMP': 'Campaign',
            'FREE': 'Free',
            'EMP': 'Employee',
            'KS': 'Kompis'
        };
        
        return codeMap[code] || code;
    }

    /**
     * Format initial offer for display
     */
    formatInitialOffer(parsed) {
        const period = this.ruleset.periodMap[parsed.period] || parsed.period;
        const discountType = this.ruleset.priceTypeMap[parsed.type] || parsed.type;
        
        return `${parsed.length} ${period} - ${parsed.discount} ${discountType} discount`;
    }

    /**
     * Format renewal plan for display
     */
    formatRenewalPlan(parsed) {
        const term = this.ruleset.termMap[parsed.term] || parsed.term;
        return `${term} - ${parsed.price} kr`;
    }

    /**
     * Generate human-readable summary
     */
    generateSummary(result) {
        const parts = [];
        
        if (result.humanReadable.brand) {
            parts.push(`Brand: ${result.humanReadable.brand}`);
        }
        
        if (result.humanReadable.product) {
            parts.push(`Product: ${result.humanReadable.product}`);
        }
        
        if (result.humanReadable.initialOffer) {
            parts.push(`Initial Offer: ${result.humanReadable.initialOffer}`);
        }
        
        if (result.humanReadable.renewalType) {
            parts.push(`Renewal: ${result.humanReadable.renewalType}`);
        }
        
        if (result.humanReadable.campaignText) {
            parts.push(`Campaign: ${result.humanReadable.campaignText}`);
        }
        
        if (result.humanReadable.codeType) {
            parts.push(`Type: ${result.humanReadable.codeType}`);
        }
        
        if (result.humanReadable.renewalPlan) {
            parts.push(`Renewal Plan: ${result.humanReadable.renewalPlan}`);
        }
        
        return parts.join(' | ');
    }

    /**
     * Validate code format without parsing
     */
    quickValidate(code) {
        if (!code || typeof code !== 'string') {
            return false;
        }

        // Check minimum length
        if (code.length < 15) {
            return false;
        }

        // Check separator count (minimum 4 separators for 5 segments)
        const separator = this.ruleset?.separator || '-';
        const separatorCount = (code.match(new RegExp(`\\${separator}`, 'g')) || []).length;
        
        if (separatorCount < 4) {
            return false;
        }

        return true;
    }

    /**
     * Get parsing history (if saved)
     */
    getParsingHistory(limit = 10) {
        try {
            const historyJson = localStorage.getItem(Config.STORAGE.HISTORY + '_parsed');
            const history = historyJson ? JSON.parse(historyJson) : [];
            return history.slice(0, limit);
        } catch (error) {
            console.error('Failed to get parsing history:', error);
            return [];
        }
    }

    /**
     * Save parsed result to history
     */
    saveToHistory(result) {
        if (!Config.FEATURES.ENABLE_HISTORY) return;

        try {
            const historyJson = localStorage.getItem(Config.STORAGE.HISTORY + '_parsed');
            const history = historyJson ? JSON.parse(historyJson) : [];

            const entry = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                code: result.originalCode,
                isValid: result.isValid,
                summary: result.summary || result.error
            };

            history.unshift(entry);

            // Keep only last 20 entries
            if (history.length > 20) {
                history.splice(20);
            }

            localStorage.setItem(Config.STORAGE.HISTORY + '_parsed', JSON.stringify(history));

            if (Config.FEATURES.DEBUG_MODE) {
                console.log('💾 Saved parsed result to history:', entry);
            }
        } catch (error) {
            console.error('Failed to save to history:', error);
        }
    }

    /**
     * Format result for display
     */
    formatForDisplay(result) {
        if (!result.isValid) {
            return {
                status: 'error',
                message: result.error || 'Invalid promocode format'
            };
        }

        const display = {
            status: 'success',
            code: result.originalCode,
            breakdown: []
        };

        // Add each component to breakdown
        if (result.humanReadable.brand) {
            display.breakdown.push({
                label: 'Brand',
                value: result.humanReadable.brand,
                raw: result.parsed.brand
            });
        }

        if (result.humanReadable.product) {
            display.breakdown.push({
                label: 'Product',
                value: result.humanReadable.product,
                raw: result.parsed.product
            });
        }

        if (result.humanReadable.initialOffer) {
            display.breakdown.push({
                label: 'Initial Offer',
                value: result.humanReadable.initialOffer,
                raw: result.parsed.initialOffer,
                details: {
                    length: result.parsed.initialLength,
                    period: result.parsed.initialPeriod,
                    discount: result.parsed.discountAmount,
                    type: result.parsed.discountType
                }
            });
        }

        if (result.humanReadable.renewalType) {
            display.breakdown.push({
                label: 'Renewal Type',
                value: result.humanReadable.renewalType,
                raw: result.parsed.renewalType
            });
        }

        if (result.humanReadable.campaignText) {
            display.breakdown.push({
                label: 'Campaign',
                value: result.humanReadable.campaignText,
                raw: result.parsed.campaignText
            });
        }

        if (result.humanReadable.codeType) {
            display.breakdown.push({
                label: 'Code Type',
                value: result.humanReadable.codeType,
                raw: result.parsed.codeType
            });
        }

        if (result.humanReadable.renewalPlan) {
            display.breakdown.push({
                label: 'Renewal Plan',
                value: result.humanReadable.renewalPlan,
                raw: result.parsed.renewalPlan,
                details: {
                    term: result.parsed.renewalTerm,
                    price: result.parsed.price
                }
            });
        }

        return display;
    }
}

// Create singleton instance
const promocodeParser = new PromocodeParser();

// Export for use in other modules
window.promocodeParser = promocodeParser;

if (Config.FEATURES.DEBUG_MODE) {
    console.log('🔍 Promocode Parser initialized', promocodeParser);
}