/* ============================================
   VISA ADVISORY FORMS - SHARED UTILITIES
   ============================================ */

const FormConfig = {
    apiUrl: 'http://localhost:7071/api',
    submitEndpoint: 'YOUR_POWER_AUTOMATE_HTTP_TRIGGER_URL',
    autoSaveInterval: 30000,
    tokenParam: 'key',
    adminStage: 0,
    autoSaveDebounceMs: 3000,
    autoSaveRetryMax: 3,
    autoSaveRetryBaseMs: 1000
};

const FormContext = {
    isValid: false, role: '', formInstanceId: '', formTemplateId: '',
    contactId: '', caseId: '', currentStatus: 0, currentPage: 1,
    templateName: '', totalPages: 0, adminPages: 1, version: 1,
    accessKey: '', adminResponse: null, userResponse: null, lastSavedAt: null
};

var _autoSaveTimer = null;
var _saveInProgress = false;
var _lastSavedData = null;
var _currentStageRef = null;

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

                // Navigate to last saved stage if resuming, otherwise first user stage
                var targetStage = firstUserStage;
                if (FormContext.currentPage > 0 && stageOrder.indexOf(FormContext.currentPage) >= 0) {
                    targetStage = FormContext.currentPage;
                }
                navigateToStageFn(targetStage);

                // Show resume notification if there's saved data
                if (FormContext.lastSavedAt && FormContext.userResponse) {
                    var savedDate = new Date(FormContext.lastSavedAt);
                    var formattedDate = savedDate.toLocaleDateString('en-NZ', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });
                    var resumeBanner = document.createElement('div');
                    resumeBanner.id = 'resumeBanner';
                    resumeBanner.style.cssText = 'background:#e8f4fd;border:1px solid #b8daff;border-radius:6px;padding:12px 20px;margin:10px 0 20px 0;display:flex;align-items:center;justify-content:space-between;gap:10px;';
                    resumeBanner.innerHTML = '<span style="color:#0056b3;font-size:0.9rem;">&#128190; Continuing from your saved draft (' + formattedDate + ')</span><button type="button" onclick="this.parentElement.remove()" style="background:none;border:none;color:#0056b3;cursor:pointer;font-size:1.1rem;">&times;</button>';
                    var fc = document.querySelector('.form-content');
                    if (fc) { fc.insertBefore(resumeBanner, fc.firstChild); setTimeout(function() { var rb = document.getElementById('resumeBanner'); if (rb) rb.remove(); }, 10000); }
                }
            }

            console.log('User view: Advisor Assessment locked, user stages editable.');
        }
    }
}

/* ══════════════════════════════════════════════
   AUTO-SAVE TO DATAVERSE API (Debounced)
   ══════════════════════════════════════════════ */

function createSaveIndicator() {
    if (document.getElementById('apiSaveIndicator')) return;
    var indicator = document.createElement('div');
    indicator.id = 'apiSaveIndicator';
    indicator.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:10px 18px;border-radius:8px;font-size:0.85rem;font-weight:500;z-index:9999;transition:all 0.3s ease;opacity:0;pointer-events:none;display:flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
    document.body.appendChild(indicator);
    if (!document.getElementById('saveIndicatorStyles')) {
        var style = document.createElement('style');
        style.id = 'saveIndicatorStyles';
        style.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
    }
}

function updateSaveIndicator(state) {
    var el = document.getElementById('apiSaveIndicator');
    if (!el) return;
    el.style.pointerEvents = 'none';
    el.onclick = null;
    if (state === 'saving') {
        el.style.cssText += 'background:#fff3cd;color:#856404;border:1px solid #ffc107;opacity:1;';
        el.innerHTML = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#856404;animation:spin 1s linear infinite"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> Saving...';
    } else if (state === 'saved') {
        el.style.cssText += 'background:#d4edda;color:#155724;border:1px solid #c3e6cb;opacity:1;';
        el.innerHTML = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#155724"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Saved';
        setTimeout(function() { el.style.opacity = '0'; }, 3000);
    } else if (state === 'failed') {
        el.style.cssText += 'background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;opacity:1;pointer-events:auto;cursor:pointer;';
        el.innerHTML = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#721c24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg> Save failed — click to retry';
        el.onclick = function() { el.style.pointerEvents = 'none'; triggerApiSaveNow(); };
    } else if (state === 'conflict') {
        el.style.cssText += 'background:#fff3cd;color:#856404;border:1px solid #ffc107;opacity:1;pointer-events:auto;cursor:pointer;';
        el.innerHTML = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#856404"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg> Data updated elsewhere — click to reload';
        el.onclick = function() { window.location.reload(); };
    } else {
        el.style.opacity = '0';
    }
}

