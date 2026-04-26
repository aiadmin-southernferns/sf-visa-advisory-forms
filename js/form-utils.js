/* ============================================
   VISA ADVISORY FORMS - SHARED UTILITIES
   ============================================ */

// Configuration
const FormConfig = {
    // INZ Forms API URL - UPDATE per environment
    apiUrl: 'http://localhost:7071/api',

    // Legacy submit endpoint (kept for backward compatibility)
    submitEndpoint: 'YOUR_POWER_AUTOMATE_HTTP_TRIGGER_URL',
    
    // Auto-save interval in milliseconds (30 seconds)
    autoSaveInterval: 30000,
    
    // Token parameter name in URL (changed from 'token' to 'key')
    tokenParam: 'key'
};

/* ============================================
   FORM CONTEXT
   Stores the validated session info returned
   by the API. Available globally after init.
   ============================================ */

const FormContext = {
    /** @type {boolean} Whether the key was validated successfully */
    isValid: false,

    /** @type {string} 'admin' or 'user' */
    role: '',

    /** @type {string} Form Instance ID (GUID) */
    formInstanceId: '',

    /** @type {string} Form Template ID (GUID) */
    formTemplateId: '',

    /** @type {string} Contact ID (GUID) */
    contactId: '',

    /** @type {string} Case ID (GUID) */
    caseId: '',

    /** @type {number} Current form status (1=KeyGenerated, 2=AdminCompleted, etc.) */
    currentStatus: 0,

    /** @type {number} Last page/stage the user was on */
    currentPage: 1,

    /** @type {string} Form template name */
    templateName: '',

    /** @type {number} Total pages in this form */
    totalPages: 0,

    /** @type {number} Number of admin pages (typically 1) */
    adminPages: 1,

    /** @type {number} Current data version for optimistic concurrency */
    version: 1,

    /** @type {string} The raw key from the URL (needed for API calls) */
    accessKey: '',

    /** @type {object|null} Admin response data loaded from server */
    adminResponse: null,

    /** @type {object|null} User response data loaded from server */
    userResponse: null,

    /** @type {string|null} Last saved timestamp */
    lastSavedAt: null
};

/* ============================================
   TOKEN / KEY HANDLING
   ============================================ */

function getTokenFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(FormConfig.tokenParam);
}

/**
 * Validates the key against the Azure Functions API.
 * On success, populates FormContext with role, IDs, and status.
 * @param {string} key - The HMAC-signed key from the URL
 * @returns {Promise<{valid: boolean, error?: string, errorType?: string}>}
 */
async function validateKeyWithApi(key) {
    if (!key || key.length < 20) {
        return { valid: false, error: 'Invalid form link.', errorType: 'INVALID' };
    }

    try {
        const response = await fetch(FormConfig.apiUrl + '/form-keys/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key })
        });

        if (response.ok) {
            const data = await response.json();

            // Populate FormContext
            FormContext.isValid = true;
            FormContext.role = data.role;
            FormContext.formInstanceId = data.formInstanceId;
            FormContext.formTemplateId = data.formTemplateId;
            FormContext.contactId = data.contactId;
            FormContext.caseId = data.caseId;
            FormContext.currentStatus = data.currentStatus;
            FormContext.currentPage = data.currentPage || 1;
            FormContext.templateName = data.templateName;
            FormContext.totalPages = data.totalPages;
            FormContext.adminPages = data.adminPages || 1;
            FormContext.accessKey = key;

            console.log('Key validated. Role:', data.role, 'Status:', data.currentStatus, 'FormInstance:', data.formInstanceId);

            return { valid: true };

        } else if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.message || 'This form link is invalid or has expired.';

            // Determine error type for appropriate UI
            let errorType = 'EXPIRED';
            if (message.includes('revoked')) errorType = 'REVOKED';
            if (message.includes('submitted')) errorType = 'SUBMITTED';
            if (message.includes('not yet ready')) errorType = 'NOT_READY';

            return { valid: false, error: message, errorType: errorType };

        } else {
            const errorData = await response.json().catch(() => ({}));
            return {
                valid: false,
                error: errorData.message || 'An error occurred while validating the form link.',
                errorType: 'ERROR'
            };
        }

    } catch (networkError) {
        console.error('Key validation network error:', networkError);
        return {
            valid: false,
            error: 'Unable to connect to the server. Please check your internet connection and try again.',
            errorType: 'NETWORK'
        };
    }
}

