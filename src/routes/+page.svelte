<script>
    import { app, auth } from '$lib/FireBase.js';
    import { getFirestore, collection, onSnapshot, query, where, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
    import { signInWithEmailAndPassword, signOut } from "firebase/auth";

    let email = $state('');
    let password = $state('');
    let loggedIn = $state(false);
    let showArchiv = $state(false);
    let customers = $state([]);
    let jobs = $state([]);
    let archivJobs = $state([]);
    let user = $state();
    
    const db = getFirestore(app);

    async function handleSignIn() {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            user = userCredential.user.email;
            loggedIn = true;
            getJobsFromCollection();
            getCustomersFromCollection();
        } catch (error) {
            console.error(error.code, error.message);
        }
    }

    async function handleLogOut() {
        try {
            await signOut(auth);
            console.log("User signed out");
            loggedIn = false;
            showArchiv = false;
            customers = [];
            jobs = [];
            email = '';
            password = '';
            user = '';
            archivJobs = [];
        } catch (error) {
            console.error(error.code, error.message);
        }
    }
    
    async function getCustomersFromCollection() {
        customers = [];
        const q = query(collection(db, "customer"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            customers = [];
            querySnapshot.forEach((doc) => {
                customers = [...customers, doc.data()];
            });
            customers.sort((a, b) => (a.companyName > b.companyName) ? 1 : -1);
        });
    }

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

    let newCustomer = $state('');
    let newJobname = $state('');
    let newQuantity = $state(0);
    let newDetails = $state('');
    let newAmount = $state(0.00);
    let newProducer = $state('');

    async function addNewJob() {
        
        const colRef = doc(collection(db, "Jobs"));
        await setDoc(colRef,{
            jobstart: Date.now() / 1000,
            customer: newCustomer,
            jobname: newJobname,
            quantity: newQuantity,
            details: newDetails,
            amount: newAmount,
            producer: newProducer,
            paper_ready: false,
            plates_ready: false,
            print_ready: false,
            invoice_ready: false,
            payed_ready: false,
            archiv: false
        });
        console.log("Document written with ID: ", colRef.id);
        newCustomer = '';
        newJobname = '';
        newQuantity = 0;
        newDetails = '';
        newAmount = 0;
        newProducer = '';
    }

    function archiveJob(ID) {
        if (!confirm("Diesen Auftrag wirklich archivieren?")) {
            return;
        }
        const jobRef = doc(db, "Jobs", ID);
        updateDoc(jobRef, {
            archiv: true
        });
    }

    function deleteJob(ID) {
        if (!confirm("Diesen Auftrag wirklich löschen?")) {
            return;
        }
        const jobRef = doc(db, "Jobs", ID);
        deleteDoc(jobRef);
    }

    function clearNewJob() {
        newCustomer = '';
        newJobname = '';
        newQuantity = 0;
        newDetails = '';
        newAmount = 0;
        newProducer = '';
    }
    function handleNewCustomer() {
        if (newCustomer === "Neuer Kunde") {
            let newCustomerName = prompt("Bitte geben Sie den Namen des neuen Kunden ein:");
            let newCustomerName2 = prompt("Bitte geben Sie den zweiten Namen des neuen Kunden ein:");
            let newCustomerAddress1 = prompt("Bitte geben Sie die erste Adresse des neuen Kunden ein:");
            let newCustomerAddress2 = prompt("Bitte geben Sie die zweite Adresse des neuen Kunden ein:");
            if (newCustomerName != null && newCustomerAddress1 != null && newCustomerAddress2 != null) {
                const colRef = doc(collection(db, "customer"));
                setDoc(colRef, {
                    companyName: newCustomerName,
                    companyName2: newCustomerName2,
                    address1: newCustomerAddress1,
                    address2: newCustomerAddress2
                });
            }
        }
    }
    
    let archiveCustomer = $state('');

    function getJobFromArchiv(archiveCustomer) {
        let archiveCustomerToLower = archiveCustomer.toLowerCase();
        archivJobs = [];
        const q = query(collection(db, "Jobs"), where("archiv", "==", true));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            archivJobs = [];
            querySnapshot.forEach((doc) => {
                let customerToLower = doc.data().customer.toLowerCase();
                if (archiveCustomerToLower.includes(customerToLower)) {
                    let ID = doc.id;
                    let archivJob = { id: ID, ...doc.data() };
                    archivJobs = [...archivJobs, archivJob];
                }
                
            });
            archivJobs.sort((a, b) => (b.jobstart) - (a.jobstart));
        });
        showArchiv = true;
        archiveCustomer = '';
        }
    function addNewJobFromArchiv(job) {
        const colRef = doc(collection(db, "Jobs"));
        setDoc(colRef, {
                jobstart: Date.now() / 1000,
                customer: job.customer,
                jobname: job.jobname,
                quantity: job.quantity,
                details: job.details,
                amount: job.amount,
                producer: job.producer,
                paper_ready: false,
                plates_ready: false,
                print_ready: false,
                invoice_ready: false,
                payed_ready: false,
                archiv: false
            });
        console.log("Document written with ID: ", colRef.id);
        showArchiv = false;
        }
    function editJob(job) {
        let editedCustomer = prompt("Kunde:", job.customer);
        let editedJobname = prompt("Auftrag:", job.jobname);
        let editedQuantity = parseInt(prompt("Menge:", job.quantity), 10);
        let editedDetails = prompt("Details:", job.details);
        let editedAmount = parseFloat(prompt("Betrag:", job.amount));
        let editedProducer = prompt("Produzent:", job.producer);

        if (editedCustomer && editedJobname && !isNaN(editedQuantity) && editedDetails && !isNaN(editedAmount) && editedProducer) {
            const jobRef = doc(db, "Jobs", job.id);
            updateDoc(jobRef, {
                customer: editedCustomer,
                jobname: editedJobname,
                quantity: editedQuantity,
                details: editedDetails,
                amount: editedAmount,
                producer: editedProducer
            }).then(() => {
                console.log("Job updated successfully");
            }).catch((error) => {
                console.error("Error updating job: ", error);
            });
        } else {
            alert("Alle Felder müssen korrekt ausgefüllt werden!");
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

    {#if loggedIn && !showArchiv}
    
        <h2>Neuer Auftrag:</h2>
        <div class="newJob">
            
            <select onchange={handleNewCustomer} bind:value={newCustomer}>
                <option value="" disabled selected>Wählen Sie einen Kunden</option>
                <option value="Neuer Kunde">Neuer Kunde</option>
                {#each customers as customer}
                    <option value={customer.companyName}>{customer.companyName}</option>
                {/each}
            </select>
            
            <input class="broadField" type="text" placeholder="Auftrag" bind:value={newJobname}/>
            <input class="smallField"type="number" placeholder="Menge" bind:value={newQuantity}/>
            <input class="broadField" type="text" placeholder="Details" bind:value={newDetails}/>
            <input class="smallField" type="number" placeholder="Betrag" bind:value={newAmount}/>
            <select bind:value={newProducer}>
                <option value="" disabled selected>Produzent</option>
                <option value="chr">Chromik Offsetdruck</option>
                <option value="doe">Chromik Digitaldruck</option>
                <option value="pwd">Printworld</option>
                <option value="sax">Saxoprint</option>
                <option value="wmd">wir-machen-druck</option>
                <option value="sil">Silberdruck</option>
                <option value="pin">Pinguin</option>
                <option value="hee">Heenemann</option>
                <option value="son">Sonstige</option>
            </select>
            <button onclick={clearNewJob}>Felder löschen</button>
            <button onclick={addNewJob}>Auftrag anlegen</button>
        </div>
        <h2>Archiv:</h2>
    <select bind:value={archiveCustomer} onchange={() => getJobFromArchiv(archiveCustomer)}>
        <option value="" disabled selected>Wählen Sie einen Kunden</option>
        {#each customers as customer}
            <option value={customer.companyName}>{customer.companyName}</option>
        {/each}
    </select>
        <h2>{jobs.length} aktive Aufträge:</h2>
        <ul>
            {#each jobs as job, index}
                <li>
                    <div class="joblist {index % 2 === 0 ? 'secondRow' : ''}">
                        <div class="jobstart">
                            <p>{new Date(job.jobstart * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                        <div class="customer"><p><strong>{job.customer}</strong></p></div>
                        <div class="jobname"><p>{job.jobname}</p></div>
                        <div class="quantity"><p><strong>{job.quantity}</strong> Stück</p></div>
                        <div class="details"><p>{job.details}</p></div>
                        <div class="amount"><p><strong>{job.amount}</strong> Euro</p></div>
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
                        <button style="background-color: orange; height: 2rem;" onclick={() => editJob(job)}>Bearbeiten</button>
                        <button style="background-color: DeepSkyBlue; height: 2rem;"onclick={() => archiveJob(job.id)}>Archiv</button>
                        <button style="background-color: crimson; height: 2rem;" onclick={() => deleteJob(job.id)}>Löschen</button>
                        
                    </div>
                </li>
            {/each}
        </ul>
    {:else if loggedIn && showArchiv}
        <div>
            <h2>{archivJobs.length} archivierte Aufträge:</h2>
            <button onclick={() => {showArchiv = false; archiveCustomer = '';}}>Archiv schließen</button>
        </div>
        <ul>
            {#each archivJobs as job, index}
                <li>
                    <div class="joblist {index % 2 === 0 ? 'secondRow' : ''}">
                        <div class="jobstart">
                            <p>{new Date(job.jobstart * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                        <div class="customer"><p><strong>{job.customer}</strong></p></div>
                        <div class="jobname"><p>{job.jobname}</p></div>
                        <div class="quantity"><p><strong>{job.quantity}</strong> Stück</p></div>
                        <div class="details"><p>{job.details}</p></div>
                        <div class="amount"><p><strong>{job.amount}</strong> Euro</p></div>
                        <div class="producer"><p>{job.producer}</p></div>
                        <button style="background-color: DeepSkyBlue; height: 2rem;" onclick={() => addNewJobFromArchiv(job)}>Kopieren</button>
                </li>
            {/each}
        </ul>
    {/if}
</main>

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
    .customer {
        flex: 1;
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

    .newJob {
        display: flex;
        align-items: center;
        gap: 10px;
        background-color: lightgreen;
        border: 1px solid grey;
        border-radius: 5px;
        padding: 10px;
        margin-top: 10px;
    }
    .smallField {
        width: 50px;
    }
    .broadField {
        width: 30%;
    }
</style>


