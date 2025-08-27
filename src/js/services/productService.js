/* ============================================================================
   CODEX NOVA NEBULA - Product Service
   Manages product data fetching and filtering by brand
   ============================================================================ */

class ProductService {
    constructor() {
        this.allProducts = [];
        this.filteredProducts = [];
        this.currentProduct = null;
        this.currentBrandId = null;
        this.isLoading = false;
        this.error = null;
    }

    /**
     * Initialize and fetch all products
     */
    async initialize() {
        if (this.allProducts.length > 0 && !this.error) {
            return this.allProducts;
        }

        return this.fetchAllProducts();
    }

    /**
     * Fetch all products from Airtable
     */
    async fetchAllProducts() {
        this.isLoading = true;
        this.error = null;

        try {
            if (Config.FEATURES.DEBUG_MODE) {
                console.log('📦 Fetching all products...');
            }

            this.allProducts = await airtableService.fetchAllProducts();
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log(`✅ Fetched ${this.allProducts.length} products`, this.allProducts);
            }

            return this.allProducts;

        } catch (error) {
            this.error = error.message || 'Failed to fetch products';
            console.error('Product fetch error:', error);
            throw new Error(this.error);
            
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Fetch products filtered by brand
     */
    async fetchProductsByBrand(brandId) {
        if (!brandId) {
            this.filteredProducts = [];
            this.currentBrandId = null;
            return [];
        }

        this.isLoading = true;
        this.error = null;
        this.currentBrandId = brandId;

        try {
            if (Config.FEATURES.DEBUG_MODE) {
                console.log(`📦 Fetching products for brand: ${brandId}`);
            }

            this.filteredProducts = await airtableService.fetchProductsByBrand(brandId);
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log(`✅ Fetched ${this.filteredProducts.length} products for brand`, this.filteredProducts);
            }

            // Check for last selected product
            const lastProductId = localStorage.getItem(Config.STORAGE.LAST_PRODUCT);
            if (lastProductId) {
                const lastProduct = this.filteredProducts.find(p => p.id === lastProductId);
                if (lastProduct) {
                    this.currentProduct = lastProduct;
                }
            }

            return this.filteredProducts;

        } catch (error) {
            this.error = error.message || 'Failed to fetch products for brand';
            console.error('Product fetch error:', error);
            
            // Try to filter from cached all products as fallback
            if (this.allProducts.length > 0) {
                this.filteredProducts = this.allProducts.filter(product => 
                    product.brandIds && product.brandIds.includes(brandId)
                );
                return this.filteredProducts;
            }
            
            throw new Error(this.error);
            
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get product by ID
     */
    getProductById(productId) {
        // Check filtered products first
        let product = this.filteredProducts.find(p => p.id === productId);
        
        // Fallback to all products
        if (!product) {
            product = this.allProducts.find(p => p.id === productId);
        }
        
        return product;
    }

    /**
     * Get product by code
     */
    getProductByCode(productCode) {
        // Check filtered products first
        let product = this.filteredProducts.find(p => p.code === productCode);
        
        // Fallback to all products
        if (!product) {
            product = this.allProducts.find(p => p.code === productCode);
        }
        
        return product;
    }

    /**
     * Set current product
     */
    setCurrentProduct(productId) {
        const product = this.getProductById(productId);
        if (product) {
            this.currentProduct = product;
            
            // Save to localStorage
            localStorage.setItem(Config.STORAGE.LAST_PRODUCT, productId);
            
            if (Config.FEATURES.DEBUG_MODE) {
                console.log('📦 Current product set:', product);
            }
            
            return product;
        }
        return null;
    }

    /**
     * Clear current product
     */
    clearCurrentProduct() {
        this.currentProduct = null;
        localStorage.removeItem(Config.STORAGE.LAST_PRODUCT);
    }

    /**
     * Generate product shortcode if not exists
     */
    generateProductShortcode(productName) {
        if (!productName) return '';
        
        // Take first 4 letters, uppercase, alphanumeric only
        return productName
            .replace(/[^A-Z0-9]/gi, '')
            .substring(0, 4)
            .toUpperCase();
    }

    /**
     * Get product code (use existing or generate)
     */
    getProductCode(product) {
        if (!product) return '';
        
        // Use existing code if available
        if (product.code) {
            return product.code;
        }
        
        // Use promocode ID if available
        if (product.promocodeId) {
            return product.promocodeId;
        }
        
        // Generate from name
        return this.generateProductShortcode(product.name);
    }

    /**
     * Populate product dropdown
     */
    populateProductDropdown(selectElement, selectedProductId = null) {
        if (!selectElement) return;

        // Clear existing options
        selectElement.innerHTML = '<option value="">Select Product...</option>';

        // Add loading state
        if (this.isLoading) {
            selectElement.innerHTML = '<option value="">Loading products...</option>';
            selectElement.disabled = true;
            return;
        }

        // Add error state
        if (this.error) {
            selectElement.innerHTML = '<option value="">Error loading products</option>';
            selectElement.disabled = true;
            return;
        }

        // Check if we have products
        if (this.filteredProducts.length === 0) {
            selectElement.innerHTML = '<option value="">No products available</option>';
            selectElement.disabled = true;
            return;
        }

        // Enable select
        selectElement.disabled = false;

        // Group products by type if available
        const productsByType = {};
        this.filteredProducts.forEach(product => {
            const type = product.type || 'Other';
            if (!productsByType[type]) {
                productsByType[type] = [];
            }
            productsByType[type].push(product);
        });

        // Add products (grouped or ungrouped)
        if (Object.keys(productsByType).length > 1) {
            // Add grouped products
            Object.keys(productsByType).sort().forEach(type => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = type;
                
                productsByType[type].forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    const code = this.getProductCode(product);
                    option.textContent = code ? `${product.name} (${code})` : product.name;
                    
                    if (selectedProductId && product.id === selectedProductId) {
                        option.selected = true;
                    }
                    
                    optgroup.appendChild(option);
                });
                
                selectElement.appendChild(optgroup);
            });
        } else {
            // Add ungrouped products
            this.filteredProducts.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                const code = this.getProductCode(product);
                option.textContent = code ? `${product.name} (${code})` : product.name;
                
                if (selectedProductId && product.id === selectedProductId) {
                    option.selected = true;
                }
                
                selectElement.appendChild(option);
            });
        }

        // Set current product if exists
        if (this.currentProduct && !selectedProductId) {
            selectElement.value = this.currentProduct.id;
        }
    }

    /**
     * Clear filtered products
     */
    clearFilteredProducts() {
        this.filteredProducts = [];
        this.currentBrandId = null;
        this.clearCurrentProduct();
    }

    /**
     * Refresh products (force fetch)
     */
    async refresh() {
        // Clear cache
        airtableService.clearCache(Config.AIRTABLE.TABLES.PRODUCTS);
        
        // Clear current state
        this.allProducts = [];
        this.filteredProducts = [];
        
        // Fetch fresh data
        return this.fetchAllProducts();
    }
}

// Create singleton instance
const productService = new ProductService();

// Export for use in other modules
window.productService = productService;

if (Config.FEATURES.DEBUG_MODE) {
    console.log('📦 Product Service initialized', productService);
}