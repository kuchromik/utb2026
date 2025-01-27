<script>
    import { app, auth } from '$lib/FireBase.js';
    import { getFirestore, collection, getDocs, orderBy, query, where, doc, updateDoc } from 'firebase/firestore';
    import { signInWithEmailAndPassword, signOut } from "firebase/auth";
    import { onMount } from 'svelte';

    let email = $state('');
    let password = $state('');
    let loggedIn = $state(false);
    let customers = $state([]);
    let jobs = $state([]);
    let selectedCustomer = $state('');
    
    const db = getFirestore(app);
    

    async function handleSignIn() {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
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
    /*
    async function getCustomersFromCollection() {
        const querySnapshot = await getDocs(collection(db, "customer"));
        querySnapshot.forEach((doc) => {
            customers = [...customers, doc.data()];
        });
    }   
    */
    async function getJobsFromCollection() {
        jobs = [];
        const q = query(collection(db, "Jobs"), where("archiv", "==", false));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            let ID = doc.id;
            let job = { id: ID, ...doc.data() };
            jobs = [...jobs, job];
        });
        jobs.sort((a, b) => (b.jobstart) - (a.jobstart));
    }

    async function toggleSomethingIsReady(whatsIsReady, ID) {
        const jobRef = doc(db, "Jobs", ID);
        if (whatsIsReady === "paper") {
            await updateDoc(jobRef, {
                paper_ready: !ID.paper_ready
            });
            console.log(whatsIsReady, "status geändert on Firestore");
        } else if (whatsIsReady === "plates") {
            await updateDoc(jobRef, {
                plates_ready: !ID.plates_ready
            });
            console.log(whatsIsReady, "status geändert on Firestore");
        }
        else if (whatsIsReady === "print") {
            await updateDoc(jobRef, {
                print_ready: !ID.print_ready
            });
            console.log(whatsIsReady, "status geändert on Firestore");
        }
        else if (whatsIsReady === "invoice") {
            await updateDoc(jobRef, {
                invoice_ready: !ID.invoice_ready
            });
            console.log(whatsIsReady, "status geändert on Firestore");
        }
        else if (whatsIsReady === "payed") {
            await updateDoc(jobRef, {
                payed: !ID.payed
            });
            console.log(whatsIsReady, "status geändert on Firestore");
        }
        
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
<button onclick={()=> getCustomersFromCollection()}>Get Customers, inaktiv!</button>
<hr>
<button onclick={()=> getJobsFromCollection()}>Get Jobs</button>
<hr>
<ul>
    {#each jobs as job}
        <li>
            <div class="joblist">
                <div class="jobstart">
                    <small>{new Date(job.jobstart * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</small>
                </div>
                <!--<div class="jobID"><small>{job.id}</small></div>-->
                <div class="customer"><p>{job.customer}</p></div>
                <div class="jobname"><p>{job.jobname}</p></div>
                <div class="quantity"><p>{job.quantity}</p></div>
                <div class="details"><p>{job.details}</p></div>
                <div class="amount"><p>{job.amount}</p></div>
                <div class="producer"><p>{job.producer}</p></div>
                <div class="ready">
                    <label>Papier?<input type="checkbox" name="Papier?" bind:checked={job.paper_ready} disabled={!(job.producer === 'chr' || job.producer === 'doe')} onchange={() => toggleSomethingIsReady("paper", job.id)}/></label>
                </div>
                <div class="ready">
                    <label>Platten?<input type="checkbox" name="Platten?" bind:checked={job.plates_ready} disabled={!(job.producer === 'chr')} onchange={() => toggleSomethingIsReady("plates", job.id)}/></label>
                </div>
                <div class="ready">
                    <label>Druck?<input type="checkbox" name="Druck?" bind:checked={job.print_ready} disabled={!(job.producer === 'chr' || job.producer === 'doe')} onchange={() => toggleSomethingIsReady("print", job.id)}/></label>
                </div>
                <div class="ready">
                    <label>Rechnung?<input type="checkbox" name="Platten?" bind:checked={job.invoice_ready} disabled={!(true)} onchange={() => toggleSomethingIsReady("invoice", job.id)}/></label>
                </div>
                <div class="ready">
                    <label>Zahlung?<input type="checkbox" name="Zahlung?" bind:checked={job.payed_ready} disabled={!(true)} onchange={() => toggleSomethingIsReady("payed", job.id)}/></label>
                </div>
                
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
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');

    * {
        font-family: 'Roboto', sans-serif;
        font-size: 12px;
    }
    li {
        list-style-type: none;
    }

    .joblist {
        display: flex;
        align-items: center;
        gap: 10px;
        border: 1px solid black;
        padding: 10px;
        margin: 5px;
    }

    .jobstart {
        flex: 1;
    }
    .jobID {
        flex: 1;
    }
    .customer {
        flex: 2;
    }
    .jobname {
        flex: 2;
    }
    .quantity {
        flex: 1;
    }
    .details {
        flex: 3;
    }
    .amount {
        flex: 1;
    }
    .producer {
        flex: 1;
    }
    .ready {
        flex: 1;
    }
</style>


