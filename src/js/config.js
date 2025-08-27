/* ============================================================================
   CODEX NOVA NEBULA - Configuration
   Central configuration for API endpoints, table names, and constants
   ============================================================================ */

const Config = {
    // Airtable Configuration
    AIRTABLE: {
        // Base URL for Airtable API
        BASE_URL: 'https://api.airtable.com/v0',
        
        // Base ID - Replace with your actual Airtable Base ID
        BASE_ID: 'appr4aDlV77V3BT74', // e.g., 'appXXXXXXXXXXXXXX'
        
        // API Key - This should be handled securely (see proxy notes below)
        // For production, use a proxy server to hide this key
        API_KEY: 'patWVD735YtGc1idE.e3c011153b30619b2104b848bb11b4487342f4205666308ed37ff318300b942f', // e.g., 'keyXXXXXXXXXXXXXX'
        
        // Table Names
        TABLES: {
            BRANDS: 'Brands',
            PRODUCTS: 'Products',
            RATE_PLANS: 'Rate Plans',
            RULESETS: 'Rulesets',
            RULE_COMPONENTS: 'Rule Components',
            VOCAB_CODE_TYPES: 'Vocab - Promocode Code Types',
            VOCAB_BRAZE_OBJECT_TYPES: 'Vocab - Braze Object Types',
            VOCAB_BRAZE_CODE_CLASSES: 'Vocab - Braze Code Classes',
            VOCAB_BRAZE_COMM_TYPES: 'Vocab - Braze Communication Types',
            BRAND_OVERRIDES: 'Brand Overrides',
            TESTS_FIXTURES: 'Tests / Fixtures',
            CHANGELOG: 'Changelog'
        },
        
        // Field Mappings for each table
        FIELDS: {
            BRANDS: {
                BRAND_CODE: 'Brand Code',
                BRAND_NAME: 'Brand Name',
                COUNTRY: 'Country',
                BRAZE_CODE: 'Braze Code'
            },
            PRODUCTS: {
                PRODUCT_NAME: 'Product Name',
                PRODUCT_TYPE: 'Product Type',
                PRODUCT_CODE: 'Product Code',
                BRAND: 'Brand',
                PROMOCODE_ID: 'Promocode ID'
            },
            RATE_PLANS: {
                PLAN_CODE: 'Plan Code',
                PLAN_NAME: 'Plan Name',
                PRICE: 'Price',
                CATEGORY: 'Category',
                PRODUCT: 'Product',
                PLAN_ID: 'Plan ID'
            },
            RULESETS: {
                TYPE: 'Type',
                NAME: 'Name',
                VERSION: 'Version',
                STATUS: 'Status',
                EFFECTIVE_FROM: 'Effective From',
                EFFECTIVE_TO: 'Effective To',
                DEFAULT_FOR_BRANDS: 'Default For Brands',
                SEGMENTS_ORDER: 'Segments Order',
                SEPARATOR: 'Separator',
                CASING: 'Casing',
                INITIAL_OFFER_REGEX: 'InitialOffer Regex',
                RENEWAL_PLAN_REGEX: 'RenewalPlan Regex',
                PERIOD_MAP: 'Period Map (JSON)',
                TERM_MAP: 'Term Map (JSON)',
                PRICE_TYPE_MAP: 'Price Type Map (JSON)',
                FREETEXT_MAX_LENGTH: 'Freetext Max Length',
                FREETEXT_SANITIZATION: 'Freetext Sanitization'
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
        
        // Code types
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
    
    // Braze Configuration
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
    
    // UTM Configuration
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
        LAST_PRODUCT: 'codex_last_product'
    },
    
    // Feature Flags
    FEATURES: {
        USE_CACHE: true,
        USE_PROXY: false, // Set to true in production
        ENABLE_HISTORY: true,
        ENABLE_VALIDATION: true,
        ENABLE_MOCK_DATA: false, // Set to true for development without API
        DEBUG_MODE: false // Set to true for console logging
    },
    
    // Proxy Configuration (for secure API key handling)
    PROXY: {
        // If using a proxy server to hide API keys
        BASE_URL: '/api/airtable', // Your proxy endpoint
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

// Export for use in other modules
window.Config = Config;

// Debug logging if enabled
if (Config.FEATURES.DEBUG_MODE) {
    console.log('🚀 Codex Nova Nebula Configuration Loaded', Config);
}