async function saveToApi(formElement, retryCount) {
    if (!FormContext.formInstanceId || !FormContext.isValid) return;
    if (FormContext.role === 'admin') return;
    if (_saveInProgress) return;
    retryCount = retryCount || 0;

    var currentData = collectFormData(formElement);
    var currentJson = JSON.stringify(currentData);
    if (currentJson === _lastSavedData) { return; }

    _saveInProgress = true;
    updateSaveIndicator('saving');

    try {
        var currentStage = _currentStageRef ? _currentStageRef() : FormContext.currentPage;
        var response = await fetch(FormConfig.apiUrl + '/form-data/' + FormContext.formInstanceId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: FormContext.version,
                currentPage: currentStage,
                pages: currentData,
                isAdminSave: false
            })
        });

        if (response.ok) {
            var result = await response.json();
            FormContext.version = result.version;
            FormContext.lastSavedAt = result.savedAt;
            _lastSavedData = currentJson;
            updateSaveIndicator('saved');
            console.log('Auto-saved. Version:', result.version);
            try { localStorage.setItem(getStorageKey('API_BACKUP'), currentJson); } catch (e) {}
        } else if (response.status === 409) {
            var conflictData = await response.json().catch(function() { return {}; });
            FormContext.version = conflictData.serverVersion || FormContext.version;
            updateSaveIndicator('conflict');
        } else {
            throw new Error('Save failed: ' + response.status);
        }
    } catch (error) {
        console.error('Auto-save error (attempt ' + (retryCount + 1) + '):', error);
        if (retryCount < FormConfig.autoSaveRetryMax) {
            var delay = FormConfig.autoSaveRetryBaseMs * Math.pow(2, retryCount);
            setTimeout(function() { _saveInProgress = false; saveToApi(formElement, retryCount + 1); }, delay);
            return;
        }
        updateSaveIndicator('failed');
        try { localStorage.setItem(getStorageKey('FAILED_SAVE'), currentJson); } catch (e) {}
    }
    _saveInProgress = false;
}

function debouncedApiSave(formElement) {
    if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(function() { saveToApi(formElement, 0); }, FormConfig.autoSaveDebounceMs);
}

function triggerApiSaveNow() {
    if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
    var form = document.querySelector('form');
    if (form) saveToApi(form, 0);
}

function setupApiAutoSave(formElement, getCurrentStageFn) {
    _currentStageRef = getCurrentStageFn;
    createSaveIndicator();

    formElement.querySelectorAll('input, select, textarea').forEach(function(el) {
        if (el.disabled) return;
        var eventType = (el.type === 'text' || el.type === 'email' || el.type === 'tel' ||
                         el.type === 'number' || el.tagName === 'TEXTAREA') ? 'input' : 'change';
        el.addEventListener(eventType, function() { debouncedApiSave(formElement); });
    });

    window.addEventListener('beforeunload', function() {
        if (_autoSaveTimer) {
            clearTimeout(_autoSaveTimer);
            try {
                var data = collectFormData(formElement);
                var stage = _currentStageRef ? _currentStageRef() : FormContext.currentPage;
                navigator.sendBeacon(
                    FormConfig.apiUrl + '/form-data/' + FormContext.formInstanceId,
                    new Blob([JSON.stringify({ version: FormContext.version, currentPage: stage, pages: data, isAdminSave: false })], { type: 'application/json' })
                );
            } catch (e) {}
        }
    });

    console.log('API auto-save initialized. Debounce:', FormConfig.autoSaveDebounceMs + 'ms');
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
    var fieldsToTrigger = [];

    Object.keys(data).forEach(function(key) {
        var field = formElement.elements[key];
        if (!field) return;

        if (field instanceof RadioNodeList) {
            var radio = formElement.querySelector('input[name="' + key + '"][value="' + data[key] + '"]');
            if (radio) { radio.checked = true; fieldsToTrigger.push(radio); }
        } else if (field.type === 'checkbox') {
            field.checked = data[key] === true || data[key] === 'on' || data[key] === 'Yes';
            fieldsToTrigger.push(field);
        } else if (field.type === 'radio') {
            var radio = formElement.querySelector('input[name="' + key + '"][value="' + data[key] + '"]');
            if (radio) { radio.checked = true; fieldsToTrigger.push(radio); }
        } else if (field.tagName === 'SELECT' || field.type === 'text' || field.type === 'email' ||
                   field.type === 'tel' || field.type === 'date' || field.type === 'number') {
            field.value = data[key];
            fieldsToTrigger.push(field);
        } else if (field.tagName === 'TEXTAREA') {
            field.value = data[key];
            fieldsToTrigger.push(field);
        }
    });

    // Fire change events AFTER all values are set,
    // so conditional logic sees the complete state
    setTimeout(function() {
        fieldsToTrigger.forEach(function(field) {
            field.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }, 50);
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
        if (FormContext.adminResponse) { restoreFormData(FormContext.adminResponse, formElement); console.log('Restored admin responses.'); }
        if (FormContext.userResponse) { restoreFormData(FormContext.userResponse, formElement); console.log('Restored user responses.'); }
        if (!FormContext.userResponse && !FormContext.adminResponse) { loadDraft(formCode, formElement); }
        setInterval(function() { saveDraft(formCode, formElement); }, FormConfig.autoSaveInterval);
        formElement.querySelectorAll('input, select, textarea').forEach(function(el) { el.addEventListener('change', function() { saveDraft(formCode, formElement); }); });
    }

    setDefaultDates();
    console.log('Form initialized. Role:', FormContext.role, 'Status:', FormContext.currentStatus);
    return true;
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
    initForm: initForm, FormConfig: FormConfig, FormContext: FormContext, saveToApi: saveToApi, 
    debouncedApiSave: debouncedApiSave, triggerApiSaveNow: triggerApiSaveNow,
    setupApiAutoSave: setupApiAutoSave, createSaveIndicator: createSaveIndicator,
};