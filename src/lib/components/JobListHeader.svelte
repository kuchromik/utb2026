<script>
</script>

<div class="job-list-header">
    <div class="header-item">Datum</div>
    <div class="header-item">Termin</div>
    <div class="header-item">Kunde</div>
    <div class="header-item">Auftrag</div>
    <div class="header-item">Menge</div>
    <div class="header-item">Det.</div>
    <div class="header-item">Betrag</div>
    <div class="header-item">Prod.</div>
    <div class="header-item">Ship?</div>
    <div class="header-item">Dat.</div>
    <div class="header-item">Pap.</div>
    <div class="header-item">Plat.</div>
    <div class="header-item">Druck</div>
    <div class="header-item">Klar?</div>
    <div class="header-item" style="grid-column: span 3; text-align: center;">Akt.</div>
</div>

<style>
    .job-list-header {
        display: grid;
        grid-template-columns: 
            120px          /* Datum */
            88px           /* Liefertermin */
            125px          /* Kunde */
            200px          /* Jobname */
            75px           /* Menge */
            minmax(100px, 1fr)    /* Details */
            120px          /* Betrag */
            65px           /* Produzent */
            48px 48px 48px 48px 48px 48px  /* Checkboxen (6: Papier, Platten, Druck, Daten, Klar, Versand) */
            58px 58px 58px;  /* Buttons (B, L, K) */
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

    .header-item:nth-child(5),
    .header-item:nth-child(7) {
        text-align: center;
    }

    .header-item:nth-child(7) {
        text-align: right;
    }

    .header-item:nth-child(n+9):nth-child(-n+14) {
        text-align: center;
        font-size: var(--font-size-xs);
    }
</style>
