/* ============================================
   VISA ADVISORY FORMS - SHARED UTILITIES
   ============================================ */

const FormConfig = {
    apiUrl: 'http://localhost:7071/api',
    submitEndpoint: 'YOUR_POWER_AUTOMATE_HTTP_TRIGGER_URL',
    autoSaveInterval: 30000,
    tokenParam: 'key',
    adminStage: 0
};

const FormContext = {
    isValid: false, role: '', formInstanceId: '', formTemplateId: '',
    contactId: '', caseId: '', currentStatus: 0, currentPage: 1,
    templateName: '', totalPages: 0, adminPages: 1, version: 1,
    accessKey: '', adminResponse: null, userResponse: null, lastSavedAt: null
};

/* ── TOKEN / KEY HANDLING ─────────────────── */

function getTokenFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(FormConfig.tokenParam);
}

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
            console.log('Key validated. Role:', data.role, 'Status:', data.currentStatus);
            return { valid: true };
        } else if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.message || 'This form link is invalid or has expired.';
            let errorType = 'EXPIRED';
            if (message.includes('revoked')) errorType = 'REVOKED';
            if (message.includes('submitted')) errorType = 'SUBMITTED';
            if (message.includes('not yet ready')) errorType = 'NOT_READY';
            return { valid: false, error: message, errorType: errorType };
        } else {
            const errorData = await response.json().catch(() => ({}));
            return { valid: false, error: errorData.message || 'An error occurred.', errorType: 'ERROR' };
        }
    } catch (networkError) {
        console.error('Key validation network error:', networkError);
        return { valid: false, error: 'Unable to connect to the server.', errorType: 'NETWORK' };
    }
}

function validateToken(token) {
    return token && token.length >= 20;
}

/* ── ERROR PAGES ──────────────────────────── */

function showTokenError() {
    showErrorPage('Invalid or Expired Link', 'This form link is invalid or has expired. Please contact your immigration advisor for a new link.', 'If you believe this is an error, please check that you copied the complete link from your email.');
}

function showErrorPage(title, message, hint) {
    let iconColor = '#dc3545';
    let iconSvg = '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>';
    if (title.includes('Submitted') || title.includes('Already')) {
        iconColor = '#28a745';
        iconSvg = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>';
    } else if (title.includes('Not Ready')) {
        iconColor = '#ffc107';
        iconSvg = '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>';
    }
    document.body.innerHTML = '<div class="container"><div class="form-content" style="border-radius:10px;margin-top:50px;"><div style="text-align:center;padding:60px 30px;"><div style="margin-bottom:20px;"><svg viewBox="0 0 24 24" style="width:64px;height:64px;fill:' + iconColor + '">' + iconSvg + '</svg></div><h2 style="color:' + iconColor + ';margin-bottom:15px;">' + title + '</h2><p style="color:#666;margin-bottom:20px;">' + message + '</p>' + (hint ? '<p style="color:#999;font-size:0.9rem;">' + hint + '</p>' : '') + '</div></div></div>';
}

/* ── LOAD FORM DATA FROM API ──────────────── */

async function loadFormDataFromApi() {
    if (!FormContext.formInstanceId) return false;
    try {
        const response = await fetch(FormConfig.apiUrl + '/form-data/' + FormContext.formInstanceId, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) { console.warn('Failed to load form data:', response.status); return false; }
        const data = await response.json();
        FormContext.version = data.version || 1;
        FormContext.currentPage = data.currentPage || 1;
        FormContext.adminResponse = data.adminResponse || null;
        FormContext.userResponse = data.userResponse || null;
        FormContext.lastSavedAt = data.lastSavedAt || null;
        console.log('Form data loaded. Version:', FormContext.version);
        FormContext._loadedFormData = data;
        return true;
    } catch (error) {
        console.error('Error loading form data:', error);
        return false;
    }
}

/* ── ROLE-BASED RENDERING ─────────────────── */

function makeStageReadOnly(stageNum) {
    const section = document.querySelector('.form-section[data-stage="' + stageNum + '"]');
    if (!section) return;

    section.querySelectorAll('input, select, textarea').forEach(function(field) {
        field.disabled = true;
        field.style.opacity = '0.7';
        field.style.cursor = 'not-allowed';
    });

    section.querySelectorAll('button').forEach(function(btn) {
        if (!btn.classList.contains('btn-nav')) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    });

    section.classList.add('stage-readonly');

    if (!section.querySelector('.readonly-banner')) {
        var banner = document.createElement('div');
        banner.className = 'readonly-banner';
        banner.style.cssText = 'background:#e8f4fd;border:1px solid #b8daff;border-radius:6px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px;';
        banner.innerHTML = '<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#0069d9;flex-shrink:0"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg><span style="color:#0056b3;font-size:0.9rem;">This section has been completed by your advisor and cannot be edited.</span>';
        // Insert after the first child (the h2 title)
        var firstChild = section.querySelector('h2, .section-title');
        if (firstChild && firstChild.nextSibling) {
            section.insertBefore(banner, firstChild.nextSibling);
        } else {
            section.insertBefore(banner, section.firstChild);
        }
    }
}

function applyRoleBasedRendering(stageOrder, navigateToStageFn, unlockStageFn) {
    var role = FormContext.role;
    var status = FormContext.currentStatus;
    var adminStage = FormConfig.adminStage;

    console.log('Applying role-based rendering. Role:', role, 'Status:', status);

    if (role === 'admin') {
        // ADMIN: Show only admin stage (stage 0), editable. Hide everything else.
        document.querySelectorAll('.stage-tab').forEach(function(tab) {
            var tabStage = tab.dataset.stage;
            if (tabStage != adminStage) {
                tab.style.display = 'none';
            } else {
                tab.style.display = '';
                tab.classList.add('active', 'unlocked');
            }
        });

        document.querySelectorAll('.form-section').forEach(function(section) {
            if (section.dataset.stage == adminStage) {
                section.classList.add('active');
                section.style.display = '';
            } else {
                section.classList.remove('active');
                section.style.display = 'none';
            }
        });

        // Hide section sub-navigation (Identity Details sub-tabs)
        var sectionNav = document.querySelector('.section-nav-container');
        if (sectionNav) sectionNav.style.display = 'none';

        navigateToStageFn(adminStage);
        console.log('Admin view: only Advisor Assessment visible and editable.');

    } else if (role === 'user') {
        // USER: Admin stage is read-only, all other stages are editable.
        makeStageReadOnly(adminStage);

        // Update admin tab label
        var adminTab = document.querySelector('.stage-tab[data-stage="' + adminStage + '"]');
        if (adminTab) {
            adminTab.classList.add('unlocked', 'completed');
            adminTab.innerHTML = '&#128274; Advisor Assessment';
        }

        // If submitted, make everything read-only
        if (status === 5 || status === 7) {
            stageOrder.forEach(function(s) { makeStageReadOnly(s); });
            var stageNav = document.getElementById('stageNav');
            if (stageNav) {
                var banner = document.createElement('div');
                banner.style.cssText = 'background:#d4edda;border:1px solid #c3e6cb;padding:12px 20px;text-align:center;color:#155724;font-weight:500;';
                banner.textContent = 'This form has been submitted. All sections are read-only.';
                stageNav.parentElement.insertBefore(banner, stageNav);
            }
            console.log('User view: form submitted, all read-only.');
        } else {
            // Normal user flow
            var firstUserStage = null;
            for (var i = 0; i < stageOrder.length; i++) {
                if (stageOrder[i] !== adminStage) { firstUserStage = stageOrder[i]; break; }
            }

            if (firstUserStage !== null) {
                unlockStageFn(firstUserStage);

                // If resuming, unlock stages up to current page
                if (FormContext.currentPage > 0) {
                    var currentIdx = stageOrder.indexOf(FormContext.currentPage);
                    if (currentIdx >= 0) {
                        for (var j = 0; j <= currentIdx; j++) {
                            unlockStageFn(stageOrder[j]);
                        }
                    }
                }

                navigateToStageFn(firstUserStage);
            }

            console.log('User view: Advisor Assessment locked, user stages editable.');
        }
    }
}

/* ── ADMIN SAVE & CLOSE ───────────────────── */