/**
 * Legacy synchronous validation - kept as a quick pre-check before API call.
 * @param {string} token
 * @returns {boolean}
 */
function validateToken(token) {
    if (!token || token.length < 20) {
        return false;
    }
    return true;
}

/* ============================================
   ERROR PAGES
   ============================================ */

function showTokenError() {
    showErrorPage(
        'Invalid or Expired Link',
        'This form link is invalid or has expired. Please contact your immigration advisor for a new link.',
        'If you believe this is an error, please check that you copied the complete link from your email.'
    );
}

function showErrorPage(title, message, hint) {
    // Determine icon and color based on title content
    let iconColor = '#dc3545';
    let iconSvg = '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>';

    if (title.includes('Submitted') || title.includes('Already')) {
        iconColor = '#28a745';
        iconSvg = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>';
    } else if (title.includes('Not Ready') || title.includes('not yet')) {
        iconColor = '#ffc107';
        iconSvg = '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>';
    }

    document.body.innerHTML = `
        <div class="container">
            <div class="form-content" style="border-radius: 10px; margin-top: 50px;">
                <div class="error-container" style="text-align: center; padding: 60px 30px;">
                    <div class="error-icon" style="margin-bottom: 20px;">
                        <svg viewBox="0 0 24 24" style="width:64px;height:64px;fill:${iconColor}">${iconSvg}</svg>
                    </div>
                    <h2 style="color: ${iconColor}; margin-bottom: 15px;">${title}</h2>
                    <p style="color: #666; margin-bottom: 20px;">${message}</p>
                    ${hint ? `<p style="color: #999; font-size: 0.9rem;">${hint}</p>` : ''}
                </div>
            </div>
        </div>
    `;
}

/* ============================================
   LOAD FORM DATA FROM API
   ============================================ */

/**
 * Loads saved form data from the API (admin answers + user answers).
 * Called during initialization to restore state.
 * @returns {Promise<boolean>} true if data was loaded successfully
 */
async function loadFormDataFromApi() {
    if (!FormContext.formInstanceId) return false;

    try {
        const response = await fetch(
            FormConfig.apiUrl + '/form-data/' + FormContext.formInstanceId,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (!response.ok) {
            console.warn('Failed to load form data:', response.status);
            return false;
        }

        const data = await response.json();

        FormContext.version = data.version || 1;
        FormContext.currentPage = data.currentPage || 1;
        FormContext.adminResponse = data.adminResponse || null;
        FormContext.userResponse = data.userResponse || null;
        FormContext.lastSavedAt = data.lastSavedAt || null;

        console.log('Form data loaded. Version:', FormContext.version, 'Page:', FormContext.currentPage);

        return true;

    } catch (error) {
        console.error('Error loading form data:', error);
        return false;
    }
}

/* ============================================
   AUTO-SAVE FUNCTIONALITY
   ============================================ */

function getStorageKey(formCode) {
    const token = getTokenFromUrl();
    const tokenHash = token ? token.substring(0, 20) : 'default';
    return `visa_form_${formCode}_${tokenHash}`;
}

/**
 * Saves draft to localStorage (local fallback).
 */
function saveDraft(formCode, formElement) {
    const formData = new FormData(formElement);
    const draft = {};
    
    formData.forEach((value, key) => {
        draft[key] = value;
    });

    formElement.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        draft[cb.name] = cb.checked;
    });

    const storageKey = getStorageKey(formCode);
    try {
        localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (e) {
        console.warn('localStorage save failed:', e);
    }
    
    showAutosaveIndicator();
}

