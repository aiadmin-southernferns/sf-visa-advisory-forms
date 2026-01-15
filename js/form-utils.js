/* ============================================
   VISA ADVISORY FORMS - SHARED UTILITIES
   ============================================ */

// Configuration - UPDATE THIS after creating Power Automate flow
const FormConfig = {
    // Replace with your actual Power Automate HTTP trigger URL
    submitEndpoint: 'YOUR_POWER_AUTOMATE_HTTP_TRIGGER_URL',
    
    // Auto-save interval in milliseconds (30 seconds)
    autoSaveInterval: 30000,
    
    // Token parameter name in URL
    tokenParam: 'token'
};

/* ============================================
   TOKEN HANDLING
   ============================================ */

function getTokenFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(FormConfig.tokenParam);
}

function validateToken(token) {
    if (!token || token.length < 20) {
        return false;
    }
    // Basic validation - actual validation happens server-side
    return true;
}

function showTokenError() {
    document.body.innerHTML = `
        <div class="container">
            <div class="form-content" style="border-radius: 10px; margin-top: 50px;">
                <div class="error-container">
                    <div class="error-icon">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </div>
                    <h2 style="color: #dc3545; margin-bottom: 15px;">Invalid or Expired Link</h2>
                    <p style="color: #666; margin-bottom: 20px;">This form link is invalid or has expired. Please contact your immigration advisor for a new link.</p>
                    <p style="color: #999; font-size: 0.9rem;">If you believe this is an error, please check that you copied the complete link from your email.</p>
                </div>
            </div>
        </div>
    `;
}

/* ============================================
   AUTO-SAVE FUNCTIONALITY
   ============================================ */

function getStorageKey(formCode) {
    const token = getTokenFromUrl();
    // Use token hash to create unique storage key per form instance
    const tokenHash = token ? token.substring(0, 20) : 'default';
    return `visa_form_${formCode}_${tokenHash}`;
}

function saveDraft(formCode, formElement) {
    const formData = new FormData(formElement);
    const draft = {};
    
    formData.forEach((value, key) => {
        draft[key] = value;
    });

    // Save checkbox states (FormData doesn't include unchecked boxes)
    formElement.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        draft[cb.name] = cb.checked;
    });

    const storageKey = getStorageKey(formCode);
    localStorage.setItem(storageKey, JSON.stringify(draft));
    
    // Show autosave indicator
    showAutosaveIndicator();
}

function loadDraft(formCode, formElement) {
    const storageKey = getStorageKey(formCode);
    const draft = localStorage.getItem(storageKey);
    
    if (!draft) return false;

    try {
        const data = JSON.parse(draft);

        Object.keys(data).forEach(key => {
            const field = formElement.elements[key];
            if (!field) return;

            if (field.type === 'checkbox') {
                field.checked = data[key] === true || data[key] === 'on';
            } else if (field.type === 'radio') {
                const radio = formElement.querySelector(`input[name="${key}"][value="${data[key]}"]`);
                if (radio) radio.checked = true;
            } else if (field.tagName === 'SELECT' || field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'date' || field.type === 'number') {
                field.value = data[key];
            } else if (field.tagName === 'TEXTAREA') {
                field.value = data[key];
            }
        });

        return true;
    } catch (e) {
        console.error('Error loading draft:', e);
        return false;
    }
}

function clearDraft(formCode) {
    const storageKey = getStorageKey(formCode);
    localStorage.removeItem(storageKey);
}

function showAutosaveIndicator() {
    const indicator = document.getElementById('autosaveIndicator');
    if (indicator) {
        indicator.style.display = 'block';
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 2000);
    }
}

/* ============================================
   FORM NAVIGATION
   ============================================ */

let currentSection = 1;

function updateSectionDisplay(totalSections) {
    // Update sections
    document.querySelectorAll('.form-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const activeSection = document.querySelector(`.form-section[data-section="${currentSection}"]`);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    // Update progress steps
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < currentSection) {
            step.classList.add('completed');
        } else if (index + 1 === currentSection) {
            step.classList.add('active');
        }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextSection(totalSections, validateFn) {
    if (validateFn && !validateFn()) {
        return false;
    }
    
    if (currentSection < totalSections) {
        currentSection++;
        updateSectionDisplay(totalSections);
        return true;
    }
    return false;
}

function prevSection(totalSections) {
    if (currentSection > 1) {
        currentSection--;
        updateSectionDisplay(totalSections);
        return true;
    }
    return false;
}

function goToSection(sectionNumber, totalSections) {
    if (sectionNumber >= 1 && sectionNumber <= totalSections) {
        currentSection = sectionNumber;
        updateSectionDisplay(totalSections);
        return true;
    }
    return false;
}

/* ============================================
   VALIDATION
   ============================================ */

function validateSection(sectionNumber) {
    const sectionEl = document.querySelector(`.form-section[data-section="${sectionNumber}"]`);
    if (!sectionEl) return true;

    const requiredFields = sectionEl.querySelectorAll('[required]');
    let isValid = true;
    let firstError = null;

    requiredFields.forEach(field => {
        const formGroup = field.closest('.form-group') || field.closest('.checkbox-item');
        
        // Clear previous error state
        field.classList.remove('error');
        if (formGroup) formGroup.classList.remove('has-error');
        
        let fieldValid = true;

        if (field.type === 'checkbox') {
            if (!field.checked) {
                fieldValid = false;
                field.style.outline = '2px solid var(--error-color)';
            } else {
                field.style.outline = '';
            }
        } else if (field.type === 'radio') {
            const radioGroup = sectionEl.querySelectorAll(`input[name="${field.name}"]`);
            const anyChecked = Array.from(radioGroup).some(r => r.checked);
            if (!anyChecked) {
                fieldValid = false;
            }
        } else {
            if (!field.value.trim()) {
                fieldValid = false;
                field.classList.add('error');
            }
        }

        if (!fieldValid) {
            isValid = false;
            if (formGroup) formGroup.classList.add('has-error');
            if (!firstError) firstError = field;
        }
    });

    // Scroll to first error
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return isValid;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\d\s\-\+\(\)]{8,20}$/;
    return re.test(phone);
}

