/* ============================================================================
   CODEX NOVA NEBULA - Brand Service
   Manages brand data fetching and state
   ============================================================================ */

class BrandService {
    constructor() {
        this.brands = [];
        this.currentBrand = null;
        this.isLoading = false;
        this.error = null;
    }

    /**
     * Initialize and fetch all brands
     */
    async initialize() {
        if (this.brands.length > 0 && !this.error) {
            // Already initialized
            return this.brands;
        }

        return this.fetchBrands();
    }

    /**
     * Fetch all brands from Airtable
     */
    async fetchBrands() {
        this.isLoading = true;
        this.error = null;

        try {
            if (Config.FEATURES.DEBUG_MODE) {
                console.log('🏢 Fetching brands...');
            }

            this.brands = await airtableService.fetchBrands();
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log(`✅ Fetched ${this.brands.length} brands`, this.brands);
            }

            // Check for last selected brand in localStorage
            const lastBrandId = localStorage.getItem(Config.STORAGE.LAST_BRAND);
            if (lastBrandId) {
                const lastBrand = this.brands.find(b => b.id === lastBrandId);
                if (lastBrand) {
                    this.currentBrand = lastBrand;
                }
            }

            return this.brands;

        } catch (error) {
            this.error = error.message || 'Failed to fetch brands';
            console.error('Brand fetch error:', error);
            
            // Throw error to be handled by UI
            throw new Error(this.error);
            
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get brand by ID
     */
    getBrandById(brandId) {
        return this.brands.find(brand => brand.id === brandId);
    }

    /**
     * Get brand by code
     */
    getBrandByCode(brandCode) {
        return this.brands.find(brand => brand.code === brandCode);
    }

    /**
     * Set current brand
     */
    setCurrentBrand(brandId) {
        const brand = this.getBrandById(brandId);
        if (brand) {
            this.currentBrand = brand;
            
            // Save to localStorage for persistence
            localStorage.setItem(Config.STORAGE.LAST_BRAND, brandId);
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log('🏢 Current brand set:', brand);
            }
            
            return brand;
        }
        return null;
    }

    /**
     * Clear current brand
     */
    clearCurrentBrand() {
        this.currentBrand = null;
        localStorage.removeItem(Config.STORAGE.LAST_BRAND);
    }

    /**
     * Get all brands sorted by name
     */
    getAllBrands() {
        return [...this.brands].sort((a, b) => 
            a.name.localeCompare(b.name)
        );
    }

    /**
     * Get brands by country
     */
    getBrandsByCountry(country) {
        return this.brands.filter(brand => 
            brand.country === country
        );
    }

    /**
     * Refresh brands (force fetch)
     */
    async refresh() {
        // Clear cache for brands
        airtableService.clearCache(Config.AIRTABLE.TABLES.BRANDS);
        
        // Fetch fresh data
        return this.fetchBrands();
    }

    /**
     * Populate brand dropdown
     */
    populateBrandDropdown(selectElement, selectedBrandId = null) {
        if (!selectElement) return;

        // Clear existing options
        selectElement.innerHTML = '<option value="">Select Brand...</option>';

        // Add loading state
        if (this.isLoading) {
            selectElement.innerHTML = '<option value="">Loading brands...</option>';
            selectElement.disabled = true;
            return;
        }

        // Add error state
        if (this.error) {
            selectElement.innerHTML = '<option value="">Error loading brands</option>';
            selectElement.disabled = true;
            return;
        }

        // Enable select
        selectElement.disabled = false;

        // Add brands
        this.brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand.id;
            option.textContent = `${brand.name} (${brand.code})`;
            
            if (brand.country) {
                option.setAttribute('data-country', brand.country);
            }
            
            if (selectedBrandId && brand.id === selectedBrandId) {
                option.selected = true;
            }
            
            selectElement.appendChild(option);
        });

        // Set current brand if exists
        if (this.currentBrand && !selectedBrandId) {
            selectElement.value = this.currentBrand.id;
        }
    }

    /**
     * Get brand display name
     */
    getBrandDisplayName(brand) {
        if (!brand) return '';
        return `${brand.name} (${brand.code})`;
    }
}

// Create singleton instance
const brandService = new BrandService();

// Export for use in other modules
window.brandService = brandService;

if (Config.FEATURES.DEBUG_MODE) {
    console.log('🏢 Brand Service initialized', brandService);
}