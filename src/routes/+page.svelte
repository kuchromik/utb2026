<script>
    import { onDestroy } from 'svelte';
    import { app, auth } from '$lib/FireBase.js';
    import { getFirestore, collection, onSnapshot, query, where, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
    import { signInWithEmailAndPassword, signOut } from "firebase/auth";
    
    // Import components
    import LoginForm from '$lib/components/LoginForm.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import NewCustomerModal from '$lib/components/NewCustomerModal.svelte';
    import JobForm from '$lib/components/JobForm.svelte';
    import JobEditForm from '$lib/components/JobEditForm.svelte';
    import JobListItem from '$lib/components/JobListItem.svelte';
    import JobListHeader from '$lib/components/JobListHeader.svelte';
    import ArchiveListHeader from '$lib/components/ArchiveListHeader.svelte';

    let loggedIn = $state(false);
    let showArchiv = $state(false);
    let customers = $state([]);
    let jobs = $state([]);
    let archivJobs = $state([]);
    let user = $state('');
    
    const db = getFirestore(app);
    
    // Store unsubscribe functions for cleanup
    let unsubscribeCustomers = null;
    let unsubscribeJobs = null;
    let unsubscribeArchivJobs = null;
    
    // Modal states
    let showDeleteModal = $state(false);
    let showArchiveModal = $state(false);
    let showNewCustomerModal = $state(false);
    let deleteJobId = $state('');
    let archiveJobId = $state('');
    
    // Edit mode
    let jobToEdit = $state(null);
    let jobToEditIndex = $state(0);
    let editMode = $state(false);
    
    // Archive customer selection
    let archiveCustomer = $state('');
    
    // Cleanup listeners on component destroy
    onDestroy(() => {
        if (unsubscribeCustomers) unsubscribeCustomers();
        if (unsubscribeJobs) unsubscribeJobs();
        if (unsubscribeArchivJobs) unsubscribeArchivJobs();
    });

    async function handleSignIn(email, password) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user.email;
        loggedIn = true;
        getJobsFromCollection();
        getCustomersFromCollection();
    }

    async function handleLogOut() {
        await signOut(auth);
        loggedIn = false;
        showArchiv = false;
        customers = [];
        jobs = [];
        user = '';
        archivJobs = [];
        
        // Clean up listeners
        if (unsubscribeCustomers) {
            unsubscribeCustomers();
            unsubscribeCustomers = null;
        }
        if (unsubscribeJobs) {
            unsubscribeJobs();
            unsubscribeJobs = null;
        }
        if (unsubscribeArchivJobs) {
            unsubscribeArchivJobs();
            unsubscribeArchivJobs = null;
        }
    }
    
    async function getCustomersFromCollection() {
        if (unsubscribeCustomers) unsubscribeCustomers();
        customers = [];
        const q = query(collection(db, "customer"));
        unsubscribeCustomers = onSnapshot(q, (querySnapshot) => {
            customers = [];
            querySnapshot.forEach((doc) => {
                customers = [...customers, doc.data()];
            });
            customers.sort((a, b) => (a.companyName > b.companyName) ? 1 : -1);
        }, (error) => {
            console.error("Error fetching customers:", error);
        });
    }

    async function getJobsFromCollection() {
        if (unsubscribeJobs) unsubscribeJobs();
        jobs = [];
        const q = query(collection(db, "Jobs"), where("archiv", "==", false));
        unsubscribeJobs = onSnapshot(q, (querySnapshot) => {
            jobs = [];
            querySnapshot.forEach((doc) => {
                let ID = doc.id;
                let job = { id: ID, ...doc.data() };
                jobs = [...jobs, job];
            });
            jobs.sort((a, b) => (b.jobstart) - (a.jobstart));
        }, (error) => {
            console.error("Error fetching jobs:", error);
        });
    }

    async function toggleSomethingIsReady(whatsIsReady, ID, isReady) {
        const jobRef = doc(db, "Jobs", ID);
        const updateField = {
            paper: "paper_ready",
            plates: "plates_ready",
            print: "print_ready",
            invoice: "invoice_ready",
            payed: "payed_ready"
        };
        
        const fieldName = updateField[whatsIsReady];
        if (fieldName) {
            try {
                await updateDoc(jobRef, {
                    [fieldName]: !isReady
                });
            } catch (error) {
                console.error(`Error updating ${whatsIsReady}:`, error);
            }
        }
    }

    async function addNewJob(jobData) {
        const colRef = doc(collection(db, "Jobs"));
        await setDoc(colRef, {
            jobstart: Date.now() / 1000,
            customer: jobData.customer,
            jobname: jobData.jobname,
            quantity: jobData.quantity,
            details: jobData.details,
            amount: jobData.amount,
            producer: jobData.producer,
            paper_ready: false,
            plates_ready: false,
            print_ready: false,
            invoice_ready: false,
            payed_ready: false,
            archiv: false
        });
    }

    function confirmArchiveJob(jobId) {
        archiveJobId = jobId;
        showArchiveModal = true;
    }

    async function archiveJob() {
        try {
            const jobRef = doc(db, "Jobs", archiveJobId);
            await updateDoc(jobRef, {
                archiv: true
            });
        } catch (error) {
            console.error("Error archiving job:", error);
        }
    }

    function confirmDeleteJob(jobId) {
        deleteJobId = jobId;
        showDeleteModal = true;
    }

    async function deleteJob() {
        try {
            const jobRef = doc(db, "Jobs", deleteJobId);
            await deleteDoc(jobRef);
        } catch (error) {
            console.error("Error deleting job:", error);
        }
    }

    async function addNewCustomer(customerData) {
        try {
            const colRef = doc(collection(db, "customer"));
            await setDoc(colRef, {
                companyName: customerData.companyName,
                companyName2: customerData.companyName2,
                address1: customerData.address1,
                address2: customerData.address2
            });
        } catch (error) {
            console.error("Error adding customer:", error);
            throw error;
        }
    }

    function getJobFromArchiv(selectedCustomer) {
        if (unsubscribeArchivJobs) unsubscribeArchivJobs();
        let archiveCustomerToLower = selectedCustomer.toLowerCase();
        archivJobs = [];
        const q = query(collection(db, "Jobs"), where("archiv", "==", true));
        unsubscribeArchivJobs = onSnapshot(q, (querySnapshot) => {
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
        }, (error) => {
            console.error("Error fetching archive jobs:", error);
        });
        showArchiv = true;
        archiveCustomer = '';
    }

    async function addNewJobFromArchiv(job) {
        try {
            const colRef = doc(collection(db, "Jobs"));
            await setDoc(colRef, {
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
            showArchiv = false;
        } catch (error) {
            console.error("Error copying job from archive:", error);
        }
    }

    function openEditMode(job, index) {
        jobToEdit = job;
        jobToEditIndex = index;
        editMode = true;
    }

    async function saveChangedJob(changedData) {
        try {
            const jobRef = doc(db, "Jobs", jobToEdit.id);
            await updateDoc(jobRef, {
                customer: changedData.customer,
                jobname: changedData.jobname,
                quantity: changedData.quantity,
                details: changedData.details,
                amount: changedData.amount,
                producer: changedData.producer
            });
            stopChangeMode();
        } catch (error) {
            console.error("Error updating job:", error);
            throw error;
        }
    }

    function stopChangeMode() {
        editMode = false;
        jobToEdit = null;
        jobToEditIndex = 0;
    }
</script>

<main>
    <h1 class="headline">Welcome to UTB2026</h1>

    <LoginForm 
        bind:loggedIn={loggedIn}
        bind:user={user}
        onSignIn={handleSignIn}
        onSignOut={handleLogOut}
    />
    
    <hr>

    {#if loggedIn && !showArchiv}
        <JobForm 
            {customers}
            onSubmit={addNewJob}
            onNewCustomer={() => showNewCustomerModal = true}
        />
        
        <h2>Archiv:</h2>
        <div class="archive-selector">
            <select bind:value={archiveCustomer} onchange={() => getJobFromArchiv(archiveCustomer)}>
                <option value="" disabled selected>Wählen Sie einen Kunden</option>
                {#each customers as customer}
                    <option value={customer.companyName}>{customer.companyName}</option>
                {/each}
            </select>
        </div>
        
        <h2>{jobs.length} aktive Aufträge:</h2>
        <JobListHeader />
        <ul>
            {#each jobs as job, index}
                <li>
                    <JobListItem 
                        {job}
                        {index}
                        onToggleReady={toggleSomethingIsReady}
                        onEdit={openEditMode}
                        onArchive={confirmArchiveJob}
                        onDelete={confirmDeleteJob}
                    />
                    
                    {#if editMode && jobToEditIndex === index}
                        <JobEditForm 
                            job={jobToEdit}
                            {customers}
                            onSave={saveChangedJob}
                            onCancel={stopChangeMode}
                            onNewCustomer={() => showNewCustomerModal = true}
                        />
                    {/if}
                </li>
            {/each}
        </ul>
    {:else if loggedIn && showArchiv}
        <div class="archive-header">
            <h2>📦 {archivJobs.length} archivierte Aufträge</h2>
            <button onclick={() => {showArchiv = false; archiveCustomer = '';}}>
                ← Zurück zu aktiven Aufträgen
            </button>
        </div>
        <ArchiveListHeader />
        <ul>
            {#each archivJobs as job, index}
                <li>
                    <JobListItem 
                        {job}
                        {index}
                        showReadyChecks={false}
                        onEdit={addNewJobFromArchiv}
                    />
                </li>
            {/each}
        </ul>
    {/if}
</main>

<!-- Modals -->
<Modal 
    bind:show={showDeleteModal}
    title="Auftrag löschen"
    message="Möchten Sie diesen Auftrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
    confirmText="Löschen"
    cancelText="Abbrechen"
    onConfirm={deleteJob}
/>

<Modal 
    bind:show={showArchiveModal}
    title="Auftrag archivieren"
    message="Möchten Sie diesen Auftrag wirklich archivieren?"
    confirmText="Archivieren"
    cancelText="Abbrechen"
    onConfirm={archiveJob}
/>

<NewCustomerModal 
    bind:show={showNewCustomerModal}
    onComplete={addNewCustomer}
/>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @import '$lib/styles/theme.css';

    :global(body) {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: var(--spacing-xl) var(--spacing-lg);
    }

    main {
        max-width: 1800px;
        margin: 0 auto;
        background: var(--color-white);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-xl);
        padding: var(--spacing-2xl);
    }

    .headline {
        font-size: var(--font-size-3xl);
        font-weight: 700;
        margin-bottom: var(--spacing-xl);
        text-align: center;
        color: var(--color-gray-900);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    :global(hr) {
        border: none;
        height: 1px;
        background: var(--color-gray-200);
        margin: var(--spacing-xl) 0;
    }

    :global(h2) {
        font-size: var(--font-size-xl);
        font-weight: 600;
        color: var(--color-gray-800);
        margin: var(--spacing-lg) 0 var(--spacing-md) 0;
    }

    :global(select) {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        color: var(--color-gray-700);
        background-color: var(--color-white);
        cursor: pointer;
        transition: all var(--transition-fast);
        min-width: 200px;
    }

    :global(select:hover) {
        border-color: var(--color-primary);
    }

    :global(select:focus) {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    :global(button) {
        padding: var(--spacing-sm) var(--spacing-lg);
        border: none;
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        font-weight: 500;
        cursor: pointer;
        transition: all var(--transition-fast);
        box-shadow: var(--shadow-sm);
    }

    :global(button:hover) {
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
    }

    :global(button:active) {
        transform: translateY(0);
    }

    :global(button:disabled) {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    ul {
        padding-inline-start: 0;
        list-style: none;
    }

    li {
        list-style-type: none;
        margin-bottom: var(--spacing-md);
    }

    .archive-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--color-info-light);
        padding: var(--spacing-lg);
        border-radius: var(--radius-lg);
        margin-bottom: var(--spacing-lg);
        border: 2px solid var(--color-info);
    }

    .archive-header h2 {
        margin: 0;
        color: var(--color-info);
    }

    .archive-header button {
        background: var(--color-info);
        color: white;
    }

    .archive-header button:hover {
        background: var(--color-info-hover);
    }

    .archive-selector {
        margin-bottom: var(--spacing-lg);
    }
</style>
