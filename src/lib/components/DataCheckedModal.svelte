<script>
    /** @type {{ job: import('$lib/types').Job, customer?: import('$lib/types').Customer, onConfirm: (shipDate: string) => void, onConfirmWithoutEmail: (shipDate: string) => void, onCancel: () => void }} */
    let { job, customer, onConfirm, onConfirmWithoutEmail, onCancel } = $props();

    let shipDate = $state('');

    /** Returns the matching contact object if job.contactEmail points to one in customer.contacts */
    const contact = $derived(
        job.contactEmail && customer?.contacts?.length
            ? (customer.contacts.find(c => c.email === job.contactEmail) ?? null)
            : null
    );

    function handleConfirm() {
        if (!shipDate) {
            alert('Bitte geben Sie einen Termin ein.');
            return;
        }
        onConfirm(shipDate);
    }

    function handleConfirmWithoutEmail() {
        if (!shipDate) {
            alert('Bitte geben Sie einen Termin ein.');
            return;
        }
        onConfirmWithoutEmail(shipDate);
    }

    /** @param {string} isoDate */
    function formatDateGerman(isoDate) {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        return `${day}.${month}.${year}`;
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="modal-backdrop" onclick={onCancel} onkeydown={(e) => e.key === 'Escape' && onCancel()} role="presentation" tabindex="-1">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal-content" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
        <h2>Druckdaten geprüft – Termin festlegen</h2>

        <div class="info-section">
            <p><strong>Kunde:</strong> {job.customer}</p>
            <p><strong>Auftrag:</strong> {job.jobname}</p>
            {#if contact}
                <p class="contact-info">
                    <strong>Ansprechpartner:</strong> {contact.firstName} {contact.lastName}
                    <span class="contact-email">({contact.email})</span>
                    <span class="contact-hint">← E-Mail geht an diesen Kontakt</span>
                </p>
            {/if}
        </div>

        <div class="ship-date-section">
            {#if job.toShip}
                <p class="mode-text">📦 Dieser Auftrag wird <strong>versendet</strong>.</p>
                <p>Der Kunde wird informiert, dass seine Druckdaten in Ordnung sind und die Ware am angegebenen Datum versendet wird.</p>
            {:else}
                <p class="mode-text">🏪 Dieser Auftrag wird <strong>zur Abholung</strong> bereitgestellt.</p>
                <p>Der Kunde wird informiert, dass seine Druckdaten in Ordnung sind und die Ware ab dem angegebenen Datum abgeholt werden kann.</p>
            {/if}

            <div class="date-input">
                <label for="shipDate">
                    {job.toShip ? 'Versanddatum' : 'Abhol-/Liefertermin'}: <span class="required">*</span>
                </label>
                <input
                    id="shipDate"
                    type="date"
                    bind:value={shipDate}
                    required
                />
                {#if shipDate}
                    <span class="date-preview">→ {formatDateGerman(shipDate)}</span>
                {/if}
            </div>
        </div>

        <div class="button-group">
            <button class="btn-cancel" onclick={onCancel}>
                Abbrechen
            </button>
            <button class="btn-no-email" onclick={handleConfirmWithoutEmail}>
                Ohne E-Mail speichern
            </button>
            <button class="btn-confirm" onclick={handleConfirm}>
                OK – E-Mail senden
            </button>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
    }

    .modal-content {
        background: white;
        border-radius: var(--radius-lg);
        padding: var(--spacing-xl);
        max-width: 500px;
        width: 90%;
        box-shadow: var(--shadow-xl);
        animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
        from {
            transform: translateY(-20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    h2 {
        margin: 0 0 var(--spacing-lg) 0;
        color: var(--color-gray-900);
        font-size: var(--font-size-xl);
    }

    .info-section {
        background: var(--color-gray-50);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-lg);
    }

    .info-section p {
        margin: var(--spacing-xs) 0;
        color: var(--color-gray-700);
    }

    .contact-info {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
        border-top: 1px solid var(--color-gray-200);
        padding-top: var(--spacing-xs);
        margin-top: var(--spacing-xs);
    }

    .contact-email {
        color: var(--color-gray-500);
        font-size: var(--font-size-sm);
    }

    .contact-hint {
        font-size: var(--font-size-xs);
        color: var(--color-info);
        font-style: italic;
    }

    .ship-date-section {
        background: var(--color-gray-50);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-lg);
    }

    .ship-date-section p {
        margin: 0 0 var(--spacing-sm) 0;
        color: var(--color-gray-700);
    }

    .mode-text {
        font-weight: 600;
        color: var(--color-info);
        margin-bottom: var(--spacing-sm);
    }

    .date-input {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        flex-wrap: wrap;
        margin-top: var(--spacing-md);
    }

    .date-input label {
        font-weight: 600;
        color: var(--color-gray-700);
        white-space: nowrap;
    }

    .date-input input[type="date"] {
        padding: var(--spacing-xs) var(--spacing-sm);
        border: 2px solid var(--color-gray-300);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-sm);
        color: var(--color-gray-900);
    }

    .date-input input[type="date"]:focus {
        outline: none;
        border-color: var(--color-primary);
    }

    .date-preview {
        font-size: var(--font-size-sm);
        color: var(--color-gray-500);
        font-style: italic;
    }

    .required {
        color: var(--color-danger);
    }

    .button-group {
        display: flex;
        gap: var(--spacing-sm);
        justify-content: flex-end;
        flex-wrap: wrap;
    }

    button {
        padding: var(--spacing-sm) var(--spacing-md);
        border: none;
        border-radius: var(--radius-md);
        font-weight: 600;
        cursor: pointer;
        font-size: var(--font-size-sm);
        transition: background var(--transition-fast);
    }

    .btn-cancel {
        background: var(--color-gray-200);
        color: var(--color-gray-700);
    }

    .btn-cancel:hover {
        background: var(--color-gray-300);
    }

    .btn-no-email {
        background: var(--color-gray-500);
        color: white;
    }

    .btn-no-email:hover {
        background: var(--color-gray-600);
    }

    .btn-confirm {
        background: var(--color-success);
        color: white;
    }

    .btn-confirm:hover {
        background: var(--color-success-hover, #15803d);
    }

    p {
        margin: 0;
    }
</style>
