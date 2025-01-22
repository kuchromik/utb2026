<script>
    import { app, auth } from '$lib/FireBase.js';
    import { getFirestore, collection, getDocs } from 'firebase/firestore';
    import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
    import { onMount } from 'svelte';

    let email = '';
    let password = '';
    let user = $state(null);

    const db = getFirestore(app);
    const auth2 = getAuth();
    

    async function handleSignIn() {
        try {
            const userCredential = await signInWithEmailAndPassword(auth2, email, password);
            user = userCredential.user;
            console.log(user);
            getCustomersFromCollection();
        } catch (error) {
            console.error(error.code, error.message);
        }
    }

    async function getCustomersFromCollection() {
        const querySnapshot = await getDocs(collection(db, "customer"));
        querySnapshot.forEach((doc) => {
            console.log(`${doc.id} => ${doc.data()}`);
        });
    }

    signOut(auth2).then(() => {
    // Sign-out successful.
    user = null;
    console.log('Sign-out successful');
    }).catch((error) => {
    // An error happened.
    });
</script>
<h1>Welcome to UTB2026</h1>
{#if !(user)}
    <input type="email" bind:value={email} placeholder="Email" />
    <input type="password" bind:value={password} placeholder="Password" />
    <button onclick={handleSignIn}>Sign In</button>
{:else}
    <button onclick={()=> signOut(auth2)}>Sign Out</button>
{/if}


