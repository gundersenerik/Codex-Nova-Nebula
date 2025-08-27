/* ============================================================================
   CODEX NOVA NEBULA - Configuration
   Central configuration for API endpoints, table names, and constants
   ============================================================================ */

const Config = {
    // Airtable Configuration
    AIRTABLE: {
        // Base URL for Airtable API
        BASE_URL: 'https://api.airtable.com/v0',
        
        // Base ID - Your actual Airtable Base ID
        BASE_ID: 'appr4aDlV77V3BT74',
        
        // API Key - For production, use a proxy server to hide this key
        API_KEY: 'patWVD735YtGc1idE.e3c011153b30619b2104b848bb11b4487342f4205666308ed37ff318300b942f',
        
        // Table Names - UPDATED TO MATCH YOUR ACTUAL AIRTABLE
        TABLES: {
            BRANDS: 'Brands',
            PRODUCTS: 'Products',
            RATE_PLANS: 'Rate_Plans',  // Changed from 'Rate Plans' (underscore)
            RATE_PLAN_TYPES: 'Rate_Plan_Types',  // New table you have
            PROMOCODE_CODE_TYPES: 'Promocode_Code_Types',  // Your actual table name
            PROMOCODE_HISTORY: 'Promocode_History',  // New table you have
            
            // These tables might not exist yet - keeping for future use
            RULESETS: 'Rulesets',  // May need to create this
            RULE_COMPONENTS: 'Rule_Components',  // May need to create this
            VOCAB_CODE_TYPES: 'Promocode_Code_Types',  // Using your existing table
            BRAND_OVERRIDES: 'Brand_Overrides',  // May need to create this
            TESTS_FIXTURES: 'Tests_Fixtures',  // May need to create this
            CHANGELOG: 'Changelog'  // May need to create this
        },
        
        // Field Mappings for each table
        // NOTE: These are GUESSES - you need to update them with your actual field names
        FIELDS: {
            BRANDS: {
                // Common patterns - update these with your actual column names
                BRAND_CODE: 'Code',  // Could be: 'Brand_Code', 'Brand Code', 'code'
                BRAND_NAME: 'Name',  // Could be: 'Brand_Name', 'Brand Name', 'name'
                COUNTRY: 'Country',  // Could be: 'country', 'Country_Code'
                BRAZE_CODE: 'Braze_Code'  // Might not exist yet
            },
            PRODUCTS: {
                // Update these with your actual column names
                PRODUCT_NAME: 'Name',  // Could be: 'Product_Name', 'Product Name'
                PRODUCT_TYPE: 'Type',  // Could be: 'Product_Type', 'Category'
                PRODUCT_CODE: 'Code',  // Could be: 'Product_Code', 'SKU'
                BRAND: 'Brand',  // Link to Brands table - could be 'Brand_ID'
                PROMOCODE_ID: 'Promocode_ID'  // Could be: 'Promo_ID'
            },
            RATE_PLANS: {
                // Update these with your actual column names
                PLAN_CODE: 'Code',  // Could be: 'Plan_Code', 'Rate_Code'
                PLAN_NAME: 'Name',  // Could be: 'Plan_Name', 'Rate_Plan_Name'
                PRICE: 'Price',  // Could be: 'price', 'Amount'
                CATEGORY: 'Category',  // Could be: 'Type', 'Plan_Type'
                PRODUCT: 'Product',  // Link to Products - could be 'Product_ID'
                PLAN_ID: 'Plan_ID'  // Could be: 'ID', 'Rate_Plan_ID'
            },
            RATE_PLAN_TYPES: {
                // Add fields for Rate_Plan_Types table
                TYPE_CODE: 'Code',
                TYPE_NAME: 'Name',
                DESCRIPTION: 'Description'
            },
            PROMOCODE_CODE_TYPES: {
                // Fields for your Promocode_Code_Types table
                CODE: 'Code',  // WB, HB, CMP, etc.
                LABEL: 'Label',  // Human-readable name
                ACTIVE: 'Active',  // Checkbox field
                DESCRIPTION: 'Description'
            },
            PROMOCODE_HISTORY: {
                // Fields for tracking generated codes
                CODE: 'Code',
                GENERATED_DATE: 'Generated_Date',
                GENERATED_BY: 'Generated_By',
                BRAND: 'Brand',
                PRODUCT: 'Product'
            },
            RULESETS: {
                TYPE: 'Type',
                NAME: 'Name',
                VERSION: 'Version',
                STATUS: 'Status',
                EFFECTIVE_FROM: 'Effective_From',
                EFFECTIVE_TO: 'Effective_To',
                DEFAULT_FOR_BRANDS: 'Default_For_Brands',
                SEGMENTS_ORDER: 'Segments_Order',
                SEPARATOR: 'Separator',
                CASING: 'Casing',
                INITIAL_OFFER_REGEX: 'InitialOffer_Regex',
                RENEWAL_PLAN_REGEX: 'RenewalPlan_Regex',
                PERIOD_MAP: 'Period_Map_JSON',
                TERM_MAP: 'Term_Map_JSON',
                PRICE_TYPE_MAP: 'Price_Type_Map_JSON',
                FREETEXT_MAX_LENGTH: 'Freetext_Max_Length',
                FREETEXT_SANITIZATION: 'Freetext_Sanitization'
            }
        },
        
        // View Names (if using specific Airtable views)
        VIEWS: {
            ACTIVE_BRANDS: 'Active Brands',
            ACTIVE_PRODUCTS: 'Active Products',
            ACTIVE_RATE_PLANS: 'Active Rate Plans',
            ACTIVE_RULESETS: 'Active Rulesets'
        }
    },
    
    // API Configuration
    API: {
        // Cache duration in milliseconds (5 minutes)
        CACHE_DURATION: 5 * 60 * 1000,
        
        // Request timeout in milliseconds
        TIMEOUT: 10000,
        
        // Max records to fetch per request
        MAX_RECORDS: 100,
        
        // Retry configuration
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },
    
    // Promocode Configuration
    PROMOCODE: {
        // Period mappings
        PERIODS: {
            M: 'Months',
            U: 'Weeks',
            Q: 'Quarters',
            Y: 'Years'
        },
        
        // Term mappings
        TERMS: {
            M: 'Monthly',
            Q: 'Quarterly',
            Y: 'Yearly',
            U: 'Weekly'
        },
        
        // Discount type mappings
        DISCOUNT_TYPES: {
            K: 'Kroner',
            P: 'Percent'
        },
        
        // Renewal types
        RENEWAL_TYPES: {
            T: 'Termed',
            E: 'Evergreen'
        },
        
        // Code types - these should match your Promocode_Code_Types table
        CODE_TYPES: ['WB', 'HB', 'CMP', 'FREE', 'EMP', 'KS'],
        
        // Validation patterns
        PATTERNS: {
            INITIAL_OFFER: /^(\d+)([MUQY])(\d+)([KP])$/,
            RENEWAL_PLAN: /^([MQYU])(\d+)$/,
            FREETEXT: /^[A-Z0-9]*$/,
            CODE_TYPE: /^(WB|HB|CMP|FREE|EMP|KS)$/
        },
        
        // Max lengths
        MAX_LENGTHS: {
            FREETEXT: 15,
            CAMPAIGN_TEXT: 15
        },
        
        // Default separator for segments
        SEPARATOR: '-',
        
        // Default casing
        CASING: 'UPPER'
    },
    
    // Braze Configuration (for future use)
    BRAZE: {
        // Object types
        OBJECT_TYPES: {
            CMP: 'Campaign',
            CAN: 'Canvas',
            SEG: 'Segment',
            TPL: 'Template'
        },
        
        // Code classes
        CODE_CLASSES: {
            1000: 'Transactional',
            2000: 'Marketing/Journey',
            3000: 'Operational',
            4000: 'Compliance/Legal',
            'YYYY': 'One-off/Ad-hoc',
            9000: 'Test/Sandbox'
        },
        
        // Default separator
        SEPARATOR: '_',
        
        // Max lengths
        MAX_LENGTHS: {
            DESCRIPTION: 50,
            FLAGS: 30
        }
    },
    
    // UTM Configuration (for future use)
    UTM: {
        // UTM parameter names
        PARAMS: {
            SOURCE: 'utm_source',
            MEDIUM: 'utm_medium',
            CAMPAIGN: 'utm_campaign',
            TERM: 'utm_term',
            CONTENT: 'utm_content'
        },
        
        // Default values
        DEFAULTS: {
            MEDIUM: 'email'
        }
    },
    
    // UI Configuration
    UI: {
        // Animation durations
        ANIMATION_DURATION: 300,
        
        // Debounce delay for input events
        DEBOUNCE_DELAY: 300,
        
        // Toast/notification duration
        NOTIFICATION_DURATION: 3000,
        
        // Loading states
        LOADING_MESSAGES: {
            BRANDS: 'Loading brands...',
            PRODUCTS: 'Loading products...',
            RATE_PLANS: 'Loading rate plans...',
            GENERATING: 'Generating code...',
            VALIDATING: 'Validating code...'
        },
        
        // Error messages
        ERROR_MESSAGES: {
            NETWORK: 'Network error. Please check your connection.',
            API: 'Failed to fetch data from Airtable.',
            VALIDATION: 'Please fill all required fields.',
            INVALID_CODE: 'Invalid promocode format.',
            GENERATION_FAILED: 'Failed to generate promocode.'
        },
        
        // Success messages
        SUCCESS_MESSAGES: {
            COPIED: 'Copied to clipboard!',
            GENERATED: 'Promocode generated successfully!',
            VALIDATED: 'Promocode validated successfully!'
        }
    },
    
    // Storage Keys (for localStorage)
    STORAGE: {
        HISTORY: 'codex_promocode_history',
        USER_PREFS: 'codex_user_preferences',
        CACHE_PREFIX: 'codex_cache_',
        LAST_BRAND: 'codex_last_brand',
        LAST_PRODUCT: 'codex_last_product',
        FORM_STATE: 'promocode_form_state'
    },
    
    // Feature Flags
    FEATURES: {
        USE_CACHE: true,
        USE_PROXY: false,  // Set to true in production
        ENABLE_HISTORY: true,
        ENABLE_VALIDATION: true,
        ENABLE_MOCK_DATA: false,  // Set to true to use mock data
        DEBUG_MODE: true  // ENABLED for debugging - set to false in production
    },
    
    // Proxy Configuration (for secure API key handling in production)
    PROXY: {
        // If using a proxy server to hide API keys
        BASE_URL: '/api/airtable',  // Your proxy endpoint
        ENDPOINTS: {
            BRANDS: '/brands',
            PRODUCTS: '/products',
            RATE_PLANS: '/rate-plans'
        }
    },
    
    // Environment Detection
    ENV: {
        isDevelopment: window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1',
        isProduction: window.location.hostname !== 'localhost' && 
                      window.location.hostname !== '127.0.0.1'
    }
};

// Freeze the configuration to prevent accidental modifications
Object.freeze(Config);
Object.freeze(Config.AIRTABLE);
Object.freeze(Config.AIRTABLE.TABLES);
Object.freeze(Config.AIRTABLE.FIELDS);
Object.freeze(Config.PROMOCODE);
Object.freeze(Config.BRAZE);
Object.freeze(Config.UI);
Object.freeze(Config.STORAGE);
Object.freeze(Config.FEATURES);

// Export for use in other modules
window.Config = Config;

// Debug logging if enabled
if (Config.FEATURES.DEBUG_MODE) {
    console.log('🚀 Codex Nova Nebula Configuration Loaded');
    console.log('📊 Tables configured:', Object.keys(Config.AIRTABLE.TABLES));
    console.log('🔧 Debug Mode: ENABLED');
    console.log('⚠️ Important: Update FIELDS section with your actual Airtable column names!');
}