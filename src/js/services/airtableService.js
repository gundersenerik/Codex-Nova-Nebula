/* ============================================================================
   CODEX NOVA NEBULA - Airtable Service
   Core service for all Airtable API interactions with caching
   ============================================================================ */

class AirtableService {
    constructor() {
        this.baseUrl = Config.AIRTABLE.BASE_URL;
        this.baseId = Config.AIRTABLE.BASE_ID;
        this.apiKey = Config.AIRTABLE.API_KEY;
        this.cache = new Map();
        this.pendingRequests = new Map();
    }

    /**
     * Build the full API URL for a table
     */
    getTableUrl(tableName, options = {}) {
        let url = `${this.baseUrl}/${this.baseId}/${encodeURIComponent(tableName)}`;
        
        const params = new URLSearchParams();
        
        if (options.view) {
            params.append('view', options.view);
        }
        if (options.maxRecords) {
            params.append('maxRecords', options.maxRecords);
        }
        if (options.filterByFormula) {
            params.append('filterByFormula', options.filterByFormula);
        }
        if (options.sort) {
            options.sort.forEach((sortField, index) => {
                params.append(`sort[${index}][field]`, sortField.field);
                params.append(`sort[${index}][direction]`, sortField.direction || 'asc');
            });
        }
        if (options.fields) {
            options.fields.forEach(field => {
                params.append('fields[]', field);
            });
        }
        if (options.offset) {
            params.append('offset', options.offset);
        }
        
        const queryString = params.toString();
        return queryString ? `${url}?${queryString}` : url;
    }

    /**
     * Generate cache key for requests
     */
    getCacheKey(tableName, options = {}) {
        return `${tableName}_${JSON.stringify(options)}`;
    }

    /**
     * Check if cached data is still valid
     */
    isCacheValid(cacheEntry) {
        if (!cacheEntry) return false;
        const now = Date.now();
        return (now - cacheEntry.timestamp) < Config.API.CACHE_DURATION;
    }

