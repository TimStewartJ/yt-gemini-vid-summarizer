/**
 * Action Sequencer - Manages sequential automation steps
 * Handles the execution of automation sequences with proper timing and error handling
 */

/**
 * Action Sequencer - Manages sequential automation steps
 */
class ActionSequencer {
    /**
     * Executes a sequence of actions with proper waiting
     * @param {Array} steps - Array of step objects
     * @param {string} videoId - Video ID for logging
     * @returns {Promise<boolean>} - Success status
     */
    static async executeSequence(steps, videoId) {
        console.log(`Starting smart automation sequence for video: ${videoId}`);
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            try {
                console.log(`Step ${i + 1}/${steps.length}: ${step.name}`);
                
                // Wait for element
                const element = step.element || await window.SmartElementWaiter.waitForElement(
                    step.selectors,
                    step.options || {}
                );
                
                // Add small delay for UI stability
                const actionDelay = window.AutomationConfig?.AUTOMATION_CONFIG?.timeouts?.actionDelay || 100;
                await this.delay(actionDelay);
                
                // Execute action
                if (step.action) {
                    await step.action(element, videoId);
                } else {
                    element.click();
                }
                
                console.log(`✓ Step ${i + 1} completed: ${step.name}`);
                
                // Wait a bit before next step
                if (i < steps.length - 1) {
                    await this.delay(step.delayAfter || 200);
                }
                
            } catch (error) {
                console.error(`✗ Step ${i + 1} failed: ${step.name}`, error);
                
                if (step.required !== false) {
                    throw new Error(`Required step failed: ${step.name} - ${error.message}`);
                } else {
                    console.log(`Skipping optional step: ${step.name}`);
                }
            }
        }
        
        console.log(`✓ Successfully completed automation sequence for video: ${videoId}`);
        return true;
    }
    
    /**
     * Creates a promise that resolves after a delay
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Promise that resolves after delay
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Make ActionSequencer available globally
if (typeof window !== 'undefined') {
    window.ActionSequencer = ActionSequencer;
}
