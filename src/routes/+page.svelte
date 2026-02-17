<script>
    import { onDestroy } from 'svelte';
    import { app, auth } from '$lib/FireBase.js';
    import { getFirestore, collection, onSnapshot, query, where, doc, updateDoc, setDoc, deleteDoc, getDocs, writeBatch, deleteField } from 'firebase/firestore';
    import { signInWithEmailAndPassword, signOut } from "firebase/auth";
    
    // Import components
    import LoginForm from '$lib/components/LoginForm.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import NewCustomerModal from '$lib/components/NewCustomerModal.svelte';
    import EditCustomerModal from '$lib/components/EditCustomerModal.svelte';
    import JobForm from '$lib/components/JobForm.svelte';
    import JobEditForm from '$lib/components/JobEditForm.svelte';
    import JobListItem from '$lib/components/JobListItem.svelte';
    import ShippedConfirmModal from '$lib/components/ShippedConfirmModal.svelte';

    /** @typedef {import('$lib/types').Customer} Customer */
    /** @typedef {import('$lib/types').JobFormData} JobFormData */
    /** @typedef {import('$lib/types').Job} Job */
    /** @typedef {import('$lib/types').ReadyType} ReadyType */
    /** @typedef {import('$lib/types').UnsubscribeFn} UnsubscribeFn */

    let loggedIn = $state(false);
    let showArchiv = $state(false);
    /** @type {Customer[]} */
    let customers = $state([]);
    /** @type {Job[]} */
    let jobs = $state([]);
    /** @type {Job[]} */
    let archivJobs = $state([]);
    let user = $state('');
    
    const db = getFirestore(app);
    
    // Store unsubscribe functions for cleanup
    /** @type {UnsubscribeFn | null} */
    let unsubscribeCustomers = null;
    /** @type {UnsubscribeFn | null} */
    let unsubscribeJobs = null;
    /** @type {UnsubscribeFn | null} */
    let unsubscribeArchivJobs = null;
    
    // Modal states
    let showDeleteModal = $state(false);
    let showArchiveModal = $state(false);
    let showNewCustomerModal = $state(false);
    let showEditCustomerModal = $state(false);
    let showShippedConfirmModal = $state(false);
    let deleteJobId = $state('');
    let archiveJobId = $state('');
    /** @type {Customer | null} */
    let customerToEdit = $state(null);
    /** @type {Job | null} */
    let jobForShippedConfirm = $state(null);
    
    // Edit mode
    /** @type {Job | null} */
    let jobToEdit = $state(null);
    let jobToEditIndex = $state(0);
    let editMode = $state(false);
    
    // Archive customer selection
    let archiveCustomer = $state('');
    let archiveSearch = $state('');

    /** @param {number | string} value */
    function normalizeAmount(value) {
        const numericValue = Number(value);
        return Math.round((numericValue + Number.EPSILON) * 100) / 100;
    }

    function noop() {}

    /** @returns {Job[]} */
    function getFilteredArchivJobs() {
        const queryText = archiveSearch.trim().toLowerCase();
        if (!queryText) {
            return archivJobs;
        }

        return archivJobs.filter((job) => {
            const jobname = job.jobname?.toLowerCase() ?? '';
            const details = job.details?.toLowerCase() ?? '';
            return jobname.includes(queryText) || details.includes(queryText);
        });
    }

    /** @param {Customer} customer */
    function getCustomerLabel(customer) {
        const company = customer.company?.trim();
        const firstName = customer.firstName?.trim() ?? '';
        const lastName = customer.lastName?.trim() ?? '';
        const contactName = [lastName, firstName].filter(Boolean).join(', ');

        if (company) {
            return contactName ? `${company} – ${contactName}` : company;
        }

        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
            return fullName;
        }
        return customer.companyName ?? '';
    }

    /** @param {Customer} customer */
    function getCustomerSortKey(customer) {
        const company = customer.company?.trim() ?? '';
        const lastName = customer.lastName?.trim() ?? '';
        const firstName = customer.firstName?.trim() ?? '';

        if (company) {
            return `${company.toLowerCase()}|${lastName.toLowerCase()}|${firstName.toLowerCase()}`;
        }

        return `${lastName.toLowerCase()}|${firstName.toLowerCase()}`;
    }

    /**
     * Findet das Customer-Objekt basierend auf dem customer Label String
     * @param {string} customerLabel - Der customer String aus einem Job
     * @returns {Customer | undefined} Das vollständige Customer-Objekt oder undefined
     */
    function getCustomerByLabel(customerLabel) {
        return customers.find((customer) => getCustomerLabel(customer) === customerLabel);
    }

    /** @param {string} customerLabel */
    function openEditCustomerModal(customerLabel) {
        const selectedCustomer = getCustomerByLabel(customerLabel);
        if (!selectedCustomer) {
            console.warn(`Customer not found for label: ${customerLabel}`);
            return;
        }
        customerToEdit = selectedCustomer;
        showEditCustomerModal = true;
    }

    /** @param {Partial<Customer> & Record<string, unknown>} customerData */
    function normalizeCustomerData(customerData) {
        const firstName = String(customerData.firstName ?? customerData.companyName ?? '').trim();
        const lastName = String(customerData.lastName ?? '').trim();
        const companyValue = String(customerData.company ?? customerData.companyName2 ?? '').trim();
        const legacyAddress2 = String(customerData.address2 ?? '').trim();

        let zipFromLegacy = '';
        let cityFromLegacy = '';
        const zipCityMatch = legacyAddress2.match(/^(\d{4,6})\s+(.+)$/);
        if (zipCityMatch) {
            zipFromLegacy = zipCityMatch[1];
            cityFromLegacy = zipCityMatch[2];
        }

        /** @type {Customer} */
        const normalized = {
            firstName,
            lastName,
            address: String(customerData.address ?? customerData.address1 ?? '').trim(),
            zip: String(customerData.zip ?? zipFromLegacy).trim(),
            city: String(customerData.city ?? cityFromLegacy).trim(),
            countryCode: String(customerData.countryCode ?? 'DE').trim().toUpperCase(),
            email: String(customerData.email ?? '').trim().toLowerCase()
        };

        if (companyValue) {
            normalized.company = companyValue;
        }

        return normalized;
    }

    async function migrateLegacyCustomers() {
        const customerCollection = collection(db, "customer");
        const snapshot = await getDocs(query(customerCollection));
        const batch = writeBatch(db);
        let updatedCount = 0;

        snapshot.forEach((customerDoc) => {
            const rawData = /** @type {Partial<Customer> & Record<string, unknown>} */ (customerDoc.data());
            const needsMigration = !!(rawData.companyName || rawData.companyName2 || rawData.address1 || rawData.address2);
            if (!needsMigration) {
                return;
            }

            const normalized = normalizeCustomerData(rawData);
            batch.update(customerDoc.ref, {
                ...normalized,
                companyName: deleteField(),
                companyName2: deleteField(),
                address1: deleteField(),
                address2: deleteField()
            });
            updatedCount += 1;
        });

        if (updatedCount > 0) {
            await batch.commit();
            console.info(`Migrated ${updatedCount} legacy customer documents.`);
        }
    }
    
    // Cleanup listeners on component destroy
    onDestroy(() => {
        if (unsubscribeCustomers) unsubscribeCustomers();
        if (unsubscribeJobs) unsubscribeJobs();
        if (unsubscribeArchivJobs) unsubscribeArchivJobs();
    });

    /** @param {string} email @param {string} password */
    async function handleSignIn(email, password) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user.email ?? '';
        loggedIn = true;

        try {
            await migrateLegacyCustomers();
        } catch (migrationError) {
            console.error("Error migrating legacy customers:", migrationError);
        }

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
                const customerData = normalizeCustomerData(/** @type {Partial<Customer> & Record<string, unknown>} */ (doc.data()));
                customerData.id = doc.id;
                customers = [...customers, customerData];
            });
            customers.sort((a, b) => getCustomerSortKey(a).localeCompare(getCustomerSortKey(b), 'de'));
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
                const jobData = /** @type {Job} */ ({ id: ID, ...doc.data() });
                jobs = [...jobs, jobData];
            });
            jobs.sort((a, b) => (b.jobstart) - (a.jobstart));
        }, (error) => {
            console.error("Error fetching jobs:", error);
        });
    }

    /** @param {ReadyType} whatsIsReady @param {string} ID @param {boolean} isReady */
    async function toggleSomethingIsReady(whatsIsReady, ID, isReady) {
        // Spezialbehandlung für "shipped" - zeige Bestätigungsmodal
        if (whatsIsReady === 'shipped' && isReady === false) {
            const job = jobs.find(j => j.id === ID);
            if (job) {
                jobForShippedConfirm = job;
                showShippedConfirmModal = true;
                return;
            }
        }

        const jobRef = doc(db, "Jobs", ID);
        /** @type {Record<ReadyType, string>} */
        const updateField = {
            paper: "paper_ready",
            plates: "plates_ready",
            print: "print_ready",
            shipped: "shipped_ready",
            invoice: "invoice_ready",
            payed: "payed_ready",
            toShip: "toShip"
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

    /** @param {string | undefined} trackingNumber */
    async function confirmShippedAndSendEmail(trackingNumber) {
        if (!jobForShippedConfirm) return;

        try {
            const jobRef = doc(db, "Jobs", jobForShippedConfirm.id);
            
            // Update Job in Firebase
            /** @type {Record<string, any>} */
            const updateData = {
                shipped_ready: true
            };
            
            if (trackingNumber) {
                updateData.trackingNumber = trackingNumber;
            }
            
            await updateDoc(jobRef, updateData);

            // Suche Kunden-E-Mail per ID
            const customerId = jobForShippedConfirm.customerId;
            const jobCustomer = jobForShippedConfirm.customer;
            const customer = customerId 
                ? customers.find(c => c.id === customerId)
                : customers.find(c => {
                    const customerLabel = getCustomerLabel(c);
                    return customerLabel === jobCustomer;
                });

            if (customer && customer.email) {
                // Sende E-Mail via API
                const response = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customerEmail: customer.email,
                        customerName: jobForShippedConfirm.customer,
                        jobname: jobForShippedConfirm.jobname,
                        toShip: Boolean(jobForShippedConfirm.toShip),
                        trackingNumber: trackingNumber
                    })
                });

                const result = await response.json();
                
                if (response.ok) {
                    alert('E-Mail wurde erfolgreich versendet!');
                } else {
                    alert(`Fehler beim E-Mail-Versand: ${result.error}\n\nDetails: ${result.details || 'Keine weiteren Informationen'}`);
                }
            } else {
                alert('Warnung: Keine E-Mail-Adresse für diesen Kunden gefunden. Der Status wurde aktualisiert, aber keine E-Mail wurde versendet.');
            }
        } catch (error) {
            console.error('Fehler beim Bestätigen und E-Mail-Versand:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
            alert('Fehler beim Verarbeiten der Anfrage: ' + errorMessage);
        } finally {
            showShippedConfirmModal = false;
            jobForShippedConfirm = null;
        }
    }

    function cancelShippedConfirm() {
        showShippedConfirmModal = false;
        jobForShippedConfirm = null;
    }

    /** @param {JobFormData} jobData */
    async function addNewJob(jobData) {
        const colRef = doc(collection(db, "Jobs"));
        await setDoc(colRef, {
            jobstart: Date.now() / 1000,
            customerId: jobData.customerId,
            customer: jobData.customer,
            jobname: jobData.jobname,
            quantity: jobData.quantity,
            details: jobData.details,
            amount: normalizeAmount(jobData.amount),
            producer: jobData.producer,
            paper_ready: false,
            plates_ready: false,
            print_ready: false,
            shipped_ready: false,
            invoice_ready: false,
            payed_ready: false,
            toShip: false,
            archiv: false
        });
    }

    /** @param {string} jobId */
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

    /** @param {string} jobId */
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

    /** @param {Customer} customerData */
    async function addNewCustomer(customerData) {
        try {
            const colRef = doc(collection(db, "customer"));
            const company = customerData.company?.trim();
            await setDoc(colRef, {
                firstName: customerData.firstName.trim(),
                lastName: customerData.lastName.trim(),
                ...(company ? { company } : {}),
                address: customerData.address.trim(),
                zip: customerData.zip.trim(),
                city: customerData.city.trim(),
                countryCode: customerData.countryCode.trim().toUpperCase(),
                email: customerData.email.trim().toLowerCase()
            });
        } catch (error) {
            console.error("Error adding customer:", error);
            throw error;
        }
    }

    /** @param {Customer} customerData */
    async function updateCustomer(customerData) {
        if (!customerData.id || !customerToEdit) {
            return;
        }

        const previousLabel = getCustomerLabel(customerToEdit);
        const nextLabel = getCustomerLabel(customerData);
        const customerRef = doc(db, "customer", customerData.id);
        const company = customerData.company?.trim();

        try {
            await updateDoc(customerRef, {
                firstName: customerData.firstName.trim(),
                lastName: customerData.lastName.trim(),
                ...(company ? { company } : { company: deleteField() }),
                address: customerData.address.trim(),
                zip: customerData.zip.trim(),
                city: customerData.city.trim(),
                countryCode: customerData.countryCode.trim().toUpperCase(),
                email: customerData.email.trim().toLowerCase()
            });

            if (previousLabel !== nextLabel) {
                const jobsQuery = query(collection(db, "Jobs"), where("customer", "==", previousLabel));
                const jobsSnapshot = await getDocs(jobsQuery);
                if (!jobsSnapshot.empty) {
                    const batch = writeBatch(db);
                    jobsSnapshot.forEach((jobDoc) => {
                        batch.update(jobDoc.ref, { customer: nextLabel });
                    });
                    await batch.commit();
                }
            }

            showEditCustomerModal = false;
            customerToEdit = null;
        } catch (error) {
            console.error("Error updating customer:", error);
            throw error;
        }
    }

    /** @param {string} selectedCustomer */
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
                    const archivJobData = /** @type {Job} */ ({ id: ID, ...doc.data() });
                    archivJobs = [...archivJobs, archivJobData];
                }
            });
            archivJobs.sort((a, b) => (b.jobstart) - (a.jobstart));
        }, (error) => {
            console.error("Error fetching archive jobs:", error);
        });
        showArchiv = true;
        archiveCustomer = '';
        archiveSearch = '';
    }

    /** @param {Job} job */
    async function addNewJobFromArchiv(job) {
        try {
            const colRef = doc(collection(db, "Jobs"));
            await setDoc(colRef, {
                jobstart: Date.now() / 1000,
                customerId: job.customerId || '',
                customer: job.customer,
                jobname: job.jobname,
                quantity: job.quantity,
                details: job.details,
                amount: normalizeAmount(job.amount),
                producer: job.producer,
                paper_ready: false,
                plates_ready: false,
                print_ready: false,
                invoice_ready: false,
                payed_ready: false,
                toShip: false,
                archiv: false
            });
            showArchiv = false;
        } catch (error) {
            console.error("Error copying job from archive:", error);
        }
    }

    /** @param {Job} job @param {number} index */
    function openEditMode(job, index) {
        jobToEdit = job;
        jobToEditIndex = index;
        editMode = true;
    }

    /** @param {JobFormData} changedData */
    async function saveChangedJob(changedData) {
        if (!jobToEdit) {
            return;
        }

        try {
            const jobRef = doc(db, "Jobs", jobToEdit.id);
            await updateDoc(jobRef, {
                customerId: changedData.customerId,
                customer: changedData.customer,
                jobname: changedData.jobname,
                quantity: changedData.quantity,
                details: changedData.details,
                amount: normalizeAmount(changedData.amount),
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
            onNewCustomer={() => {
                showNewCustomerModal = true;
            }}
            onEditCustomer={openEditCustomerModal}
        />
        
        <h2>Archiv:</h2>
        <div class="archive-selector">
            <select bind:value={archiveCustomer} onchange={() => getJobFromArchiv(archiveCustomer)}>
                <option value="" disabled selected>Wählen Sie einen Kunden</option>
                {#each customers as customer}
                    <option value={getCustomerLabel(customer)}>{getCustomerLabel(customer)}</option>
                {/each}
            </select>
        </div>

        <h2>{jobs.length} aktive Aufträge:</h2>
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
                    
                    {#if editMode && jobToEdit && jobToEditIndex === index}
                        <JobEditForm 
                            job={jobToEdit}
                            {customers}
                            onSave={saveChangedJob}
                            onCancel={stopChangeMode}
                            onNewCustomer={() => {
                                showNewCustomerModal = true;
                            }}
                            onEditCustomer={openEditCustomerModal}
                        />
                    {/if}
                </li>
            {/each}
        </ul>
    {:else if loggedIn && showArchiv}
        <div class="archive-header">
            <h2>📦 {getFilteredArchivJobs().length} archivierte Aufträge</h2>
            <button onclick={() => {showArchiv = false; archiveCustomer = ''; archiveSearch = '';}}>
                ← Zurück zu aktiven Aufträgen
            </button>
        </div>
        <div class="archive-search">
            <input
                type="text"
                bind:value={archiveSearch}
                placeholder="Suche in Jobname oder Details"
            />
        </div>
        <ul>
            {#each getFilteredArchivJobs() as job, index}
                <li>
                    <JobListItem 
                        {job}
                        {index}
                        showReadyChecks={false}
                        onEdit={addNewJobFromArchiv}
                        onToggleReady={noop}
                        onArchive={noop}
                        onDelete={noop}
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

<EditCustomerModal
    bind:show={showEditCustomerModal}
    customer={customerToEdit}
    onComplete={updateCustomer}
/>

{#if showShippedConfirmModal && jobForShippedConfirm}
    <ShippedConfirmModal
        job={jobForShippedConfirm}
        onConfirm={confirmShippedAndSendEmail}
        onCancel={cancelShippedConfirm}
    />
{/if}

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

    .archive-search {
        margin-bottom: var(--spacing-lg);
    }

    .archive-search input {
        width: 100%;
        max-width: 420px;
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
    }

    .archive-search input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-light);
    }
</style>
