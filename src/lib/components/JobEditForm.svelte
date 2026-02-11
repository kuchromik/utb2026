<script>
    let { 
        job,
        customers = [],
        onSave,
        onCancel,
        onNewCustomer
    } = $props();

    let customer = $state(job.customer);
    let jobname = $state(job.jobname);
    let quantity = $state(job.quantity);
    let details = $state(job.details);
    let amount = $state(job.amount);
    let producer = $state(job.producer);
    let error = $state('');
    let loading = $state(false);

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
            error = 'Menge muss größer als 0 sein';
            return false;
        }
        
        if (amount < 0) {
            error = 'Betrag kann nicht negativ sein';
            return false;
        }
        
        if (!producer) {
            error = 'Bitte Produzent auswählen';
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
            await onSave({
                customer: customer,
                jobname: jobname.trim(),
                quantity: Number(quantity),
                details: details.trim(),
                amount: Number(amount),
                producer
            });
        } catch (err) {
            error = `Fehler beim Speichern: ${err.message}`;
        } finally {
            loading = false;
        }
    }

    function handleCustomerChange() {
        if (customer === "Neuer Kunde") {
            onNewCustomer();
            customer = job.customer;
        }
    }
</script>

<div class="changeJob">
    {#if error}
        <p class="error">{error}</p>
    {/if}
    
    <select 
        bind:value={customer} 
        onchange={handleCustomerChange}
        disabled={loading}
    >
        <option value="" disabled>Wählen Sie einen Kunden</option>
        <option value="Neuer Kunde">➕ Neuer Kunde</option>
        {#each customers as cust}
            <option value={cust.companyName}>{cust.companyName}</option>
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
    
    <button 
        onclick={handleSave}
        disabled={loading}
    >
        {loading ? 'Wird gespeichert...' : 'Speichern'}
    </button>
    
    <button 
        onclick={onCancel}
        disabled={loading}
    >
        Abbruch
    </button>
</div>

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
        grid-template-columns: 200px 1fr 100px 1fr 120px 200px auto auto;
        gap: var(--spacing-md);
        align-items: center;
        background: var(--color-warning-light);
        border: 2px solid var(--color-warning);
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        margin-top: var(--spacing-md);
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