async function handleAdminSaveAndCloseAction(formElement) {
    try {
        var overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            var lt = overlay.querySelector('.loading-text');
            if (lt) lt.textContent = 'Saving advisor assessment...';
            overlay.classList.add('active');
        }

        // Collect only admin fields (name starts with "adv_")
        var allData = collectFormData(formElement);
        var adminData = {};
        Object.keys(allData).forEach(function(key) {
            if (key.startsWith('adv_')) adminData[key] = allData[key];
        });

        var response = await fetch(FormConfig.apiUrl + '/form-data/' + FormContext.formInstanceId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: FormContext.version,
                currentPage: FormConfig.adminStage,
                pages: adminData,
                isAdminSave: true
            })
        });

        if (overlay) overlay.classList.remove('active');

        if (!response.ok) {
            var errorData = await response.json().catch(function() { return {}; });
            alert('Failed to save: ' + (errorData.message || 'Unknown error'));
            return;
        }

        var result = await response.json();
        FormContext.version = result.version;

        // Save to localStorage as backup
        saveDraft('ADMIN_' + FormContext.formInstanceId, formElement);

        alert('Advisor Assessment saved successfully.\n\nYou can now close this window and click "Send INZ Form to Contact" in Dynamics CE to send the form to the client.');

        window.close();

        // If window.close doesn't work, show success page
        setTimeout(function() {
            document.body.innerHTML = '<div class="container"><div class="form-content" style="border-radius:10px;margin-top:50px;"><div style="text-align:center;padding:60px 30px;"><svg viewBox="0 0 24 24" style="width:64px;height:64px;fill:#28a745;margin-bottom:20px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg><h2 style="color:#28a745;margin-bottom:15px;">Advisor Assessment Saved</h2><p style="color:#666;margin-bottom:20px;">Your assessment has been saved successfully. You can safely close this tab.</p><p style="color:#666;">Return to Dynamics CE and click <strong>"Send INZ Form to Contact"</strong> to send the form to the client.</p></div></div></div>';
        }, 500);

    } catch (error) {
        console.error('Admin save error:', error);
        var ov = document.getElementById('loadingOverlay');
        if (ov) ov.classList.remove('active');
        alert('An error occurred while saving: ' + error.message);
    }
}

/* ── AUTO-SAVE ────────────────────────────── */

function getStorageKey(formCode) {
    var token = getTokenFromUrl();
    var tokenHash = token ? token.substring(0, 20) : 'default';
    return 'visa_form_' + formCode + '_' + tokenHash;
}

function saveDraft(formCode, formElement) {
    var formData = new FormData(formElement);
    var draft = {};
    formData.forEach(function(value, key) { draft[key] = value; });
    formElement.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { draft[cb.name] = cb.checked; });
    try { localStorage.setItem(getStorageKey(formCode), JSON.stringify(draft)); } catch (e) { console.warn('localStorage save failed:', e); }
    showAutosaveIndicator();
}

function loadDraft(formCode, formElement) {
    var draft;
    try { draft = localStorage.getItem(getStorageKey(formCode)); } catch (e) { return false; }
    if (!draft) return false;
    try { restoreFormData(JSON.parse(draft), formElement); return true; } catch (e) { console.error('Error loading draft:', e); return false; }
}

function restoreFormData(data, formElement) {
    Object.keys(data).forEach(function(key) {
        var field = formElement.elements[key];
        if (!field) return;
        if (field.type === 'checkbox') {
            field.checked = data[key] === true || data[key] === 'on' || data[key] === 'Yes';
        } else if (field.type === 'radio') {
            var radio = formElement.querySelector('input[name="' + key + '"][value="' + data[key] + '"]');
            if (radio) radio.checked = true;
        } else if (field.tagName === 'SELECT' || field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'date' || field.type === 'number') {
            field.value = data[key];
        } else if (field.tagName === 'TEXTAREA') {
            field.value = data[key];
        }
    });
}

function collectFormData(formElement) {
    var data = {};
    formElement.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="date"], input[type="hidden"]').forEach(function(i) { if (i.name) data[i.name] = i.value; });
    formElement.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { if (cb.name) data[cb.name] = cb.checked; });
    formElement.querySelectorAll('input[type="radio"]:checked').forEach(function(r) { if (r.name) data[r.name] = r.value; });
    formElement.querySelectorAll('select').forEach(function(s) { if (s.name) data[s.name] = s.value; });
    formElement.querySelectorAll('textarea').forEach(function(t) { if (t.name) data[t.name] = t.value; });
    return data;
}

function clearDraft(formCode) { try { localStorage.removeItem(getStorageKey(formCode)); } catch (e) {} }

function showAutosaveIndicator() {
    var indicator = document.getElementById('autosaveIndicator');
    if (indicator) { indicator.style.display = 'block'; setTimeout(function() { indicator.style.display = 'none'; }, 2000); }
}

/* ── FORM NAVIGATION ──────────────────────── */

var currentSection = 1;

function updateSectionDisplay(totalSections) {
    document.querySelectorAll('.form-section').forEach(function(s) { s.classList.remove('active'); });
    var active = document.querySelector('.form-section[data-section="' + currentSection + '"]');
    if (active) active.classList.add('active');
    document.querySelectorAll('.progress-step').forEach(function(step, index) {
        step.classList.remove('active', 'completed');
        if (index + 1 < currentSection) step.classList.add('completed');
        else if (index + 1 === currentSection) step.classList.add('active');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextSection(totalSections, validateFn) {
    if (validateFn && !validateFn()) return false;
    if (currentSection < totalSections) { currentSection++; updateSectionDisplay(totalSections); return true; }
    return false;
}

function prevSection(totalSections) {
    if (currentSection > 1) { currentSection--; updateSectionDisplay(totalSections); return true; }
    return false;
}

function goToSection(sectionNumber, totalSections) {
    if (sectionNumber >= 1 && sectionNumber <= totalSections) { currentSection = sectionNumber; updateSectionDisplay(totalSections); return true; }
    return false;
}

/* ── VALIDATION ───────────────────────────── */

function validateSection(sectionNumber) {
    var sectionEl = document.querySelector('.form-section[data-section="' + sectionNumber + '"]');
    if (!sectionEl) return true;
    var requiredFields = sectionEl.querySelectorAll('[required]');
    var isValid = true; var firstError = null;
    requiredFields.forEach(function(field) {
        var formGroup = field.closest('.form-group') || field.closest('.checkbox-item');
        field.classList.remove('error');
        if (formGroup) formGroup.classList.remove('has-error');
        var fieldValid = true;
        if (field.type === 'checkbox') { if (!field.checked) { fieldValid = false; field.style.outline = '2px solid var(--error-color)'; } else { field.style.outline = ''; } }
        else if (field.type === 'radio') { var rg = sectionEl.querySelectorAll('input[name="' + field.name + '"]'); if (!Array.from(rg).some(function(r) { return r.checked; })) fieldValid = false; }
        else { if (!field.value.trim()) { fieldValid = false; field.classList.add('error'); } }
        if (!fieldValid) { isValid = false; if (formGroup) formGroup.classList.add('has-error'); if (!firstError) firstError = field; }
    });
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return isValid;
}

function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function validatePhone(phone) { return /^[\d\s\-\+\(\)]{8,20}$/.test(phone); }

/* ── FORM SUBMISSION ──────────────────────── */

async function submitForm(formCode, formElement, additionalData) {
    additionalData = additionalData || {};
    var token = getTokenFromUrl();
    if (!token) { alert('Invalid form link.'); return { success: false, error: 'No token' }; }
    var loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.add('active');
    var responses = [];
    formElement.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { responses.push({ questionCode: cb.name, value: cb.checked ? 'Yes' : 'No', type: 'checkbox' }); });
    formElement.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="date"]').forEach(function(i) { if (i.value) responses.push({ questionCode: i.name, value: i.value, type: i.type }); });
    formElement.querySelectorAll('select').forEach(function(s) { if (s.value) responses.push({ questionCode: s.name, value: s.value, type: 'select' }); });
    formElement.querySelectorAll('textarea').forEach(function(t) { if (t.value) responses.push({ questionCode: t.name, value: t.value, type: 'textarea' }); });
    var radioGroups = {};
    formElement.querySelectorAll('input[type="radio"]:checked').forEach(function(r) { if (!radioGroups[r.name]) { radioGroups[r.name] = true; responses.push({ questionCode: r.name, value: r.value, type: 'radio' }); } });
    var payload = Object.assign({ token: token, formCode: formCode, responses: responses, submittedAt: new Date().toISOString() }, additionalData);
    try {
        var response = await fetch(FormConfig.submitEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (response.ok) { var result = await response.json(); clearDraft(formCode); return { success: true, referenceNumber: result.referenceNumber || (formCode + '-' + Date.now()), data: result }; }
        else { var ed = await response.json().catch(function() { return {}; }); throw new Error(ed.message || 'Submission failed'); }
    } catch (error) { console.error('Submission error:', error); return { success: false, error: error.message || 'An error occurred' }; }
    finally { if (loadingOverlay) loadingOverlay.classList.remove('active'); }
}

/* ── UI HELPERS ───────────────────────────── */

function showSuccessPage(referenceNumber) {
    document.querySelectorAll('.form-section').forEach(function(s) { s.classList.remove('active'); });
    var ss = document.querySelector('.form-section[data-section="success"]');
    if (ss) { ss.classList.add('active'); var ref = document.getElementById('submissionRef'); if (ref) ref.textContent = referenceNumber; }
    var pc = document.querySelector('.progress-container'); if (pc) pc.style.display = 'none';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-NZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function setDefaultDates() {
    var today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(function(el) { if (!el.value && el.dataset.defaultToday === 'true') el.value = today; });
}

/* ── CONDITIONAL LOGIC ────────────────────── */

function setupConditionalField(triggerSelector, targetSelector, showValue) {
    var triggers = document.querySelectorAll(triggerSelector);
    var target = document.querySelector(targetSelector);
    if (!triggers.length || !target) return;
    function update() { var c = document.querySelector(triggerSelector + ':checked'); target.style.display = (c && c.value === showValue) ? 'block' : 'none'; }
    triggers.forEach(function(t) { t.addEventListener('change', update); });
    update();
}

/* ── INITIALIZATION ───────────────────────── */

async function initForm(formCode, totalSections) {
    var key = getTokenFromUrl();
    if (!key || key.length < 20) { showTokenError(); return false; }

    var formContent = document.querySelector('.form-content') || document.querySelector('.container');
    if (formContent) {
        formContent.querySelectorAll('.form-section, .stage-nav, .section-nav-container').forEach(function(el) { el.style.display = 'none'; });
        var ld = document.createElement('div'); ld.id = 'initLoading'; ld.style.cssText = 'text-align:center;padding:60px 20px;';
        ld.innerHTML = '<p style="color:#666;font-size:1.1rem;">Validating your form link...</p>';
        formContent.appendChild(ld);
    }

    var result = await validateKeyWithApi(key);
    var ldEl = document.getElementById('initLoading'); if (ldEl) ldEl.remove();

    if (!result.valid) {
        switch (result.errorType) {
            case 'SUBMITTED': showErrorPage('Form Already Submitted', result.error, 'If you need to make changes, please contact your immigration advisor.'); break;
            case 'NOT_READY': showErrorPage('Form Not Ready Yet', result.error, 'Your advisor is still preparing this form.'); break;
            case 'REVOKED': showErrorPage('Link Revoked', result.error, 'Please contact your immigration advisor for a new link.'); break;
            case 'NETWORK': showErrorPage('Connection Error', result.error, 'Please check your internet connection and refresh the page.'); break;
            default: showTokenError(); break;
        }
        return false;
    }

    if (formContent) {
        formContent.querySelectorAll('.form-section, .stage-nav, .section-nav-container').forEach(function(el) { el.style.display = ''; });
    }

    await loadFormDataFromApi();

    var tokenField = document.getElementById('formToken'); if (tokenField) tokenField.value = key;

    var formElement = document.getElementById(formCode.toLowerCase().replace('_', '') + 'Form') || document.querySelector('form');
    if (formElement) {
        // Always reset admin checkboxes first to clear any browser autofill
        resetAdminCheckboxes();

        if (FormContext.adminResponse) { restoreFormData(FormContext.adminResponse, formElement); console.log('Restored admin responses.'); }
        if (FormContext.userResponse) { restoreFormData(FormContext.userResponse, formElement); console.log('Restored user responses.'); }
        if (!FormContext.userResponse && !FormContext.adminResponse) { loadDraft(formCode, formElement); }

        // Reset again after a delay to override any late browser autofill
        if (!FormContext.adminResponse) {
            setTimeout(function() { resetAdminCheckboxes(); }, 200);
        }

        setInterval(function() { saveDraft(formCode, formElement); }, FormConfig.autoSaveInterval);
        formElement.querySelectorAll('input, select, textarea').forEach(function(el) { el.addEventListener('change', function() { saveDraft(formCode, formElement); }); });
    }

    setDefaultDates();
    console.log('Form initialized. Role:', FormContext.role, 'Status:', FormContext.currentStatus);
    return true;
}

/* ══════════════════════════════════════════════
   SUBMIT TO DATAVERSE API
   ══════════════════════════════════════════════ */

async function submitToApi(formElement) {
    if (!FormContext.formInstanceId || !FormContext.isValid) {
        return { success: false, error: 'Invalid form session.' };
    }

    try {
        // Collect all user form data
        var allData = collectFormData(formElement);

        // Remove admin fields (they're already saved separately)
        var userData = {};
        Object.keys(allData).forEach(function(key) {
            if (!key.startsWith('adv_')) userData[key] = allData[key];
        });

        var response = await fetch(
            FormConfig.apiUrl + '/form-submissions/' + FormContext.formInstanceId + '/submit',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version: FormContext.version,
                    pages: userData
                })
            }
        );

        if (response.ok) {
            var result = await response.json();
            FormContext.version = result.version || FormContext.version;
            FormContext.currentStatus = 5; // Submitted

            // Clear local drafts
            clearDraft('API_BACKUP');
            clearDraft('FAILED_SAVE');

            console.log('Form submitted successfully. FormInstance:', FormContext.formInstanceId);
            return {
                success: true,
                formInstanceId: result.formInstanceId,
                submittedAt: result.submittedAt,
                message: result.message
            };

        } else if (response.status === 409) {
            var conflictData = await response.json().catch(function() { return {}; });
            return { success: false, error: 'Version conflict: ' + (conflictData.message || 'Please reload and try again.'), isConflict: true };

        } else {
            var errorData = await response.json().catch(function() { return {}; });
            return { success: false, error: errorData.message || 'Submission failed. Please try again.' };
        }

    } catch (error) {
        console.error('Submit error:', error);
        return { success: false, error: 'Unable to connect to the server. Please check your connection and try again.' };
    }
}