function loadDraft(formCode, formElement) {
    const storageKey = getStorageKey(formCode);
    let draft;

    try {
        draft = localStorage.getItem(storageKey);
    } catch (e) {
        console.warn('localStorage read failed:', e);
        return false;
    }
    
    if (!draft) return false;

    try {
        const data = JSON.parse(draft);
        restoreFormData(data, formElement);
        return true;
    } catch (e) {
        console.error('Error loading draft:', e);
        return false;
    }
}

/**
 * Restores form field values from a flat key-value object.
 * Used by both localStorage drafts and API-loaded data.
 * @param {object} data - Key-value pairs of field names to values
 * @param {HTMLFormElement} formElement
 */
function restoreFormData(data, formElement) {
    Object.keys(data).forEach(key => {
        const field = formElement.elements[key];
        if (!field) return;

        if (field.type === 'checkbox') {
            field.checked = data[key] === true || data[key] === 'on' || data[key] === 'Yes';
        } else if (field.type === 'radio') {
            const radio = formElement.querySelector(`input[name="${key}"][value="${data[key]}"]`);
            if (radio) radio.checked = true;
        } else if (field.tagName === 'SELECT' || field.type === 'text' || field.type === 'email' ||
                   field.type === 'tel' || field.type === 'date' || field.type === 'number') {
            field.value = data[key];
        } else if (field.tagName === 'TEXTAREA') {
            field.value = data[key];
        }
    });
}

/**
 * Collects all form field values into a flat key-value object.
 * @param {HTMLFormElement} formElement
 * @returns {object}
 */
function collectFormData(formElement) {
    const data = {};

    // Text, email, tel, number, date inputs
    formElement.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="date"], input[type="hidden"]').forEach(input => {
        if (input.name) {
            data[input.name] = input.value;
        }
    });

    // Checkboxes
    formElement.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb.name) {
            data[cb.name] = cb.checked;
        }
    });

    // Radio buttons (only checked ones)
    formElement.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
        if (radio.name) {
            data[radio.name] = radio.value;
        }
    });

    // Selects
    formElement.querySelectorAll('select').forEach(select => {
        if (select.name) {
            data[select.name] = select.value;
        }
    });

    // Textareas
    formElement.querySelectorAll('textarea').forEach(textarea => {
        if (textarea.name) {
            data[textarea.name] = textarea.value;
        }
    });

    return data;
}

function clearDraft(formCode) {
    const storageKey = getStorageKey(formCode);
    try {
        localStorage.removeItem(storageKey);
    } catch (e) {
        // ignore
    }
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
    document.querySelectorAll('.form-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const activeSection = document.querySelector(`.form-section[data-section="${currentSection}"]`);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    document.querySelectorAll('.progress-step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < currentSection) {
            step.classList.add('completed');
        } else if (index + 1 === currentSection) {
            step.classList.add('active');
        }
    });

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

    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.add('active');

    // Collect all form responses
    const responses = [];

    formElement.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        responses.push({
            questionCode: cb.name,
            value: cb.checked ? 'Yes' : 'No',
            type: 'checkbox'
        });
    });

    formElement.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="date"]').forEach(input => {
        if (input.value) {
            responses.push({
                questionCode: input.name,
                value: input.value,
                type: input.type
            });
        }
    });

    formElement.querySelectorAll('select').forEach(select => {
        if (select.value) {
            responses.push({
                questionCode: select.name,
                value: select.value,
                type: 'select'
            });
        }
    });

    formElement.querySelectorAll('textarea').forEach(textarea => {
        if (textarea.value) {
            responses.push({
                questionCode: textarea.name,
                value: textarea.value,
                type: 'textarea'
            });
        }
    });

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

    updateVisibility();
}

/* ============================================
   INITIALIZATION (ASYNC - API VALIDATED)
   ============================================ */

/**
 * Initializes the form by validating the key against the API,
 * loading saved data, and setting up auto-save.
 *
 * IMPORTANT: This is now ASYNC. The caller must use:
 *   const ok = await FormUtils.initForm(FORM_CODE, TOTAL_STAGES);
 *
 * @param {string} formCode - Form identifier (e.g. 'INZ_1012')
 * @param {number} totalSections - Total number of stages/sections
 * @returns {Promise<boolean>} true if initialization succeeded
 */
