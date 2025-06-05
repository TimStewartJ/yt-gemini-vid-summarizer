/**
 * Smart Element Waiter - Combines MutationObserver and intelligent polling
 * Provides advanced element waiting capabilities with multiple fallback strategies
 */

/**
 * Smart Element Waiter - Combines MutationObserver and intelligent polling
 */
class SmartElementWaiter {
    /**
     * Waits for an element to appear in the DOM with multiple strategies
     * @param {string|Array} selectors - CSS selector(s) to wait for
     * @param {Object} options - Configuration options
     * @returns {Promise<Element>} - The found element
     */
    static async waitForElement(selectors, options = {}) {
        const config = {
            timeout: options.timeout || window.AutomationConfig?.AUTOMATION_CONFIG?.timeouts?.elementWait || 5000,
            validateVisibility: options.validateVisibility !== false,
            validateInteractable: options.validateInteractable || false,
            retryCount: options.retryCount || 0,
            maxRetries: options.maxRetries || window.AutomationConfig?.AUTOMATION_CONFIG?.timeouts?.maxRetries || 3,
            textPattern: options.textPattern || null
        };
        
        const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
        
        return new Promise((resolve, reject) => {
            let resolved = false;
            
            // First, try to find the element immediately
            const immediateElement = this.findBestElement(selectorArray, config);
            if (immediateElement) {
                resolved = true;
                return resolve(immediateElement);
            }
            
            // Set up timeout
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer?.disconnect();
                    
                    if (config.retryCount < config.maxRetries) {
                        // Retry with increased timeout and different strategy
                        const retryOptions = {
                            ...options,
                            retryCount: config.retryCount + 1,
                            timeout: Math.min(config.timeout * 1.5, 10000)
                        };
                        
                        console.log(`Retrying element search (attempt ${config.retryCount + 1}/${config.maxRetries})`);
                        this.waitForElement(selectors, retryOptions)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        reject(new Error(`Element not found after ${config.maxRetries} attempts: ${selectorArray.join(', ')}`));
                    }
                }
            }, config.timeout);
            
            // Set up MutationObserver for dynamic content
            let observer = null;
            const useObserver = window.AutomationConfig?.AUTOMATION_CONFIG?.strategies?.useMutationObserver !== false;
            if (useObserver) {
                observer = new MutationObserver(() => {
                    if (resolved) return;
                    
                    const element = this.findBestElement(selectorArray, config);
                    if (element) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        observer.disconnect();
                        resolve(element);
                    }
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['style', 'class', 'hidden']
                });
            }
            
            // Set up polling as backup
            const usePolling = window.AutomationConfig?.AUTOMATION_CONFIG?.strategies?.usePolling !== false;
            if (usePolling) {
                const poll = () => {
                    if (resolved) return;
                    
                    const element = this.findBestElement(selectorArray, config);
                    if (element) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        observer?.disconnect();
                        resolve(element);
                    } else {
                        setTimeout(poll, 250);
                    }
                };
                
                setTimeout(poll, 100);
            }
        });
    }
    
    /**
     * Finds the best matching element from a list of selectors
     * @param {Array} selectors - Array of CSS selectors
     * @param {Object} config - Validation configuration
     * @returns {Element|null} - The best matching element or null
     */
    static findBestElement(selectors, config) {
        for (const selector of selectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (this.validateElement(element, config)) {
                        return element;
                    }
                }
            } catch (error) {
                console.warn(`Invalid selector: ${selector}`, error);
            }
        }
        return null;
    }
    
    /**
     * Validates if an element meets the required criteria
     * @param {Element} element - The element to validate
     * @param {Object} config - Validation configuration
     * @returns {boolean} - True if element is valid
     */
    static validateElement(element, config) {
        if (!element) return false;
        
        // Check if element is visible
        if (config.validateVisibility) {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            
            if (rect.width === 0 || rect.height === 0 ||
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                style.opacity === '0') {
                return false;
            }
        }
        
        // Check if element is interactable
        if (config.validateInteractable) {
            if (element.disabled || element.getAttribute('aria-disabled') === 'true') {
                return false;
            }
        }
        
        // Check text content if pattern provided
        if (config.textPattern) {
            const elementText = element.textContent || element.innerText || '';
            const hasMatchingText = config.textPattern.some(pattern => 
                elementText.toLowerCase().includes(pattern.toLowerCase())
            );
            if (!hasMatchingText) {
                return false;
            }
        }
        
        return true;
    }
}

// Make SmartElementWaiter available globally
if (typeof window !== 'undefined') {
    window.SmartElementWaiter = SmartElementWaiter;
}
