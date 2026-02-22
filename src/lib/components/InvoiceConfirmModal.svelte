<script>
    /** @typedef {import('$lib/types').Job} Job */
    /** @typedef {import('$lib/types').Customer} Customer */
    
    /** @type {{ show?: boolean, job?: Job, customer?: Customer, onConfirm: () => void, onCancel: () => void }} */
    let { 
        show = $bindable(false),
        job,
        customer,
        onConfirm,
        onCancel
    } = $props();

    function getInvoiceEmail() {
        if (!customer) return '';
        // Priorisiere invoiceMail, sonst normale E-Mail
        return customer.invoiceMail || customer.email || '';
    }

    function getCustomerName() {
        if (!customer) return '';
        const company = customer.company?.trim();
        const firstName = customer.firstName?.trim() || '';
        const lastName = customer.lastName?.trim() || '';
        
        if (company) return company;
        return `${firstName} ${lastName}`.trim();
    }
</script>

{#if show}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={onCancel} role="presentation">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2>📄 Rechnung erstellen und versenden</h2>
            
            {#if job && customer}
                <div class="invoice-details">
                    <div class="detail-row">
                        <strong>Auftrag:</strong>
                        <span>{job.jobname}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Kunde:</strong>
                        <span>{getCustomerName()}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Betrag:</strong>
                        <span>{job.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € (inkl. {job.vatRate ?? 19}% MwSt.)</span>
                    </div>
                    <div class="detail-row email-row">
                        <strong>📧 E-Mail Adresse:</strong>
                        <span class="email">{getInvoiceEmail()}</span>
                    </div>
                    
                    {#if customer.invoiceMail}
                        <p class="info-note">✓ Rechnung wird an separate Rechnungsadresse gesendet</p>
                    {:else}
                        <p class="info-note">ℹ️ Rechnung wird an Standard-E-Mail gesendet</p>
                    {/if}
                </div>

                <div class="confirmation-question">
                    <p><strong>Rechnung jetzt erstellen und versenden an:</strong></p>
                    <p class="email-highlight">{getInvoiceEmail()}</p>
                </div>
            {/if}

            <div class="modal-actions">
                <button class="btn-confirm" onclick={onConfirm}>
                    ✓ Ja, Rechnung versenden
                </button>
                <button class="btn-cancel" onclick={onCancel}>
                    Abbrechen
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
    }

    .modal-content {
        background: white;
        border-radius: var(--radius-lg);
        padding: var(--spacing-xl);
        max-width: 600px;
        width: 90%;
        box-shadow: var(--shadow-xl);
        max-height: 90vh;
        overflow-y: auto;
    }

    h2 {
        margin: 0 0 var(--spacing-lg) 0;
        color: var(--color-gray-900);
        font-size: var(--font-size-xl);
    }

    .invoice-details {
        background: var(--color-gray-50);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        margin-bottom: var(--spacing-lg);
    }

    .detail-row {
        display: flex;
        justify-content: space-between;
        padding: var(--spacing-sm) 0;
        border-bottom: 1px solid var(--color-gray-200);
    }

    .detail-row:last-of-type {
        border-bottom: none;
    }

    .email-row {
        margin-top: var(--spacing-sm);
        padding-top: var(--spacing-md);
        border-top: 2px solid var(--color-info);
    }

    .email {
        color: var(--color-info);
        font-weight: 600;
        word-break: break-word;
    }

    .info-note {
        margin: var(--spacing-md) 0 0 0;
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--color-info-light);
        border-left: 4px solid var(--color-info);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-sm);
        color: var(--color-gray-700);
    }

    .confirmation-question {
        background: var(--color-warning-light);
        border: 2px solid var(--color-warning);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        margin-bottom: var(--spacing-lg);
        text-align: center;
    }

    .confirmation-question p {
        margin: 0;
    }

    .confirmation-question p:first-child {
        margin-bottom: var(--spacing-sm);
    }

    .email-highlight {
        font-size: var(--font-size-lg);
        font-weight: 700;
        color: var(--color-info);
        word-break: break-word;
    }

    .modal-actions {
        display: flex;
        gap: var(--spacing-md);
        justify-content: flex-end;
    }

    button {
        padding: var(--spacing-md) var(--spacing-xl);
        font-weight: 600;
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        cursor: pointer;
        transition: all var(--transition-fast);
    }

    .btn-confirm {
        background: var(--color-success);
        color: white;
        border: none;
    }

    .btn-confirm:hover {
        background: var(--color-success-hover);
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
    }

    .btn-cancel {
        background: var(--color-gray-200);
        color: var(--color-gray-700);
        border: none;
    }

    .btn-cancel:hover {
        background: var(--color-gray-300);
    }
</style>
