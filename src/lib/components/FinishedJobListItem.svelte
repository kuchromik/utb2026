<script>
    /** @typedef {import('$lib/types').Job} Job */
    /** @typedef {import('$lib/types').JobToggleReadyHandler} JobToggleReadyHandler */
    /** @typedef {import('$lib/types').JobEditHandler} JobEditHandler */
    /** @typedef {import('$lib/types').JobIdHandler} JobIdHandler */

    /** @type {{ job: Job, index: number, onToggleReady: JobToggleReadyHandler, onArchive: JobIdHandler, onDelete: JobIdHandler }} */
    let { 
        job,
        index,
        onToggleReady,
        onArchive,
        onDelete
    } = $props();

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
        <p title={job.jobname}>{job.jobname}</p>
    </div>
    <div class="quantity"><p><strong>{job.quantity}</strong> Stck</p></div>
    <div class="details">
        <p title={job.details}>{job.details}</p>
    </div>
    <div class="amount"><p><strong>{formatAmount(job.amount)}</strong> Euro</p></div>
    <div class="producer">
        <p title={job.producer}>{job.producer}</p>
    </div>
    
    <div class="ready">
        <label>
            Rechnung?
            <input 
                type="checkbox" 
                name="Rechnung?" 
                checked={Boolean(job.invoice_ready)}
                onchange={(event) => {
                    const target = /** @type {HTMLInputElement} */ (event.currentTarget);
                    onToggleReady("invoice", job.id, !target.checked);
                }}
            />
        </label>
    </div>
    
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
            100px          /* Betrag */
            80px           /* Produzent */
            60px           /* Rechnung Checkbox */
            88px 88px 88px;  /* Buttons (3, aber nur 2 verwendet) */
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
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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

    .ready {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 60px;
    }

    .ready label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        font-size: var(--font-size-xs);
        color: var(--color-gray-600);
        cursor: pointer;
        white-space: nowrap;
    }

    .ready input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: var(--color-success);
        flex-shrink: 0;
    }

    button {
        padding: var(--spacing-xs) var(--spacing-sm);
        font-size: var(--font-size-xs);
        font-weight: 600;
        white-space: nowrap;
        height: 32px;
        min-width: 80px;
    }

    button:nth-of-type(1) {
        background: var(--color-info);
        color: white;
    }

    button:nth-of-type(1):hover {
        background: var(--color-info-hover);
    }

    button:nth-of-type(2) {
        background: var(--color-danger);
        color: white;
    }

    button:nth-of-type(2):hover {
        background: var(--color-danger-hover);
    }

    p {
        margin: 0;
    }
</style>