    /**
     * Get headers for API requests
     */
    getHeaders() {
        if (Config.FEATURES.USE_PROXY) {
            // If using proxy, might not need auth headers
            return {
                'Content-Type': 'application/json'
            };
        }
        
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Fetch data with caching and error handling
     */
    async fetchData(tableName, options = {}) {
        const cacheKey = this.getCacheKey(tableName, options);
        
        // Check cache first if caching is enabled
        if (Config.FEATURES.USE_CACHE) {
            const cachedData = this.cache.get(cacheKey);
            if (this.isCacheValid(cachedData)) {
                if (Config.FEATURES.DEBUG_MODE) {
                    console.log(`📦 Using cached data for ${tableName}`);
                }
                return cachedData.data;
            }
        }
        
        // Check if request is already pending (prevent duplicate requests)
        if (this.pendingRequests.has(cacheKey)) {
            if (Config.FEATURES.DEBUG_MODE) {
                console.log(`⏳ Waiting for pending request: ${tableName}`);
            }
            return this.pendingRequests.get(cacheKey);
        }
        
        // Create new request
        const requestPromise = this.performFetch(tableName, options);
        this.pendingRequests.set(cacheKey, requestPromise);
        
        try {
            const data = await requestPromise;
            
            // Cache the successful response
            if (Config.FEATURES.USE_CACHE) {
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
            }
            
            return data;
        } finally {
            // Remove from pending requests
            this.pendingRequests.delete(cacheKey);
        }
    }

    /**
     * Perform the actual fetch with retry logic
     */
    async performFetch(tableName, options = {}, retryCount = 0) {
        const url = this.getTableUrl(tableName, options);
        
        if (Config.FEATURES.DEBUG_MODE) {
            console.log(`🔄 Fetching: ${url}`);
        }
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(),
                signal: AbortSignal.timeout(Config.API.TIMEOUT)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle pagination if there are more records
            let allRecords = [...data.records];
            
            if (data.offset) {
                const nextOptions = { ...options, offset: data.offset };
                const nextData = await this.performFetch(tableName, nextOptions);
                allRecords = [...allRecords, ...nextData];
            }
            
            return allRecords;
            
        } catch (error) {
            // Retry logic
            if (retryCount < Config.API.RETRY_ATTEMPTS) {
                if (Config.FEATURES.DEBUG_MODE) {
                    console.log(`⚠️ Retry ${retryCount + 1}/${Config.API.RETRY_ATTEMPTS} for ${tableName}`);
                }
                
                await new Promise(resolve => 
                    setTimeout(resolve, Config.API.RETRY_DELAY * (retryCount + 1))
                );
                
                return this.performFetch(tableName, options, retryCount + 1);
            }
            
            console.error(`❌ Failed to fetch ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Clear cache (all or specific table)
     */
    clearCache(tableName = null) {
        if (tableName) {
            // Clear specific table cache
            for (const [key] of this.cache) {
                if (key.startsWith(tableName)) {
                    this.cache.delete(key);
                }
            }
        } else {
            // Clear all cache
            this.cache.clear();
        }
        
        if (Config.FEATURES.DEBUG_MODE) {
            console.log(`🧹 Cache cleared: ${tableName || 'all'}`);
        }
    }

    // =========================================================================
    // Specific methods for each table
    // =========================================================================

    /**
     * Fetch all brands
     */
    async fetchBrands() {
        try {
            const records = await this.fetchData(Config.AIRTABLE.TABLES.BRANDS, {
                sort: [{ field: Config.AIRTABLE.FIELDS.BRANDS.BRAND_NAME, direction: 'asc' }]
            });
            
            return records.map(record => ({
                id: record.id,
                code: record.fields[Config.AIRTABLE.FIELDS.BRANDS.BRAND_CODE],
                name: record.fields[Config.AIRTABLE.FIELDS.BRANDS.BRAND_NAME],
                country: record.fields[Config.AIRTABLE.FIELDS.BRANDS.COUNTRY],
                brazeCode: record.fields[Config.AIRTABLE.FIELDS.BRANDS.BRAZE_CODE],
                raw: record.fields
            }));
        } catch (error) {
            console.error('Failed to fetch brands:', error);
            throw error;
        }
    }

    /**
     * Fetch products filtered by brand
     */
    async fetchProductsByBrand(brandId) {
        try {
            // Create filter formula for linked records
            const filterFormula = `FIND('${brandId}', {${Config.AIRTABLE.FIELDS.PRODUCTS.BRAND}})`;
            
            const records = await this.fetchData(Config.AIRTABLE.TABLES.PRODUCTS, {
                filterByFormula: filterFormula,
                sort: [{ field: Config.AIRTABLE.FIELDS.PRODUCTS.PRODUCT_NAME, direction: 'asc' }]
            });
            
            return records.map(record => ({
                id: record.id,
                name: record.fields[Config.AIRTABLE.FIELDS.PRODUCTS.PRODUCT_NAME],
                type: record.fields[Config.AIRTABLE.FIELDS.PRODUCTS.PRODUCT_TYPE],
                code: record.fields[Config.AIRTABLE.FIELDS.PRODUCTS.PRODUCT_CODE],
                brandIds: record.fields[Config.AIRTABLE.FIELDS.PRODUCTS.BRAND] || [],
                promocodeId: record.fields[Config.AIRTABLE.FIELDS.PRODUCTS.PROMOCODE_ID],
                raw: record.fields
            }));
        } catch (error) {
            console.error('Failed to fetch products:', error);
            throw error;
        }
    }

    /**
     * Fetch all products (unfiltered)
     */
    async fetchAllProducts() {
        try {
            const records = await this.fetchData(Config.AIRTABLE.TABLES.PRODUCTS, {
                sort: [{ field: Config.AIRTABLE.FIELDS.PRODUCTS.PRODUCT_NAME, direction: 'asc' }]
            });
            
            return records.map(record => ({
                id: record.id,
                name: record.fields[Config.AIRTABLE.FIELDS.PRODUCTS.PRODUCT_NAME],
                type: record.fields[Config.AIRTABLE.FIELDS.PRODUCTS.PRODUCT_TYPE],
                code: record.fields[Config.AIRTABLE.FIELDS.PRODUCTS.PRODUCT_CODE],
                brandIds: record.fields[Config.AIRTABLE.FIELDS.PRODUCTS.BRAND] || [],
                promocodeId: record.fields[Config.AIRTABLE.FIELDS.PRODUCTS.PROMOCODE_ID],
                raw: record.fields
            }));
        } catch (error) {
            console.error('Failed to fetch all products:', error);
            throw error;
        }
    }

    /**
     * Fetch rate plans filtered by product
     */
    async fetchRatePlansByProduct(productId) {
        try {
            // Create filter formula for linked records
            const filterFormula = `FIND('${productId}', {${Config.AIRTABLE.FIELDS.RATE_PLANS.PRODUCT}})`;
            
            const records = await this.fetchData(Config.AIRTABLE.TABLES.RATE_PLANS, {
                filterByFormula: filterFormula,
                sort: [{ field: Config.AIRTABLE.FIELDS.RATE_PLANS.PLAN_NAME, direction: 'asc' }]
            });
            
            return records.map(record => ({
                id: record.id,
                code: record.fields[Config.AIRTABLE.FIELDS.RATE_PLANS.PLAN_CODE],
                name: record.fields[Config.AIRTABLE.FIELDS.RATE_PLANS.PLAN_NAME],
                price: record.fields[Config.AIRTABLE.FIELDS.RATE_PLANS.PRICE],
                category: record.fields[Config.AIRTABLE.FIELDS.RATE_PLANS.CATEGORY],
                productIds: record.fields[Config.AIRTABLE.FIELDS.RATE_PLANS.PRODUCT] || [],
                planId: record.fields[Config.AIRTABLE.FIELDS.RATE_PLANS.PLAN_ID],
                raw: record.fields
            }));
        } catch (error) {
            console.error('Failed to fetch rate plans:', error);
            throw error;
        }
    }

    /**
     * Fetch active ruleset for promocodes
     */
    async fetchPromocodeRuleset(brandId = null) {
        try {
            const filterParts = [
                `{${Config.AIRTABLE.FIELDS.RULESETS.TYPE}} = 'Promocode'`,
                `{${Config.AIRTABLE.FIELDS.RULESETS.STATUS}} = 'Active'`
            ];
            
            const filterFormula = `AND(${filterParts.join(', ')})`;
            
            const records = await this.fetchData(Config.AIRTABLE.TABLES.RULESETS, {
                filterByFormula: filterFormula,
                maxRecords: 1,
                sort: [{ field: Config.AIRTABLE.FIELDS.RULESETS.VERSION, direction: 'desc' }]
            });
            
            if (records.length === 0) {
                throw new Error('No active promocode ruleset found');
            }
            
            const ruleset = records[0];
            return {
                id: ruleset.id,
                name: ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.NAME],
                version: ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.VERSION],
                segmentsOrder: ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.SEGMENTS_ORDER],
                separator: ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.SEPARATOR] || '-',
                casing: ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.CASING] || 'UPPER',
                initialOfferRegex: ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.INITIAL_OFFER_REGEX],
                renewalPlanRegex: ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.RENEWAL_PLAN_REGEX],
                periodMap: JSON.parse(ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.PERIOD_MAP] || '{}'),
                termMap: JSON.parse(ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.TERM_MAP] || '{}'),
                priceTypeMap: JSON.parse(ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.PRICE_TYPE_MAP] || '{}'),
                freetextMaxLength: ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.FREETEXT_MAX_LENGTH] || 15,
                freetextSanitization: ruleset.fields[Config.AIRTABLE.FIELDS.RULESETS.FREETEXT_SANITIZATION],
                raw: ruleset.fields
            };
        } catch (error) {
            console.error('Failed to fetch promocode ruleset:', error);
            // Return default ruleset if fetch fails
            return {
                separator: '-',
                casing: 'UPPER',
                periodMap: Config.PROMOCODE.PERIODS,
                termMap: Config.PROMOCODE.TERMS,
                priceTypeMap: Config.PROMOCODE.DISCOUNT_TYPES,
                freetextMaxLength: 15
            };
        }
    }

    /**
     * Fetch promocode code types vocabulary
     */
    async fetchCodeTypes() {
        try {
            const filterFormula = `{Active} = TRUE()`;
            
            const records = await this.fetchData(Config.AIRTABLE.TABLES.VOCAB_CODE_TYPES, {
                filterByFormula: filterFormula
            });
            
            return records.map(record => ({
                code: record.fields['Code'],
                label: record.fields['Label'],
                active: record.fields['Active'],
                raw: record.fields
            }));
        } catch (error) {
            console.error('Failed to fetch code types:', error);
            // Return default code types if fetch fails
            return Config.PROMOCODE.CODE_TYPES.map(code => ({
                code: code,
                label: code
            }));
        }
    }
}

// Create singleton instance
const airtableService = new AirtableService();

// Export for use in other modules
window.airtableService = airtableService;

if (Config.FEATURES.DEBUG_MODE) {
    console.log('📡 Airtable Service initialized', airtableService);
}