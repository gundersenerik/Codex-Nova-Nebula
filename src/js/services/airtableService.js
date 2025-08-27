/* ============================================================================
   CODEX NOVA NEBULA - Airtable Service
   Core service for all Airtable API interactions with caching
   UPDATED: Better product field discovery
   ============================================================================ */

class AirtableService {
    constructor() {
        this.baseUrl = Config.AIRTABLE.BASE_URL;
        this.baseId = Config.AIRTABLE.BASE_ID;
        this.apiKey = Config.AIRTABLE.API_KEY;
        this.cache = new Map();
        this.pendingRequests = new Map();
        
        // Store discovered field mappings
        this.fieldMappings = {
            brands: {},
            products: {},
            ratePlans: {}
        };
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
        if (Config.FEATURES.USE_CACHE && !options.noCache) {
            const cachedData = this.cache.get(cacheKey);
            if (this.isCacheValid(cachedData)) {
                if (Config.FEATURES.DEBUG_MODE) {
                    console.log(`📦 Using cached data for ${tableName}`);
                }
                return cachedData.data;
            }
        }
        
        // Check if request is already pending
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
                // Get more details about the error
                let errorDetails = `HTTP error! status: ${response.status}`;
                try {
                    const errorBody = await response.json();
                    if (errorBody.error) {
                        errorDetails = `Airtable Error: ${errorBody.error.type || 'Unknown'} - ${errorBody.error.message || 'No message'}`;
                        console.error('📛 Airtable API Error:', errorBody.error);
                    }
                } catch (e) {
                    // Could not parse error body
                }
                throw new Error(errorDetails);
            }
            
            const data = await response.json();
            
            // Handle pagination
            let allRecords = [...data.records];
            
            if (data.offset && !options.noPagination) {
                const nextOptions = { ...options, offset: data.offset };
                const nextData = await this.performFetch(tableName, nextOptions);
                allRecords = [...allRecords, ...nextData];
            }
            
