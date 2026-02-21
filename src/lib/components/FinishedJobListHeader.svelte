<script>
</script>

<div class="finished-job-list-header">
    <div class="header-item">Datum</div>
    <div class="header-item">Kunde</div>
    <div class="header-item">Auftrag</div>
    <div class="header-item">Menge</div>
    <div class="header-item">Det.</div>
    <div class="header-item">Betrag</div>
    <div class="header-item">Prod.</div>
    <div class="header-item" style="grid-column: span 3; text-align: center;">Aktion</div>
</div>

<style>
    .finished-job-list-header {
        display: grid;
        grid-template-columns: 
            120px          /* Datum */
            130px          /* Kunde */
            150px          /* Jobname */
            90px           /* Menge */
            minmax(150px, 1fr)    /* Details */
            150px          /* Betrag */
            80px           /* Produzent */
            88px 88px 88px;  /* 3 Buttons */
        gap: 8px;
        align-items: center;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
</style>