async function initForm(formCode, totalSections) {
    // 1. Get the key from URL
    const key = getTokenFromUrl();

    // Quick local pre-check
    if (!key || key.length < 20) {
        showTokenError();
        return false;
    }

    // 2. Show a loading state while validating
    const formContent = document.querySelector('.form-content') || document.querySelector('.container');
    if (formContent) {
        const existingSections = formContent.querySelectorAll('.form-section, .stage-nav, .section-nav-container');
        existingSections.forEach(el => { el.style.display = 'none'; });

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'initLoading';
        loadingDiv.style.cssText = 'text-align:center;padding:60px 20px;';
        loadingDiv.innerHTML = '<p style="color:#666;font-size:1.1rem;">Validating your form link...</p>';
        formContent.appendChild(loadingDiv);
    }

    // 3. Validate key against the API
    const result = await validateKeyWithApi(key);

    // Remove loading indicator
    const loadingDiv = document.getElementById('initLoading');
    if (loadingDiv) loadingDiv.remove();

    if (!result.valid) {
        // Show appropriate error page based on error type
        switch (result.errorType) {
            case 'SUBMITTED':
                showErrorPage(
                    'Form Already Submitted',
                    result.error,
                    'If you need to make changes, please contact your immigration advisor.'
                );
                break;
            case 'NOT_READY':
                showErrorPage(
                    'Form Not Ready Yet',
                    result.error,
                    'Your advisor is still preparing this form. You will receive an email when it is ready.'
                );
                break;
            case 'REVOKED':
                showErrorPage(
                    'Link Revoked',
                    result.error,
                    'This form link has been revoked. Please contact your immigration advisor for a new link.'
                );
                break;
            case 'NETWORK':
                showErrorPage(
                    'Connection Error',
                    result.error,
                    'Please check your internet connection and refresh the page to try again.'
                );
                break;
            default:
                showTokenError();
                break;
        }
        return false;
    }

    // 4. Key is valid — restore sections visibility
    if (formContent) {
        formContent.querySelectorAll('.form-section, .stage-nav, .section-nav-container').forEach(el => {
            el.style.display = '';
        });
    }

    // 5. Load saved form data from API
    await loadFormDataFromApi();

    // 6. Set token in hidden field (backward compatibility)
    const tokenField = document.getElementById('formToken');
    if (tokenField) {
        tokenField.value = key;
    }

    // 7. Load from localStorage as fallback (if no API data)
    const formElement = document.getElementById(`${formCode.toLowerCase().replace('_', '')}Form`) || 
                        document.querySelector('form');

    if (formElement) {
        // If API returned saved data, restore it
        if (FormContext.userResponse) {
            restoreFormData(FormContext.userResponse, formElement);
            console.log('Restored user responses from server.');
        }
        if (FormContext.adminResponse) {
            restoreFormData(FormContext.adminResponse, formElement);
            console.log('Restored admin responses from server.');
        }

        // Fall back to localStorage if no server data
        if (!FormContext.userResponse && !FormContext.adminResponse) {
            loadDraft(formCode, formElement);
        }

        // Set up auto-save (still saves to localStorage for now)
        setInterval(() => saveDraft(formCode, formElement), FormConfig.autoSaveInterval);

        formElement.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('change', () => saveDraft(formCode, formElement));
        });
    }

    // 8. Set default dates
    setDefaultDates();

    console.log('Form initialized. Role:', FormContext.role, 'Status:', FormContext.currentStatus);

    return true;
}

// Export for use in form pages
window.FormUtils = {
    getTokenFromUrl,
    validateToken,
    validateKeyWithApi,
    showTokenError,
    showErrorPage,
    saveDraft,
    loadDraft,
    clearDraft,
    collectFormData,
    restoreFormData,
    loadFormDataFromApi,
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
    FormConfig,
    FormContext
};