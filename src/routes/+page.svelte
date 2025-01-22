<script>
    import { app, auth } from '$lib/FireBase.js';
    import { getFirestore, collection, getDocs } from 'firebase/firestore';
    import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
    import { onMount } from 'svelte';

    let email = '';
    let password = '';

    const db = getFirestore(app);
    const auth2 = getAuth();

    async function handleSignIn() {
        try {
            const userCredential = await signInWithEmailAndPassword(auth2, email, password);
            const user = userCredential.user;
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
</script>
<h1>Welcome to UTB2026</h1>
<input type="email" bind:value={email} placeholder="Email" />
<input type="password" bind:value={password} placeholder="Password" />
<button on:click={handleSignIn}>Sign In</button>


