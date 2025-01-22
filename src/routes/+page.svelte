<script>
    import { app, auth } from '$lib/FireBase.js';
    import { getFirestore, collection, getDocs } from 'firebase/firestore';
    import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
    import { onMount } from 'svelte';

    let email = '';
    let password = '';
    let loggedIn = false;
    let customers = [];
    let selectedCustomer = '';
    
    const db = getFirestore(app);
    

    async function handleSignIn() {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("User signed in");
            console.log(user);
            loggedIn = true;
        } catch (error) {
            console.error(error.code, error.message);
        }
    }

    async function handleLogOut() {
        try {
            await signOut(auth);
            console.log("User signed out");
            loggedIn = false;
        } catch (error) {
            console.error(error.code, error.message);
        }
    }

    async function getCustomersFromCollection() {
        const querySnapshot = await getDocs(collection(db, "customer"));
        querySnapshot.forEach((doc) => {
            customers = [...customers, doc.data()];
        });
    }

 

</script>
<h1>Welcome to UTB2026</h1>

{#if loggedIn}
    <h2>User is logged in</h2>
{:else}
    <h2>User is not logged in</h2>
{/if}



<input type="email" bind:value={email} placeholder="Email" />
<input type="password" bind:value={password} placeholder="Password" />
<button onclick={handleSignIn}>Sign In</button>
<hr>
<button onclick={()=> handleLogOut()}>Sign Out</button>
<hr>
<button onclick={()=> getCustomersFromCollection()}>Get Customers</button>
<hr>
<ul>
    {#each customers as customer}
        <li>{customer.companyName}</li>
    {/each}
</ul>
<hr>
<select bind:value={selectedCustomer}>
    <option value="" disabled selected>Select a customer</option>
    {#each customers as customer}
        <option value={customer.companyName}>{customer.companyName}</option>
    {/each}
</select>
<hr>
{#if selectedCustomer}
    <h2>Selected Customer: {selectedCustomer}</h2>
{/if}




