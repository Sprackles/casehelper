// ==UserScript==
// @name         Case Info Helper (Salesforce Edition v0.7.3)
// @namespace    http://tampermonkey.net/
// @version      0.7.3
// @description  Adds Citadel (background tab) and Open Parent Case (in-app) actions
// @match        *://*/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.addValueChangeListener
// @grant        GM.openInTab
// ==/UserScript==

;(async function(){
  'use strict';

  const fields     = ['First','Last','Phone','Email','DBA','Title','MID','SN','Parent Case','Issue'];
  const storageKey = 'caseInfo';
  let savedData    = await GM.getValue(storageKey, {});

  // Auto-populate Parent Case from Salesforce URL
  (function(){
    if(!savedData['Parent Case']){
      const match = location.pathname.match(/\/lightning\/r\/Case\/([A-Za-z0-9]{15,18})\//);
      const id = match
        ? match[1]
        : new URLSearchParams(location.search).get('id') || '';
      if(id) savedData['Parent Case'] = id;
    }
  })();

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #caseHelperToggle {
      position:fixed; bottom:20px; right:20px;
      width:42px; height:42px; border-radius:50%;
      background:#007bff; color:#fff; font-size:20px;
      display:flex; align-items:center; justify-content:center;
      border:none; cursor:pointer; z-index:10000;
    }
    #caseHelperPanel {
      position:fixed; bottom:20px; right:70px;
      max-width:280px; background:rgba(0,0,0,0.85); color:#fff;
      font-family:sans-serif; font-size:12px;
      border-radius:8px; padding:8px; z-index:9999;
      display:none; max-height:80vh; overflow-y:auto;
    }
    #caseHelperPanel input,
    #caseHelperPanel textarea {
      font-size:12px; width:100%; margin:6px 0; padding:6px;
      background:#222; color:#fff; border:1px solid #555;
      border-radius:4px; box-sizing:border-box;
    }
    #caseHelperPanel button {
      font-size:12px; width:100%; margin:6px 0; padding:6px;
      background:#0066cc; color:#fff; border:none;
      border-radius:4px; cursor:pointer; box-sizing:border-box;
    }
    #caseHelperPanel button:hover {
      background:#0054a6;
    }
    .fieldBox {
      display:flex; justify-content:space-between;
      padding:4px 2px; border-bottom:1px solid #444;
    }
    .fieldLabel {
      font-weight:bold;
      margin-right: 8px;
    }
    #caseHelperPanel .ctxMenu {
      display:none; margin-bottom:6px;
    }
    #caseHelperPanel .ctxMenu button {
      background:#444; margin:2px 0;
    }
  `;
  document.head.appendChild(style);

  // Build toggle & panel
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'caseHelperToggle';
  toggleBtn.textContent = '⚙️';
  toggleBtn.title = 'Toggle Case Helper';
  document.body.appendChild(toggleBtn);

  const panel = document.createElement('div');
  panel.id = 'caseHelperPanel';
  document.body.appendChild(panel);

  const form    = document.createElement('form');
  const summary = document.createElement('div');
  const ctxToggle = document.createElement('button');
  ctxToggle.className = 'ctxToggle';
  ctxToggle.textContent = 'More';

  const ctxMenu = document.createElement('div');
  ctxMenu.className = 'ctxMenu';

  // 1. Citadel (background tab)
  const citadelBtn = document.createElement('button');
  citadelBtn.type = 'button';
  citadelBtn.textContent = 'Citadel';
  citadelBtn.onclick = () => {
    const sn = savedData['SN'];
    if (sn) {
      GM.openInTab(`https://citadel.shift4.com/s${encodeURIComponent(sn)}`, { active: false });
    } else {
      alert('SN not set');
    }
  };
  ctxMenu.appendChild(citadelBtn);

  // 2. Open Parent Case (same Salesforce tab)
  const openCaseBtn = document.createElement('button');
  openCaseBtn.type = 'button';
  openCaseBtn.textContent = 'Open Parent Case';
  openCaseBtn.onclick = () => {
    const pc = savedData['Parent Case'];
    if (pc) {
      // Navigate in current tab to Lightning case view
      window.location.href = `${window.location.origin}/lightning/r/Case/${encodeURIComponent(pc)}/view`;
    } else {
      alert('Parent Case not set');
    }
  };
  ctxMenu.appendChild(openCaseBtn);

  // 3–5. Placeholder actions
  ['Action 3','Action 4','Action 5'].forEach(label => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    ctxMenu.appendChild(btn);
  });

  // Render the form view
  function renderForm(){
    panel.innerHTML = '';
    panel.appendChild(ctxToggle);
    panel.appendChild(ctxMenu);

    form.innerHTML = '';
    fields.forEach(f => {
      const inp = document.createElement(f === 'Issue' ? 'textarea' : 'input');
      inp.placeholder = f;
      inp.name        = f;
      inp.value       = savedData[f] || '';
      form.appendChild(inp);
    });

    const notes = document.createElement('textarea');
    notes.placeholder = 'Notes…';
    notes.name        = 'Notes';
    notes.value       = savedData['Notes'] || '';
    form.appendChild(notes);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    form.appendChild(saveBtn);

    panel.appendChild(form);
  }

  // Render the summary view
  function renderSummary(){
    panel.innerHTML = '';
    panel.appendChild(ctxToggle);
    panel.appendChild(ctxMenu);

    summary.innerHTML = '';
    
    // XSS Fix applied here
    fields.concat('Notes').forEach(f => {
      const box = document.createElement('div');
      box.className = 'fieldBox';
      
      const labelSpan = document.createElement('span');
      labelSpan.className = 'fieldLabel';
      labelSpan.textContent = f + ':';
      
      const valueSpan = document.createElement('span');
      valueSpan.textContent = savedData[f] || '';
      
      box.appendChild(labelSpan);
      box.appendChild(valueSpan);
      summary.appendChild(box);
    });

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.type = 'button';
    editBtn.onclick = showForm;
    summary.appendChild(editBtn);

    const flushBtn = document.createElement('button');
    flushBtn.textContent = 'Flush';
    flushBtn.type = 'button';
    flushBtn.onclick = async () => {
      await GM.setValue(storageKey, {});
      savedData = {};
      showForm();
    };
    summary.appendChild(flushBtn);

    panel.appendChild(summary);
  }

  function showForm()    { renderForm(); }
  function showSummary() { renderSummary(); }

  // Save handler
  form.onsubmit = async e => {
    e.preventDefault();
    const data = {};
    fields.forEach(f => data[f] = form[f].value.trim());
    data.Notes = form.Notes.value.trim();
    await GM.setValue(storageKey, data);
    savedData = data;
    showSummary();
  };

  // Toggle panel visibility
  toggleBtn.onclick = () => {
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    if (panel.style.display === 'block') {
      Object.keys(savedData || {}).length ? showSummary() : showForm();
    }
  };

  // Hover logic for “More” menu
  [ctxToggle, ctxMenu].forEach(el => {
    el.addEventListener('mouseenter', () => {
      ctxToggle.style.display = 'none';
      ctxMenu.style.display = 'block';
    });
    el.addEventListener('mouseleave', e => {
      if (![ctxToggle, ctxMenu].some(o => o.contains(e.relatedTarget))) {
        ctxMenu.style.display = 'none';
        ctxToggle.style.display = 'block';
      }
    });
  });

  // Sync across tabs
  GM.addValueChangeListener(storageKey, (name, oldVal, newVal, remote) => {
    if (remote) {
      savedData = newVal;
      if (panel.style.display === 'block') {
        Object.keys(newVal || {}).length ? showSummary() : showForm();
      }
    }
  });

  // Initial render
  Object.keys(savedData || {}).length ? showSummary() : showForm();
})();
