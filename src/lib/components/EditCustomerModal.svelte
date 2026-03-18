<script>
    import { tick, untrack } from 'svelte';

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
    let invoiceMail = $state('');
    let single = $state(false);
    /** @type {import('$lib/types').Contact[]} */
    let additionalContacts = $state([]);
    let error = $state('');
    /** @type {HTMLInputElement | undefined} */
    let activeInput = $state(undefined);

    $effect(() => {
        // Nur show und customer-ID als Trigger tracken
        const isOpen = show;
        const customerId = customer?.id;

        if (isOpen && customer) {
            // customer-Properties mit untrack lesen, damit deren Änderungen
            // den Effect nicht erneut auslösen (verhindert Reset beim Checkbox-Klick)
            untrack(() => {
                firstName = customer.firstName ?? '';
                lastName = customer.lastName ?? '';
                company = customer.company ?? '';
                address = customer.address ?? '';
                zip = customer.zip ?? '';
                city = customer.city ?? '';
                countryCode = customer.countryCode ?? 'DE';
                email = customer.email ?? '';
                invoiceMail = customer.invoiceMail ?? '';
                single = customer.single ?? false;
                additionalContacts = customer.contacts ? customer.contacts.map(c => ({ ...c })) : [];
                error = '';
            });

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

    async function handleSave() {
        if (!customer || !validateForm()) {
            return;
        }

        try {
            if (onComplete) {
                const validContacts = buildContacts();
                await onComplete({
                    ...customer,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    company: company.trim(),
                    address: address.trim(),
                    zip: zip.trim(),
                    city: city.trim(),
                    countryCode: countryCode.trim().toUpperCase(),
                    email: email.trim().toLowerCase(),
                    invoiceMail: invoiceMail.trim().toLowerCase() || undefined,
                    single,
                    contacts: validContacts.length > 0 ? validContacts : undefined
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

                <div class="full-width">
                    <label for="edit-invoice-mail">Abweichende Rechnungs-E-Mail (optional)</label>
                    <input id="edit-invoice-mail" type="email" bind:value={invoiceMail} placeholder="z.B. buchhaltung@firma.de" />
                    <p class="hint">Wenn angegeben, werden Rechnungen immer an diese Adresse versendet (statt an die Haupt-E-Mail).</p>
                </div>

                <div class="full-width checkbox-row">
                    <label class="checkbox-label">
                        <input id="edit-single" type="checkbox" bind:checked={single} />
                        Einzelunternehmen?
                    </label>
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

    .checkbox-row {
        display: flex;
        align-items: center;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .checkbox-label input[type="checkbox"] {
        width: 1.1rem;
        height: 1.1rem;
        cursor: pointer;
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

    .hint {
        font-size: var(--font-size-xs);
        color: var(--color-gray-500);
        margin-top: var(--spacing-xs);
        font-style: italic;
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
