<script>
    import { tick } from 'svelte';
    import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
    import { app } from '$lib/FireBase.js';

    /** @typedef {{ id?: string, name?: string, street?: string, zip?: string, city?: string, countryCode?: string }} ShipmentAddressValue */
    /** @typedef {import('$lib/types').ShipmentAddress} ShipmentAddress */

    /** @type {{ show?: boolean, customerId?: string, initialValue?: ShipmentAddressValue, onSave: (value: ShipmentAddressValue) => void, onCancel?: (() => void) | null }} */
    let {
        show = $bindable(false),
        customerId = '',
        initialValue = {},
        onSave,
        onCancel = null
    } = $props();

    const db = getFirestore(app);

    /** @type {ShipmentAddressValue} */
    let localValue = $state({ name: '', street: '', zip: '', city: '', countryCode: 'DE' });

    /** @type {ShipmentAddress[]} */
    let existingAddresses = $state([]);
    let loadingAddresses = $state(false);

    /** @type {ShipmentAddress | null} */
    let selectedAddress = $state(/** @type {ShipmentAddress | null} */(null));

    const isUnmodified = $derived(
        selectedAddress !== null &&
        localValue.name === (selectedAddress.name ?? '') &&
        localValue.street === (selectedAddress.street ?? '') &&
        localValue.zip === (selectedAddress.zip ?? '') &&
        localValue.city === (selectedAddress.city ?? '') &&
        localValue.countryCode === (selectedAddress.countryCode ?? 'DE')
    );

    /** @type {HTMLInputElement | undefined} */
    let nameRef = $state(undefined);

    $effect(() => {
        if (show) {
            localValue = {
                name: initialValue.name ?? '',
                street: initialValue.street ?? '',
                zip: initialValue.zip ?? '',
                city: initialValue.city ?? '',
                countryCode: initialValue.countryCode ?? 'DE'
            };
            selectedAddress = null;
            loadExistingAddresses();
            tick().then(() => nameRef?.focus());
        } else {
            existingAddresses = [];
            selectedAddress = null;
        }
    });

    async function loadExistingAddresses() {
        if (!customerId) return;
        loadingAddresses = true;
        try {
            const q = query(
                collection(db, 'shipmentAddresses'),
                where('customerId', '==', customerId),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            existingAddresses = snap.docs.map(d => /** @type {ShipmentAddress} */ ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error('Fehler beim Laden der Versandadressen:', e);
            existingAddresses = [];
        } finally {
            loadingAddresses = false;
        }
    }

    /** @param {ShipmentAddress} addr */
    function selectExisting(addr) {
        selectedAddress = addr;
        localValue = {
            name: addr.name ?? '',
            street: addr.street ?? '',
            zip: addr.zip ?? '',
            city: addr.city ?? '',
            countryCode: addr.countryCode ?? 'DE'
        };
    }

    /** @param {ShipmentAddress} addr */
    function formatAddressLine(addr) {
        return [
            addr.name,
            addr.street,
            [addr.zip, addr.city].filter(Boolean).join(' ')
        ].filter(Boolean).join(', ');
    }

    function handleSave() {
        const id = isUnmodified && selectedAddress?.id ? selectedAddress.id : undefined;
        onSave(id ? { ...localValue, id } : { ...localValue });
        show = false;
    }

    function handleClear() {
        onSave({});
        show = false;
    }

    function handleCancel() {
        if (onCancel) onCancel();
        show = false;
    }

    /** @param {MouseEvent} event */
    function handleBackdropClick(event) {
        if (event.target === event.currentTarget) {
            handleCancel();
        }
    }

    /** @param {KeyboardEvent} e */
    function handleKeydown(e) {
        if (e.key === 'Escape') {
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
        onkeydown={handleKeydown}
    >
        <div class="modal" role="dialog" aria-modal="true" aria-label="Abweichende Versandadresse">
            <h3>Abweichende Versandadresse</h3>

            {#if loadingAddresses}
                <p class="loading-hint">Lade gespeicherte Adressen…</p>
            {:else if existingAddresses.length > 0}
                <div class="existing-section">
                    <p class="existing-label">Gespeicherte Adressen für diesen Kunden:</p>
                    <ul class="existing-list">
                        {#each existingAddresses as addr (addr.id)}
                            <li>
                                <button
                                    type="button"
                                    class="existing-item"
                                    onclick={() => selectExisting(addr)}
                                >
                                    {formatAddressLine(addr)}
                                </button>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}

            <div class="form-fields">
                <label class="field-label" for="sa-name">Empfänger / Firma</label>
                <input
                    id="sa-name"
                    bind:this={nameRef}
                    type="text"
                    bind:value={localValue.name}
                    placeholder="Name oder Firma"
                />

                <label class="field-label" for="sa-street">Straße und Hausnummer</label>
                <input
                    id="sa-street"
                    type="text"
                    bind:value={localValue.street}
                    placeholder="Straße und Hausnummer"
                />

                <div class="zip-city-row">
                    <div>
                        <label class="field-label" for="sa-zip">PLZ</label>
                        <input
                            id="sa-zip"
                            type="text"
                            bind:value={localValue.zip}
                            placeholder="PLZ"
                        />
                    </div>
                    <div class="city-col">
                        <label class="field-label" for="sa-city">Ort</label>
                        <input
                            id="sa-city"
                            type="text"
                            bind:value={localValue.city}
                            placeholder="Ort"
                        />
                    </div>
                    <div>
                        <label class="field-label" for="sa-country">Länderkürzel</label>
                        <input
                            id="sa-country"
                            type="text"
                            bind:value={localValue.countryCode}
                            placeholder="DE"
                            class="country-field"
                            maxlength="3"
                        />
                    </div>
                </div>
            </div>
            <div class="modal-buttons">
                <button class="btn-cancel" onclick={handleCancel}>Abbrechen</button>
                <button class="btn-clear" onclick={handleClear}>Adresse entfernen</button>
                <button class="btn-save" onclick={handleSave}>Übernehmen</button>
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

    .modal {
        background: white;
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-xl, 24px);
        width: min(500px, 90vw);
        box-shadow: var(--shadow-xl, 0 20px 60px rgba(0,0,0,0.3));
        animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    h3 {
        margin: 0 0 var(--spacing-lg, 16px);
        font-size: var(--font-size-lg, 1.1rem);
        color: var(--color-gray-800, #1f2937);
    }

    .form-fields {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-lg, 16px);
    }

    .field-label {
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 600;
        color: var(--color-gray-700, #374151);
        margin-bottom: 2px;
        display: block;
    }

    input {
        width: 100%;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
        border: 1px solid var(--color-gray-300, #d1d5db);
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-base, 1rem);
        box-sizing: border-box;
        transition: border-color 0.15s;
    }

    input:focus {
        outline: none;
        border-color: var(--color-primary, #6366f1);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .zip-city-row {
        display: grid;
        grid-template-columns: 100px 1fr 70px;
        gap: var(--spacing-sm, 8px);
        align-items: end;
    }

    .zip-city-row > div {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .city-col {
        flex: 1;
    }

    .country-field {
        text-transform: uppercase;
    }

    .modal-buttons {
        display: flex;
        gap: var(--spacing-sm, 8px);
        justify-content: flex-end;
        margin-top: var(--spacing-md, 12px);
    }

    button {
        padding: var(--spacing-sm, 8px) var(--spacing-lg, 16px);
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.15s;
    }

    .btn-cancel {
        background: var(--color-gray-100, #f3f4f6);
        color: var(--color-gray-700, #374151);
    }

    .btn-cancel:hover {
        background: var(--color-gray-200, #e5e7eb);
    }

    .btn-clear {
        background: transparent;
        color: var(--color-danger, #dc2626);
        border: 1px solid var(--color-danger, #dc2626);
        margin-right: auto;
    }

    .btn-clear:hover {
        background: var(--color-danger, #dc2626);
        color: white;
    }

    .btn-save {
        background: var(--color-primary, #6366f1);
        color: white;
    }

    .btn-save:hover {
        opacity: 0.9;
    }

    .loading-hint {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--color-gray-500, #6b7280);
        margin: 0 0 var(--spacing-md, 12px);
    }

    .existing-section {
        margin-bottom: var(--spacing-md, 12px);
        border: 1px solid var(--color-gray-200, #e5e7eb);
        border-radius: var(--radius-md, 6px);
        overflow: hidden;
    }

    .existing-label {
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 600;
        color: var(--color-gray-600, #4b5563);
        margin: 0;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
        background: var(--color-gray-50, #f9fafb);
        border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
    }

    .existing-list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 160px;
        overflow-y: auto;
    }

    .existing-list li + li {
        border-top: 1px solid var(--color-gray-100, #f3f4f6);
    }

    .existing-item {
        display: block;
        width: 100%;
        text-align: left;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
        background: white;
        border: none;
        border-radius: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--color-gray-700, #374151);
        cursor: pointer;
        font-weight: normal;
        transition: background 0.1s;
    }

    .existing-item:hover {
        background: var(--color-primary-light, #eef2ff);
        color: var(--color-primary, #4f46e5);
    }
</style>
