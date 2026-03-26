<script>
</script>

<div class="archive-list-header">
    <div class="header-item">Datum</div>
    <div class="header-item">Liefert.</div>
    <div class="header-item">Kunde</div>
    <div class="header-item">Auftrag</div>
    <div class="header-item">Menge</div>
    <div class="header-item">Det.</div>
    <div class="header-item">Betrag</div>
    <div class="header-item">Prod.</div>
    <div class="header-item">Rg.-Nr.</div>
    <div class="header-item">Rechnungsdatum</div>
    <div class="header-item">Bezahlt am</div>
    <div class="header-item">Aktion</div>
</div>

<style>
    .archive-list-header {
        display: grid;
        grid-template-columns: 
            120px          /* Datum */
            88px           /* Liefertermin */
            125px          /* Kunde */
            150px          /* Jobname */
            75px           /* Menge */
            150px          /* Details */
            120px          /* Betrag */
            90px           /* Produzent */
            80px           /* Rg.-Nr. */
            110px          /* Rechnungsdatum */
            110px          /* Bezahlt am */
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

    .header-item:nth-child(5) {
        text-align: center;
    }

    .header-item:nth-child(7) {
        text-align: right;
    }

    .header-item:nth-child(8) {
        text-align: center;
    }

    .header-item:nth-child(9),
    .header-item:nth-child(10),
    .header-item:nth-child(11) {
        text-align: center;
    }

    .header-item:last-child {
        text-align: center;
    }
</style>
