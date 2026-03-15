<script>
    import { tick } from 'svelte';

    /** @type {{ show?: boolean, initialValue?: string, onSave: (value: string) => void, onCancel?: (() => void) | null }} */
    let {
        show = $bindable(false),
        initialValue = '',
        onSave,
        onCancel = null
    } = $props();

    let localValue = $state('');
    /** @type {HTMLTextAreaElement | undefined} */
    let textareaRef = $state(undefined);

    $effect(() => {
        if (show) {
            localValue = initialValue;
            tick().then(() => textareaRef?.focus());
        }
    });

    function handleSave() {
        onSave(localValue);
        show = false;
    }

    function handleCancel() {
        if (onCancel) onCancel();
        show = false;
    }

    /** @param {MouseEvent} event */
    function handleBackdropClick(event) {
        if (event.target === event.currentTarget) {
            handleCancel();
        }
    }

    /** @param {KeyboardEvent} e */
    function handleKeydown(e) {
        if (e.key === 'Escape') {
            handleCancel();
        }
    }
</script>

{#if show}
    <div
        class="modal-backdrop"
        role="button"
        tabindex="0"
        aria-label="Dialog schließen"
        onclick={handleBackdropClick}
        onkeydown={handleKeydown}
    >
        <div class="modal" role="dialog" aria-modal="true" aria-label="Details bearbeiten">
            <h3>Details bearbeiten</h3>
            <div class="textarea-wrap">
                <textarea
                    bind:this={textareaRef}
                    bind:value={localValue}
                    maxlength="240"
                    placeholder="Details eingeben…"
                    rows="8"
                ></textarea>
                <p
                    class="char-count"
                    class:char-warn={localValue.length >= 200}
                    class:char-limit={localValue.length >= 230}
                >
                    {localValue.length} / 240 Zeichen
                </p>
            </div>
            <div class="modal-buttons">
                <button class="btn-cancel" onclick={handleCancel}>Abbrechen</button>
                <button class="btn-save" onclick={handleSave}>Übernehmen</button>
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
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .modal {
        background: white;
        padding: var(--spacing-xl);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-xl);
        width: 640px;
        max-width: 90vw;
        animation: slideIn 0.3s ease-out;
    }

    .modal h3 {
        font-size: var(--font-size-2xl);
        font-weight: 700;
        margin-bottom: var(--spacing-lg);
        color: var(--color-gray-900);
    }

    .textarea-wrap {
        margin-bottom: var(--spacing-lg);
    }

    textarea {
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
        transition: border-color var(--transition-fast);
    }

    textarea:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    .char-count {
        margin: var(--spacing-xs) 0 0;
        font-size: var(--font-size-xs);
        color: var(--color-gray-500);
        text-align: right;
    }

    .char-count.char-warn {
        color: var(--color-warning);
    }

    .char-count.char-limit {
        color: var(--color-danger);
        font-weight: 600;
    }

    .modal-buttons {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-md);
    }

    button {
        padding: var(--spacing-sm) var(--spacing-lg);
        border-radius: var(--radius-md);
        font-weight: 600;
        font-size: var(--font-size-base);
        cursor: pointer;
        border: none;
    }

    .btn-cancel {
        background: var(--color-gray-200);
        color: var(--color-gray-700);
    }

    .btn-cancel:hover {
        background: var(--color-gray-300);
    }

    .btn-save {
        background: var(--color-primary);
        color: white;
    }

    .btn-save:hover {
        background: var(--color-primary-hover, #4f46e5);
    }
</style>
