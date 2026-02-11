<script>
    let { 
        show = $bindable(false),
        title = 'Bestätigung',
        message = '',
        confirmText = 'OK',
        cancelText = 'Abbrechen',
        onConfirm = null,
        onCancel = null,
        showInput = false,
        inputPlaceholder = '',
        inputValue = $bindable('')
    } = $props();

    function handleConfirm() {
        if (onConfirm) {
            onConfirm(inputValue);
        }
        show = false;
        inputValue = '';
    }

    function handleCancel() {
        if (onCancel) {
            onCancel();
        }
        show = false;
        inputValue = '';
    }

    function handleKeydown(e) {
        if (e.key === 'Escape') {
            handleCancel();
        } else if (e.key === 'Enter' && !showInput) {
            handleConfirm();
        }
    }
</script>

{#if show}
    <div class="modal-backdrop" onclick={handleCancel} onkeydown={handleKeydown}>
        <div class="modal" onclick={(e) => e.stopPropagation()}>
            <h3>{title}</h3>
            <p>{message}</p>
            
            {#if showInput}
                <input 
                    type="text" 
                    bind:value={inputValue} 
                    placeholder={inputPlaceholder}
                    autofocus
                    onkeydown={(e) => e.key === 'Enter' && handleConfirm()}
                />
            {/if}
            
            <div class="modal-buttons">
                <button class="btn-cancel" onclick={handleCancel}>{cancelText}</button>
                <button class="btn-confirm" onclick={handleConfirm}>{confirmText}</button>
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
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
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
        padding: var(--spacing-xl);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-xl);
        min-width: 500px;
        max-width: 700px;
        animation: slideIn 0.3s ease-out;
    }

    .modal h3 {
        font-size: var(--font-size-2xl);
        font-weight: 700;
        margin-bottom: var(--spacing-lg);
        color: var(--color-gray-900);
    }

    .modal p {
        font-size: var(--font-size-base);
        color: var(--color-gray-600);
        margin-bottom: var(--spacing-xl);
        line-height: 1.6;
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

    .modal input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    .modal-buttons {
        display: flex;
        gap: var(--spacing-md);
        justify-content: flex-end;
    }

    .btn-cancel {
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

    .btn-cancel:hover {
        background: var(--color-gray-300);
    }

    .btn-confirm {
        background: var(--color-primary);
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
        background: var(--color-primary-hover);
    }
</style>
