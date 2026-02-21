<script>
    /** @typedef {import('$lib/types').Customer} Customer */
    /** @typedef {import('$lib/types').VatRate} VatRate */
    /** @typedef {import('$lib/types').JobSubmitHandler} JobSubmitHandler */
    /** @typedef {import('$lib/types').VoidHandler} VoidHandler */
    /** @typedef {import('$lib/types').CustomerLabelHandler} CustomerLabelHandler */

    /** @type {{ customers?: Customer[], vatRates?: VatRate[], onSubmit: JobSubmitHandler, onNewCustomer: VoidHandler, onEditCustomer: CustomerLabelHandler }} */
    let { 
        customers = [],
        vatRates = [],
        onSubmit,
        onNewCustomer,
        onEditCustomer
    } = $props();

    let selectedCustomer = $state('');
    let jobname = $state('');
    /** @type {number | string} */
    let quantity = $state('');
    let details = $state('');
    /** @type {number | string} */
    let amount = $state('');
    let producer = $state('');
    /** @type {number | string} */
    let vatRate = $state('');
    let error = $state('');
    let loading = $state(false);

    /** @param {number | string} value */
    function normalizeAmount(value) {
        const numericValue = Number(value);
        return Math.round((numericValue + Number.EPSILON) * 100) / 100;
    }

    function validateForm() {
        error = '';
        
        if (!selectedCustomer || selectedCustomer === '') {
            error = 'Bitte Kunde auswählen';
            return false;
        }
        
        if (!jobname.trim()) {
            error = 'Bitte Auftragsnamen eingeben';
            return false;
        }
        
        const numericQuantity = Number(quantity);
        if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
            error = 'Auflage muss größer als 0 sein';
            return false;
        }
        
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount < 0) {
            error = 'Betrag kann nicht negativ sein';
            return false;
        }
        
        if (!producer) {
            error = 'Bitte Produzent auswählen';
            return false;
        }
        
        if (vatRate === '' || vatRate === null || vatRate === undefined) {
            error = 'Bitte Mehrwertsteuersatz auswählen';
            return false;
        }
        
        return true;
    }

    async function handleSubmit() {
        if (!validateForm()) {
            return;
        }
        
        loading = true;
        error = '';
        
        try {
            // Finde den ausgewählten Kunden
            const customer = customers.find(c => c.id === selectedCustomer);
            const customerLabel = customer ? getCustomerLabel(customer) : selectedCustomer;
            
            await onSubmit({
                customerId: selectedCustomer,
                customer: customerLabel,
                jobname: jobname.trim(),
                quantity: Number(quantity),
                details: details.trim(),
                amount: normalizeAmount(amount),
                producer,
                vatRate: Number(vatRate)
            });
            
            // Reset form
            clearForm();
        } catch (err) {
            error = `Fehler beim Anlegen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`;
        } finally {
            loading = false;
        }
    }

    function clearForm() {
        selectedCustomer = '';
        jobname = '';
        quantity = '';
        details = '';
        amount = '';
        producer = '';
        vatRate = '';
        error = '';
    }

    function handleCustomerChange() {
        if (selectedCustomer === "Neuer Kunde") {
            onNewCustomer();
            selectedCustomer = '';
        }
    }

    function handleEditCustomer() {
        if (!selectedCustomer || selectedCustomer === 'Neuer Kunde') {
            error = 'Bitte zuerst einen bestehenden Kunden auswählen';
            return;
        }
        // Finde den Kunden anhand der ID und übergebe das Label
        const customer = customers.find(c => c.id === selectedCustomer);
        if (customer) {
            onEditCustomer(getCustomerLabel(customer));
        }
    }

    /** @param {Customer} customer */
    function getCustomerLabel(customer) {
        const company = customer.company?.trim();
        const firstName = customer.firstName?.trim() ?? '';
        const lastName = customer.lastName?.trim() ?? '';
        const contactName = [lastName, firstName].filter(Boolean).join(', ');

        if (company) {
            return contactName ? `${company} – ${contactName}` : company;
        }

        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
            return fullName;
        }
        return customer.companyName ?? '';
    }
</script>

