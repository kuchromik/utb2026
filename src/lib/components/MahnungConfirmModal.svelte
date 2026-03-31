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
        const selectedContact = job.contactEmail && customer.contacts
            ? customer.contacts.find(/** @param {any} c */ c => c.email === job.contactEmail)
            : null;
        return selectedContact?.invoiceMail || customer.invoiceMail || job.billingEmail || job.contactEmail || customer.email || '';
    }

    function getCustomerName() {
        if (!customer) return '';
        const company = customer.company?.trim();
        const firstName = customer.firstName?.trim() || '';
        const lastName = customer.lastName?.trim() || '';
        if (company) return company;
        return `${firstName} ${lastName}`.trim();
    }

    function getDaysSinceInvoice() {
        if (!job?.invoiceDate) return 0;
        return Math.floor((Date.now() / 1000 - job.invoiceDate) / 86400);
    }

    function getInvoiceDateStr() {
        if (!job?.invoiceDate) return '';
        return new Date(job.invoiceDate * 1000).toLocaleDateString('de-DE');
    }

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
            const response = await fetch('/api/send-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job, customer, previewOnly: true })
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
            <h2>⚠️ Zahlungserinnerung versenden</h2>

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
                        <strong>Rechnung Nr.:</strong>
                        <span>{job.invoiceNumber}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Rechnungsdatum:</strong>
                        <span>{getInvoiceDateStr()}</span>
                    </div>
                    <div class="detail-row overdue-row">
                        <strong>Überfällig seit:</strong>
                        <span class="overdue-badge">{getDaysSinceInvoice() - 14} Tage (gesamt {getDaysSinceInvoice()} Tage seit Rechnungstellung)</span>
                    </div>
                    <div class="detail-row email-row">
                        <strong>📧 E-Mail Adresse:</strong>
                        <span class="email">{getInvoiceEmail()}</span>
                    </div>
                    <p class="info-note bcc-note">📋 Eine Kopie wird an remindlog@online.de gesendet</p>
                    <p class="info-note">📎 Die bestehende Rechnung wird erneut als PDF-Anhang mitgeschickt</p>
                </div>

                <div class="confirmation-question">
                    <p><strong>Mahnung wird versendet an:</strong></p>
                    <p class="email-highlight">{getInvoiceEmail()}</p>
                </div>
            {/if}

            {#if step === 'details'}
                {#if previewError}
                    <p class="preview-error">⚠️ {previewError}</p>
                {/if}
                <div class="modal-actions">
                    <button class="btn-confirm" onclick={loadPreview}>
                        🔍 Rechnung prüfen vor dem Versand
                    </button>
                    <button class="btn-cancel" onclick={onCancel}>
                        Abbrechen
                    </button>
                </div>
            {:else if step === 'loading'}
                <div class="preview-loading">
                    <div class="spinner"></div>
                    <p>Rechnung wird geladen…</p>
                </div>
            {:else if step === 'preview'}
                <div class="pdf-preview-container">
                    <iframe src={pdfObjectUrl} title="Rechnungsvorschau" class="pdf-iframe"></iframe>
                </div>
                <div class="modal-actions preview-actions">
                    <button class="btn-confirm" onclick={onConfirm}>
                        ✓ Mahnung jetzt versenden
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

    h2 {
        margin-top: 0;
        margin-bottom: var(--spacing-lg);
        color: #b91c1c;
        font-size: var(--font-size-xl);
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
        border-top-color: #b91c1c;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .preview-error {
        color: #b91c1c;
        background: #fef2f2;
        border: 1px solid #fca5a5;
        border-radius: var(--radius-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        margin-bottom: var(--spacing-md);
        font-size: var(--font-size-sm);
    }

    .invoice-details {
        background: var(--color-gray-50);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
    }

    .detail-row {
        display: flex;
        gap: var(--spacing-sm);
        padding: var(--spacing-xs) 0;
        font-size: var(--font-size-sm);
        border-bottom: 1px solid var(--color-gray-200);
    }

    .detail-row:last-of-type {
        border-bottom: none;
    }

    .detail-row strong {
        min-width: 140px;
        color: var(--color-gray-700);
    }

    .overdue-row strong {
        color: #b91c1c;
    }

    .overdue-badge {
        color: #b91c1c;
        font-weight: 600;
    }

    .email {
        color: var(--color-info, #2563eb);
        word-break: break-all;
    }

    .email-row {
        margin-top: var(--spacing-sm);
    }

    .info-note {
        font-size: var(--font-size-xs);
        color: var(--color-gray-600);
        background: #fffbeb;
        border-left: 3px solid #f59e0b;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        margin: var(--spacing-xs) 0 0;
    }

    .bcc-note {
        background: #eff6ff;
        border-left-color: #3b82f6;
    }

    .confirmation-question {
        text-align: center;
        padding: var(--spacing-sm) 0;
        margin-bottom: var(--spacing-lg);
    }

    .confirmation-question p {
        margin: 0 0 var(--spacing-xs);
        font-size: var(--font-size-sm);
        color: var(--color-gray-700);
    }

    .email-highlight {
        font-size: var(--font-size-lg);
        color: #b91c1c;
        font-weight: 700;
    }

    .modal-actions {
        display: flex;
        gap: var(--spacing-md);
        justify-content: flex-end;
    }

    .preview-actions {
        flex-wrap: wrap;
    }

    button {
        padding: var(--spacing-sm) var(--spacing-lg);
        border-radius: var(--radius-md);
        font-weight: 600;
        font-size: var(--font-size-sm);
        cursor: pointer;
        border: none;
        transition: all var(--transition-fast);
    }

    .btn-confirm {
        background: #b91c1c;
        color: white;
    }

    .btn-confirm:hover {
        background: #991b1b;
    }

    .btn-cancel {
        background: var(--color-gray-200);
        color: var(--color-gray-700);
    }

    .btn-cancel:hover {
        background: var(--color-gray-300);
    }

    .btn-back {
        background: var(--color-gray-100);
        color: var(--color-gray-600);
    }

    .btn-back:hover {
        background: var(--color-gray-200);
    }
</style>
