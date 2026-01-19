document.addEventListener('DOMContentLoaded', () => {
    
    const ticketModal = document.getElementById("ticketModal");
    const accountModal = document.getElementById("accountSelectionModal");
    const dateModal = document.getElementById("dateSelectionModal");
    const openTicketBtn = document.getElementById("add-ticket-btn");
    const closeTicketX = document.querySelector(".close-modal-btn"); 
    const cancelTicketBtn = document.querySelector(".btn-new-cancel");
    const confirmTicketBtn = document.querySelector(".btn-new-confirm");
    const mainConfirmBtn = document.querySelector(".header-actions-group .action-btn:nth-child(2)"); 
    const closeDateX = document.querySelector(".close-date-modal-btn");
    const cancelDateBtn = document.querySelector(".close-date-action");
    const saveFinalBtn = document.getElementById("btn-save-final");
    const accountSelectBox = document.querySelector(".account-select-box");
    const selectText = document.querySelector(".select-text");
    const drInput = document.getElementById("dr-input");
    const crInput = document.getElementById("cr-input");
    const remarksInput = document.querySelector(".remarks-box");
    const transactionDateInput = document.getElementById("transaction-date-input");
    const accountItems = document.querySelectorAll(".account-item");
    const closeAccountX = document.querySelector(".close-select-modal-btn");
    const cancelAccountBtn = document.querySelector(".close-select-action");
    const entriesContainer = document.getElementById("entries-container");
    const emptyState = document.getElementById("empty-state-msg");
    const footer = document.getElementById("entries-footer");
    const footerLabel = document.querySelector(".sub-total-label");
    const totalDrEl = document.getElementById("total-dr");
    const totalCrEl = document.getElementById("total-cr");

    // State
    let selectedAccountName = "";
    let selectedBreadcrumb = "";
    let currentTotalDr = 0;
    let currentTotalCr = 0;
    let editingRow = null; 
    let editingDrVal = 0; 
    let editingCrVal = 0;
    let isEditMode = false;
    let originalTicketId = null;

    const editId = localStorage.getItem('winnolas_editing_id');
    if (editId) loadTicketForEditing(editId);

    // --- NEW: MODAL HELPER FUNCTION ---
    function showModal({ type, title, message, onConfirm }) {
        const modal = document.getElementById('globalModal');
        if (!modal) return;
        const box = modal.querySelector('.custom-modal-box');
        const icon = document.getElementById('modalIcon');
        const titleEl = document.getElementById('modalTitle');
        const descEl = document.getElementById('modalDesc');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        box.classList.remove('modal-success', 'modal-danger', 'modal-warning');
        cancelBtn.style.display = "block";

        if (type === 'danger') {
            box.classList.add('modal-danger');
            icon.className = "fa-solid fa-trash-can";
            confirmBtn.textContent = "Delete";
        } else if (type === 'warning') {
            box.classList.add('modal-warning');
            icon.className = "fa-solid fa-circle-exclamation";
            confirmBtn.textContent = "OK";
            cancelBtn.style.display = "none"; 
        } else {
            box.classList.add('modal-success');
            icon.className = "fa-solid fa-check";
            confirmBtn.textContent = "Confirm";
        }

        titleEl.textContent = title;
        descEl.innerHTML = message;
        modal.style.display = "flex";

        const newConfirm = confirmBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newConfirm.addEventListener('click', () => {
            if(onConfirm) onConfirm();
            modal.style.display = "none";
        });
        newCancel.addEventListener('click', () => {
            modal.style.display = "none";
        });
    }

    // --- REPLACED ALERTS WITH MODALS ---
    function loadTicketForEditing(id) {
        const allTickets = JSON.parse(localStorage.getItem('winnolas_tickets')) || [];
        const ticket = allTickets.find(t => t.id === id);
        if (!ticket) return; 

        isEditMode = true;
        originalTicketId = id;
        transactionDateInput.value = ticket.date; 

        if(emptyState) emptyState.style.display = "none";
        if(footer) footer.style.display = "flex";

        ticket.entries.forEach(entry => {
            const rowDiv = document.createElement("div");
            rowDiv.classList.add("entry-row");
            const drDisplay = entry.dr > 0 ? formatMoney(entry.dr) : "0.00";
            const crDisplay = entry.cr > 0 ? formatMoney(entry.cr) : "0.00";
            rowDiv.innerHTML = generateRowHTML(entry.account, entry.breadcrumb, drDisplay, crDisplay);
            attachRowEvents(rowDiv, entry.account, entry.breadcrumb, entry.dr, entry.cr, "");
            entriesContainer.appendChild(rowDiv);
            currentTotalDr += entry.dr;
            currentTotalCr += entry.cr;
        });
        updateFooterTotals();
    }

    // (Modal Open/Close Logic)
    if(openTicketBtn) openTicketBtn.addEventListener("click", () => { resetModalInputs(); ticketModal.style.display = "flex"; });
    const closeTicketModal = () => { ticketModal.style.display = "none"; resetModalInputs(); };
    if(closeTicketX) closeTicketX.addEventListener("click", closeTicketModal);
    if(cancelTicketBtn) cancelTicketBtn.addEventListener("click", closeTicketModal);
    if(accountSelectBox) accountSelectBox.addEventListener("click", () => accountModal.style.display = "flex");
    const closeAccountModal = () => accountModal.style.display = "none";
    if(closeAccountX) closeAccountX.addEventListener("click", closeAccountModal);
    if(cancelAccountBtn) cancelAccountBtn.addEventListener("click", closeAccountModal);
    const closeDateModal = () => { dateModal.style.display = "none"; document.getElementById("date-warning").style.display = "none"; };
    if(closeDateX) closeDateX.addEventListener("click", closeDateModal);
    if(cancelDateBtn) cancelDateBtn.addEventListener("click", closeDateModal);

    accountItems.forEach(item => {
        item.addEventListener("click", function() {
            selectedAccountName = this.getAttribute("data-name");
            selectedBreadcrumb = this.querySelector(".acc-bread").textContent;
            updateAccountUI(selectedAccountName);
            closeAccountModal();
        });
    });

    function updateAccountUI(name) {
        selectText.textContent = name;
        selectText.style.color = "#333";
        selectText.style.fontWeight = "700";
        accountSelectBox.style.borderColor = "#2e46cc";
        accountSelectBox.style.backgroundColor = "#f0fafd";
        const warning = document.querySelector(".warning-icon");
        if(warning) warning.style.display = "none";
    }

    if (drInput && crInput) {
        drInput.addEventListener("input", function() { if(this.value !== "") crInput.value = ""; });
        crInput.addEventListener("input", function() { if(this.value !== "") drInput.value = ""; });
    }

    // --- ADD/UPDATE ENTRY ---
    if(confirmTicketBtn) {
        confirmTicketBtn.addEventListener("click", () => {
            const drValue = parseFloat(drInput.value) || 0;
            const crValue = parseFloat(crInput.value) || 0;
            const remarksValue = remarksInput ? remarksInput.value : "";

            if(!selectedAccountName) { 
                showModal({ type: 'warning', title: 'Missing Account', message: 'Please select an account before proceeding.' });
                return; 
            }
            if(drValue === 0 && crValue === 0) { 
                showModal({ type: 'warning', title: 'Missing Amount', message: 'Please enter a Debit or Credit amount.' });
                return; 
            }
            processEntry(drValue, crValue, remarksValue);
        });
    }

    function processEntry(drValue, crValue, remarksValue) {
        if(emptyState) emptyState.style.display = "none";
        if(footer) footer.style.display = "flex";

        const drDisplay = drValue > 0 ? formatMoney(drValue) : "0.00";
        const crDisplay = crValue > 0 ? formatMoney(crValue) : "0.00";

        if (editingRow) {
            currentTotalDr -= editingDrVal;
            currentTotalCr -= editingCrVal;
            editingRow.innerHTML = generateRowHTML(selectedAccountName, selectedBreadcrumb, drDisplay, crDisplay);
            attachRowEvents(editingRow, selectedAccountName, selectedBreadcrumb, drValue, crValue, remarksValue);
        } else {
            const rowDiv = document.createElement("div");
            rowDiv.classList.add("entry-row");
            rowDiv.innerHTML = generateRowHTML(selectedAccountName, selectedBreadcrumb, drDisplay, crDisplay);
            attachRowEvents(rowDiv, selectedAccountName, selectedBreadcrumb, drValue, crValue, remarksValue);
            entriesContainer.appendChild(rowDiv);
        }

        currentTotalDr += drValue;
        currentTotalCr += crValue;
        updateFooterTotals();
        closeTicketModal();
    }

    // --- MAIN SAVE FLOW ---
    if(mainConfirmBtn) {
        mainConfirmBtn.addEventListener("click", () => {
            const rows = document.querySelectorAll(".entry-row");
            if(rows.length === 0) { 
                showModal({ type: 'warning', title: 'Empty Ticket', message: 'Please add at least one entry row.' });
                return; 
            }
            
            if(!isEditMode && !transactionDateInput.value) {
                const now = new Date();
                const localDate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                transactionDateInput.value = localDate;
            }
            dateModal.style.display = "flex";
        });
    }

    if(saveFinalBtn) {
        saveFinalBtn.addEventListener("click", () => {
            const dateVal = transactionDateInput.value;
            if(!dateVal) {
                document.getElementById("date-warning").style.display = "block";
                return;
            }
            
            showModal({
                type: 'success',
                title: 'Save Ticket?',
                message: `Are you sure you want to save this ticket for <b>${dateVal}</b>?`,
                onConfirm: () => {
                    saveTicketToLocalStorage(dateVal);
                }
            });
        });
    }

    function saveTicketToLocalStorage(dateString) {
        let allTickets = JSON.parse(localStorage.getItem('winnolas_tickets')) || [];
        const rows = document.querySelectorAll(".entry-row");
        const entriesData = [];
        rows.forEach(row => {
            const name = row.querySelector(".entry-name-line").childNodes[0].textContent.trim();
            const bread = row.querySelector(".entry-breadcrumb").textContent;
            const amounts = row.querySelectorAll(".amount-cell");
            const drTxt = amounts[0].textContent.replace(/,/g, '');
            const crTxt = amounts[1].textContent.replace(/,/g, '');
            entriesData.push({ account: name, breadcrumb: bread, dr: parseFloat(drTxt), cr: parseFloat(crTxt) });
        });

        const cleanDate = dateString.replace(/-/g, '');
        if (isEditMode) allTickets = allTickets.filter(t => t.id !== originalTicketId);

        const existingForDate = allTickets.filter(t => t.date === dateString);
        let maxSeq = 0;
        existingForDate.forEach(t => {
            const parts = t.id.split('-');
            if (parts.length > 1) { const seq = parseInt(parts[1], 10); if (!isNaN(seq) && seq > maxSeq) maxSeq = seq; }
        });
        const sequence = (maxSeq + 1).toString().padStart(3, '0');
        const finalTicketId = `${cleanDate}-${sequence}`;

        const newTicket = { id: finalTicketId, date: dateString, entries: entriesData, totalDr: currentTotalDr, totalCr: currentTotalCr };
        allTickets.push(newTicket);
        localStorage.setItem('winnolas_tickets', JSON.stringify(allTickets));
        localStorage.removeItem('winnolas_editing_id');
        window.location.href = "index.html";
    }

    function generateRowHTML(name, bread, drTxt, crTxt) {
        return `<div class="entry-details"><div class="entry-name-line">${name}<div class="entry-actions"><i class="fa-solid fa-pen-to-square action-icon edit-icon" title="Edit"></i><i class="fa-solid fa-trash-can action-icon delete-icon" title="Delete"></i></div></div><div class="entry-breadcrumb">${bread}</div></div><div class="entry-amounts"><div class="amount-cell">${drTxt}</div><div class="amount-cell">${crTxt}</div></div>`;
    }

    function attachRowEvents(rowElement, name, bread, drVal, crVal, remarks) {
        const editBtn = rowElement.querySelector(".edit-icon");
        const deleteBtn = rowElement.querySelector(".delete-icon");

        deleteBtn.addEventListener("click", () => {
            showModal({
                type: 'danger',
                title: 'Remove Entry?',
                message: `Remove <b>${name}</b> from this ticket?`,
                onConfirm: () => {
                    rowElement.remove();
                    currentTotalDr -= drVal;
                    currentTotalCr -= crVal;
                    updateFooterTotals();
                    if(entriesContainer.children.length === 1) { 
                        emptyState.style.display = "flex"; footer.style.display = "none";
                    }
                }
            });
        });

        editBtn.addEventListener("click", () => {
            editingRow = rowElement;
            editingDrVal = drVal;
            editingCrVal = crVal;
            selectedAccountName = name;
            selectedBreadcrumb = bread;
            updateAccountUI(name);
            if(drVal > 0) drInput.value = drVal;
            if(crVal > 0) crInput.value = crVal;
            if(remarksInput) remarksInput.value = remarks;
            confirmTicketBtn.innerHTML = '<i class="fa-solid fa-check"></i> Update';
            ticketModal.style.display = "flex";
        });
    }

    function updateFooterTotals() {
        totalDrEl.textContent = formatMoney(currentTotalDr);
        totalCrEl.textContent = formatMoney(currentTotalCr);
        const isBalanced = Math.abs(currentTotalDr - currentTotalCr) < 0.01;
        if (isBalanced && currentTotalDr > 0) { footer.classList.add("balanced"); footerLabel.textContent = "Sub Total (Balanced)"; } 
        else { footer.classList.remove("balanced"); footerLabel.textContent = "Sub Total (Unbalanced)"; }
    }

    function resetModalInputs() {
        editingRow = null; editingDrVal = 0; editingCrVal = 0;
        if(confirmTicketBtn) confirmTicketBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Entry';
        if(drInput) drInput.value = ""; if(crInput) crInput.value = ""; if(remarksInput) remarksInput.value = "";
        selectText.textContent = "No Account Selected"; selectText.style.color = "#7f8c8d"; selectText.style.fontWeight = "normal";
        accountSelectBox.style.borderColor = "#29b6f6"; accountSelectBox.style.backgroundColor = "#fff";
        const warning = document.querySelector(".warning-icon"); if(warning) warning.style.display = "inline-block";
        selectedAccountName = ""; selectedBreadcrumb = "";
    }

    function formatMoney(amount) { return amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }

    window.addEventListener("click", (e) => {
        if (e.target == ticketModal) closeTicketModal();
        if (e.target == accountModal) closeAccountModal();
        if (e.target == dateModal) closeDateModal();
        const globalModal = document.getElementById("globalModal");
        if (e.target == globalModal) globalModal.style.display = "none";
    });
});