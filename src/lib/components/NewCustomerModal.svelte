<script>
    let { 
        show = $bindable(false),
        onComplete = null
    } = $props();

    let step = $state(1);
    let companyName = $state('');
    let companyName2 = $state('');
    let address1 = $state('');
    let address2 = $state('');
    let error = $state('');

    function validateStep() {
        error = '';
        
        if (step === 1 && !companyName.trim()) {
            error = 'Bitte Firmennamen eingeben';
            return false;
        }
        
        if (step === 3 && !address1.trim()) {
            error = 'Bitte Straße und Hausnummer eingeben';
            return false;
        }
        
        if (step === 4 && !address2.trim()) {
            error = 'Bitte PLZ und Ort eingeben';
            return false;
        }
        
        return true;
    }

    function nextStep() {
        if (validateStep()) {
            if (step < 4) {
                step++;
            } else {
                handleComplete();
            }
        }
    }

    function prevStep() {
        error = '';
        if (step > 1) {
            step--;
        }
    }

    function handleComplete() {
        if (onComplete) {
            onComplete({
                companyName: companyName.trim(),
                companyName2: companyName2.trim(),
                address1: address1.trim(),
                address2: address2.trim()
            });
        }
        reset();
    }

    function handleCancel() {
        reset();
    }

    function reset() {
        show = false;
        step = 1;
        companyName = '';
        companyName2 = '';
        address1 = '';
        address2 = '';
        error = '';
    }
</script>

{#if show}
    <div class="modal-backdrop" onclick={handleCancel}>
        <div class="modal" onclick={(e) => e.stopPropagation()}>
            <h3>Neuen Kunden anlegen - Schritt {step}/4</h3>
            
            {#if step === 1}
                <label>Firmenname (Zeile 1) *</label>
                <input 
                    type="text" 
                    bind:value={companyName} 
                    placeholder="Firma GmbH"
                    autofocus
                    onkeydown={(e) => e.key === 'Enter' && nextStep()}
                />
            {:else if step === 2}
                <label>Firmenname (Zeile 2, optional)</label>
                <input 
                    type="text" 
                    bind:value={companyName2} 
                    placeholder="Abteilung / Zusatz"
                    autofocus
                    onkeydown={(e) => e.key === 'Enter' && nextStep()}
                />
            {:else if step === 3}
                <label>Straße und Hausnummer *</label>
                <input 
                    type="text" 
                    bind:value={address1} 
                    placeholder="Musterstraße 123"
                    autofocus
                    onkeydown={(e) => e.key === 'Enter' && nextStep()}
                />
            {:else if step === 4}
                <label>PLZ und Ort *</label>
                <input 
                    type="text" 
                    bind:value={address2} 
                    placeholder="12345 Musterstadt"
                    autofocus
                    onkeydown={(e) => e.key === 'Enter' && nextStep()}
                />
            {/if}
            
            {#if error}
                <p class="error">{error}</p>
            {/if}
            
            <div class="modal-buttons">
                <button class="btn-cancel" onclick={handleCancel}>Abbrechen</button>
                {#if step > 1}
                    <button class="btn-back" onclick={prevStep}>Zurück</button>
                {/if}
                <button class="btn-confirm" onclick={nextStep}>
                    {step === 4 ? 'Kunde anlegen' : 'Weiter'}
                </button>
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
        min-width: 600px;
        max-width: 700px;
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
        margin-bottom: var(--spacing-lg);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        transition: all var(--transition-fast);
    }

    .modal input:hover {
        border-color: var(--color-gray-400);
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
        margin-bottom: var(--spacing-md);
        border-left: 4px solid var(--color-danger);
    }

    .modal-buttons {
        display: flex;
        gap: var(--spacing-md);
        justify-content: flex-end;
        margin-top: var(--spacing-xl);
        padding-top: var(--spacing-lg);
        border-top: 1px solid var(--color-gray-200);
    }

    .btn-cancel, .btn-back {
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

    .btn-cancel:hover, .btn-back:hover {
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
</style>
