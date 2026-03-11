<script>
    import { tick } from 'svelte';

    /** @typedef {import('$lib/types').CustomerCompleteHandler} CustomerCompleteHandler */

    /** @type {{ show?: boolean, onComplete?: CustomerCompleteHandler | null }} */
    let { 
        show = $bindable(false),
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
    let invoiceMail = $state('');
    /** @type {import('$lib/types').Contact[]} */
    let additionalContacts = $state([]);
    let error = $state('');
    /** @type {HTMLInputElement | undefined} */
    let activeInput = $state(undefined);

    $effect(() => {
        if (show) {
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

        if (invoiceMail.trim() && !isValidEmail(invoiceMail.trim())) {
            error = 'Bitte gültige abweichende Rechnungs-E-Mail eingeben';
            return false;
        }

        for (let i = 0; i < additionalContacts.length; i++) {
            const c = additionalContacts[i];
            if (c.email.trim() && !isValidEmail(c.email.trim())) {
                error = `Bitte gültige E-Mail für Ansprechpartner ${i + 1} eingeben`;
                return false;
            }
        }

        return true;
    }

    function buildContacts() {
        return additionalContacts
            .filter(c => c.firstName.trim() || c.lastName.trim() || c.email.trim())
            .map(c => /** @type {import('$lib/types').Contact} */ ({
                firstName: c.firstName.trim(),
                lastName: c.lastName.trim(),
                email: c.email.trim().toLowerCase(),
                ...(c.invoiceMail?.trim() ? { invoiceMail: c.invoiceMail.trim().toLowerCase() } : {})
            }));
    }

    function addContact() {
        additionalContacts = [...additionalContacts, { firstName: '', lastName: '', email: '', invoiceMail: '' }];
    }

    /** @param {number} index */
    function removeContact(index) {
        additionalContacts = additionalContacts.filter((_, i) => i !== index);
    }

    async function handleComplete() {
        if (!validateForm()) {
            return;
        }

        try {
            if (onComplete) {
                const validContacts = buildContacts();
                await onComplete({
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    company: company.trim(),
                    address: address.trim(),
                    zip: zip.trim(),
                    city: city.trim(),
                    countryCode: countryCode.trim().toUpperCase(),
                    email: email.trim().toLowerCase(),
                    ...(invoiceMail.trim() ? { invoiceMail: invoiceMail.trim().toLowerCase() } : {}),
                    ...(validContacts.length > 0 ? { contacts: validContacts } : {})
                });
            }
            reset();
        } catch (err) {
            error = `Fehler beim Anlegen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`;
        }
    }

    function handleCancel() {
        reset();
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

    function reset() {
        show = false;
        firstName = '';
        lastName = '';
        company = '';
        address = '';
        zip = '';
        city = '';
        countryCode = 'DE';
        email = '';
        invoiceMail = '';
        additionalContacts = [];
        error = '';
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
        <div class="modal" role="dialog" aria-modal="true" aria-label="Neuen Kunden anlegen">
            <h3>Neuen Kunden anlegen</h3>

            <div class="form-grid">
                <div>
                    <label for="first-name">Vorname *</label>
                    <input
                        id="first-name"
                        type="text"
                        bind:value={firstName}
                        bind:this={activeInput}
                        placeholder="Max"
                    />
                </div>

                <div>
                    <label for="last-name">Nachname *</label>
                    <input
                        id="last-name"
                        type="text"
                        bind:value={lastName}
                        placeholder="Mustermann"
                    />
                </div>

                <div class="full-width">
                    <label for="company">Firma (optional)</label>
                    <input
                        id="company"
                        type="text"
                        bind:value={company}
                        placeholder="Muster GmbH"
                    />
                </div>

                <div class="full-width">
                    <label for="address">Straße + Hausnummer *</label>
                    <input
                        id="address"
                        type="text"
                        bind:value={address}
                        placeholder="Musterstraße 123"
                    />
                </div>

                <div>
                    <label for="zip">Postleitzahl *</label>
                    <input
                        id="zip"
                        type="text"
                        bind:value={zip}
                        placeholder="12345"
                    />
                </div>

                <div>
                    <label for="city">Ort *</label>
                    <input
                        id="city"
                        type="text"
                        bind:value={city}
                        placeholder="Musterstadt"
                    />
                </div>

                <div>
                    <label for="country-code">Ländercode *</label>
                    <input
                        id="country-code"
                        type="text"
                        bind:value={countryCode}
                        placeholder="DE"
                        maxlength="2"
                    />
                </div>

                <div>
                    <label for="email">E-Mail *</label>
                    <input
                        id="email"
                        type="email"
                        bind:value={email}
                        placeholder="kunde@firma.de"
                    />
                </div>

                <div class="full-width">
                    <label for="invoice-mail">Abweichende E-Mail für Rechnung (optional)</label>
                    <input
                        id="invoice-mail"
                        type="email"
                        bind:value={invoiceMail}
                        placeholder="rechnung@firma.de"
                    />
                </div>
            </div>

            <div class="contacts-section">
                <div class="contacts-header">
                    <span class="contacts-title">Weitere Ansprechpartner (optional)</span>
                    <button type="button" class="btn-add-contact" onclick={addContact}>+ Hinzufügen</button>
                </div>
                {#each additionalContacts as _, i}
                    <div class="contact-row">
                        <input type="text" bind:value={additionalContacts[i].firstName} placeholder="Vorname" />
                        <input type="text" bind:value={additionalContacts[i].lastName} placeholder="Nachname" />
                        <input type="email" bind:value={additionalContacts[i].email} placeholder="E-Mail" />
                        <input type="email" bind:value={additionalContacts[i].invoiceMail} placeholder="Rechnungs-E-Mail (opt.)" />
                        <button type="button" class="btn-remove-contact" onclick={() => removeContact(i)}>✕</button>
                    </div>
                {/each}
            </div>
            
            {#if error}
                <p class="error">{error}</p>
            {/if}
            
            <div class="modal-buttons">
                <button class="btn-cancel" onclick={handleCancel}>Abbrechen</button>
                <button class="btn-confirm" onclick={handleComplete}>Kunde anlegen</button>
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
        margin-bottom: var(--spacing-md);
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

    .contacts-section {
        margin-top: var(--spacing-lg);
        border-top: 1px solid var(--color-gray-200);
        padding-top: var(--spacing-md);
    }

    .contacts-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--spacing-sm);
    }

    .contacts-title {
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--color-gray-600);
    }

    .btn-add-contact {
        background: var(--color-primary);
        color: white;
        border: none;
        padding: var(--spacing-xs) var(--spacing-md);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: var(--font-size-sm);
        font-weight: 600;
    }

    .btn-add-contact:hover {
        opacity: 0.85;
    }

    .contact-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr auto;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-sm);
        align-items: center;
    }

    .btn-remove-contact {
        background: var(--color-danger);
        color: white;
        border: none;
        width: 28px;
        height: 28px;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: var(--font-size-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    }

    .btn-remove-contact:hover {
        opacity: 0.85;
    }
</style>
