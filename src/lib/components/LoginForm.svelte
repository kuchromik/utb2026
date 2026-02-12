<script>
    /** @typedef {import('$lib/types').SignInHandler} SignInHandler */
    /** @typedef {import('$lib/types').SignOutHandler} SignOutHandler */

    /** @type {{ loggedIn?: boolean, user?: string, onSignIn: SignInHandler, onSignOut: SignOutHandler }} */
    let { loggedIn = $bindable(false), user = $bindable(''), onSignIn, onSignOut } = $props();
    
    let email = $state('');
    let password = $state('');
    let error = $state('');
    let loading = $state(false);

    /** @param {string} email */
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    async function handleSignIn() {
        error = '';
        
        // Input validation
        if (!email.trim()) {
            error = 'Bitte E-Mail-Adresse eingeben';
            return;
        }
        
        if (!validateEmail(email)) {
            error = 'Bitte gültige E-Mail-Adresse eingeben';
            return;
        }
        
        if (!password) {
            error = 'Bitte Passwort eingeben';
            return;
        }
        
        if (password.length < 6) {
            error = 'Passwort muss mindestens 6 Zeichen lang sein';
            return;
        }
        
        loading = true;
        try {
            await onSignIn(email, password);
        } catch (err) {
            error = err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen';
        } finally {
            loading = false;
        }
    }

    async function handleSignOut() {
        loading = true;
        error = '';
        try {
            await onSignOut();
            email = '';
            password = '';
        } catch (err) {
            error = err instanceof Error ? err.message : 'Abmeldung fehlgeschlagen';
        } finally {
            loading = false;
        }
    }
</script>

<div class="login">
    {#if !loggedIn}
        <input 
            type="email" 
            bind:value={email} 
            placeholder="Email" 
            disabled={loading}
            onkeydown={(e) => e.key === 'Enter' && handleSignIn()}
        />
        <input 
            type="password" 
            bind:value={password} 
            placeholder="Password" 
            disabled={loading}
            onkeydown={(e) => e.key === 'Enter' && handleSignIn()}
        />
        <button onclick={handleSignIn} disabled={loading}>
            {loading ? 'Anmelden...' : 'Sign In'}
        </button>
    {:else}
        <button onclick={handleSignOut} disabled={loading}>
            {loading ? 'Abmelden...' : 'Sign Out'}
        </button>
    {/if}
    
    <div>
        {#if loggedIn}
            <h2 class="logged-in">✓ Angemeldet als {user}</h2>
        {:else}
            <h2 class="logged-out">○ Nicht angemeldet</h2>
        {/if}
        {#if error}
            <p class="error">{error}</p>
        {/if}
    </div>
</div>

<style>
    .login {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-xl);
        padding: var(--spacing-lg);
        background: var(--color-gray-50);
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-gray-200);
    }

    input {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        color: var(--color-gray-700);
        min-width: 250px;
        transition: all var(--transition-fast);
    }

    input:hover {
        border-color: var(--color-gray-400);
    }

    input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    input:disabled {
        background-color: var(--color-gray-100);
        cursor: not-allowed;
    }

    button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: var(--spacing-sm) var(--spacing-xl);
        min-width: 120px;
    }

    button:hover:not(:disabled) {
        background: linear-gradient(135deg, #5568d3 0%, #6a4190 100%);
    }

    h2 {
        font-size: var(--font-size-base);
        font-weight: 600;
        margin: 0;
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--radius-md);
    }

    .logged-in {
        color: var(--color-success);
        background: var(--color-success-light);
    }

    .logged-out {
        color: var(--color-gray-500);
        background: var(--color-gray-100);
    }

    .error {
        color: var(--color-danger);
        font-weight: 600;
        font-size: var(--font-size-sm);
        background: var(--color-danger-light);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--radius-md);
        margin-top: var(--spacing-sm);
    }
</style>
