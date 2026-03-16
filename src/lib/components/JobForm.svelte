<script>
    import DetailsEditModal from './DetailsEditModal.svelte';
    import ShipmentAddressModal from './ShipmentAddressModal.svelte';

    /** @typedef {import('$lib/types').Customer} Customer */
    /** @typedef {import('$lib/types').VatRate} VatRate */
    /** @typedef {import('$lib/types').JobSubmitHandler} JobSubmitHandler */
    /** @typedef {import('$lib/types').VoidHandler} VoidHandler */
    /** @typedef {import('$lib/types').CustomerLabelHandler} CustomerLabelHandler */
    /** @typedef {import('$lib/types').ShipmentAddressInput} ShipmentAddressInput */

    /** @type {{ customers?: Customer[], vatRates?: VatRate[], onSubmit: JobSubmitHandler, onNewCustomer: VoidHandler, onEditCustomer: CustomerLabelHandler }} */
    let { 
        customers = [],
        vatRates = [],
        onSubmit,
        onNewCustomer,
        onEditCustomer
    } = $props();

    let selectedCustomer = $state('');
    let selectedContactEmail = $state('');
    let jobname = $state('');
    /** @type {number | string} */
    let quantity = $state('');
    let details = $state('');
    /** @type {number | string} */
    let amount = $state('');
    /** @type {number | string} */
    let shippingCosts = $state('');
    let producer = $state('');
    /** @type {number | string} */
    let vatRate = $state(19);
    let error = $state('');
    let loading = $state(false);
    let showDetailsModal = $state(false);
    let showShipmentAddressModal = $state(false);
    /** @type {ShipmentAddressInput} */
    let shipmentAddress = $state({});

    /** @param {number | string} value */
    function normalizeAmount(value) {
        const numericValue = Number(value);
        return Math.round((numericValue + Number.EPSILON) * 100) / 100;
    }

    /** @param {number | string} value
     * @returns {string}
     */
    function formatCurrencyInput(value) {
        if (value === '' || value === null || value === undefined) return '';
        const n = parseFloat(String(value).replace(',', '.'));
        return Number.isFinite(n) ? n.toFixed(2) : String(value);
    }

    /** @param {string} customerId
     * @returns {{ label: string, email: string }[]}
     */
    function getContactOptions(customerId) {
        const cust = customers.find(c => c.id === customerId);
        if (!cust || !cust.contacts?.length) return [];
        const primary = { label: `${cust.firstName} ${cust.lastName}`.trim() + ' (Hauptkontakt)', email: cust.email };
        const extras = cust.contacts.map(c => ({ label: `${c.firstName} ${c.lastName}`.trim(), email: c.email }));
        return [primary, ...extras];
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
                ...(shippingCosts !== '' ? { shippingCosts: normalizeAmount(shippingCosts) } : {}),
                producer,
                vatRate: Number(vatRate),
                ...(selectedContactEmail ? { contactEmail: selectedContactEmail } : {}),
                shipmentAddress: isShipmentAddressSet(shipmentAddress) ? { ...shipmentAddress } : null
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
        shippingCosts = '';
        producer = '';
        vatRate = 19;
        shipmentAddress = {};
        error = '';
    }

    function handleCustomerChange() {
        if (selectedCustomer === "Neuer Kunde") {
            onNewCustomer();
            selectedCustomer = '';
            selectedContactEmail = '';
        } else {
            selectedContactEmail = '';
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

    /** @param {ShipmentAddressInput} addr */
    function isShipmentAddressSet(addr) {
        return !!(addr && (addr.name || addr.street || addr.zip || addr.city));
    }

    /** @param {ShipmentAddressInput} addr */
    function formatShipmentAddress(addr) {
        const parts = [
            addr.name,
            addr.street,
            [addr.zip, addr.city].filter(Boolean).join(' '),
            addr.countryCode
        ].filter(Boolean);
        return parts.join(' · ');
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
            {#if selectedCustomer && getContactOptions(selectedCustomer).length > 0}
                <label class="field-label" style="margin-top: var(--spacing-xs);" for="job-contact">Ansprechpartner</label>
                <select id="job-contact" bind:value={selectedContactEmail} disabled={loading}>
                    <option value="">Hauptkontakt</option>
                    {#each getContactOptions(selectedCustomer) as opt}
                        <option value={opt.email}>{opt.label}</option>
                    {/each}
                </select>
            {/if}
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
            <span class="field-label">Details</span>
            <div class="details-preview">
                <span class="details-preview-text" class:details-placeholder={!details}>
                    {details || 'Details eingeben …'}
                </span>
                <button
                    type="button"
                    class="btn-details-edit"
                    onclick={() => showDetailsModal = true}
                    disabled={loading}
                >✎ Bearbeiten</button>
            </div>
        </div>

        <div class="field">
            <label class="field-label" for="job-amount">Auftragswert</label>
            <input
                id="job-amount"
                class="smallField"
                type="text"
                inputmode="decimal"
                placeholder="0,00"
                bind:value={amount}
                onblur={() => { amount = formatCurrencyInput(amount); }}
                disabled={loading}
            />
        </div>

        <div class="field">
            <label class="field-label" for="job-shipping-costs">Versandkosten</label>
            <input
                id="job-shipping-costs"
                class="smallField"
                type="text"
                inputmode="decimal"
                placeholder="0,00"
                bind:value={shippingCosts}
                onblur={() => { shippingCosts = formatCurrencyInput(shippingCosts); }}
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

        <div class="field field-shipment-address">
            <span class="field-label">Abw. Versandadresse</span>
            <div class="details-preview">
                <span class="details-preview-text" class:details-placeholder={!isShipmentAddressSet(shipmentAddress)}>
                    {isShipmentAddressSet(shipmentAddress) ? formatShipmentAddress(shipmentAddress) : 'Keine abweichende Versandadresse …'}
                </span>
                <button
                    type="button"
                    class="btn-details-edit"
                    onclick={() => showShipmentAddressModal = true}
                    disabled={loading}
                >✎ Bearbeiten</button>
            </div>
        </div>
    </div>

    <DetailsEditModal
        bind:show={showDetailsModal}
        initialValue={details}
        onSave={(v) => { details = v; }}
    />
    <ShipmentAddressModal
        bind:show={showShipmentAddressModal}
        customerId={selectedCustomer}
        initialValue={shipmentAddress}
        onSave={(v) => { shipmentAddress = v; }}
    />
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
        grid-template-columns: 200px 1fr 100px 2fr 100px 160px 100px 120px 100px 100px;
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

    .field-shipment-address {
        grid-column: 1 / -1;
    }

    .details-preview {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-xs) var(--spacing-sm) var(--spacing-xs) var(--spacing-md);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        background: white;
        min-height: 38px;
    }

    .details-preview-text {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--font-size-sm);
        color: var(--color-gray-700);
    }

    .details-placeholder {
        color: var(--color-gray-400);
    }

    .btn-details-edit {
        flex-shrink: 0;
        padding: 2px 10px;
        height: 26px;
        font-size: var(--font-size-sm);
        background: var(--color-gray-100);
        color: var(--color-gray-600);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-sm);
        font-weight: normal;
        white-space: nowrap;
    }

    .btn-details-edit:hover:not(:disabled) {
        background: var(--color-gray-200);
        border-color: var(--color-success);
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

    select {
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        transition: all var(--transition-fast);
    }

    select:hover:not(:disabled) {
        border-color: var(--color-success);
    }

    select:focus {
        outline: none;
        border-color: var(--color-success);
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }

    select:disabled {
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
