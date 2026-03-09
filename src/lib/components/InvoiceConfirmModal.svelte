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
        if (!customer || !job) return '';
        // Priorisierung: job.billingEmail > customer.invoiceMail > customer.email
        return job.billingEmail || customer.invoiceMail || customer.email || '';
    }

    function getCustomerName() {
        if (!customer) return '';
        const company = customer.company?.trim();
        const firstName = customer.firstName?.trim() || '';
        const lastName = customer.lastName?.trim() || '';
        
        if (company) return company;
        return `${firstName} ${lastName}`.trim();
    }

    function getBillingAddress() {
        if (!job || !job.billingAddress) return null;
        
        const addr = job.billingAddress;
        
        return [
            addr.firma || '',
            addr.strasse || '',
            `${addr.plz || ''} ${addr.ort || ''}`.trim(),
            addr.land || ''
        ].filter(Boolean).join(', ');
    }

    function getStandardAddress() {
        if (!customer) return '';
        
        const name = getCustomerName();
        return [
            name,
            customer.street || customer.address || '',
            `${customer.zip || ''} ${customer.city || ''}`.trim(),
            customer.country || ''
        ].filter(Boolean).join(', ');
    }

    function calcInvoice() {
        if (!job) return null;
        const netto = parseFloat((Number(job.amount) || 0).toFixed(2));
        const shipping = parseFloat((Number(job.shippingCosts) || 0).toFixed(2));
        const vatRate = Number(job.vatRate) || 19;
        const nettosumme = parseFloat((netto + shipping).toFixed(2));
        const mwst = parseFloat((nettosumme * vatRate / 100).toFixed(2));
        const gesamt = parseFloat((nettosumme + mwst).toFixed(2));
        return { netto, shipping, vatRate, nettosumme, mwst, gesamt };
    }

    const fmt = (/** @type {number} */ n) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    /** @type {'details' | 'loading' | 'preview'} */
    let step = $state('details');
    let pdfObjectUrl = $state('');
    let previewError = $state('');

    $effect(() => {
        if (!show) {
            step = 'details';
            previewError = '';
            if (pdfObjectUrl) {
                URL.revokeObjectURL(pdfObjectUrl);
                pdfObjectUrl = '';
            }
        }
    });

    async function loadPreview() {
        if (!job || !customer) return;
        step = 'loading';
        previewError = '';
        try {
            const response = await fetch('/api/create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job,
                    customer,
                    userId: null,
                    invoiceEmail: getInvoiceEmail(),
                    customerName: getCustomerName(),
                    amount: job.amount,
                    vatRate: job.vatRate || 19,
                    previewOnly: true
                })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Vorschau konnte nicht geladen werden');
            }
            const data = await response.json();
            const binary = atob(data.pdfBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: 'application/pdf' });
            if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
            pdfObjectUrl = URL.createObjectURL(blob);
            step = 'preview';
        } catch (err) {
            previewError = err instanceof Error ? err.message : 'Unbekannter Fehler';
            step = 'details';
        }
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
                    
                    {#if getBillingAddress()}
                        <div class="detail-row billing-highlight">
                            <strong>📍 Rechnungsadresse:</strong>
                            <span>{getBillingAddress()}</span>
                        </div>
                        <p class="info-note warning">⚠️ Abweichende Rechnungsadresse wird verwendet</p>
                    {:else}
                        <div class="detail-row">
                            <strong>Adresse:</strong>
                            <span>{getStandardAddress()}</span>
                        </div>
                    {/if}
                    
                    {#if calcInvoice()}
                        {@const c = calcInvoice()}
                        <div class="calc-table">
                            <div class="calc-row">
                                <span>Nettobetrag</span>
                                <span>{fmt(c.netto)} €</span>
                            </div>
                            {#if c.shipping > 0}
                                <div class="calc-row">
                                    <span>Versandkosten netto</span>
                                    <span>{fmt(c.shipping)} €</span>
                                </div>
                                <div class="calc-row">
                                    <span>Nettosumme</span>
                                    <span>{fmt(c.nettosumme)} €</span>
                                </div>
                            {/if}
                            <div class="calc-row">
                                <span>MwSt. {c.vatRate}%</span>
                                <span>{fmt(c.mwst)} €</span>
                            </div>
                            <div class="calc-row calc-total">
                                <span>Gesamtbetrag</span>
                                <span>{fmt(c.gesamt)} €</span>
                            </div>
                        </div>
                    {/if}
                    <div class="detail-row email-row">
                        <strong>📧 E-Mail Adresse:</strong>
                        <span class="email">{getInvoiceEmail()}</span>
                    </div>
                    
                    {#if job.billingEmail}
                        <p class="info-note warning">⚠️ Rechnung wird an abweichende E-Mail-Adresse gesendet</p>
                    {:else if customer.invoiceMail}
                        <p class="info-note">✓ Rechnung wird an separate Rechnungsadresse gesendet</p>
                    {:else}
                        <p class="info-note">ℹ️ Rechnung wird an Standard-E-Mail gesendet</p>
                    {/if}
                </div>

                <div class="confirmation-question">
                    <p><strong>Rechnung wird versendet an:</strong></p>
                    <p class="email-highlight">{getInvoiceEmail()}</p>
                </div>
            {/if}

            {#if step === 'details'}
                {#if previewError}
                    <p class="preview-error">⚠️ {previewError}</p>
                {/if}
                <div class="modal-actions">
                    <button class="btn-confirm" onclick={loadPreview}>
                        🔍 PDF prüfen vor dem Versand
                    </button>
                    <button class="btn-cancel" onclick={onCancel}>
                        Abbrechen
                    </button>
                </div>
            {:else if step === 'loading'}
                <div class="preview-loading">
                    <div class="spinner"></div>
                    <p>PDF wird generiert…</p>
                </div>
            {:else if step === 'preview'}
                <div class="pdf-preview-container">
                    <iframe src={pdfObjectUrl} title="Rechnungsvorschau" class="pdf-iframe"></iframe>
                </div>
                <div class="modal-actions preview-actions">
                    <button class="btn-confirm" onclick={onConfirm}>
                        ✓ Rechnung jetzt versenden
                    </button>
                    <button class="btn-back" onclick={() => { step = 'details'; }}>
                        ← Zurück
                    </button>
                    <button class="btn-cancel" onclick={onCancel}>
                        Abbrechen
                    </button>
                </div>
            {/if}
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

    .modal-content:has(.pdf-preview-container) {
        max-width: 860px;
        width: 95%;
    }

    .pdf-preview-container {
        margin-bottom: var(--spacing-lg);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        overflow: hidden;
    }

    .pdf-iframe {
        display: block;
        width: 100%;
        height: 60vh;
        border: none;
    }

    .preview-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-xl);
        color: var(--color-gray-600);
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--color-gray-200);
        border-top-color: var(--color-info);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .preview-error {
        color: var(--color-error, #dc2626);
        background: #fef2f2;
        border: 1px solid #fca5a5;
        border-radius: var(--radius-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        margin-bottom: var(--spacing-md);
        font-size: var(--font-size-sm);
    }

    .preview-actions {
        flex-wrap: wrap;
    }

    .btn-back {
        background: var(--color-gray-100);
        color: var(--color-gray-700);
        border: 1px solid var(--color-gray-300);
    }

    .btn-back:hover {
        background: var(--color-gray-200);
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

    .billing-highlight {
        background: var(--color-warning-light);
        margin: var(--spacing-sm) calc(-1 * var(--spacing-md));
        padding: var(--spacing-sm) var(--spacing-md);
        border-left: 4px solid var(--color-warning);
    }

    .email-row {
        margin-top: var(--spacing-sm);
        padding-top: var(--spacing-md);
        border-top: 2px solid var(--color-info);
    }

    .calc-table {
        margin: var(--spacing-sm) 0;
        border: 1px solid var(--color-gray-200);
        border-radius: var(--radius-sm);
        overflow: hidden;
    }

    .calc-row {
        display: flex;
        justify-content: space-between;
        padding: var(--spacing-sm) var(--spacing-md);
        border-bottom: 1px solid var(--color-gray-200);
        font-size: var(--font-size-sm);
    }

    .calc-row:last-child {
        border-bottom: none;
    }

    .calc-total {
        background: var(--color-gray-100);
        font-weight: 700;
        font-size: var(--font-size-base);
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

    .info-note.warning {
        background: var(--color-warning-light);
        border-left-color: var(--color-warning);
        font-weight: 600;
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
