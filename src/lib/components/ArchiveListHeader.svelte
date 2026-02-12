<script>
</script>

<div class="archive-list-header">
    <div class="header-item">Datum</div>
    <div class="header-item">Kunde</div>
    <div class="header-item">Auftr.</div>
    <div class="header-item">Menge</div>
    <div class="header-item">Det.</div>
    <div class="header-item">Betrag</div>
    <div class="header-item">Prod.</div>
    <div class="header-item">Aktion</div>
</div>

<style>
    .archive-list-header {
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
        background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
        border-radius: var(--radius-lg);
        padding: var(--spacing-md) var(--spacing-lg);
        margin-bottom: var(--spacing-sm);
        box-shadow: var(--shadow-sm);
    }

    .header-item {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .header-item:nth-child(4) {
        text-align: center;
    }

    .header-item:nth-child(6) {
        text-align: right;
    }

    .header-item:nth-child(7) {
        text-align: center;
    }

    .header-item:last-child {
        text-align: center;
    }
</style>