/* ══════════════════════════════════════════════════════════════════════
   SUPPORTING DOCUMENTS — CONFIGURATION & DYNAMIC GENERATION
   
   Add this entire block to form-utils.js BEFORE the EXPORT section.
   Then update the EXPORT to include the new functions.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Always-required documents — shown regardless of admin selections.
 * These are NOT controlled by admin checkboxes.
 */
var ALWAYS_REQUIRED_DOCS = [
    { fieldName: 'doc_passport_bio',    label: 'Passport Bio Pages + Visa Pages + Stamps', spFolder: 'Passport Bio Pages', multi: true, required: true, helpText: 'Upload clear copies of your passport bio-data page, all visa pages, and stamp pages.' },
    { fieldName: 'doc_photo',           label: 'Your Photo (Passport Size)', spFolder: 'Photo', multi: false, required: true, helpText: 'Format: JPG only. Passport size, less than 6 months old, color, light background. 900x1200px, 500KB–3MB.', accept: '.jpg,.jpeg' },
    { fieldName: 'doc_cv',              label: 'Fully Completed CV', spFolder: 'CV', multi: false, required: true },
    { fieldName: 'doc_sop',             label: 'Statement of Purpose', spFolder: 'SOP', multi: false, required: true, helpText: 'Refer to the SOP guide provided by your advisor.' },
    { fieldName: 'doc_police_cert',     label: 'Police Certificate', spFolder: 'Police Certificate', multi: false, required: true, helpText: 'Should be less than 6 months old.' },
    { fieldName: 'doc_medical',         label: 'Medical Certificate', spFolder: 'Medical', multi: false, required: true, helpText: 'Should be less than 3 months old.' },
    { fieldName: 'doc_offer_letter',    label: 'Offer Letter from Education Provider', spFolder: 'Offer Letter from Education Provider', multi: false, required: true },
    { fieldName: 'doc_inz_forms',       label: 'INZ Forms (1012 / 1200 / 1226 / 1014 / 1025)', spFolder: 'INZ Forms (1012 -1200-1226-1014-1025)', multi: true, required: true, helpText: 'Upload all completed INZ forms as instructed by your advisor.' },
];

/**
 * Conditional document configuration.
 * Each entry maps an admin checkbox field name to its upload config.
 * sectionId = which HTML container to place the upload in.
 */
