<script>
    import { app, auth } from '$lib/FireBase.js';
    import { getFirestore, collection, getDocs, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
    import { signInWithEmailAndPassword, signOut } from "firebase/auth";

    let email = $state('');
    let password = $state('');
    let loggedIn = $state(false);
    let customers = $state([]);
    let jobs = $state([]);
    let selectedCustomer = $state('');
    
    const db = getFirestore(app);

    let user = $state();
    

    async function handleSignIn() {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            user = userCredential.user.email;
            loggedIn = true;
            getJobsFromCollection();
        } catch (error) {
            console.error(error.code, error.message);
        }
    }

    async function handleLogOut() {
        try {
            await signOut(auth);
            console.log("User signed out");
            loggedIn = false;
            jobs = [];
            email = '';
            password = '';
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
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            jobs = [];
            querySnapshot.forEach((doc) => {
                let ID = doc.id;
                let job = { id: ID, ...doc.data() };
                jobs = [...jobs, job];
            });
            jobs.sort((a, b) => (b.jobstart) - (a.jobstart));
        });
        
    }
   

    async function toggleSomethingIsReady(whatsIsReady, ID, isReady) {
        const jobRef = doc(db, "Jobs", ID);
        if (whatsIsReady === "paper") {
            await updateDoc(jobRef, {
                paper_ready: !(isReady)
            });
            console.log(whatsIsReady, "status geändert on Firestore");
        } else if (whatsIsReady === "plates") {
            await updateDoc(jobRef, {
                plates_ready: !(isReady)
            });
            console.log(whatsIsReady, "status geändert on Firestore");
        }
        else if (whatsIsReady === "print") {
            await updateDoc(jobRef, {
                print_ready: !(isReady)
            });
            console.log(whatsIsReady, "status geändert on Firestore");
        }
        else if (whatsIsReady === "invoice") {
            await updateDoc(jobRef, {
                invoice_ready: !(isReady)
            });
            console.log(whatsIsReady, "status geändert on Firestore");
        }
        else if (whatsIsReady === "payed") {
            await updateDoc(jobRef, {
                payed_ready: !(isReady)
            });
            console.log(whatsIsReady, "status geändert on Firestore");
        }
        
    }

</script>

<main>

<h1 class="headline">Welcome to UTB2026</h1>

<div class = "login">
    {#if !loggedIn}
        <input type="email" bind:value={email} placeholder="Email" />
        <input type="password" bind:value={password} placeholder="Password" />
   
        <button onclick={handleSignIn}>Sign In</button>
    {:else}
        <button onclick={()=> handleLogOut()}>Sign Out</button>
    {/if}
    <div>
        {#if loggedIn}
            <h2 style="color: darkgreen;">Logged as {user}</h2>
        {:else}
            <h2 style="color: lightcoral;">No User logged</h2>
        {/if}
    </div>
</div>
<hr>
<ul>
    {#each jobs as job, index}
        <li>
            <div class="joblist {index % 2 === 0 ? 'secondRow' : ''}">
                <div class="jobstart">
                    <p>{new Date(job.jobstart * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
                <!--<div class="jobID"><p>{job.id}</p></div>-->
                <div class="customer"><p><strong>{job.customer}</strong></p></div>
                <div class="jobname"><p>{job.jobname}</p></div>
                <div class="quantity"><p><strong>{job.quantity}</strong></p></div>
                <div class="details"><p>{job.details}</p></div>
                <div class="amount"><p><strong>{job.amount}</strong></p></div>
                <div class="producer"><p>{job.producer}</p></div>
                <div class="ready">
                    {#if (job.producer === 'chr' || job.producer === 'doe')}
                        <label>Papier?<input type="checkbox" name="Papier?" bind:checked={job.paper_ready} onclick={() => toggleSomethingIsReady("paper", job.id, job.paper_ready)}/></label>
                    {:else}
                        <input type="hidden" name="Papier?"/>
                    {/if}
                </div>
                <div class="ready">
                    {#if (job.producer === 'chr')}
                        <label>Platten?<input type="checkbox" name="Platten?" bind:checked={job.plates_ready} onclick={() => toggleSomethingIsReady("plates", job.id, job.plates_ready)}/></label>
                    {:else}
                        <input type="hidden" name="Platten?"/>
                    {/if}
                </div>

                <div class="ready">
                    {#if (job.producer === 'chr' || job.producer === 'doe')}
                        <label>Druck?<input type="checkbox" name="Druck?" bind:checked={job.print_ready} onclick={() => toggleSomethingIsReady("print", job.id, job.print_ready)}/></label>
                    {:else}
                        <input type="hidden" name="Druck?"/>
                    {/if}
                </div>
                <div class="ready">
                    <label>Rechnung?<input type="checkbox" name="Platten?" bind:checked={job.invoice_ready} onclick={() => toggleSomethingIsReady("invoice", job.id, job.invoice_ready)}/></label>
                </div>
                <div class="ready">
                    <label>Zahlung?<input type="checkbox" name="Zahlung?" bind:checked={job.payed_ready} onclick={() => toggleSomethingIsReady("payed", job.id, job.payed_ready)}/></label>
                </div>
                
            </div>
        </li>
    {/each}
</ul>
</main>
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

    main {
        max-width: 1600px;
        margin: 0 auto;
    }

    .headline {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 20px;
        text-align: center;
    }


    ul {
        padding-inline-start: 0;
    }

    li {
        list-style-type: none;
    }

    .login {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-bottom: 20px;
    }


    .joblist {
        display: flex;
        align-items: center;
        gap: 10px;
        background-color: whitesmoke;
        border: 1px solid grey;
        border-radius: 5px;
        padding: 10px;
        margin-top: 10px;
    }

    .secondRow {
        background-color: lightgrey;
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


