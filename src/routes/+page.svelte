<script>
    import { app, auth } from '$lib/FireBase.js';
    import { getFirestore, collection, getDocs, orderBy, query, where } from 'firebase/firestore';
    import { signInWithEmailAndPassword, signOut } from "firebase/auth";
    import { onMount } from 'svelte';

    let email = '';
    let password = '';
    let loggedIn = false;
    let customers = [];
    let jobs = [];
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

    async function getJobsFromCollection() {
        const q = query(collection(db, "Jobs"), where("archiv", "==", false));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            jobs = [...jobs, doc.data()];
            jobs.sort((a, b) => (b.jobstart) - (a.jobstart));
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
<button onclick={()=> getJobsFromCollection()}>Get Jobs</button>
<hr>
<ul>
    {#each jobs as job}
        <li>
            <div class="joblist">
                <p>{new Date(job.jobstart * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                <p>{job.customer}</p>
                <p>{job.jobname}</p>
                <p>{job.quantity}</p>
                <p>{job.details}</p>
                <p>{job.amount}</p>
                <p>{job.producer}</p>
            </div>
        </li>
    {/each}
</ul>
<!--
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
-->

<style>
    li {
        list-style-type: none;
    }

    .joblist {
        display: flex;
       gap: 10px;
        border: 1px solid black;
        padding: 10px;
        margin: 5px;
    }
</style>