var CONDITIONAL_DOC_CONFIG = {
    // ── Relationship to Sponsor (Annexture 17) ──
    adv_rel_sponsor_id:       { label: 'Passport copy / ID of Sponsor', sectionId: 'docSection_relationship', spFolder: 'Annexture 17 - Relationship to Sponsor', multi: false },
    adv_rel_birth_cert_orig:  { label: 'Birth Certificate — Original', sectionId: 'docSection_relationship', spFolder: 'Annexture 17 - Relationship to Sponsor', multi: false },
    adv_rel_birth_cert_trans: { label: 'Birth Certificate — Translation', sectionId: 'docSection_relationship', spFolder: 'Annexture 17 - Relationship to Sponsor', multi: false },
    adv_rel_marriage_cert_orig: { label: 'Marriage Certificate — Original', sectionId: 'docSection_relationship', spFolder: 'Annexture 17 - Relationship to Sponsor', multi: false },
    adv_rel_marriage_cert_trans: { label: 'Marriage Certificate — Translation', sectionId: 'docSection_relationship', spFolder: 'Annexture 17 - Relationship to Sponsor', multi: false },
    adv_rel_parent_id_orig:   { label: 'Birth certificate of parents / Passport / ID — Original', sectionId: 'docSection_relationship', spFolder: 'Annexture 17 - Relationship to Sponsor', multi: true },
    adv_rel_parent_id_trans:  { label: 'Birth certificate of parents / Passport / ID — Translation', sectionId: 'docSection_relationship', spFolder: 'Annexture 17 - Relationship to Sponsor', multi: true },

    // ── Education (Annexture 13) ──
    adv_edu_ol:     { label: 'GCE O/L Certificate', sectionId: 'docSection_education', spFolder: 'Annexture 13 - Educational Qualifications', multi: false },
    adv_edu_al:     { label: 'GCE A/L Certificate', sectionId: 'docSection_education', spFolder: 'Annexture 13 - Educational Qualifications', multi: false },
    adv_edu_degree: { label: 'Degree Certificates + Transcripts', sectionId: 'docSection_education', spFolder: 'Annexture 13 - Educational Qualifications', multi: true },
    adv_edu_ielts:  { label: 'IELTS or PTE Certificate', sectionId: 'docSection_education', spFolder: 'Annexture 13 - Educational Qualifications', multi: false },

    // ── Employment (Annexture 14 & 15) ──
    adv_emp_service_letter: { label: 'Service Letter with salary confirmation', sectionId: 'docSection_employment', spFolder: 'Annexture 14 - Current Work Experience', multi: true },
    adv_emp_contract:       { label: 'Employment Contract', sectionId: 'docSection_employment', spFolder: 'Annexture 14 - Current Work Experience', multi: true },
    adv_emp_payslips:       { label: 'Pay slips (Last 3 months)', sectionId: 'docSection_employment', spFolder: 'Annexture 14 - Current Work Experience', multi: true },
    adv_emp_epf_etf:        { label: 'EPF/ETF confirmation for each employment', sectionId: 'docSection_employment', spFolder: 'Annexture 14 - Current Work Experience', multi: true },
    adv_emp_bank_stmt:      { label: 'Bank statement of salary account (Last 3 months)', sectionId: 'docSection_employment', spFolder: 'Annexture 14 - Current Work Experience', multi: true },
    adv_emp_epf_history:    { label: 'EPF/ETF contribution history of all employments', sectionId: 'docSection_employment', spFolder: 'Annexture 15 - Previous Work Experience', multi: true },

    // ── Tuition Fee (Annexture 19) ──
    adv_tuition_invoice:   { label: 'Invoice from college (Acknowledgement Invoice)', sectionId: 'docSection_tuition', spFolder: 'Annexture 19 - Evidence of Tuition Fee Payment', multi: false },
    adv_tuition_tt_proof:  { label: 'TT transfer proof (Debit Advice / Order)', sectionId: 'docSection_tuition', spFolder: 'Annexture 19 - Evidence of Tuition Fee Payment', multi: false },
    adv_tuition_bank_stmt: { label: 'Bank statement — Post TT', sectionId: 'docSection_tuition', spFolder: 'Annexture 19 - Evidence of Tuition Fee Payment', multi: false },

    // ── Home Ties ──
    adv_home_deed_orig:       { label: 'Transfer deeds (original) — Home and Properties', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: true },
    adv_home_deed_trans:      { label: 'Transfer deeds (Translation) — Home and Properties', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: true },
    adv_home_successor:       { label: 'Nomination of Successor Form / Affidavit', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_child_birth_orig:{ label: 'Birth Certificates of Children — Original', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: true },
    adv_home_child_birth_trans:{ label: 'Birth Certificates of Children — Translation', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: true },
    adv_home_marriage_orig:   { label: 'Marriage Certificate — Original', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_marriage_trans:  { label: 'Marriage Certificate — Translation', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_parent_id:       { label: 'Identity documents of parents with translation', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: true },
    adv_home_parent_medical:  { label: 'Medical certificates of parents', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: true },
    adv_home_vehicle_book:    { label: 'Vehicle Registration Book', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_vehicle_valuation:{ label: 'Vehicle Valuation Report', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_travel_evidence: { label: 'Evidence of Previous International travels', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_business_reg:    { label: 'Business Registration certificate', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_business_tax:    { label: 'Business tax return / Financial documents', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_leave_letter:    { label: 'Employment leave letters / Future Job confirmation', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_memberships:     { label: 'Active memberships in societies, charities, service clubs', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_pets:            { label: 'Pets (pictures / other proofs)', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_other_financial: { label: 'Other financial evidence', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_religious_letter:{ label: 'Letter from a religious leader about social services', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_friend_letters:  { label: 'Two letters from close friends with their IDs/Passports', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_career_outcome:  { label: 'Post study career outcome proofs', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },
    adv_home_gold_valuation:  { label: 'Valuation reports of gold', sectionId: 'docSection_homeTies', spFolder: 'Annexture 16 - Travel History', multi: false },

    // ── Visa Refusals (Annexture 18) ──
    adv_visa_refusal_letter:      { label: 'Visa Refusal Letter issued by immigration', sectionId: 'docSection_visaRefusal', spFolder: 'Annexture 18 - Visa Decline Letters & Explanations', multi: true },
    adv_visa_refusal_explanation: { label: 'Explanation letter written by the student', sectionId: 'docSection_visaRefusal', spFolder: 'Annexture 18 - Visa Decline Letters & Explanations', multi: true },

    // ── Fixed Deposits Myself (Annexture 1A) ──
    adv_fd_m_certificates:    { label: 'Fixed deposit Certificates (Myself)', sectionId: 'docSection_fundsMyself', spFolder: 'Annexture 1A - Evidence of Funds - Fixed Deposit (Myself)', multi: true, subHeading: 'Fixed Deposits' },
    adv_fd_m_balance_confirm: { label: 'Bank balance confirmations — Fixed Deposits (Myself)', sectionId: 'docSection_fundsMyself', spFolder: 'Annexture 1A - Evidence of Funds - Fixed Deposit (Myself)', multi: true },
    adv_fd_m_renewal:         { label: 'FD renewal confirmation letter (Myself)', sectionId: 'docSection_fundsMyself', spFolder: 'Annexture 1A - Evidence of Funds - Fixed Deposit (Myself)', multi: true },

    // ── Fixed Deposits Sponsor (Annexture 1B) ──
    adv_fd_s_certificates:    { label: 'Fixed deposit Certificates (Sponsor)', sectionId: 'docSection_fundsSponsor', spFolder: 'Annexture 1B - Evidence of Funds - Fixed Deposit (Sponsor)', multi: true, subHeading: 'Fixed Deposits' },
    adv_fd_s_balance_confirm: { label: 'Bank balance confirmations — Fixed Deposits (Sponsor)', sectionId: 'docSection_fundsSponsor', spFolder: 'Annexture 1B - Evidence of Funds - Fixed Deposit (Sponsor)', multi: true },
    adv_fd_s_renewal:         { label: 'FD renewal confirmation letter (Sponsor)', sectionId: 'docSection_fundsSponsor', spFolder: 'Annexture 1B - Evidence of Funds - Fixed Deposit (Sponsor)', multi: true },

    // ── Savings Myself (Annexture 2A) ──
    adv_sav_m_bank_history:   { label: 'Bank account history statement 3 months — Savings (Myself)', sectionId: 'docSection_fundsMyself', spFolder: 'Annexture 2A - Evidence of Funds - Savings (Myself)', multi: true, subHeading: 'Savings / Current Accounts' },
    adv_sav_m_balance_confirm:{ label: 'Bank balance confirmations — Savings (Myself)', sectionId: 'docSection_fundsMyself', spFolder: 'Annexture 2A - Evidence of Funds - Savings (Myself)', multi: true },

    // ── Savings Sponsor (Annexture 2B) ──
    adv_sav_s_bank_history:   { label: 'Bank account history statement 3 months — Savings (Sponsor)', sectionId: 'docSection_fundsSponsor', spFolder: 'Annexture 2B - Evidence of Funds - Savings (Sponsor)', multi: true, subHeading: 'Savings / Current Accounts' },
    adv_sav_s_balance_confirm:{ label: 'Bank balance confirmations — Savings (Sponsor)', sectionId: 'docSection_fundsSponsor', spFolder: 'Annexture 2B - Evidence of Funds - Savings (Sponsor)', multi: true },

    // ── Large Deposit (Annexture 3) ──
    adv_large_deposit_m_explain: { label: 'Explanation of large deposits with proofs (Myself)', sectionId: 'docSection_fundsMyself', spFolder: 'Annexture 3 - Evidence of Funds - Large Deposit Explanation', multi: true, subHeading: 'Large Deposit Explanation' },
    adv_large_deposit_s_explain: { label: 'Explanation of large deposits with proofs (Sponsor)', sectionId: 'docSection_fundsSponsor', spFolder: 'Annexture 3 - Evidence of Funds - Large Deposit Explanation', multi: true, subHeading: 'Large Deposit Explanation' },

    // ── Provident Fund Myself (Annexture 4A) ──
    adv_pf_m_epf_stmt:       { label: 'EPF — Member Account Statement (Myself)', sectionId: 'docSection_fundsMyself', spFolder: 'Annexture 4A - Evidence of Funds - Employee\'s Provident Fund (Myself)', multi: false, subHeading: 'Provident Fund (EPF/ETF)' },
    adv_pf_m_epf_history:    { label: 'EPF — Contribution History report (Myself)', sectionId: 'docSection_fundsMyself', spFolder: 'Annexture 4A - Evidence of Funds - Employee\'s Provident Fund (Myself)', multi: false },
    adv_pf_m_etf_stmt:       { label: 'ETF — Member Account Statement (Myself)', sectionId: 'docSection_fundsMyself', spFolder: 'Annexture 4A - Evidence of Funds - Employee\'s Provident Fund (Myself)', multi: false },
    adv_pf_m_etf_history:    { label: 'ETF — Contribution History report (Myself)', sectionId: 'docSection_fundsMyself', spFolder: 'Annexture 4A - Evidence of Funds - Employee\'s Provident Fund (Myself)', multi: false },
    adv_pf_m_available_proof:{ label: 'Document to prove readily available — PF (Myself)', sectionId: 'docSection_fundsMyself', spFolder: 'Annexture 4A - Evidence of Funds - Employee\'s Provident Fund (Myself)', multi: false },

    // ── Provident Fund Sponsor (Annexture 4B) ──
    adv_pf_s_epf_stmt:       { label: 'EPF — Member Account Statement (Sponsor)', sectionId: 'docSection_fundsSponsor', spFolder: 'Annexture 4B - Evidence of Funds - Employee\'s Provident Fund (Sponsor)', multi: false, subHeading: 'Provident Fund (EPF/ETF)' },
    adv_pf_s_epf_history:    { label: 'EPF — Contribution History report (Sponsor)', sectionId: 'docSection_fundsSponsor', spFolder: 'Annexture 4B - Evidence of Funds - Employee\'s Provident Fund (Sponsor)', multi: false },
    adv_pf_s_etf_stmt:       { label: 'ETF — Member Account Statement (Sponsor)', sectionId: 'docSection_fundsSponsor', spFolder: 'Annexture 4B - Evidence of Funds - Employee\'s Provident Fund (Sponsor)', multi: false },
    adv_pf_s_etf_history:    { label: 'ETF — Contribution History report (Sponsor)', sectionId: 'docSection_fundsSponsor', spFolder: 'Annexture 4B - Evidence of Funds - Employee\'s Provident Fund (Sponsor)', multi: false },
    adv_pf_s_available_proof:{ label: 'Document to prove readily available — PF (Sponsor)', sectionId: 'docSection_fundsSponsor', spFolder: 'Annexture 4B - Evidence of Funds - Employee\'s Provident Fund (Sponsor)', multi: false },

    // ── Education Loan (Annexture 5) ──
    adv_loan_offer_letter:    { label: 'Education Loan Offer / Sanction Letter', sectionId: 'docSection_educationLoan', spFolder: 'Annexture 5 - Evidence of Education Loan', multi: false },

    // ── Loan Repayment (Annexture 11) ──
    adv_loan_repay_security:  { label: 'Security for loans (fixed assets)', sectionId: 'docSection_loanRepayment', spFolder: 'Annexture 11 - Education Loan Repayment Plan', multi: false },
    adv_loan_repay_plan:      { label: 'Repayment Plan', sectionId: 'docSection_loanRepayment', spFolder: 'Annexture 11 - Education Loan Repayment Plan', multi: false },

    // ── Source: Employment Myself (Annexture 6A) ──
    adv_sof_emp_m_employer_letter: { label: 'Employer letter / contract with salary confirmation (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 6A - Source of Funds - Savings from Employment (Myself)', multi: false, subHeading: 'Savings from Employment' },
    adv_sof_emp_m_bank_stmt:       { label: 'Bank statement of salary account 3 months (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 6A - Source of Funds - Savings from Employment (Myself)', multi: false },
    adv_sof_emp_m_salary_slips:    { label: 'Salary Slips 3 months (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 6A - Source of Funds - Savings from Employment (Myself)', multi: false },
    adv_sof_emp_m_tax_cert:        { label: 'Income Tax (PAYE) certificate (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 6A - Source of Funds - Savings from Employment (Myself)', multi: false },
    adv_sof_emp_m_bonus:           { label: 'Bonus / commissions proofs (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 6A - Source of Funds - Savings from Employment (Myself)', multi: false },
    adv_sof_emp_m_financial_stmt:  { label: 'Financial Statement from chartered accountant 2 years (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 6A - Source of Funds - Savings from Employment (Myself)', multi: false },
    adv_sof_emp_m_saving_pattern:  { label: 'Explanation of saving pattern (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 6A - Source of Funds - Savings from Employment (Myself)', multi: false },

    // ── Source: Employment Sponsor (Annexture 6B) ──
    adv_sof_emp_s_employer_letter: { label: 'Employer letter / contract with salary confirmation (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 6B - Source of Funds - Savings from Employment (Sponsor)', multi: false, subHeading: 'Savings from Employment' },
    adv_sof_emp_s_bank_stmt:       { label: 'Bank statement of salary account 3 months (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 6B - Source of Funds - Savings from Employment (Sponsor)', multi: false },
    adv_sof_emp_s_salary_slips:    { label: 'Salary Slips 3 months (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 6B - Source of Funds - Savings from Employment (Sponsor)', multi: false },
    adv_sof_emp_s_tax_cert:        { label: 'Income Tax (PAYE) certificate (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 6B - Source of Funds - Savings from Employment (Sponsor)', multi: false },
    adv_sof_emp_s_bonus:           { label: 'Bonus / commissions proofs (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 6B - Source of Funds - Savings from Employment (Sponsor)', multi: false },
    adv_sof_emp_s_financial_stmt:  { label: 'Financial Statement from chartered accountant 2 years (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 6B - Source of Funds - Savings from Employment (Sponsor)', multi: false },
    adv_sof_emp_s_saving_pattern:  { label: 'Explanation of saving pattern (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 6B - Source of Funds - Savings from Employment (Sponsor)', multi: false },

    // ── Source: Business Myself (Annexture 7A) ──
    adv_sof_biz_m_registration:  { label: 'Business registration (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 7A - Source of Funds - Business (Myself)', multi: false, subHeading: 'Self-employment / Business' },
    adv_sof_biz_m_pnl:           { label: 'Profit and loss statements by chartered accountant (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 7A - Source of Funds - Business (Myself)', multi: false },
    adv_sof_biz_m_tax:           { label: 'Business TAX evidence (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 7A - Source of Funds - Business (Myself)', multi: false },
    adv_sof_biz_m_lawyer_letter: { label: 'Letter from lawyer/accountant confirming position (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 7A - Source of Funds - Business (Myself)', multi: false },
    adv_sof_biz_m_bank_stmt:     { label: 'Bank accounts statements 6 months (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 7A - Source of Funds - Business (Myself)', multi: false },

    // ── Source: Business Sponsor (Annexture 7B) ──
    adv_sof_biz_s_registration:  { label: 'Business registration (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 7B - Source of Funds - Business (Sponsor)', multi: false, subHeading: 'Self-employment / Business' },
    adv_sof_biz_s_pnl:           { label: 'Profit and loss statements by chartered accountant (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 7B - Source of Funds - Business (Sponsor)', multi: false },
    adv_sof_biz_s_tax:           { label: 'Business TAX evidence (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 7B - Source of Funds - Business (Sponsor)', multi: false },
    adv_sof_biz_s_lawyer_letter: { label: 'Letter from lawyer/accountant confirming position (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 7B - Source of Funds - Business (Sponsor)', multi: false },
    adv_sof_biz_s_bank_stmt:     { label: 'Bank accounts statements 6 months (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 7B - Source of Funds - Business (Sponsor)', multi: false },

    // ── Source: Rental Myself (Annexture 8A) ──
    adv_sof_rent_m_lease:            { label: 'Lease agreement (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 8A - Source of Funds - Rental Property (Myself)', multi: false, subHeading: 'Rent / Lease Income' },
    adv_sof_rent_m_deed:             { label: 'Deed of the property (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 8A - Source of Funds - Rental Property (Myself)', multi: false },
    adv_sof_rent_m_valuation:        { label: 'Valuation of the Property (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 8A - Source of Funds - Rental Property (Myself)', multi: false },
    adv_sof_rent_m_bank_stmt:        { label: 'Bank statement showing receipt of funds (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 8A - Source of Funds - Rental Property (Myself)', multi: false },
    adv_sof_rent_m_accountant_letter:{ label: 'Signed letter from chartered accountant — Rental (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 8A - Source of Funds - Rental Property (Myself)', multi: false },
    adv_sof_rent_m_invoices:         { label: 'Rental Invoices (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 8A - Source of Funds - Rental Property (Myself)', multi: false },

    // ── Source: Rental Sponsor (Annexture 8B) ──
    adv_sof_rent_s_lease:            { label: 'Lease agreement (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 8B - Source of Funds - Rental Property (Sponsor)', multi: false, subHeading: 'Rent / Lease Income' },
    adv_sof_rent_s_deed:             { label: 'Deed of the property (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 8B - Source of Funds - Rental Property (Sponsor)', multi: false },
    adv_sof_rent_s_valuation:        { label: 'Valuation of the Property (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 8B - Source of Funds - Rental Property (Sponsor)', multi: false },
    adv_sof_rent_s_bank_stmt:        { label: 'Bank statement showing receipt of funds (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 8B - Source of Funds - Rental Property (Sponsor)', multi: false },
    adv_sof_rent_s_accountant_letter:{ label: 'Signed letter from chartered accountant — Rental (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 8B - Source of Funds - Rental Property (Sponsor)', multi: false },
    adv_sof_rent_s_invoices:         { label: 'Rental Invoices (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 8B - Source of Funds - Rental Property (Sponsor)', multi: false },

    // ── Source: EPF Myself (Annexture 9A) ──
    adv_sof_epf_m_contract:         { label: 'Employment contract — EPF Link (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 9A - Source of Funds - Employment link to EPF (Myself)', multi: false, subHeading: 'Employment Linked to Provident Fund' },
    adv_sof_epf_m_salary_slips:     { label: 'Last 6 months salary slips — EPF Link (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 9A - Source of Funds - Employment link to EPF (Myself)', multi: false },
    adv_sof_epf_m_service_letter:   { label: 'Service letter — EPF Link (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 9A - Source of Funds - Employment link to EPF (Myself)', multi: false },
    adv_sof_epf_m_closing_stmt:     { label: 'Copy of closing statement of Fund (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 9A - Source of Funds - Employment link to EPF (Myself)', multi: false },
    adv_sof_epf_m_balance_letter:   { label: 'Letter confirming the Balance — EPF (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 9A - Source of Funds - Employment link to EPF (Myself)', multi: false },
    adv_sof_epf_m_bank_stmt:        { label: 'Bank statement if fund withdrawn — EPF (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 9A - Source of Funds - Employment link to EPF (Myself)', multi: false },
    adv_sof_epf_m_accountant_letter:{ label: 'Signed letter from chartered accountant — EPF (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 9A - Source of Funds - Employment link to EPF (Myself)', multi: false },
    adv_sof_epf_m_epf_balance:      { label: 'EPF/ETF — Balance confirmation (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 9A - Source of Funds - Employment link to EPF (Myself)', multi: false },
    adv_sof_epf_m_epf_contrib:      { label: 'EPF/ETF — Contribution History report (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 9A - Source of Funds - Employment link to EPF (Myself)', multi: false },
    adv_sof_epf_m_receival_proof:   { label: 'Docs to prove receival of EPF/ETF (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 9A - Source of Funds - Employment link to EPF (Myself)', multi: false },

    // ── Source: EPF Sponsor (Annexture 9B) ──
    adv_sof_epf_s_contract:         { label: 'Employment contract — EPF Link (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 9B - Source of Funds - Employment link to EPF (Sponsor)', multi: false, subHeading: 'Employment Linked to Provident Fund' },
    adv_sof_epf_s_salary_slips:     { label: 'Last 6 months salary slips — EPF Link (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 9B - Source of Funds - Employment link to EPF (Sponsor)', multi: false },
    adv_sof_epf_s_service_letter:   { label: 'Service letter — EPF Link (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 9B - Source of Funds - Employment link to EPF (Sponsor)', multi: false },
    adv_sof_epf_s_closing_stmt:     { label: 'Copy of closing statement of Fund (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 9B - Source of Funds - Employment link to EPF (Sponsor)', multi: false },
    adv_sof_epf_s_balance_letter:   { label: 'Letter confirming the Balance — EPF (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 9B - Source of Funds - Employment link to EPF (Sponsor)', multi: false },
    adv_sof_epf_s_bank_stmt:        { label: 'Bank statement if fund withdrawn — EPF (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 9B - Source of Funds - Employment link to EPF (Sponsor)', multi: false },
    adv_sof_epf_s_accountant_letter:{ label: 'Signed letter from chartered accountant — EPF (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 9B - Source of Funds - Employment link to EPF (Sponsor)', multi: false },
    adv_sof_epf_s_epf_balance:      { label: 'EPF/ETF — Balance confirmation (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 9B - Source of Funds - Employment link to EPF (Sponsor)', multi: false },
    adv_sof_epf_s_epf_contrib:      { label: 'EPF/ETF — Contribution History report (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 9B - Source of Funds - Employment link to EPF (Sponsor)', multi: false },
    adv_sof_epf_s_receival_proof:   { label: 'Docs to prove receival of EPF/ETF (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 9B - Source of Funds - Employment link to EPF (Sponsor)', multi: false },

    // ── Source: Other Myself (Annexture 10A) — all sub-items ──
    adv_sof_oth_m_prop_deed_orig:  { label: 'Sale of Property — Transfer deeds original (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false, subHeading: 'Other Sources' },
    adv_sof_oth_m_prop_deed_trans: { label: 'Sale of Property — Transfer deeds (Translation) (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_prop_sale_agree: { label: 'Sale of Property — Sales agreement (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_prop_valuation:  { label: 'Sale of Property — Land Valuation Report (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_prop_bank_stmt:  { label: 'Sale of Property — Bank statement showing receipt (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_veh_book:        { label: 'Sale of Vehicle — Vehicle book / Transfer agreement (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_veh_valuation:   { label: 'Sale of Vehicle — Valuation Report (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_veh_sale_agree:  { label: 'Sale of Vehicle — Sales agreement (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_veh_bank_stmt:   { label: 'Sale of Vehicle — Bank statement showing receipt (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_gold_purchase:   { label: 'Sale of Gold — Purchase Invoice (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_gold_sale:       { label: 'Sale of Gold — Sale Invoice (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_gold_valuation:  { label: 'Sale of Gold — Valuation Report (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_gold_bank_stmt:  { label: 'Sale of Gold — Bank statement showing receipt (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_inherit_probate: { label: 'Inheritance — Grant of Probate (will) (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_inherit_valuation:{ label: 'Inheritance — Valuation report (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_inherit_lawyer:  { label: 'Inheritance — Letter from lawyer/accountant (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_gift_donor_letter:{ label: 'Gift of Money — Letter from donor (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_gift_lawyer:     { label: 'Gift of Money — Letter from lawyer/accountant (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_gift_bank_stmt:  { label: 'Gift of Money — Bank statement showing receipt (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_giftprop_donor:  { label: 'Gift of Property/Gold — Letter from donor (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_giftprop_lawyer: { label: 'Gift of Property/Gold — Letter from lawyer (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_giftprop_deed:   { label: 'Gift of Property/Gold — Transfer deed (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_lottery_voucher: { label: 'Lottery/Betting — Commission voucher confirming win (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },
    adv_sof_oth_m_lottery_bank_stmt:{ label: 'Lottery/Betting — Bank statement showing receipt (Myself)', sectionId: 'docSection_sourceMyself', spFolder: 'Annexture 10A - Source of Funds - Other (Myself)', multi: false },

    // ── Source: Other Sponsor (Annexture 10B) ──
    adv_sof_oth_s_prop_deed_orig:  { label: 'Sale of Property — Transfer deeds original (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false, subHeading: 'Other Sources' },
    adv_sof_oth_s_prop_deed_trans: { label: 'Sale of Property — Transfer deeds (Translation) (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_prop_sale_agree: { label: 'Sale of Property — Sales agreement (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_prop_valuation:  { label: 'Sale of Property — Land Valuation Report (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_prop_bank_stmt:  { label: 'Sale of Property — Bank statement showing receipt (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_veh_book:        { label: 'Sale of Vehicle — Vehicle book / Transfer agreement (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_veh_valuation:   { label: 'Sale of Vehicle — Valuation Report (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_veh_sale_agree:  { label: 'Sale of Vehicle — Sales agreement (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_veh_bank_stmt:   { label: 'Sale of Vehicle — Bank statement showing receipt (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_gold_purchase:   { label: 'Sale of Gold — Purchase Invoice (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_gold_sale:       { label: 'Sale of Gold — Sale Invoice (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_gold_valuation:  { label: 'Sale of Gold — Valuation Report (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_gold_bank_stmt:  { label: 'Sale of Gold — Bank statement showing receipt (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_inherit_probate: { label: 'Inheritance — Grant of Probate (will) (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_inherit_valuation:{ label: 'Inheritance — Valuation report (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_inherit_lawyer:  { label: 'Inheritance — Letter from lawyer/accountant (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_gift_donor_letter:{ label: 'Gift of Money — Letter from donor (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_gift_lawyer:     { label: 'Gift of Money — Letter from lawyer/accountant (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_gift_bank_stmt:  { label: 'Gift of Money — Bank statement showing receipt (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_giftprop_donor:  { label: 'Gift of Property/Gold — Letter from donor (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_giftprop_lawyer: { label: 'Gift of Property/Gold — Letter from lawyer (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_giftprop_deed:   { label: 'Gift of Property/Gold — Transfer deed (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_lottery_voucher: { label: 'Lottery/Betting — Commission voucher confirming win (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
    adv_sof_oth_s_lottery_bank_stmt:{ label: 'Lottery/Betting — Bank statement showing receipt (Sponsor)', sectionId: 'docSection_sourceSponsor', spFolder: 'Annexture 10B - Source of Funds - Other (Sponsor)', multi: false },
};

// ── Track uploaded files: { fieldName: [{ documentId, fileName }] } ──
var _uploadedDocs = {};
var _uploadCounter = 0;
var _uploadInProgress = 0;

/**
 * Creates the HTML for a single upload item.
 */
function createUploadItemHtml(fieldName, config, index) {
    var accept = config.accept || '.pdf,.jpg,.jpeg,.png,.docx';
    var uniqueId = fieldName + '_' + index;
    var html = '<div class="doc-upload-item" id="upload_' + uniqueId + '" data-field="' + fieldName + '" data-sp-folder="' + (config.spFolder || '') + '">';
    if (index === 0) {
        html += '<label class="question-label' + (config.required !== false ? ' mandatory' : '') + '">' + escapeHtml(config.label) + '</label>';
        if (config.helpText) html += '<p class="help-text">' + config.helpText + '</p>';
    } else {
        html += '<label class="question-label" style="font-size:0.9rem;color:#555;">' + escapeHtml(config.label) + ' — File ' + (index + 1) + '</label>';
    }
    html += '<div class="upload-area">';
    html += '<input type="file" class="doc-file-input" data-field-name="' + fieldName + '" data-upload-index="' + index + '" accept="' + accept + '">';
    html += '<div class="upload-status"></div>';
    html += '</div>';
    if (index > 0) {
        html += '<button type="button" class="btn-remove-upload" onclick="removeUploadSlot(\'' + uniqueId + '\')" style="background:none;border:none;color:#dc3545;cursor:pointer;font-size:0.8rem;margin-top:4px;">✕ Remove this slot</button>';
    }
    html += '</div>';
    return html;
}

/**
 * Main function: generates all upload fields based on admin data.
 * Call this after form data is loaded.
 */
function setupSupportingDocuments() {
    var adminData = FormContext.adminResponse || {};
    var lastSubHeading = {};

    // 1. Generate always-required documents
    var requiredSection = document.getElementById('docSection_required');
    if (requiredSection) {
        ALWAYS_REQUIRED_DOCS.forEach(function(doc) {
            requiredSection.insertAdjacentHTML('beforeend', createUploadItemHtml(doc.fieldName, doc, 0));
            if (doc.multi) {
                requiredSection.insertAdjacentHTML('beforeend',
                    '<button type="button" class="btn-add-another" data-field="' + doc.fieldName + '" onclick="addAnotherFile(\'' + doc.fieldName + '\')" style="background:none;border:1px dashed #2e86c1;color:#2e86c1;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:0.85rem;margin:0 0 15px 0;">+ Add another file</button>');
            }
        });
    }

    // 2. Generate conditional documents
    var sectionsShown = {};
    Object.keys(CONDITIONAL_DOC_CONFIG).forEach(function(adminField) {
        var val = adminData[adminField];
        if (val !== true && val !== 'yes' && val !== 'on' && val !== 'Yes') return;

        var config = CONDITIONAL_DOC_CONFIG[adminField];
        var section = document.getElementById(config.sectionId);
        if (!section) return;

        // Show the section
        section.style.display = '';
        sectionsShown[config.sectionId] = true;

        // Add sub-heading if this is the first item in a new sub-group
        if (config.subHeading && lastSubHeading[config.sectionId] !== config.subHeading) {
            lastSubHeading[config.sectionId] = config.subHeading;
            section.insertAdjacentHTML('beforeend',
                '<h4 class="doc-sub-heading" style="margin:20px 0 10px;color:var(--primary-color,#1a5276);font-size:0.95rem;border-bottom:1px solid #dee2e6;padding-bottom:6px;">' + config.subHeading + '</h4>');
        }

        // Create upload item
        var docFieldName = 'doc_' + adminField.replace('adv_', '');
        var uploadConfig = Object.assign({}, config, { required: true });
        section.insertAdjacentHTML('beforeend', createUploadItemHtml(docFieldName, uploadConfig, 0));

        // Add "add another" button for multi-upload items
        if (config.multi) {
            section.insertAdjacentHTML('beforeend',
                '<button type="button" class="btn-add-another" data-field="' + docFieldName + '" onclick="addAnotherFile(\'' + docFieldName + '\')" style="background:none;border:1px dashed #2e86c1;color:#2e86c1;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:0.85rem;margin:0 0 15px 0;">+ Add another file</button>');
        }
    });

    // 3. Set up file change handlers on all generated inputs
    document.querySelectorAll('.doc-file-input').forEach(function(input) {
        input.addEventListener('change', handleFileSelect);
    });

    // 4. Show count summary
    var conditionalCount = Object.keys(sectionsShown).length;
    console.log('Supporting documents setup complete. Required:', ALWAYS_REQUIRED_DOCS.length, 'Conditional sections shown:', conditionalCount);

     // Restore previously uploaded documents
     if (FormContext._loadedFormData && FormContext._loadedFormData.documents) {
         restoreUploadedDocuments(FormContext._loadedFormData.documents);
     }
}

/**
 * Adds another file upload slot for multi-upload items.
 */
function addAnotherFile(fieldName) {
    _uploadCounter++;
    var config = findDocConfig(fieldName);
    if (!config) return;

    var btn = document.querySelector('.btn-add-another[data-field="' + fieldName + '"]');
    if (!btn) return;

    var html = createUploadItemHtml(fieldName, config, _uploadCounter);
    btn.insertAdjacentHTML('beforebegin', html);

    // Attach event handler to the new input
    var newItem = document.getElementById('upload_' + fieldName + '_' + _uploadCounter);
    if (newItem) {
        var input = newItem.querySelector('.doc-file-input');
        if (input) input.addEventListener('change', handleFileSelect);
    }
}

/**
 * Removes an added upload slot.
 */
function removeUploadSlot(uniqueId) {
    var item = document.getElementById('upload_' + uniqueId);
    if (item) item.remove();
}

/**
 * Handles file selection on an upload input.
 */
async function handleFileSelect(e) {
    var file = e.target.files[0];
    if (!file) return;
 
    var input = e.target;
    var fieldName = input.getAttribute('data-field-name');
    var uploadArea = input.closest('.upload-area');
    var statusDiv = uploadArea ? uploadArea.querySelector('.upload-status') : null;
 
    // Get SP folder from the parent upload item
    var uploadItem = input.closest('.doc-upload-item');
    var spFolder = uploadItem ? (uploadItem.getAttribute('data-sp-folder') || '') : '';
 
    // Validate size (25MB)
    if (file.size > 25 * 1024 * 1024) {
        if (statusDiv) { statusDiv.innerHTML = '<span style="color:#dc3545;">&#10060; File too large. Maximum 25MB.</span>'; statusDiv.style.display = 'block'; }
        input.value = '';
        return;
    }
 
    // Validate type
    var ext = '.' + file.name.split('.').pop().toLowerCase();
    var allowedExts = (input.getAttribute('accept') || '.pdf,.jpg,.jpeg,.png,.docx').split(',');
    if (allowedExts.indexOf(ext) === -1) {
        if (statusDiv) { statusDiv.innerHTML = '<span style="color:#dc3545;">&#10060; Invalid file type. Accepted: ' + allowedExts.join(', ') + '</span>'; statusDiv.style.display = 'block'; }
        input.value = '';
        return;
    }
 
    // Upload to API → SharePoint
    if (statusDiv) {
        statusDiv.innerHTML = '<span style="color:#856404;">&#8987; Uploading ' + escapeHtml(file.name) + ' to SharePoint...</span>';
        statusDiv.style.display = 'block';
    }
    input.disabled = true;
    _uploadInProgress++;
 
    try {
        var response = await fetch(
            FormConfig.apiUrl + '/form-data/' + FormContext.formInstanceId + '/documents',
            {
                method: 'POST',
                headers: {
                    'X-Field-Name': fieldName,
                    'X-File-Name': encodeURIComponent(file.name),
                    'X-SP-Folder': encodeURIComponent(spFolder),
                    'Content-Type': file.type || 'application/octet-stream'
                },
                body: file
            }
        );
 
        if (response.ok) {
            var result = await response.json();
 
            // Track the upload
            if (!_uploadedDocs[fieldName]) _uploadedDocs[fieldName] = [];
            _uploadedDocs[fieldName].push({
                documentId: result.documentId,
                fileName: result.fileName,
                fileSize: result.fileSize
            });
 
            // Show success with remove button
            if (statusDiv) {
                statusDiv.innerHTML =
                    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
                    '<span style="color:#155724;">&#9989; ' + escapeHtml(file.name) + ' (' + formatFileSize(file.size) + ') — Uploaded to SharePoint</span>' +
                    '<button type="button" onclick="removeUploadedDocument(\'' + fieldName + '\', \'' + result.documentId + '\', this)" style="background:none;border:1px solid #dc3545;color:#dc3545;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:0.8rem;">Remove</button>' +
                    '</div>';
                statusDiv.style.display = 'block';
            }
 
            // Hide the file input
            input.style.display = 'none';
            console.log('Document uploaded to SharePoint:', fieldName, result.documentId, file.name);
 
        } else {
            var errorData = await response.json().catch(function() { return {}; });
            throw new Error(errorData.message || 'Upload failed with status ' + response.status);
        }
 
    } catch (error) {
        console.error('Upload error for ' + fieldName + ':', error);
        if (statusDiv) {
            statusDiv.innerHTML = '<span style="color:#dc3545;">&#10060; Upload failed: ' + escapeHtml(error.message) + '</span>';
            statusDiv.style.display = 'block';
        }
        input.value = '';
        input.disabled = false;
    }
 
    _uploadInProgress--;
}

async function removeUploadedDocument(fieldName, documentId, buttonElement) {
    if (!FormContext.formInstanceId) return;
 
    var statusDiv = buttonElement.closest('.upload-status');
    var uploadArea = buttonElement.closest('.upload-area');
 
    buttonElement.disabled = true;
    buttonElement.textContent = 'Removing...';
 
    try {
        var response = await fetch(
            FormConfig.apiUrl + '/form-data/' + FormContext.formInstanceId + '/documents/' + documentId,
            { method: 'DELETE' }
        );
 
        if (response.ok || response.status === 204) {
            if (_uploadedDocs[fieldName]) {
                _uploadedDocs[fieldName] = _uploadedDocs[fieldName].filter(function(d) {
                    return d.documentId !== documentId;
                });
                if (_uploadedDocs[fieldName].length === 0) delete _uploadedDocs[fieldName];
            }
 
            if (uploadArea) {
                var input = uploadArea.querySelector('.doc-file-input');
                if (input) { input.value = ''; input.style.display = ''; input.disabled = false; }
            }
            if (statusDiv) { statusDiv.innerHTML = ''; statusDiv.style.display = 'none'; }
 
            console.log('Document removed:', fieldName, documentId);
        } else {
            throw new Error('Delete failed with status ' + response.status);
        }
    } catch (error) {
        console.error('Remove document error:', error);
        buttonElement.disabled = false;
        buttonElement.textContent = 'Remove';
        alert('Failed to remove document: ' + error.message);
    }
}
 
function restoreUploadedDocuments(documents) {
    if (!documents || !documents.length) return;
 
    documents.forEach(function(doc) {
        if (doc.uploadStatus === 3) return; // Skip failed/deleted
 
        var fieldName = doc.fieldName;
 
        if (!_uploadedDocs[fieldName]) _uploadedDocs[fieldName] = [];
        _uploadedDocs[fieldName].push({
            documentId: doc.documentId,
            fileName: doc.fileName,
            fileSize: doc.fileSize
        });
 
        var inputs = document.querySelectorAll('.doc-file-input[data-field-name="' + fieldName + '"]');
        if (inputs.length === 0) return;
 
        // Find the first input that doesn't already show an upload
        var targetInput = null;
        for (var i = 0; i < inputs.length; i++) {
            var area = inputs[i].closest('.upload-area');
            var status = area ? area.querySelector('.upload-status') : null;
            if (status && status.style.display !== 'block') { targetInput = inputs[i]; break; }
        }
        if (!targetInput) targetInput = inputs[0];
 
        var uploadArea = targetInput.closest('.upload-area');
        var statusDiv = uploadArea ? uploadArea.querySelector('.upload-status') : null;
 
        if (statusDiv) {
            statusDiv.innerHTML =
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
                '<span style="color:#155724;">&#9989; ' + escapeHtml(doc.fileName) + ' — In SharePoint</span>' +
                '<button type="button" onclick="removeUploadedDocument(\'' + fieldName + '\', \'' + doc.documentId + '\', this)" style="background:none;border:1px solid #dc3545;color:#dc3545;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:0.8rem;">Remove</button>' +
                '</div>';
            statusDiv.style.display = 'block';
        }
        targetInput.style.display = 'none';
    });
 
    console.log('Restored', documents.length, 'uploaded document indicators.');
}

/**
 * Finds the config for a document field name.
 */
function findDocConfig(fieldName) {
    // Check always-required
    for (var i = 0; i < ALWAYS_REQUIRED_DOCS.length; i++) {
        if (ALWAYS_REQUIRED_DOCS[i].fieldName === fieldName) return ALWAYS_REQUIRED_DOCS[i];
    }
    // Check conditional (doc_ prefix maps to adv_ prefix)
    var adminField = fieldName.replace('doc_', 'adv_');
    if (CONDITIONAL_DOC_CONFIG[adminField]) return CONDITIONAL_DOC_CONFIG[adminField];
    return null;
}

/**
 * Validates that all required documents have at least one file selected.
 * Returns true if valid, false otherwise.
 */
function validateDocumentUploads() {
    var missing = [];
    var adminData = FormContext.adminResponse || {};

    // Check always-required
    ALWAYS_REQUIRED_DOCS.forEach(function(doc) {
        if (!doc.required) return;
        var inputs = document.querySelectorAll('.doc-file-input[data-field-name="' + doc.fieldName + '"]');
        var hasFile = Array.from(inputs).some(function(input) { return input.files && input.files.length > 0; });
        // Also check if already uploaded (from _uploadedDocs)
        if (!hasFile && (!_uploadedDocs[doc.fieldName] || _uploadedDocs[doc.fieldName].length === 0)) {
            missing.push(doc.label);
        }
    });

    // Check conditional required
    Object.keys(CONDITIONAL_DOC_CONFIG).forEach(function(adminField) {
        var val = adminData[adminField];
        if (val !== true && val !== 'yes' && val !== 'on' && val !== 'Yes') return;

        var config = CONDITIONAL_DOC_CONFIG[adminField];
        var docFieldName = 'doc_' + adminField.replace('adv_', '');
        var inputs = document.querySelectorAll('.doc-file-input[data-field-name="' + docFieldName + '"]');
        var hasFile = Array.from(inputs).some(function(input) { return input.files && input.files.length > 0; });
        if (!hasFile && (!_uploadedDocs[docFieldName] || _uploadedDocs[docFieldName].length === 0)) {
            missing.push(config.label);
        }
    });

    if (missing.length > 0) {
        var errorDiv = document.getElementById('docValidationError');
        if (errorDiv) {
            errorDiv.innerHTML = '<strong>Please upload the following required documents before continuing:</strong><ul style="margin:8px 0 0 20px;">' +
                missing.map(function(m) { return '<li>' + escapeHtml(m) + '</li>'; }).join('') + '</ul>';
            errorDiv.style.display = 'block';
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return false;
    }

    var errorDiv = document.getElementById('docValidationError');
    if (errorDiv) errorDiv.style.display = 'none';
    return true;
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Resets all admin checkboxes to unchecked.
 * Called when a new form is loaded with no saved admin response.
 */
function resetAdminCheckboxes() {
    document.querySelectorAll('input[type="checkbox"][name^="adv_"]').forEach(function(cb) {
        cb.checked = false;
    });
    document.querySelectorAll('input[type="radio"][name^="adv_"]').forEach(function(r) {
        r.checked = false;
    });
    document.querySelectorAll('textarea[name^="adv_"]').forEach(function(t) {
        t.value = '';
    });
    console.log('Admin checkboxes reset (no saved data).');
}

/**
 * Makes sections collapsible by wrapping their content.
 * Call after all dynamic content is generated.
 * Targets: .checklist-section (admin stage) and .doc-section (supporting docs)
 */
function setupCollapsibleSections() {
    var selectors = '.checklist-section, .doc-section';
    document.querySelectorAll(selectors).forEach(function(section) {
        // Skip if already set up or hidden
        if (section.classList.contains('collapsible-ready')) return;
        if (section.style.display === 'none') return;
        section.classList.add('collapsible-ready');

        // Find the title element
        var title = section.querySelector('h3, .checklist-section-title, .doc-section-title');
        if (!title) return;

        // Wrap everything after the title into a collapsible body
        var body = document.createElement('div');
        body.className = 'collapsible-body';

        // Move all siblings after the title into the body
        var sibling = title.nextElementSibling;
        while (sibling) {
            var next = sibling.nextElementSibling;
            body.appendChild(sibling);
            sibling = next;
        }
        section.appendChild(body);

        // Make the title a clickable header
        title.classList.add('collapsible-header');
        var icon = document.createElement('span');
        icon.className = 'collapse-icon';
        icon.innerHTML = '▾';
        title.appendChild(icon);

        // Toggle on click
        title.addEventListener('click', function() {
            var isCollapsed = body.classList.toggle('collapsed');
            icon.classList.toggle('collapsed', isCollapsed);
        });
    });

    console.log('Collapsible sections initialized.');
}

/* ── EXPORT ───────────────────────────────── */

window.FormUtils = {
    getTokenFromUrl: getTokenFromUrl, validateToken: validateToken, validateKeyWithApi: validateKeyWithApi,
    showTokenError: showTokenError, showErrorPage: showErrorPage,
    saveDraft: saveDraft, loadDraft: loadDraft, clearDraft: clearDraft,
    collectFormData: collectFormData, restoreFormData: restoreFormData, loadFormDataFromApi: loadFormDataFromApi,
    makeStageReadOnly: makeStageReadOnly, applyRoleBasedRendering: applyRoleBasedRendering,
    handleAdminSaveAndCloseAction: handleAdminSaveAndCloseAction,
    nextSection: nextSection, prevSection: prevSection, goToSection: goToSection,
    validateSection: validateSection, validateEmail: validateEmail, validatePhone: validatePhone,
    submitForm: submitForm, showSuccessPage: showSuccessPage, formatDate: formatDate,
    setDefaultDates: setDefaultDates, setupConditionalField: setupConditionalField,
    initForm: initForm, submitToApi: submitToApi, ALWAYS_REQUIRED_DOCS: ALWAYS_REQUIRED_DOCS,
    CONDITIONAL_DOC_CONFIG: CONDITIONAL_DOC_CONFIG, setupSupportingDocuments: setupSupportingDocuments,
    addAnotherFile: addAnotherFile, removeUploadSlot: removeUploadSlot,
    validateDocumentUploads: validateDocumentUploads, resetAdminCheckboxes: resetAdminCheckboxes, setupCollapsibleSections: setupCollapsibleSections,
    restoreUploadedDocuments: restoreUploadedDocuments, FormConfig: FormConfig, FormContext: FormContext, 
};

window.addAnotherFile = addAnotherFile;
window.removeUploadSlot = removeUploadSlot;
window.removeUploadedDocument = removeUploadedDocument;