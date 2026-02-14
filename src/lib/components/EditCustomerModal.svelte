<script>
    import { tick } from 'svelte';

    /** @typedef {import('$lib/types').Customer} Customer */
    /** @typedef {import('$lib/types').CustomerCompleteHandler} CustomerCompleteHandler */

    /** @type {{ show?: boolean, customer?: Customer | null, onComplete?: CustomerCompleteHandler | null }} */
    let {
        show = $bindable(false),
        customer = null,
        onComplete = null
    } = $props();

    let firstName = $state('');
    let lastName = $state('');
    let company = $state('');
    let address = $state('');
    let zip = $state('');
    let city = $state('');
    let countryCode = $state('DE');
    let email = $state('');
    let error = $state('');
    /** @type {HTMLInputElement | undefined} */
    let activeInput = $state(undefined);

    $effect(() => {
        if (show && customer) {
            firstName = customer.firstName ?? '';
            lastName = customer.lastName ?? '';
            company = customer.company ?? '';
            address = customer.address ?? '';
            zip = customer.zip ?? '';
            city = customer.city ?? '';
            countryCode = customer.countryCode ?? 'DE';
            email = customer.email ?? '';
            error = '';

            tick().then(() => activeInput?.focus());
        }
    });

    /** @param {string} value */
    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function validateForm() {
        error = '';

        if (!firstName.trim()) {
            error = 'Bitte Vorname eingeben';
            return false;
        }

        if (!lastName.trim()) {
            error = 'Bitte Nachname eingeben';
            return false;
        }

        if (!address.trim()) {
            error = 'Bitte Straße und Hausnummer eingeben';
            return false;
        }

        if (!zip.trim()) {
            error = 'Bitte Postleitzahl eingeben';
            return false;
        }

        if (!city.trim()) {
            error = 'Bitte Ort eingeben';
            return false;
        }

        if (!countryCode.trim()) {
            error = 'Bitte Ländercode eingeben';
            return false;
        }

        if (!email.trim()) {
            error = 'Bitte E-Mail eingeben';
            return false;
        }

        if (!isValidEmail(email.trim())) {
            error = 'Bitte gültige E-Mail eingeben';
            return false;
        }

        return true;
    }

    async function handleSave() {
        if (!customer || !validateForm()) {
            return;
        }

        try {
            if (onComplete) {
                await onComplete({
                    ...customer,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    company: company.trim(),
                    address: address.trim(),
                    zip: zip.trim(),
                    city: city.trim(),
                    countryCode: countryCode.trim().toUpperCase(),
                    email: email.trim().toLowerCase()
                });
            }
            show = false;
        } catch (err) {
            error = `Fehler beim Speichern: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`;
        }
    }

    function handleCancel() {
        show = false;
        error = '';
    }

    /** @param {MouseEvent} event */
    function handleBackdropClick(event) {
        if (event.target === event.currentTarget) {
            handleCancel();
        }
    }

    /** @param {KeyboardEvent} event */
    function handleBackdropKeydown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            handleCancel();
        }
    }
</script>

{#if show}
    <div
        class="modal-backdrop"
        role="button"
        tabindex="0"
        aria-label="Dialog schließen"
        onclick={handleBackdropClick}
        onkeydown={handleBackdropKeydown}
    >
        <div class="modal" role="dialog" aria-modal="true" aria-label="Kunde bearbeiten">
            <h3>Kunde bearbeiten</h3>

            <div class="form-grid">
                <div>
                    <label for="edit-first-name">Vorname *</label>
                    <input id="edit-first-name" type="text" bind:value={firstName} bind:this={activeInput} />
                </div>

                <div>
                    <label for="edit-last-name">Nachname *</label>
                    <input id="edit-last-name" type="text" bind:value={lastName} />
                </div>

                <div class="full-width">
                    <label for="edit-company">Firma (optional)</label>
                    <input id="edit-company" type="text" bind:value={company} />
                </div>

                <div class="full-width">
                    <label for="edit-address">Straße + Hausnummer *</label>
                    <input id="edit-address" type="text" bind:value={address} />
                </div>

                <div>
                    <label for="edit-zip">Postleitzahl *</label>
                    <input id="edit-zip" type="text" bind:value={zip} />
                </div>

                <div>
                    <label for="edit-city">Ort *</label>
                    <input id="edit-city" type="text" bind:value={city} />
                </div>

                <div>
                    <label for="edit-country-code">Ländercode *</label>
                    <input id="edit-country-code" type="text" bind:value={countryCode} maxlength="2" />
                </div>

                <div>
                    <label for="edit-email">E-Mail *</label>
                    <input id="edit-email" type="email" bind:value={email} />
                </div>
            </div>

            {#if error}
                <p class="error">{error}</p>
            {/if}

            <div class="modal-buttons">
                <button class="btn-cancel" onclick={handleCancel}>Abbrechen</button>
                <button class="btn-confirm" onclick={handleSave}>Speichern</button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
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

    .modal {
        background: white;
        padding: var(--spacing-2xl);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-xl);
        min-width: 680px;
        max-width: 760px;
        animation: slideIn 0.3s ease-out;
    }

    .modal h3 {
        font-size: var(--font-size-2xl);
        font-weight: 700;
        margin-bottom: var(--spacing-xl);
        color: var(--color-gray-900);
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
    }

    .modal h3::before {
        content: '';
        width: 40px;
        height: 4px;
        background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
        border-radius: 2px;
    }

    .modal label {
        display: block;
        font-size: var(--font-size-base);
        font-weight: 600;
        margin-bottom: var(--spacing-sm);
        color: var(--color-gray-700);
    }

    .modal input {
        width: 100%;
        padding: var(--spacing-md);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        transition: all var(--transition-fast);
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-md);
    }

    .full-width {
        grid-column: 1 / -1;
    }

    .modal input:hover {
        border-color: var(--color-gray-400);
    }

    .modal input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    .error {
        color: var(--color-danger);
        font-size: var(--font-size-sm);
        font-weight: 600;
        background: var(--color-danger-light);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--radius-md);
        margin-top: var(--spacing-md);
        border-left: 4px solid var(--color-danger);
    }

    .modal-buttons {
        display: flex;
        gap: var(--spacing-md);
        justify-content: flex-end;
        margin-top: var(--spacing-lg);
        padding-top: var(--spacing-lg);
        border-top: 1px solid var(--color-gray-200);
    }

    .btn-cancel {
        background: var(--color-gray-200);
        color: var(--color-gray-700);
        border: none;
        padding: var(--spacing-sm) var(--spacing-xl);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: var(--font-size-base);
        font-weight: 600;
        transition: all var(--transition-fast);
    }

    .btn-cancel:hover {
        background: var(--color-gray-300);
    }

    .btn-confirm {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: var(--spacing-sm) var(--spacing-xl);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: var(--font-size-base);
        font-weight: 600;
        transition: all var(--transition-fast);
    }

    .btn-confirm:hover {
        background: linear-gradient(135deg, #5568d3 0%, #6a4190 100%);
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
    }
</style>