            return allRecords;
            
        } catch (error) {
            // Retry logic for network errors only
            if (retryCount < Config.API.RETRY_ATTEMPTS && !error.message.includes('422') && !error.message.includes('INVALID_FILTER')) {
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
     * Clear cache
     */
    clearCache(tableName = null) {
        if (tableName) {
            for (const [key] of this.cache) {
                if (key.startsWith(tableName)) {
                    this.cache.delete(key);
                }
            }
        } else {
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
            const records = await this.fetchData(Config.AIRTABLE.TABLES.BRANDS);
            
            // Log field structure for first brand
            if (records.length > 0 && !this.fieldMappings.brands.logged) {
                console.log('📊 BRAND TABLE STRUCTURE:');
                console.log('  Fields:', Object.keys(records[0].fields));
                console.log('  Sample:', JSON.stringify(records[0].fields, null, 2));
                this.fieldMappings.brands.logged = true;
            }
            
            return records.map(record => {
                const fields = record.fields;
                
                return {
                    id: record.id,
                    code: fields['Brand_Code'] || fields['Code'] || '',
                    name: fields['Brand_Name'] || fields['Name'] || '',
                    country: fields['Country'] || '',
                    brazeCode: fields['Braze_Code'] || fields['Brand_Code'] || '',
                    raw: fields
                };
            });
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
            // First, let's fetch ALL products to see their structure and find the right ones
            console.log('🔍 Fetching all products to analyze structure...');
            const allRecords = await this.fetchData(Config.AIRTABLE.TABLES.PRODUCTS);
            
            if (allRecords.length > 0) {
                console.log('📊 PRODUCT TABLE ANALYSIS:');
                console.log('  Total products:', allRecords.length);
                console.log('  First product fields:', Object.keys(allRecords[0].fields));
                console.log('  First product data:', JSON.stringify(allRecords[0].fields, null, 2));
                
                // Look for any field that might contain brand references
                const sampleProduct = allRecords[0].fields;
                for (const [fieldName, fieldValue] of Object.entries(sampleProduct)) {
                    if (fieldValue && (Array.isArray(fieldValue) || typeof fieldValue === 'string')) {
                        // Check if this field contains record IDs (they start with 'rec')
                        const valueToCheck = Array.isArray(fieldValue) ? fieldValue[0] : fieldValue;
                        if (valueToCheck && typeof valueToCheck === 'string' && valueToCheck.startsWith('rec')) {
                            console.log(`  Potential link field "${fieldName}":`, fieldValue);
                        }
                    }
                }
            }
            
            // Now filter products for our brand
            // Since the Brand has a Products field with product IDs, we can use those IDs
            const brand = await this.fetchBrandById(brandId);
            if (brand && brand.fields.Products) {
                const productIds = brand.fields.Products;
                console.log('📦 Brand has these product IDs:', productIds);
                
                // Filter products by ID
                const brandProducts = allRecords.filter(record => 
                    productIds.includes(record.id)
                );
                
                console.log(`✅ Found ${brandProducts.length} products for brand`);
                
                return brandProducts.map(record => {
                    const fields = record.fields;
                    
                    return {
                        id: record.id,
                        name: fields['Product_Name'] || fields['Name'] || 'Unknown Product',
                        type: fields['Product_Type'] || fields['Type'] || fields['Category'] || '',
                        code: fields['Product_Code'] || fields['Code'] || fields['SKU'] || '',
                        brandIds: [brandId], // We know this product belongs to this brand
                        promocodeId: fields['Promocode_ID'] || fields['Promocode ID'] || '',
                        raw: fields
                    };
                });
            }
            
            // If we can't find products through the brand's Products field, try other methods
            console.log('⚠️ Could not find products through Brand.Products field');
            
            // Try to find which field in Products links to Brand
            const records = allRecords.filter(record => {
                const fields = record.fields;
                
                // Check various possible field names
                for (const possibleField of ['Brand', 'Brands', 'Brand_ID', 'BrandID', 'brand']) {
                    const fieldValue = fields[possibleField];
                    if (fieldValue) {
                        if (Array.isArray(fieldValue)) {
                            if (fieldValue.includes(brandId)) return true;
                        } else if (fieldValue === brandId) {
                            return true;
                        }
                    }
                }
                return false;
            });
            
            console.log(`📦 Alternative filter found ${records.length} products`);
            
            return records.map(record => {
                const fields = record.fields;
                
                return {
                    id: record.id,
                    name: fields['Product_Name'] || fields['Name'] || 'Unknown Product',
                    type: fields['Product_Type'] || fields['Type'] || fields['Category'] || '',
                    code: fields['Product_Code'] || fields['Code'] || fields['SKU'] || '',
                    brandIds: [brandId],
                    promocodeId: fields['Promocode_ID'] || fields['Promocode ID'] || '',
                    raw: fields
                };
            });
        } catch (error) {
            console.error('Failed to fetch products:', error);
            return [];
        }
    }

    /**
     * Fetch a single brand by ID
     */
    async fetchBrandById(brandId) {
        try {
            // Try to get from cache first
            const cachedBrands = this.cache.get(`${Config.AIRTABLE.TABLES.BRANDS}_{}`);
            if (cachedBrands && this.isCacheValid(cachedBrands)) {
                const brand = cachedBrands.data.find(b => b.id === brandId);
                if (brand) return brand;
            }
            
            // Fetch directly
            const url = `${this.baseUrl}/${this.baseId}/${Config.AIRTABLE.TABLES.BRANDS}/${brandId}`;
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch brand: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to fetch brand by ID:', error);
            return null;
        }
    }

    /**
     * Fetch all products
     */
    async fetchAllProducts() {
        try {
            const records = await this.fetchData(Config.AIRTABLE.TABLES.PRODUCTS);
            
            return records.map(record => {
                const fields = record.fields;
                
                return {
                    id: record.id,
                    name: fields['Product_Name'] || fields['Name'] || 'Unknown Product',
                    type: fields['Product_Type'] || fields['Type'] || '',
                    code: fields['Product_Code'] || fields['Code'] || '',
                    brandIds: fields['Brand'] || fields['Brands'] || [],
                    promocodeId: fields['Promocode_ID'] || '',
                    raw: fields
                };
            });
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
            // First fetch all rate plans to understand structure
            console.log('🔍 Fetching rate plans for product:', productId);
            const allRecords = await this.fetchData(Config.AIRTABLE.TABLES.RATE_PLANS);
            
            if (allRecords.length > 0 && !this.fieldMappings.ratePlans.logged) {
                console.log('📊 RATE PLAN TABLE STRUCTURE:');
                console.log('  Total rate plans:', allRecords.length);
                console.log('  First rate plan fields:', Object.keys(allRecords[0].fields));
                console.log('  First rate plan data:', JSON.stringify(allRecords[0].fields, null, 2));
                this.fieldMappings.ratePlans.logged = true;
            }
            
            // Filter for this product
            const records = allRecords.filter(record => {
                const fields = record.fields;
                
                // Check various possible field names for product link
                for (const possibleField of ['Product', 'Products', 'Product_ID', 'ProductID']) {
                    const fieldValue = fields[possibleField];
                    if (fieldValue) {
                        if (Array.isArray(fieldValue)) {
                            if (fieldValue.includes(productId)) return true;
                        } else if (fieldValue === productId) {
                            return true;
                        }
                    }
                }
                return false;
            });
            
            console.log(`📦 Found ${records.length} rate plans for product`);
            
            return records.map(record => {
                const fields = record.fields;
                
                return {
                    id: record.id,
                    code: fields['Code'] || fields['Plan_Code'] || '',
                    name: fields['Name'] || fields['Plan_Name'] || fields['Rate_Plan_Name'] || '',
                    price: fields['Price'] || 0,
                    category: fields['Category'] || fields['Type'] || '',
                    productIds: [productId],
                    planId: fields['Plan_ID'] || fields['ID'] || '',
                    raw: fields
                };
            });
        } catch (error) {
            console.error('Failed to fetch rate plans:', error);
            return [];
        }
    }

    /**
     * Fetch promocode ruleset
     */
    async fetchPromocodeRuleset(brandId = null) {
        try {
            // Try to fetch from Rulesets table if it exists
            const records = await this.fetchData(Config.AIRTABLE.TABLES.RULESETS, {
                maxRecords: 1
            });
            
            if (records.length > 0) {
                const ruleset = records[0].fields;
                console.log('📋 Found ruleset in Airtable:', ruleset);
                
                // Parse JSON fields if they exist
                let periodMap = Config.PROMOCODE.PERIODS;
                let termMap = Config.PROMOCODE.TERMS;
                let priceTypeMap = Config.PROMOCODE.DISCOUNT_TYPES;
                
                try {
                    if (ruleset['Period_Map_JSON']) periodMap = JSON.parse(ruleset['Period_Map_JSON']);
                    if (ruleset['Term_Map_JSON']) termMap = JSON.parse(ruleset['Term_Map_JSON']);
                    if (ruleset['Price_Type_Map_JSON']) priceTypeMap = JSON.parse(ruleset['Price_Type_Map_JSON']);
                } catch (e) {
                    console.log('Could not parse JSON fields');
                }
                
                return {
                    separator: ruleset['Separator'] || '-',
                    casing: ruleset['Casing'] || 'UPPER',
                    periodMap: periodMap,
                    termMap: termMap,
                    priceTypeMap: priceTypeMap,
                    freetextMaxLength: ruleset['Freetext_Max_Length'] || 15,
                    initialOfferRegex: ruleset['InitialOffer_Regex'] || '^(\\d+)([MUQY])(\\d+)([KP])$',
                    renewalPlanRegex: ruleset['RenewalPlan_Regex'] || '^([MQYU])(\\d+)$'
                };
            }
        } catch (error) {
            console.log('📋 No Rulesets table or error fetching, using defaults');
        }
        
        // Return default ruleset
        return {
            separator: '-',
            casing: 'UPPER',
            periodMap: Config.PROMOCODE.PERIODS,
            termMap: Config.PROMOCODE.TERMS,
            priceTypeMap: Config.PROMOCODE.DISCOUNT_TYPES,
            freetextMaxLength: 15,
            initialOfferRegex: '^(\\d+)([MUQY])(\\d+)([KP])$',
            renewalPlanRegex: '^([MQYU])(\\d+)$'
        };
    }
}

// Create singleton instance
const airtableService = new AirtableService();

// Export for use in other modules
window.airtableService = airtableService;

if (Config.FEATURES.DEBUG_MODE) {
    console.log('📡 Airtable Service initialized', airtableService);
}