<script>
    /** @typedef {import('$lib/types').Customer} Customer */
    /** @typedef {import('$lib/types').JobSubmitHandler} JobSubmitHandler */
    /** @typedef {import('$lib/types').VoidHandler} VoidHandler */

    /** @type {{ customers?: Customer[], onSubmit: JobSubmitHandler, onNewCustomer: VoidHandler }} */
    let { 
        customers = [],
        onSubmit,
        onNewCustomer
    } = $props();

    let selectedCustomer = $state('');
    let jobname = $state('');
    let quantity = $state(0);
    let details = $state('');
    let amount = $state(0);
    let producer = $state('');
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
        
        if (quantity <= 0) {
            error = 'Menge muss größer als 0 sein';
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
        
        return true;
    }

    async function handleSubmit() {
        if (!validateForm()) {
            return;
        }
        
        loading = true;
        error = '';
        
        try {
            await onSubmit({
                customer: selectedCustomer,
                jobname: jobname.trim(),
                quantity: Number(quantity),
                details: details.trim(),
                amount: normalizeAmount(amount),
                producer
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
        quantity = 0;
        details = '';
        amount = 0;
        producer = '';
        error = '';
    }

    function handleCustomerChange() {
        if (selectedCustomer === "Neuer Kunde") {
            onNewCustomer();
            selectedCustomer = '';
        }
    }
</script>

<div class="job-form-container">
    <h2>Neuer Auftrag:</h2>
    {#if error}
        <p class="error">{error}</p>
    {/if}
    <div class="newJob">
        <select 
            bind:value={selectedCustomer} 
            onchange={handleCustomerChange}
            disabled={loading}
        >
            <option value="" disabled selected>Wählen Sie einen Kunden</option>
            <option value="Neuer Kunde">➕ Neuer Kunde</option>
            {#each customers as customer}
                <option value={customer.companyName}>{customer.companyName}</option>
            {/each}
        </select>
        
        <input 
            class="broadField" 
            type="text" 
            placeholder="Auftrag" 
            bind:value={jobname}
            disabled={loading}
        />
        
        <input 
            class="smallField"
            type="number" 
            placeholder="Menge" 
            bind:value={quantity}
            min="1"
            disabled={loading}
        />
        
        <input 
            class="broadField" 
            type="text" 
            placeholder="Details" 
            bind:value={details}
            disabled={loading}
        />
        
        <input 
            class="smallField" 
            type="number" 
            placeholder="Betrag" 
            bind:value={amount}
            step="0.01"
            min="0"
            disabled={loading}
        />
        
        <select bind:value={producer} disabled={loading}>
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
        
        <button 
            onclick={handleSubmit}
            disabled={loading}
        >
            {loading ? 'Wird angelegt...' : 'Auftrag anlegen'}
        </button>
        
        <button 
            onclick={clearForm}
            disabled={loading}
        >
            Felder löschen
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
        grid-template-columns: 200px 1fr 100px 1fr 120px 200px auto auto;
        gap: var(--spacing-md);
        align-items: center;
        background: var(--color-success-light);
        border: 2px solid var(--color-success);
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        box-shadow: var(--shadow-md);
    }

    select {
        grid-column: span 1;
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

    button:first-of-type {
        background: var(--color-success);
        color: white;
    }

    button:first-of-type:hover:not(:disabled) {
        background: var(--color-success-hover);
    }

    button:last-of-type {
        background: var(--color-gray-200);
        color: var(--color-gray-700);
    }

    button:last-of-type:hover:not(:disabled) {
        background: var(--color-gray-300);
    }
</style>
