<script>
    import { getFirestore, doc, getDoc } from 'firebase/firestore';
    import { app } from '$lib/FireBase.js';
    
    /** @typedef {import('$lib/types').Job} Job */
    /** @typedef {import('$lib/types').JobToggleReadyHandler} JobToggleReadyHandler */
    /** @typedef {import('$lib/types').JobEditHandler} JobEditHandler */
    /** @typedef {import('$lib/types').JobIdHandler} JobIdHandler */
    /** @typedef {import('$lib/types').ShipmentAddress} ShipmentAddress */

    /** @type {{ job: Job, index: number, onToggleReady: JobToggleReadyHandler, onArchive: JobIdHandler, onDelete: JobIdHandler }} */
    let { 
        job,
        index,
        onToggleReady,
        onArchive,
        onDelete
    } = $props();

    const db = getFirestore(app);
    
    /** @type {ShipmentAddress | null} */
    let shipmentAddress = $state(null);
    let shipmentAddressLoading = $state(false);

    /** @param {number | string} value */
    function formatAmount(value) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
            return '0,00';
        }

        return numericValue.toLocaleString('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Lädt die Lieferadresse aus Firestore
     */
    async function loadShipmentAddress() {
        if (!job.shipmentAddressId || shipmentAddressLoading) return;
        
        shipmentAddressLoading = true;
        try {
            const addressRef = doc(db, 'shipmentAddresses', job.shipmentAddressId);
            const addressSnap = await getDoc(addressRef);
            
            if (addressSnap.exists()) {
                shipmentAddress = /** @type {ShipmentAddress} */ ({ id: addressSnap.id, ...addressSnap.data() });
            }
        } catch (error) {
            console.error('Fehler beim Laden der Lieferadresse:', error);
        } finally {
            shipmentAddressLoading = false;
        }
    }

    /**
     * Formatiert die Lieferadresse für den Tooltip
     */
    function formatShipmentAddress() {
        if (!shipmentAddress) return '';
        
        const parts = [];
        if (shipmentAddress.name) parts.push(shipmentAddress.name);
        if (shipmentAddress.street) parts.push(shipmentAddress.street);
        if (shipmentAddress.zip || shipmentAddress.city) {
            parts.push(`${shipmentAddress.zip || ''} ${shipmentAddress.city || ''}`.trim());
        }
        
        return parts.join('\n');
    }

    /**
     * Formatiert die Rechnungsadresse aus den Jobdaten für den Tooltip
     */
    function formatBillingAddress() {
        const b = job.billingAdress;
        if (!b) return '';

        const parts = [];
        if (b.firma) parts.push(b.firma);
        if (b.strasse) parts.push(b.strasse);
        if (b.plz || b.ort) {
            parts.push(`${b.plz || ''} ${b.ort || ''}`.trim());
        }
        if (b.land) parts.push(b.land);

        return parts.join('\n');
    }

    // Lade Lieferadresse wenn shipmentAddressId vorhanden
    $effect(() => {
        if (job.shipmentAddressId) {
            loadShipmentAddress();
        }
    });
</script>

<div class="finished-joblist {index % 2 === 0 ? 'secondRow' : ''} {job.FixGuenstig ? 'fixguenstig' : ''}">
    <div class="jobstart">
        <p title={new Date(job.jobstart * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}>
            {new Date(job.jobstart * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
    </div>
    <div class="customer">
        <p title={job.customer}><strong>{job.customer}</strong></p>
    </div>
    <div class="jobname">
        <p title={job.jobname}>
            <span class="jobname-text">{job.jobname}</span>
            {#if job.shipmentAddressId}
                <span 
                    class="shipment-indicator" 
                    title={shipmentAddress ? `Abweichende Lieferadresse:\n${formatShipmentAddress()}` : 'Abweichende Lieferadresse (wird geladen...)'}>
                    📦
                </span>
            {/if}
            {#if job.billingAdress}
                <span
                    class="billing-indicator"
                    title={`Abweichende Rechnungsadresse:\n${formatBillingAddress()}`}>
                    🧾
                </span>
            {/if}
            {#if job.billingEmail}
                <span
                    class="billing-email-indicator"
                    title={`Abweichende Rechnungs-E-Mail:\n${job.billingEmail}`}>
                    📧
                </span>
            {/if}
        </p>
    </div>
    <div class="quantity"><p><strong>{job.quantity}</strong> Stck</p></div>
    <div class="details">
        <p title={job.details}>{job.details}</p>
    </div>
    <div class="amount">
        <p>
            <strong>{formatAmount(job.amount)}</strong> Euro
            <span class="vat-rate">{job.vatRate ?? 19}%</span>
        </p>
    </div>
    <div class="producer">
        <p title={job.producer}>{job.producer}</p>
    </div>
    
    <button 
        class="btn-invoice"
        onclick={() => onToggleReady("invoice", job.id, Boolean(job.invoice_ready))}
    >
        {job.invoice_ready ? '✓ Rechnung' : 'Rechnung'}
    </button>
    
    <button onclick={() => onArchive(job.id)}>
        Archiv
    </button>
    <button onclick={() => onDelete(job.id)}>
        Löschen
    </button>
</div>

<style>
    .finished-joblist {
        display: grid;
        grid-template-columns: 
            120px          /* Datum */
            130px          /* Kunde */
            150px          /* Jobname */
            90px           /* Menge */
            minmax(150px, 1fr)    /* Details */
            150px          /* Betrag + MwSt. */
            80px           /* Produzent */
            88px 88px 88px;  /* 3 Buttons: Rechnung, Archiv, Löschen */
        gap: 8px;
        align-items: center;
        background: var(--color-white);
        border: 1px solid var(--color-gray-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-md) var(--spacing-lg);
        transition: all var(--transition-fast);
        box-shadow: var(--shadow-sm);
    }

    .finished-joblist:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--color-gray-300);
    }

    .secondRow {
        background: var(--color-gray-50);
    }

    .fixguenstig {
        background: #FFF9C4 !important;
    }

    .fixguenstig:hover {
        background: #FFF59D !important;
    }

    .finished-joblist > div {
        min-width: 0;
    }

    .finished-joblist > div p[title] {
        cursor: help;
    }

    .jobstart {
        font-size: var(--font-size-sm);
        color: var(--color-gray-600);
        font-weight: 500;
    }

    .jobstart p {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .customer {
        font-weight: 600;
        color: var(--color-gray-900);
        font-size: var(--font-size-sm);
    }

    .customer p {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .jobname {
        color: var(--color-gray-700);
        font-size: var(--font-size-sm);
    }

    .jobname p {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .jobname-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        min-width: 0;
    }

    .quantity {
        font-weight: 600;
        color: var(--color-primary);
        text-align: center;
        font-size: var(--font-size-sm);
    }

    .quantity p {
        white-space: nowrap;
    }

    .details {
        color: var(--color-gray-600);
        font-size: var(--font-size-sm);
    }

    .details p {
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        line-clamp: 2;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.4;
        max-height: 2.8em;
    }

    .amount {
        font-weight: 700;
        color: var(--color-success);
        text-align: right;
    }

    .amount p {
        white-space: nowrap;
    }

    .producer {
        text-transform: uppercase;
        font-weight: 600;
        font-size: var(--font-size-xs);
        color: var(--color-gray-500);
        background: var(--color-gray-100);
        padding: 4px 6px;
        border-radius: var(--radius-sm);
        text-align: center;
    }

    .producer p {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    button {
        padding: var(--spacing-xs) var(--spacing-sm);
        font-size: var(--font-size-xs);
        font-weight: 600;
        white-space: nowrap;
        height: 32px;
    }

    .btn-invoice {
        background: var(--color-warning);
        color: white;
    }

    .btn-invoice:hover {
        background: var(--color-warning-hover);
    }

    button:nth-of-type(2) {
        background: var(--color-info);
        color: white;
    }

    button:nth-of-type(2):hover {
        background: var(--color-info-hover);
    }

    button:nth-of-type(3) {
        background: var(--color-danger);
        color: white;
    }

    button:nth-of-type(3):hover {
        background: var(--color-danger-hover);
    }

    p {
        margin: 0;
    }

    .vat-rate {
        margin-left: 8px;
        color: var(--color-gray-600);
        font-size: 0.9em;
        font-weight: normal;
    }

    .shipment-indicator {
        margin-left: 6px;
        cursor: help;
        font-size: 1.1em;
        display: inline-block;
        transition: transform 0.2s ease;
    }

    .shipment-indicator:hover {
        transform: scale(1.2);
    }

    .billing-indicator,
    .billing-email-indicator {
        margin-left: 6px;
        cursor: help;
        font-size: 1.0em;
        display: inline-block;
        transition: transform 0.15s ease;
        color: var(--color-gray-700);
    }

    .billing-indicator:hover,
    .billing-email-indicator:hover {
        transform: scale(1.2);
    }
</style>
