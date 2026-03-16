<script>
    import DetailsEditModal from './DetailsEditModal.svelte';
    import ShipmentAddressModal from './ShipmentAddressModal.svelte';

    /** @typedef {import('$lib/types').Job} Job */
    /** @typedef {import('$lib/types').Customer} Customer */
    /** @typedef {import('$lib/types').VatRate} VatRate */
    /** @typedef {import('$lib/types').JobSaveHandler} JobSaveHandler */
    /** @typedef {import('$lib/types').VoidHandler} VoidHandler */
    /** @typedef {import('$lib/types').CustomerLabelHandler} CustomerLabelHandler */
    /** @typedef {import('$lib/types').ShipmentAddressInput} ShipmentAddressInput */

    /** @type {{ job: Job, customers?: Customer[], vatRates?: VatRate[], onSave: JobSaveHandler, onCancel: VoidHandler, onNewCustomer: VoidHandler, onEditCustomer: CustomerLabelHandler }} */
    let { 
        job,
        customers = [],
        vatRates = [],
        onSave,
        onCancel,
        onNewCustomer,
        onEditCustomer
    } = $props();

    let customer = $state(job.customerId || job.customer);
    let selectedContactEmail = $state(job.contactEmail ?? '');
    let jobname = $state(job.jobname);
    let quantity = $state(job.quantity);
    let details = $state(job.details);
    let amount = $state(job.amount != null ? Number(job.amount).toFixed(2) : '');
    let shippingCosts = $state(job.shippingCosts != null ? Number(job.shippingCosts).toFixed(2) : '');
    let producer = $state(job.producer);
    let vatRate = $state(job.vatRate ?? 19);
    let error = $state('');
    let loading = $state(false);
    let showDetailsModal = $state(false);
    let showShipmentAddressModal = $state(false);
    /** @type {ShipmentAddressInput} */
    let shipmentAddress = $state(job.shipmentAddress ?? {});

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
        
        if (!customer || customer === '') {
            error = 'Bitte Kunde auswählen';
            return false;
        }
        
        if (!jobname.trim()) {
            error = 'Bitte Auftragsnamen eingeben';
            return false;
        }
        
        if (quantity <= 0) {
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
        
        const numericVatRate = Number(vatRate);
        if (!Number.isFinite(numericVatRate) || numericVatRate < 0) {
            error = 'Bitte gültigen Mehrwertsteuersatz auswählen';
            return false;
        }
        
        return true;
    }

    async function handleSave() {
        if (!validateForm()) {
            return;
        }
        
        loading = true;
        error = '';
        
        try {
            // Finde den ausgewählten Kunden
            const selectedCust = customers.find(c => c.id === customer);
            const customerLabel = selectedCust ? getCustomerLabel(selectedCust) : customer;
            
            await onSave({
                customerId: customer,
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
        } catch (err) {
            error = `Fehler beim Speichern: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`;
        } finally {
            loading = false;
        }
    }

    function handleCustomerChange() {
        if (customer === "Neuer Kunde") {
            onNewCustomer();
            customer = job.customerId || job.customer;
            selectedContactEmail = '';
        } else {
            selectedContactEmail = '';
        }
    }

    function handleEditCustomer() {
        if (!customer || customer === 'Neuer Kunde') {
            error = 'Bitte zuerst einen bestehenden Kunden auswählen';
            return;
        }
        // Finde den Kunden anhand der ID und übergebe das Label
        const selectedCust = customers.find(c => c.id === customer);
        if (selectedCust) {
            onEditCustomer(getCustomerLabel(selectedCust));
        }
    }

    /** @param {Customer} customerData */
    function getCustomerLabel(customerData) {
        const company = customerData.company?.trim();
        const firstName = customerData.firstName?.trim() ?? '';
        const lastName = customerData.lastName?.trim() ?? '';
        const contactName = [lastName, firstName].filter(Boolean).join(', ');

        if (company) {
            return contactName ? `${company} – ${contactName}` : company;
        }

        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
            return fullName;
        }
        return customerData.companyName ?? '';
    }

    /** @param {ShipmentAddressInput | null | undefined} addr */
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

<div class="changeJob">
    {#if error}
        <p class="error">{error}</p>
    {/if}

    <div class="field field-customer">
        <label class="field-label" for="edit-job-customer">Kunde</label>
        <select
            id="edit-job-customer"
            bind:value={customer}
            onchange={handleCustomerChange}
            disabled={loading}
        >
            <option value="" disabled>Kunde ?</option>
            <option value="Neuer Kunde">➕ Neuer Kunde</option>
            {#each customers as cust}
                <option value={cust.id}>{getCustomerLabel(cust)}</option>
            {/each}
        </select>
        <p class="customer-hint">Für „Kunde bearbeiten“ bitte zuerst einen bestehenden Kunden auswählen.</p>
        {#if customer && getContactOptions(customer).length > 0}
            <label class="field-label" style="margin-top: var(--spacing-xs);" for="edit-job-contact">Ansprechpartner</label>
            <select id="edit-job-contact" bind:value={selectedContactEmail} disabled={loading}>
                <option value="">Hauptkontakt</option>
                {#each getContactOptions(customer) as opt}
                    <option value={opt.email}>{opt.label}</option>
                {/each}
            </select>
        {/if}
    </div>

    <div class="field">
        <label class="field-label" for="edit-job-name">Auftrag</label>
        <input
            id="edit-job-name"
            class="broadField"
            type="text"
            placeholder="Auftrag"
            bind:value={jobname}
            disabled={loading}
        />
    </div>

    <div class="field">
        <label class="field-label" for="edit-job-quantity">Auflage</label>
        <input
            id="edit-job-quantity"
            class="smallField"
            type="number"
            placeholder="Auflage (Stück)"
            bind:value={quantity}
            min="1"
            disabled={loading}
        />
    </div>

    <div class="field">
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
        <label class="field-label" for="edit-job-amount">Auftragswert</label>
        <input
            id="edit-job-amount"
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
        <label class="field-label" for="edit-job-shipping-costs">Versandkosten</label>
        <input
            id="edit-job-shipping-costs"
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
        <label class="field-label" for="edit-job-producer">Produzent</label>
        <select id="edit-job-producer" bind:value={producer} disabled={loading}>
            <option value="" disabled>Produzent</option>
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
        <label class="field-label" for="edit-job-vat-rate">Mehrwertsteuer</label>
        <select id="edit-job-vat-rate" bind:value={vatRate} disabled={loading}>
            <option value="" disabled>MwSt.-Satz auswählen</option>
            {#each vatRates as rate}
                <option value={rate.rate}>{rate.label}</option>
            {/each}
        </select>
    </div>
    
    <button 
        class="btn-save"
        onclick={handleSave}
        disabled={loading}
    >
        {loading ? 'Wird gespeichert...' : 'Speichern'}
    </button>
    
    <button 
        class="btn-cancel"
        onclick={onCancel}
        disabled={loading}
    >
        Abbruch
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
    customerId={customer}
    initialValue={shipmentAddress}
    onSave={(v) => { shipmentAddress = v; }}
/>

<style>
    .error {
        color: var(--color-danger);
        font-weight: 600;
        font-size: var(--font-size-sm);
        grid-column: 1 / -1;
        background: var(--color-danger-light);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--radius-md);
        border-left: 4px solid var(--color-danger);
    }

    .changeJob {
        display: grid;
        grid-template-columns: 200px 1fr 100px 200px 120px 120px 200px auto auto auto;
        gap: var(--spacing-md);
        align-items: end;
        background: var(--color-warning-light);
        border: 2px solid var(--color-warning);
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        margin-top: var(--spacing-md);
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

    .field-shipment-address {
        grid-column: 1 / -1;
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
        border-color: var(--color-warning);
    }

    input:focus {
        outline: none;
        border-color: var(--color-warning);
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    }

    input:disabled {
        background: var(--color-gray-100);
        cursor: not-allowed;
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
        border-color: var(--color-warning);
    }

    .smallField {
        width: 100%;
    }
    
    .broadField {
        min-width: 200px;
    }

    button {
        padding: var(--spacing-sm) var(--spacing-lg);
        font-weight: 600;
        white-space: nowrap;
        height: 38px;
    }

    .btn-save {
        background: var(--color-success);
        color: white;
    }

    .btn-save:hover:not(:disabled) {
        background: var(--color-success-hover);
    }

    .btn-cancel {
        background: var(--color-gray-200);
        color: var(--color-gray-700);
    }

    .btn-cancel:hover:not(:disabled) {
        background: var(--color-gray-300);
    }

    .btn-edit-customer {
        background: var(--color-info);
        color: white;
    }

    .btn-edit-customer:hover:not(:disabled) {
        background: var(--color-info-hover);
    }
</style>
