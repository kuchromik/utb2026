<script>
    /** @type {{ job: import('$lib/types').Job, onConfirm: (trackingNumber?: string) => void, onConfirmWithoutEmail: (trackingNumber?: string) => void, onCancel: () => void }} */
    let { job, onConfirm, onConfirmWithoutEmail, onCancel } = $props();

    let trackingNumber = $state('');

    function handleConfirm() {
        if (job.toShip && !trackingNumber.trim()) {
            alert('Bitte geben Sie eine Sendungsverfolgungsnummer ein.');
            return;
        }
        onConfirm(job.toShip ? trackingNumber.trim() : undefined);
    }

    function handleConfirmWithoutEmail() {
        if (job.toShip && !trackingNumber.trim()) {
            alert('Bitte geben Sie eine Sendungsverfolgungsnummer ein.');
            return;
        }
        onConfirmWithoutEmail(job.toShip ? trackingNumber.trim() : undefined);
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="modal-backdrop" onclick={onCancel} onkeydown={(e) => e.key === 'Escape' && onCancel()} role="presentation" tabindex="-1">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal-content" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
        <h2>Auftragsabschluss bestätigen</h2>
        
        <div class="info-section">
            <p><strong>Kunde:</strong> {job.customer}</p>
            <p><strong>Auftrag:</strong> {job.jobname}</p>
        </div>

        {#if job.toShip}
            <div class="shipping-info">
                <p class="warning-text">
                    ⚠️ Dieser Auftrag wird <strong>versendet</strong>.
                </p>
                <p>Eine E-Mail wird an den Kunden gesendet mit der Information, dass die Ware versendet wurde.</p>
                
                <div class="tracking-input">
                    <label for="tracking">
                        Sendungsverfolgungsnummer: <span class="required">*</span>
                    </label>
                    <input 
                        id="tracking"
                        type="text" 
                        bind:value={trackingNumber}
                        placeholder="z.B. 12345678901234"
                        required
                    />
                </div>
            </div>
        {:else}
            <div class="pickup-info">
                <p class="info-text">
                    📦 Dieser Auftrag wird <strong>zur Abholung</strong> bereitgestellt.
                </p>
                <p>Eine E-Mail wird an den Kunden gesendet mit der Information, dass die Ware während der Öffnungszeiten abgeholt werden kann.</p>
            </div>
        {/if}

        <div class="button-group">
            <button class="btn-cancel" onclick={onCancel}>
                Abbrechen
            </button>
            <button class="btn-no-email" onclick={handleConfirmWithoutEmail}>
                Ohne E-Mail abschließen
            </button>
            <button class="btn-confirm" onclick={handleConfirm}>
                OK - E-Mail senden
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

    .shipping-info,
    .pickup-info {
        background: var(--color-gray-50);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-lg);
    }

    .warning-text {
        color: var(--color-warning);
        font-weight: 600;
        margin-bottom: var(--spacing-sm);
    }

    .info-text {
        color: var(--color-info);
        font-weight: 600;
        margin-bottom: var(--spacing-sm);
    }

    .tracking-input {
        margin-top: var(--spacing-md);
    }

    .tracking-input label {
        display: block;
        font-weight: 600;
        color: var(--color-gray-700);
        margin-bottom: var(--spacing-xs);
    }

    .required {
        color: var(--color-danger);
    }

    .tracking-input input {
        width: 100%;
        padding: var(--spacing-sm);
        border: 2px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        transition: border-color var(--transition-fast);
    }

    .tracking-input input:focus {
        outline: none;
        border-color: var(--color-primary);
    }

    .button-group {
        display: flex;
        gap: var(--spacing-md);
        justify-content: flex-end;
        margin-top: var(--spacing-lg);
    }

    button {
        padding: var(--spacing-sm) var(--spacing-lg);
        border: none;
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-fast);
    }

    .btn-cancel {
        background: var(--color-gray-300);
        color: var(--color-gray-700);
    }

    .btn-cancel:hover {
        background: var(--color-gray-400);
    }

    .btn-no-email {
        background: var(--color-warning);
        color: white;
    }

    .btn-no-email:hover {
        background: #d97706;
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
    }

    .btn-confirm {
        background: var(--color-success);
        color: white;
    }

    .btn-confirm:hover {
        background: var(--color-success-hover);
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
    }

    p {
        margin: var(--spacing-xs) 0;
        color: var(--color-gray-600);
        line-height: 1.5;
    }
</style>
