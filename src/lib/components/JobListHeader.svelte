<script>
</script>

<div class="job-list-header">
    <div class="header-item">Datum</div>
    <div class="header-item">Kunde</div>
    <div class="header-item">Auftrag</div>
    <div class="header-item">Menge</div>
    <div class="header-item">Det.</div>
    <div class="header-item">Betrag</div>
    <div class="header-item">Prod.</div>
    <div class="header-item">Pap.</div>
    <div class="header-item">Plat.</div>
    <div class="header-item">Druck</div>
    <div class="header-item">Klar?</div>
    <div class="header-item">Vers.</div>
    <div class="header-item" style="grid-column: span 2; text-align: center;">Aktion</div>
</div>

<style>
    .job-list-header {
        display: grid;
        grid-template-columns: 
            120px          /* Datum */
            130px          /* Kunde */
            150px          /* Jobname */
            90px           /* Menge */
            minmax(150px, 1fr)    /* Details */
            100px          /* Betrag */
            80px           /* Produzent */
            60px 60px 60px 60px 60px  /* Checkboxen (5: Papier, Platten, Druck, Klar, Versand) */
            90px 90px;  /* Buttons (2: Bearbeiten, Löschen) */
        gap: 8px;
        align-items: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

    .header-item:nth-child(4),
    .header-item:nth-child(6) {
        text-align: center;
    }

    .header-item:nth-child(6) {
        text-align: right;
    }

    .header-item:nth-child(n+8):nth-child(-n+12) {
        text-align: center;
        font-size: var(--font-size-xs);
    }
</style>