<div class="job-form-container">
    <h2>Neuer Auftrag:</h2>
    {#if error}
        <p class="error">{error}</p>
    {/if}
    <div class="newJob">
        <div class="field field-customer">
            <label class="field-label" for="job-customer">Kunde</label>
            <select
                id="job-customer"
                bind:value={selectedCustomer}
                onchange={handleCustomerChange}
                disabled={loading}
            >
                <option value="" disabled selected>Kunde ?</option>
                <option value="Neuer Kunde">➕ Neuer Kunde</option>
                {#each customers as customer}
                    <option value={customer.id}>{getCustomerLabel(customer)}</option>
                {/each}
            </select>
            <p class="customer-hint">Für „Kunde bearbeiten“ bitte zuerst einen bestehenden Kunden auswählen.</p>
        </div>

        <div class="field">
            <label class="field-label" for="job-name">Auftrag</label>
            <input
                id="job-name"
                class="broadField"
                type="text"
                placeholder="Auftrag"
                bind:value={jobname}
                disabled={loading}
            />
        </div>

        <div class="field">
            <label class="field-label" for="job-quantity">Auflage</label>
            <input
                id="job-quantity"
                class="smallField"
                type="number"
                placeholder="Auflage (Stück)"
                bind:value={quantity}
                min="1"
                disabled={loading}
            />
        </div>

        <div class="field field-details">
            <label class="field-label" for="job-details">Details</label>
            <input
                id="job-details"
                class="broadField detailsField"
                type="text"
                placeholder="Details"
                bind:value={details}
                disabled={loading}
                size="120"
            />
        </div>

        <div class="field">
            <label class="field-label" for="job-amount">Auftragswert</label>
            <input
                id="job-amount"
                class="smallField"
                type="number"
                placeholder="Auftragswert (€)"
                bind:value={amount}
                step="0.01"
                min="0"
                disabled={loading}
            />
        </div>

        <div class="field">
            <label class="field-label" for="job-producer">Produzent</label>
            <select id="job-producer" bind:value={producer} disabled={loading}>
                <option value="" disabled selected>Produzent</option>
                <option value="chr">Chromik Offsetdruck</option>
                <option value="doe">Chromik Digitaldruck</option>
                <option value="pwd">Printworld</option>
                <option value="sax">Saxoprint</option>
                <option value="wmd">wir-machen-druck</option>
                <option value="sil">Silberdruck</option>
                <option value="pin">Pinguin</option>
                <option value="hee">Heenemann</option>
                <option value="son">Sonstige</option>
            </select>
        </div>

        <div class="field">
            <label class="field-label" for="job-vat-rate">Mehrwertsteuer</label>
            <select id="job-vat-rate" bind:value={vatRate} disabled={loading}>
                <option value="" disabled selected>MwSt.-Satz auswählen</option>
                {#each vatRates as rate}
                    <option value={rate.rate}>{rate.label}</option>
                {/each}
            </select>
        </div>
        
        <button 
            class="btn-submit"
            onclick={handleSubmit}
            disabled={loading}
        >
            {loading ? 'Wird angelegt...' : 'Auftrag anlegen'}
        </button>
        
        <button 
            class="btn-clear"
            onclick={clearForm}
            disabled={loading}
        >
            Felder löschen
        </button>

        <button
            class="btn-edit-customer"
            onclick={handleEditCustomer}
            disabled={loading}
        >
            Kunde bearbeiten
        </button>
    </div>
</div>

<style>
    .job-form-container {
        margin-bottom: var(--spacing-xl);
    }

    .error {
        color: var(--color-danger);
        font-weight: 600;
        padding: var(--spacing-md);
        background: var(--color-danger-light);
        border-left: 4px solid var(--color-danger);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-md);
        font-size: var(--font-size-sm);
    }

    .newJob {
        display: grid;
        grid-template-columns: 200px 1fr 100px 2fr 100px 160px 100px 100px 100px;
        gap: var(--spacing-md);
        align-items: end;
        background: var(--color-success-light);
        border: 2px solid var(--color-success);
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        box-shadow: var(--shadow-md);
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }

    .field-label {
        font-size: var(--font-size-xs);
        font-weight: 600;
        color: var(--color-gray-700);
    }

    .field-customer {
        grid-column: span 1;
    }

    .field-details {
        grid-column: span 3;
    }

    .detailsField {
        width: 100%;
    }

    .customer-hint {
        margin: 0;
        font-size: var(--font-size-xs);
        color: var(--color-gray-600);
    }

    input {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        transition: all var(--transition-fast);
    }

    input:hover:not(:disabled) {
        border-color: var(--color-success);
    }

    input:focus {
        outline: none;
        border-color: var(--color-success);
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }

    input:disabled {
        background: var(--color-gray-100);
        cursor: not-allowed;
    }

    .broadField {
        min-width: 200px;
    }
    
    .smallField {
        width: 100%;
    }

    button {
        padding: var(--spacing-sm) var(--spacing-lg);
        font-weight: 600;
        white-space: nowrap;
        height: 38px;
    }

    .btn-submit {
        background: var(--color-success);
        color: white;
    }

    .btn-submit:hover:not(:disabled) {
        background: var(--color-success-hover);
    }

    .btn-clear {
        background: var(--color-gray-200);
        color: var(--color-gray-700);
    }

    .btn-clear:hover:not(:disabled) {
        background: var(--color-gray-300);
    }

    .btn-edit-customer {
        background: var(--color-info);
        color: white;
        min-width: 160px;
    }

    .btn-edit-customer:hover:not(:disabled) {
        background: var(--color-info-hover);
    }
</style>