/* ============================================
   FORM SUBMISSION
   ============================================ */

async function submitForm(formCode, formElement, additionalData = {}) {
    const token = getTokenFromUrl();
    
    if (!token) {
        alert('Invalid form link. Please use the link from your email.');
        return { success: false, error: 'No token' };
    }

    // Show loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.add('active');

    // Collect all form responses
    const responses = [];

    // Collect checkbox responses
    formElement.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        responses.push({
            questionCode: cb.name,
            value: cb.checked ? 'Yes' : 'No',
            type: 'checkbox'
        });
    });

    // Collect text, email, tel, number inputs
    formElement.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="date"]').forEach(input => {
        if (input.value) {
            responses.push({
                questionCode: input.name,
                value: input.value,
                type: input.type
            });
        }
    });

    // Collect select values
    formElement.querySelectorAll('select').forEach(select => {
        if (select.value) {
            responses.push({
                questionCode: select.name,
                value: select.value,
                type: 'select'
            });
        }
    });

    // Collect textarea values
    formElement.querySelectorAll('textarea').forEach(textarea => {
        if (textarea.value) {
            responses.push({
                questionCode: textarea.name,
                value: textarea.value,
                type: 'textarea'
            });
        }
    });

    // Collect radio button values
    const radioGroups = {};
    formElement.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
        if (!radioGroups[radio.name]) {
            radioGroups[radio.name] = true;
            responses.push({
                questionCode: radio.name,
                value: radio.value,
                type: 'radio'
            });
        }
    });

    const payload = {
        token: token,
        formCode: formCode,
        responses: responses,
        submittedAt: new Date().toISOString(),
        ...additionalData
    };

    try {
        const response = await fetch(FormConfig.submitEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            
            // Clear draft on successful submission
            clearDraft(formCode);
            
            return { 
                success: true, 
                referenceNumber: result.referenceNumber || `${formCode}-${Date.now()}`,
                data: result 
            };
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Submission failed');
        }
    } catch (error) {
        console.error('Submission error:', error);
        return { 
            success: false, 
            error: error.message || 'An error occurred while submitting the form' 
        };
    } finally {
        if (loadingOverlay) loadingOverlay.classList.remove('active');
    }
}

/* ============================================
   UI HELPERS
   ============================================ */

function showSuccessPage(referenceNumber) {
    document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
    
    const successSection = document.querySelector('.form-section[data-section="success"]');
    if (successSection) {
        successSection.classList.add('active');
        
        const refElement = document.getElementById('submissionRef');
        if (refElement) {
            refElement.textContent = referenceNumber;
        }
    }

    // Hide progress bar
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-NZ', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(el => {
        if (!el.value && el.dataset.defaultToday === 'true') {
            el.value = today;
        }
    });
}

/* ============================================
   CONDITIONAL LOGIC
   ============================================ */

function setupConditionalField(triggerSelector, targetSelector, showValue) {
    const triggers = document.querySelectorAll(triggerSelector);
    const target = document.querySelector(targetSelector);
    
    if (!triggers.length || !target) return;

    function updateVisibility() {
        const checkedTrigger = document.querySelector(`${triggerSelector}:checked`);
        if (checkedTrigger && checkedTrigger.value === showValue) {
            target.style.display = 'block';
        } else {
            target.style.display = 'none';
        }
    }

    triggers.forEach(trigger => {
        trigger.addEventListener('change', updateVisibility);
    });

    // Initial state
    updateVisibility();
}

/* ============================================
   INITIALIZATION
   ============================================ */

function initForm(formCode, totalSections) {
    // Check token
    const token = getTokenFromUrl();
    if (!validateToken(token)) {
        showTokenError();
        return false;
    }

    // Set token in hidden field
    const tokenField = document.getElementById('formToken');
    if (tokenField) {
        tokenField.value = token;
    }

    // Load draft
    const formElement = document.getElementById(`${formCode.toLowerCase().replace('_', '')}Form`) || 
                        document.querySelector('form');
    if (formElement) {
        loadDraft(formCode, formElement);

        // Set up auto-save
        setInterval(() => saveDraft(formCode, formElement), FormConfig.autoSaveInterval);

        // Save on any change
        formElement.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('change', () => saveDraft(formCode, formElement));
        });
    }

    // Set default dates
    setDefaultDates();

    return true;
}

// Export for use in form pages
window.FormUtils = {
    getTokenFromUrl,
    validateToken,
    showTokenError,
    saveDraft,
    loadDraft,
    clearDraft,
    nextSection,
    prevSection,
    goToSection,
    validateSection,
    validateEmail,
    validatePhone,
    submitForm,
    showSuccessPage,
    formatDate,
    setDefaultDates,
    setupConditionalField,
    initForm,
    FormConfig
};
