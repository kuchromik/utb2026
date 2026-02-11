<script>
    let { 
        job,
        index,
        onToggleReady,
        onEdit,
        onArchive,
        onDelete,
        showReadyChecks = true
    } = $props();
</script>

{#if showReadyChecks}
<div class="joblist {index % 2 === 0 ? 'secondRow' : ''}">
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
    <div class="amount"><p><strong>{job.amount}</strong> Euro</p></div>
    <div class="producer">
        <p title={job.producer}>{job.producer}</p>
    </div>
    
    {#if showReadyChecks}
        <div class="ready">
            {#if (job.producer === 'chr' || job.producer === 'doe')}
                <label>
                    Papier?
                    <input 
                        type="checkbox" 
                        name="Papier?" 
                        bind:checked={job.paper_ready} 
                        onclick={() => onToggleReady("paper", job.id, job.paper_ready)}
                    />
                </label>
            {:else}
                <input type="hidden" name="Papier?"/>
            {/if}
        </div>
        
        <div class="ready">
            {#if (job.producer === 'chr')}
                <label>
                    Platten?
                    <input 
                        type="checkbox" 
                        name="Platten?" 
                        bind:checked={job.plates_ready} 
                        onclick={() => onToggleReady("plates", job.id, job.plates_ready)}
                    />
                </label>
            {:else}
                <input type="hidden" name="Platten?"/>
            {/if}
        </div>

        <div class="ready">
            {#if (job.producer === 'chr' || job.producer === 'doe')}
                <label>
                    Druck?
                    <input 
                        type="checkbox" 
                        name="Druck?" 
                        bind:checked={job.print_ready} 
                        onclick={() => onToggleReady("print", job.id, job.print_ready)}
                    />
                </label>
            {:else}
                <input type="hidden" name="Druck?"/>
            {/if}
        </div>
        
        <div class="ready">
            <label>
                Rechnung?
                <input 
                    type="checkbox" 
                    name="Rechnung?" 
                    bind:checked={job.invoice_ready} 
                    onclick={() => onToggleReady("invoice", job.id, job.invoice_ready)}
                />
            </label>
        </div>
        
        <div class="ready">
            <label>
                Zahlung?
                <input 
                    type="checkbox" 
                    name="Zahlung?" 
                    bind:checked={job.payed_ready} 
                    onclick={() => onToggleReady("payed", job.id, job.payed_ready)}
                />
            </label>
        </div>
        
        <button onclick={() => onEdit(job, index)}>
            Bearbeiten
        </button>
        <button onclick={() => onArchive(job.id)}>
            Archiv
        </button>
        <button onclick={() => onDelete(job.id)}>
            Löschen
        </button>
    {/if}
</div>
{:else}
<div class="joblist-archive {index % 2 === 0 ? 'secondRow' : ''}">
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
    <div class="amount"><p><strong>{job.amount}</strong> Euro</p></div>
    <div class="producer">
        <p title={job.producer}>{job.producer}</p>
    </div>
    <button onclick={() => onEdit(job, index)}>
        Kopieren
    </button>
</div>
{/if}

<style>
    .joblist {
        display: grid;
        grid-template-columns: 
            140px          /* Datum */
            minmax(150px, 200px)  /* Kunde */
            minmax(200px, 1fr)    /* Jobname */
            90px           /* Menge */
            minmax(150px, 1fr)    /* Details */
            100px          /* Betrag */
            80px           /* Produzent */
            80px 80px 80px 80px 80px  /* Checkboxen */
            auto auto auto;  /* Buttons */
        gap: var(--spacing-sm);
        align-items: center;
        background: var(--color-white);
        border: 1px solid var(--color-gray-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-md) var(--spacing-lg);
        transition: all var(--transition-fast);
        box-shadow: var(--shadow-sm);
    }

    .joblist:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--color-gray-300);
    }

    .secondRow {
        background: var(--color-gray-50);
    }

    /* Gemeinsame Styles für alle Spalten */
    .joblist > div {
        min-width: 0; /* Wichtig für Text-Overflow */
    }

    .joblist > div p[title],
    .joblist-archive > div p[title] {
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
        min-width: 80px;
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

    /* Button Container für bessere Ausrichtung */
    .button-group {
        display: contents; /* Buttons bleiben im Grid-Flow */
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
        background: var(--color-warning);
        color: white;
    }

    button:nth-of-type(1):hover {
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

    /* Für Archiv-Ansicht (nur Kopieren-Button) */
    .joblist button:only-of-type {
        background: var(--color-info);
        color: white;
        grid-column: -3 / -1; /* Nimmt die letzten 2 Spalten */
        min-width: 100px;
    }

    .joblist button:only-of-type:hover {
        background: var(--color-info-hover);
    }

    /* Archiv-spezifisches Grid-Layout */
    .joblist-archive {
        display: grid;
        grid-template-columns: 
            140px          /* Datum */
            minmax(150px, 200px)  /* Kunde */
            minmax(200px, 1fr)    /* Jobname */
            90px           /* Menge */
            minmax(150px, 1fr)    /* Details */
            100px          /* Betrag */
            100px          /* Produzent */
            100px;         /* Button */
        gap: var(--spacing-sm);
        align-items: center;
        background: var(--color-white);
        border: 1px solid var(--color-gray-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-md) var(--spacing-lg);
        transition: all var(--transition-fast);
        box-shadow: var(--shadow-sm);
    }

    .joblist-archive:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--color-gray-300);
    }

    .joblist-archive.secondRow {
        background: var(--color-gray-50);
    }

    .joblist-archive > div {
        min-width: 0;
    }

    .joblist-archive button {
        background: var(--color-info);
        color: white;
        width: 100%;
    }

    .joblist-archive button:hover {
        background: var(--color-info-hover);
    }

    p {
        margin: 0;
    }
</style>
