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
    import FinishedJobListItem from '$lib/components/FinishedJobListItem.svelte';
    import FinishedJobListHeader from '$lib/components/FinishedJobListHeader.svelte';
    import ArchiveListHeader from '$lib/components/ArchiveListHeader.svelte';
    import ShippedConfirmModal from '$lib/components/ShippedConfirmModal.svelte';
    import InvoiceConfirmModal from '$lib/components/InvoiceConfirmModal.svelte';
    import MahnungConfirmModal from '$lib/components/MahnungConfirmModal.svelte';
    import DataCheckedModal from '$lib/components/DataCheckedModal.svelte';

    /** @typedef {import('$lib/types').Customer} Customer */
    /** @typedef {import('$lib/types').JobFormData} JobFormData */
    /** @typedef {import('$lib/types').Job} Job */
    /** @typedef {import('$lib/types').ReadyType} ReadyType */
    /** @typedef {import('$lib/types').UnsubscribeFn} UnsubscribeFn */
    /** @typedef {import('$lib/types').VatRate} VatRate */

    let loggedIn = $state(false);
    let showArchiv = $state(false);
    let showFinished = $state(false);
    /** @type {Customer[]} */
    let customers = $state([]);
    /** @type {Job[]} */
    let jobs = $state([]);
    /** @type {Job[]} */
    let finishedJobs = $state([]);
    /** @type {Job[]} */
    let archivJobs = $state([]);
    /** @type {VatRate[]} */
    let vatRates = $state([]);
    let user = $state('');
    
    const db = getFirestore(app);
    
    // Store unsubscribe functions for cleanup
    /** @type {UnsubscribeFn | null} */
    let unsubscribeCustomers = null;
    /** @type {UnsubscribeFn | null} */
    let unsubscribeJobs = null;
    /** @type {UnsubscribeFn | null} */
    let unsubscribeFinishedJobs = null;
    /** @type {UnsubscribeFn | null} */
    let unsubscribeArchivJobs = null;
    /** @type {UnsubscribeFn | null} */
    let unsubscribeVatRates = null;
    
    // Modal states
    let showDeleteModal = $state(false);
    let showArchiveModal = $state(false);
    let showNewCustomerModal = $state(false);
    let showEditCustomerModal = $state(false);
    let showShippedConfirmModal = $state(false);
    let showInvoiceModal = $state(false);
    let deleteJobId = $state('');
    let archiveJobId = $state('');
    /** @type {Customer | null} */
    let customerToEdit = $state(null);
    /** @type {Job | null} */
    let jobForShippedConfirm = $state(null);
    /** @type {Job | null} */
    let jobForInvoice = $state(null);
    /** @type {Customer | null} */
    let customerForInvoice = $state(null);
    /** @type {Job[]} */
    let additionalJobsForInvoice = $state([]);
    /** @type {string[]} */
    let selectedAdditionalJobIds = $state([]);
    /** @type {Job | null} */
    let jobForDataChecked = $state(null);
    let showDataCheckedModal = $state(false);
    let showPaidArchiveModal = $state(false);
    let paidArchiveMessage = $state('');
    let showFinishedDeleteModal = $state(false);
    let finishedDeleteMessage = $state('');
    let showReminderModal = $state(false);
    /** @type {Job | null} */
    let jobForReminder = $state(null);
    /** @type {Customer | null} */
    let customerForReminder = $state(null);
    
    // Edit mode (aktive Aufträge)
    /** @type {Job | null} */
    let jobToEdit = $state(null);
    let jobToEditIndex = $state(0);
    let editMode = $state(false);

    // Edit mode (fertige Aufträge)
    /** @type {Job | null} */
    let finishedJobToEdit = $state(null);
    let finishedJobToEditIndex = $state(0);
    let finishedEditMode = $state(false);
    
    // Archive customer selection
    let archiveCustomer = $state('');
    let archiveSearch = $state('');

    const openInvoicesTotal = $derived(
        finishedJobs
            .filter(job => job.invoice_ready)
            .reduce((sum, job) => {
                const net = Number(job.amount) || 0;
                const vatRate = job.vatRate ?? 19;
                return sum + net * (1 + vatRate / 100);
            }, 0)
    );

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
            const customer = job.customer?.toLowerCase() ?? '';
            return jobname.includes(queryText) || details.includes(queryText) || customer.includes(queryText);
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

    /**
     * Gibt einen Schlüssel für die effektive Rechnungsadresse eines Jobs zurück.
     * Jobs mit gleicher Rechnungsadresse können zusammen fakturiert werden.
     * @param {Job} job
     * @returns {string}
     */
    function effectiveBillingKey(job) {
        if (!job.billingAddress) return 'default';
        const b = job.billingAddress;
        return `${b.firma || ''}|${b.strasse || ''}|${b.plz || ''}|${b.ort || ''}|${b.land || ''}`;
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

        const invoiceMail = String(customerData.invoiceMail ?? '').trim().toLowerCase();
        if (invoiceMail) {
            normalized.invoiceMail = invoiceMail;
        }

        if (customerData.single === true) {
            normalized.single = true;
        }

        if (Array.isArray(customerData.contacts) && customerData.contacts.length > 0) {
            normalized.contacts = /** @type {import('$lib/types').Contact[]} */ (customerData.contacts);
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

    async function migrateJobsFinishedField() {
        const jobsCollection = collection(db, "Jobs");
        const snapshot = await getDocs(query(jobsCollection));
        const batch = writeBatch(db);
        let updatedCount = 0;

        snapshot.forEach((jobDoc) => {
            const jobData = jobDoc.data();
            // Wenn das finished-Feld nicht existiert, setze es auf false
            if (jobData.finished === undefined) {
                batch.update(jobDoc.ref, {
                    finished: false
                });
                updatedCount += 1;
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
            console.info(`Migrated ${updatedCount} jobs with finished field.`);
        }
    }

    async function migrateJobsVatRate() {
        const jobsCollection = collection(db, "Jobs");
        const snapshot = await getDocs(query(jobsCollection));
        const batch = writeBatch(db);
        let updatedCount = 0;

        snapshot.forEach((jobDoc) => {
            const jobData = jobDoc.data();
            // Wenn das vatRate-Feld nicht existiert, setze es auf den Standard-Wert 19
            if (jobData.vatRate === undefined) {
                batch.update(jobDoc.ref, {
                    vatRate: 19
                });
                updatedCount += 1;
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
            console.info(`Migrated ${updatedCount} jobs with vatRate field (set to 19%).`);
        }
    }
    
    // Cleanup listeners on component destroy
    onDestroy(() => {
        if (unsubscribeCustomers) unsubscribeCustomers();
        if (unsubscribeJobs) unsubscribeJobs();
        if (unsubscribeFinishedJobs) unsubscribeFinishedJobs();
        if (unsubscribeArchivJobs) unsubscribeArchivJobs();
        if (unsubscribeVatRates) unsubscribeVatRates();
    });

    /** @param {string} email @param {string} password */
    async function handleSignIn(email, password) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user.email ?? '';
        loggedIn = true;

        try {
            await migrateLegacyCustomers();
            await migrateJobsFinishedField();
            await migrateJobsVatRate();
            await ensureDefaultVatRates();
        } catch (migrationError) {
            console.error("Error migrating legacy data:", migrationError);
        }

        getJobsFromCollection();
        getFinishedJobsFromCollection();
        getCustomersFromCollection();
        getVatRatesFromCollection();
    }

    async function handleLogOut() {
        await signOut(auth);
        loggedIn = false;
        showArchiv = false;
        showFinished = false;
        customers = [];
        jobs = [];
        finishedJobs = [];
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
        if (unsubscribeFinishedJobs) {
            unsubscribeFinishedJobs();
            unsubscribeFinishedJobs = null;
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

    async function getVatRatesFromCollection() {
        if (unsubscribeVatRates) unsubscribeVatRates();
        vatRates = [];
        const q = query(collection(db, "VatRates"));
        unsubscribeVatRates = onSnapshot(q, (querySnapshot) => {
            vatRates = [];
            querySnapshot.forEach((doc) => {
                const vatRateData = /** @type {VatRate} */ ({ id: doc.id, ...doc.data() });
                vatRates = [...vatRates, vatRateData];
            });
            // Sortiere nach Rate
            vatRates.sort((a, b) => b.rate - a.rate);
        }, (error) => {
            console.error("Error fetching VAT rates:", error);
        });
    }

    /**
     * Stellt sicher, dass Standard-Mehrwertsteuersätze in der Datenbank existieren
     */
    async function ensureDefaultVatRates() {
        const vatRatesCollection = collection(db, "VatRates");
        const snapshot = await getDocs(vatRatesCollection);
        
        // Wenn bereits Mehrwertsteuersätze existieren, nichts tun
        if (!snapshot.empty) {
            return;
        }

        // Standard-Mehrwertsteuersätze anlegen
        const defaultRates = [
            { rate: 19, label: 'Standard (19%)', isDefault: true },
            { rate: 7, label: 'Ermäßigt (7%)', isDefault: false },
            { rate: 0, label: 'Steuerfrei (0%)', isDefault: false }
        ];

        const batch = writeBatch(db);
        for (const rateData of defaultRates) {
            const docRef = doc(vatRatesCollection);
            batch.set(docRef, rateData);
        }

        try {
            await batch.commit();
        } catch (error) {
            console.error('Error creating default VAT rates:', error);
            throw error;
        }
    }

    async function getJobsFromCollection() {
        if (unsubscribeJobs) unsubscribeJobs();
        jobs = [];
        // Lade alle nicht-archivierten Jobs und filtere clientseitig
        const q = query(collection(db, "Jobs"), where("archiv", "==", false));
        unsubscribeJobs = onSnapshot(q, (querySnapshot) => {
            /** @type {Job[]} */
            const activeJobs = [];
            querySnapshot.forEach((doc) => {
                let ID = doc.id;
                const jobData = /** @type {Job} */ ({ id: ID, ...doc.data() });
                // Zeige nur Jobs, die NICHT shipped_ready sind (shipped_ready muss explizit !== true sein)
                if (jobData.shipped_ready !== true) {
                    activeJobs.push(jobData);
                }
            });
            activeJobs.sort((a, b) => (b.jobstart) - (a.jobstart));
            jobs = activeJobs;
        }, (error) => {
            console.error("Error fetching jobs:", error);
        });
    }

    async function getFinishedJobsFromCollection() {
        if (unsubscribeFinishedJobs) unsubscribeFinishedJobs();
        finishedJobs = [];
        // Lade alle nicht-archivierten Jobs und filtere nach shipped_ready === true
        const q = query(collection(db, "Jobs"), where("archiv", "==", false));
        unsubscribeFinishedJobs = onSnapshot(q, (querySnapshot) => {
            /** @type {Job[]} */
            const completedJobs = [];
            querySnapshot.forEach((doc) => {
                let ID = doc.id;
                const jobData = /** @type {Job} */ ({ id: ID, ...doc.data() });
                // Zeige nur Jobs, die explizit shipped_ready === true sind
                if (jobData.shipped_ready === true) {
                    completedJobs.push(jobData);
                }
            });
            completedJobs.sort((a, b) => (b.jobstart) - (a.jobstart));
            finishedJobs = completedJobs;
        }, (error) => {
            console.error("Error fetching finished jobs:", error);
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

        // Spezialbehandlung für "dataChecked" - zeige Datenprüfungs-Modal
        if (whatsIsReady === 'dataChecked' && isReady === false) {
            const job = jobs.find(j => j.id === ID);
            if (job) {
                jobForDataChecked = job;
                showDataCheckedModal = true;
                return;
            }
        }

        // Spezialbehandlung für "invoice" - zeige Bestätigungsmodal und erstelle Rechnung
        if (whatsIsReady === 'invoice') {
            console.log('Invoice button clicked for job:', ID);
            console.log('Current isReady state:', isReady);
            
            // Wenn bereits eine Rechnung erstellt wurde, zeige eine Info
            if (isReady === true) {
                console.log('Rechnung wurde bereits erstellt');
                alert('Für diesen Auftrag wurde bereits eine Rechnung erstellt.');
                return;
            }
            
            const job = finishedJobs.find(j => j.id === ID) || jobs.find(j => j.id === ID);
            console.log('Job found:', $state.snapshot(job));
            
            if (!job) {
                console.error('Job nicht gefunden in finishedJobs oder jobs');
                alert('Auftrag konnte nicht gefunden werden.');
                return;
            }
            
            // Finde den Kunden
            const customerId = job.customerId;
            let customer = undefined;
            
            console.log('Suche Kunde mit customerId:', customerId);
            
            if (customerId) {
                customer = customers.find(c => c.id === customerId);
            }
            
            if (!customer) {
                console.log('Kunde nicht über customerId gefunden, versuche über Label:', job.customer);
                customer = customers.find(c => getCustomerLabel(c) === job.customer);
            }
            
            console.log('Kunde gefunden:', $state.snapshot(customer));

            if (customer) {
                jobForInvoice = job;
                customerForInvoice = customer;
                // Finde weitere abrechenbare Jobs desselben Kunden (gleicher MwSt.-Satz, gleiche Rechnungsadresse)
                const primaryVatRate = job.vatRate ?? 19;
                const primaryBillingKey = effectiveBillingKey(job);
                additionalJobsForInvoice = finishedJobs.filter(j =>
                    j.id !== job.id &&
                    !j.invoice_ready &&
                    j.customerId === job.customerId &&
                    (j.vatRate ?? 19) === primaryVatRate &&
                    effectiveBillingKey(j) === primaryBillingKey
                );
                selectedAdditionalJobIds = [];
                console.log('Öffne Invoice Modal');
                showInvoiceModal = true;
                return;
            } else {
                console.error('Kunde konnte nicht zugeordnet werden');
                alert('Kunde konnte nicht gefunden werden. Bitte überprüfen Sie die Kundendaten.');
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
            toShip: "toShip",
            dataChecked: "dataChecked"
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
                shipped_ready: true,
                finished: true
            };
            
            if (trackingNumber) {
                updateData.trackingNumber = trackingNumber;
            }
            
            await updateDoc(jobRef, updateData);

            // Suche Kunden-E-Mail per ID
            const customerId = jobForShippedConfirm.customerId;
            const jobCustomer = jobForShippedConfirm.customer;
            
            let customer = undefined;
            
            // Versuch 1: Suche per customerId
            if (customerId) {
                customer = customers.find(c => c.id === customerId);
            }
            
            // Versuch 2: Exakter Match mit aktuellem Label-Format
            if (!customer) {
                customer = customers.find(c => getCustomerLabel(c) === jobCustomer);
            }
            
            // Versuch 3: Flexibles Matching für alte Formate
            // Format: "Firma Nachname Vorname" -> "Firma – Nachname, Vorname"
            if (!customer) {
                customer = customers.find(c => {
                    const company = c.company?.trim() || '';
                    const lastName = c.lastName?.trim() || '';
                    const firstName = c.firstName?.trim() || '';
                    
                    // Prüfe verschiedene Kombinationen
                    const variants = [
                        // "Firma Nachname Vorname"
                        company && lastName && firstName ? `${company} ${lastName} ${firstName}` : '',
                        // "Firma Vorname Nachname"
                        company && lastName && firstName ? `${company} ${firstName} ${lastName}` : '',
                        // "Vorname Nachname" (ohne Firma)
                        firstName && lastName ? `${firstName} ${lastName}` : '',
                        // "Nachname Vorname" (ohne Firma)
                        firstName && lastName ? `${lastName} ${firstName}` : '',
                        // Nur Firma
                        company,
                    ].filter(Boolean);
                    
                    const match = variants.some(variant => variant === jobCustomer);
                    return match;
                });
            }

            if (!customer) {
                alert(`Warnung: Kunde nicht gefunden!\n\nGesucht wurde:\n- CustomerId: ${customerId || 'nicht vorhanden'}\n- Customer Label: ${jobCustomer}\n\nDer Status wurde aktualisiert, aber keine E-Mail wurde versendet.`);
            } else if (!customer.email || customer.email.trim() === '') {
                alert(`Warnung: Kunde "${jobCustomer}" gefunden, aber keine E-Mail-Adresse hinterlegt!\n\nBitte E-Mail-Adresse im Kundendatensatz nachtragen.\n\nDer Status wurde aktualisiert, aber keine E-Mail wurde versendet.`);
            } else {
                // Sende E-Mail via API
                const response = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customerEmail: customer.email,
                        customerFirstName: customer.firstName,
                        customerLastName: customer.lastName,
                        contactEmail: jobForShippedConfirm.contactEmail ?? null,
                        contacts: customer.contacts ?? [],
                        jobname: jobForShippedConfirm.jobname,
                        toShip: Boolean(jobForShippedConfirm.toShip),
                        trackingNumber: trackingNumber,
                        shipmentAddress: jobForShippedConfirm.shipmentAddress ?? null
                    })
                });

                const result = await response.json();
                
                if (response.ok) {
                    alert('E-Mail wurde erfolgreich versendet!');
                } else {
                    alert(`Fehler beim E-Mail-Versand: ${result.error}\n\nDetails: ${result.details || 'Keine weiteren Informationen'}`);
                }
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

    /** @param {string} shipDate */
    async function confirmDataCheckedAndSendEmail(shipDate) {
        if (!jobForDataChecked) return;

        try {
            const jobRef = doc(db, "Jobs", jobForDataChecked.id);
            await updateDoc(jobRef, {
                dataChecked: true,
                shipDate: shipDate
            });

            // Suche Kunden-E-Mail
            const customerId = jobForDataChecked.customerId;
            const jobCustomer = jobForDataChecked.customer;
            let customer = undefined;

            if (customerId) {
                customer = customers.find(c => c.id === customerId);
            }
            if (!customer) {
                customer = customers.find(c => getCustomerLabel(c) === jobCustomer);
            }

            if (!customer) {
                alert(`Warnung: Kunde nicht gefunden!\n\nDer Status wurde aktualisiert, aber keine E-Mail wurde versendet.`);
            } else if (!customer.email || customer.email.trim() === '') {
                alert(`Warnung: Kunde "${jobCustomer}" hat keine E-Mail-Adresse hinterlegt!\n\nDer Status wurde aktualisiert, aber keine E-Mail wurde versendet.`);
            } else {
                const response = await fetch('/api/send-data-checked-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customerEmail: customer.email,
                        customerFirstName: customer.firstName,
                        customerLastName: customer.lastName,
                        contactEmail: jobForDataChecked.contactEmail ?? null,
                        contacts: customer.contacts ?? [],
                        jobname: jobForDataChecked.jobname,
                        toShip: Boolean(jobForDataChecked.toShip),
                        shipDate: shipDate,
                        shipmentAddress: jobForDataChecked.shipmentAddress ?? null
                    })
                });

                const result = await response.json();
                if (response.ok) {
                    alert('E-Mail über Datenfreigabe erfolgreich versendet!');
                } else {
                    alert(`Fehler beim E-Mail-Versand: ${result.error}\n\nDetails: ${result.details || 'Keine weiteren Informationen'}`);
                }
            }
        } catch (error) {
            console.error('Fehler beim Bestätigen der Datenprüfung:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
            alert('Fehler beim Verarbeiten der Anfrage: ' + errorMessage);
        } finally {
            showDataCheckedModal = false;
            jobForDataChecked = null;
        }
    }

    /** @param {string} shipDate */
    async function confirmDataCheckedWithoutEmail(shipDate) {
        if (!jobForDataChecked) return;

        try {
            const jobRef = doc(db, "Jobs", jobForDataChecked.id);
            await updateDoc(jobRef, {
                dataChecked: true,
                shipDate: shipDate
            });
        } catch (error) {
            console.error('Fehler beim Speichern der Datenprüfung:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
            alert('Fehler beim Speichern: ' + errorMessage);
        } finally {
            showDataCheckedModal = false;
            jobForDataChecked = null;
        }
    }

    function cancelDataCheckedModal() {
        showDataCheckedModal = false;
        jobForDataChecked = null;
    }

    async function createAndSendInvoice() {
        if (!jobForInvoice || !customerForInvoice) return;

        try {
            // Priorisierung der Rechnungsmail: contact.invoiceMail > customer.invoiceMail > job.billingEmail > job.contactEmail > customer.email
            const selectedContact = jobForInvoice.contactEmail && customerForInvoice.contacts
                ? customerForInvoice.contacts.find(c => c.email === jobForInvoice.contactEmail)
                : null;
            const invoiceEmail = selectedContact?.invoiceMail ||
                customerForInvoice.invoiceMail ||
                jobForInvoice.billingEmail || 
                jobForInvoice.contactEmail ||
                customerForInvoice.email;
            
            if (!invoiceEmail) {
                alert('Keine E-Mail-Adresse für den Kunden gefunden!');
                return;
            }

            const customerName = customerForInvoice.company || 
                `${customerForInvoice.firstName || ''} ${customerForInvoice.lastName || ''}`.trim();

            // PDF erstellen und E-Mail direkt serverseitig versenden (kein PDF-Roundtrip)
            // Alle ausgewählten Jobs zusammenstellen
            const selectedAdditional = finishedJobs.filter(j => selectedAdditionalJobIds.includes(j.id));
            const allJobs = [jobForInvoice, ...selectedAdditional];

            console.log('Sende Anfrage an /api/create-invoice...', allJobs.length, 'Job(s)');
            const invoiceResponse = await fetch('/api/create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobs: allJobs,
                    customer: customerForInvoice,
                    userId: user,
                    invoiceEmail,
                    customerName,
                    vatRate: jobForInvoice.vatRate || 19
                })
            });

            console.log('Antwort Status:', invoiceResponse.status);

            if (!invoiceResponse.ok) {
                const error = await invoiceResponse.json();
                console.error('Server-Fehler bei Rechnungserstellung:', error);
                const errorMsg = error.error || 'Fehler bei der Rechnungserstellung';
                const errorDetails = error.details || 'Keine Details verfügbar';
                throw new Error(`${errorMsg}\nDetails: ${errorDetails}`);
            }

            const invoiceData = await invoiceResponse.json();
            console.log('Rechnung erstellt und versendet:', invoiceData);

            // Alle Jobs per Batch als "invoice_ready" markieren mit derselben Rechnungsnummer
            const batch = writeBatch(db);
            for (const j of allJobs) {
                const jobRef = doc(db, "Jobs", j.id);
                batch.update(jobRef, {
                    invoice_ready: true,
                    invoiceNumber: invoiceData.invoiceNumber,
                    invoiceDate: Date.now() / 1000
                });
            }
            await batch.commit();

            const jobCountInfo = allJobs.length > 1
                ? `${allJobs.length} Aufträge`
                : `"${allJobs[0].jobname}"`;
            alert(`Rechnung Nr. ${invoiceData.invoiceNumber} für ${jobCountInfo} wurde erfolgreich erstellt und an ${invoiceEmail} versendet!\n\nEine Kopie wurde an invoicelog@online.de gesendet.`);
        } catch (error) {
            console.error('Fehler bei der Rechnungserstellung:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
            alert('Fehler bei der Rechnungserstellung: ' + errorMessage);
        } finally {
            showInvoiceModal = false;
            jobForInvoice = null;
            customerForInvoice = null;
            additionalJobsForInvoice = [];
            selectedAdditionalJobIds = [];
        }
    }

    function cancelInvoice() {
        showInvoiceModal = false;
        jobForInvoice = null;
        customerForInvoice = null;
        additionalJobsForInvoice = [];
        selectedAdditionalJobIds = [];
    }

    /** @param {string | undefined} trackingNumber */
    async function confirmShippedWithoutEmail(trackingNumber) {
        if (!jobForShippedConfirm) return;

        try {
            const jobRef = doc(db, "Jobs", jobForShippedConfirm.id);
            
            // Update Job in Firebase ohne E-Mail-Versand
            /** @type {Record<string, any>} */
            const updateData = {
                shipped_ready: true,
                finished: true
            };
            
            if (trackingNumber) {
                updateData.trackingNumber = trackingNumber;
            }
            
            await updateDoc(jobRef, updateData);
            
            alert('Auftrag wurde abgeschlossen (ohne E-Mail-Versand).');
        } catch (error) {
            console.error('Fehler beim Abschließen:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
            alert('Fehler beim Verarbeiten der Anfrage: ' + errorMessage);
        } finally {
            showShippedConfirmModal = false;
            jobForShippedConfirm = null;
        }
    }

    /** @param {JobFormData} jobData */
    async function addNewJob(jobData) {
        let shipmentAddressId = undefined;
        /** @type {Record<string, any>} */
        let shipmentAddressEmbed = {};

        const sa = jobData.shipmentAddress;
        if (sa && (sa.name || sa.street || sa.zip || sa.city)) {
            const saRef = doc(collection(db, 'shipmentAddresses'));
            const saData = {
                name: sa.name || '',
                street: sa.street || '',
                zip: sa.zip || '',
                city: sa.city || '',
                countryCode: sa.countryCode || 'DE',
                customerId: jobData.customerId,
                createdAt: Date.now() / 1000
            };
            await setDoc(saRef, saData);
            shipmentAddressId = saRef.id;
            shipmentAddressEmbed = { shipmentAddressId, shipmentAddress: saData };
        }

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
            vatRate: jobData.vatRate,
            ...(jobData.shippingCosts != null ? { shippingCosts: normalizeAmount(jobData.shippingCosts) } : {}),
            ...(jobData.contactEmail ? { contactEmail: jobData.contactEmail } : {}),
            ...shipmentAddressEmbed,
            paper_ready: false,
            plates_ready: false,
            print_ready: false,
            shipped_ready: false,
            invoice_ready: false,
            toShip: false,
            dataChecked: false,
            archiv: false,
            finished: false
        });
    }

    /** @param {string} jobId */
    function confirmArchiveJob(jobId) {
        archiveJobId = jobId;
        showArchiveModal = true;
    }

    /** @param {string} jobId */
    function confirmPaidArchiveJob(jobId) {
        const job = finishedJobs.find(j => j.id === jobId);
        if (!job) return;
        const net = Number(job.amount) || 0;
        const shippingCosts = Number(job.shippingCosts) || 0;
        const vatRate = job.vatRate ?? 19;
        const total = (net + shippingCosts) * (1 + vatRate / 100);
        const totalFormatted = total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        paidArchiveMessage = `Hat der Kunde den Betrag von ${totalFormatted} Euro (inkl. ${vatRate}% MwSt.) bezahlt?\n\nDer Auftrag wird anschließend ins Archiv verschoben.`;
        archiveJobId = jobId;
        showPaidArchiveModal = true;
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

    async function archivePaidJob() {
        try {
            const jobRef = doc(db, "Jobs", archiveJobId);
            await updateDoc(jobRef, {
                archiv: true,
                payDate: Date.now() / 1000
            });
        } catch (error) {
            console.error("Error archiving paid job:", error);
        }
    }

    /** @param {string} jobId */
    function confirmDeleteJob(jobId) {
        deleteJobId = jobId;
        showDeleteModal = true;
    }

    /** @param {string} jobId */
    function openReminderModal(jobId) {
        const job = finishedJobs.find(j => j.id === jobId);
        if (!job) return;
        const customer = customers.find(c => c.id === job.customerId) ??
            customers.find(c => getCustomerLabel(c) === job.customer) ?? null;
        jobForReminder = job;
        customerForReminder = customer;
        showReminderModal = true;
    }

    async function sendReminder() {
        if (!jobForReminder || !customerForReminder) return;
        try {
            const response = await fetch('/api/send-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job: jobForReminder, customer: customerForReminder })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Fehler beim Versand der Mahnung');
            }
            const data = await response.json();
            const reminderDate = Math.floor(Date.now() / 1000);
            const jobRef = doc(db, "Jobs", jobForReminder.id);
            await updateDoc(jobRef, { reminderDate });
            // Optimistic local update so the button color changes immediately
            const updatedJobId = jobForReminder.id;
            finishedJobs = finishedJobs.map(j => j.id === updatedJobId ? { ...j, reminderDate } : j);
            alert(`Zahlungserinnerung für Rechnung Nr. ${jobForReminder.invoiceNumber} wurde erfolgreich an ${data.invoiceEmail} versendet.\n\nEine Kopie wurde an remindlog@online.de gesendet.`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
            alert('Fehler beim Versand der Mahnung: ' + errorMessage);
        } finally {
            showReminderModal = false;
            jobForReminder = null;
            customerForReminder = null;
        }
    }

    function cancelReminder() {
        showReminderModal = false;
        jobForReminder = null;
        customerForReminder = null;
    }

    /** @param {string} jobId */
    function confirmFinishedDeleteJob(jobId) {
        const job = finishedJobs.find(j => j.id === jobId);
        deleteJobId = jobId;
        if (job?.invoice_ready) {
            finishedDeleteMessage = `Achtung: Für diesen Auftrag wurde bereits eine Rechnung an den Kunden versendet!\n\nMöchten Sie den Auftrag trotzdem endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.`;
        } else {
            finishedDeleteMessage = 'Möchten Sie diesen fertigen Auftrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.';
        }
        showFinishedDeleteModal = true;
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
                email: customerData.email.trim().toLowerCase(),
                ...(customerData.invoiceMail ? { invoiceMail: customerData.invoiceMail.trim().toLowerCase() } : {}),
                single: customerData.single === true,
                ...(customerData.contacts?.length ? { contacts: customerData.contacts } : {})
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
                email: customerData.email.trim().toLowerCase(),
                ...(customerData.invoiceMail ? { invoiceMail: customerData.invoiceMail.trim().toLowerCase() } : { invoiceMail: deleteField() }),
                single: customerData.single === true,
                ...(customerData.contacts?.length ? { contacts: customerData.contacts } : { contacts: deleteField() })
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

    /** Lädt alle archivierten Jobs ohne Kundenfilter */
    function getAllArchivJobs() {
        if (unsubscribeArchivJobs) unsubscribeArchivJobs();
        archivJobs = [];
        const q = query(collection(db, "Jobs"), where("archiv", "==", true));
        unsubscribeArchivJobs = onSnapshot(q, (querySnapshot) => {
            archivJobs = [];
            querySnapshot.forEach((doc) => {
                let ID = doc.id;
                const archivJobData = /** @type {Job} */ ({ id: ID, ...doc.data() });
                archivJobs = [...archivJobs, archivJobData];
            });
            archivJobs.sort((a, b) => (b.jobstart) - (a.jobstart));
        }, (error) => {
            console.error("Error fetching all archive jobs:", error);
        });
        showArchiv = true;
        archiveCustomer = '';
        archiveSearch = '';
    }

    /** @param {Job} job */
    /** @param {Job} job */
    async function copyJob(job) {
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
                vatRate: job.vatRate ?? 19,
                paper_ready: false,
                plates_ready: false,
                print_ready: false,
                invoice_ready: false,
                toShip: false,
                archiv: false,
                finished: false
            });
        } catch (error) {
            console.error("Fehler beim Kopieren des Auftrags:", error);
        }
    }

    /** @param {Job} job */
    async function addNewJobFromArchiv(job) {
        await copyJob(job);
        showArchiv = false;
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
            let shipmentAddressUpdate = {};
            const sa = changedData.shipmentAddress;
            if (sa && (sa.name || sa.street || sa.zip || sa.city)) {
                const saRef = doc(collection(db, 'shipmentAddresses'));
                const saData = {
                    name: sa.name || '',
                    street: sa.street || '',
                    zip: sa.zip || '',
                    city: sa.city || '',
                    countryCode: sa.countryCode || 'DE',
                    customerId: changedData.customerId,
                    createdAt: Date.now() / 1000
                };
                await setDoc(saRef, saData);
                shipmentAddressUpdate = { shipmentAddressId: saRef.id, shipmentAddress: saData };
            } else {
                shipmentAddressUpdate = { shipmentAddressId: deleteField(), shipmentAddress: deleteField() };
            }

            const jobRef = doc(db, "Jobs", jobToEdit.id);
            await updateDoc(jobRef, {
                customerId: changedData.customerId,
                customer: changedData.customer,
                jobname: changedData.jobname,
                quantity: changedData.quantity,
                details: changedData.details,
                amount: normalizeAmount(changedData.amount),
                producer: changedData.producer,
                vatRate: changedData.vatRate,
                ...(changedData.shippingCosts != null ? { shippingCosts: normalizeAmount(changedData.shippingCosts) } : { shippingCosts: deleteField() }),
                ...(changedData.contactEmail ? { contactEmail: changedData.contactEmail } : { contactEmail: deleteField() }),
                ...shipmentAddressUpdate
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

    /** @param {Job} job @param {number} index */
    function openFinishedEditMode(job, index) {
        finishedJobToEdit = job;
        finishedJobToEditIndex = index;
        finishedEditMode = true;
    }

    /** @param {import('$lib/types').JobFormData} changedData */
    async function saveChangedFinishedJob(changedData) {
        if (!finishedJobToEdit) return;
        try {
            let shipmentAddressUpdate = {};
            const sa = changedData.shipmentAddress;
            if (sa && (sa.name || sa.street || sa.zip || sa.city)) {
                const saRef = doc(collection(db, 'shipmentAddresses'));
                const saData = {
                    name: sa.name || '',
                    street: sa.street || '',
                    zip: sa.zip || '',
                    city: sa.city || '',
                    countryCode: sa.countryCode || 'DE',
                    customerId: changedData.customerId,
                    createdAt: Date.now() / 1000
                };
                await setDoc(saRef, saData);
                shipmentAddressUpdate = { shipmentAddressId: saRef.id, shipmentAddress: saData };
            } else {
                shipmentAddressUpdate = { shipmentAddressId: deleteField(), shipmentAddress: deleteField() };
            }

            const jobRef = doc(db, "Jobs", finishedJobToEdit.id);
            await updateDoc(jobRef, {
                customerId: changedData.customerId,
                customer: changedData.customer,
                jobname: changedData.jobname,
                quantity: changedData.quantity,
                details: changedData.details,
                amount: normalizeAmount(changedData.amount),
                producer: changedData.producer,
                vatRate: changedData.vatRate,
                ...(changedData.shippingCosts != null ? { shippingCosts: normalizeAmount(changedData.shippingCosts) } : { shippingCosts: deleteField() }),
                ...(changedData.contactEmail ? { contactEmail: changedData.contactEmail } : { contactEmail: deleteField() }),
                ...shipmentAddressUpdate
            });
            stopFinishedChangeMode();
        } catch (error) {
            console.error("Error updating finished job:", error);
            throw error;
        }
    }

    function stopFinishedChangeMode() {
        finishedEditMode = false;
        finishedJobToEdit = null;
        finishedJobToEditIndex = 0;
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

    {#if loggedIn && !showArchiv && !showFinished}
        <JobForm 
            {customers}
            {vatRates}
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
            <button class="search-all-btn" onclick={() => getAllArchivJobs()}>🔍 Gesamtes Archiv durchsuchen</button>
        </div>

        <div class="section-header">
            <h2>{jobs.length} aktive Aufträge:</h2>
            <button class="finished-btn" onclick={() => {showFinished = true;}}>
                ✓ Fertige Aufträge anzeigen ({finishedJobs.length})
            </button>
        </div>
        <ul>
            {#each jobs as job, index (job.id)}
                <li>
                    <JobListItem 
                        {job}
                        {index}
                        onToggleReady={toggleSomethingIsReady}
                        onEdit={openEditMode}
                        onArchive={confirmArchiveJob}
                        onDelete={confirmDeleteJob}
                        onCopy={copyJob}
                    />
                    
                    {#if editMode && jobToEdit && jobToEditIndex === index}
                        <JobEditForm 
                            job={jobToEdit}
                            {customers}
                            {vatRates}
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
    {:else if loggedIn && showFinished}
        <div class="finished-header">
            <h2>✓ {finishedJobs.length} fertige Aufträge</h2>
            {#if openInvoicesTotal > 0}
                <span class="open-invoices-total">
                    Offene Rechnungen: {openInvoicesTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
            {/if}
            <button onclick={() => {showFinished = false;}}>
                ← Zurück zu aktiven Aufträgen
            </button>
        </div>
        <FinishedJobListHeader />
        <ul>
            {#each finishedJobs as job, index (job.id)}
                <li>
                    <FinishedJobListItem 
                        {job}
                        {index}
                        onToggleReady={toggleSomethingIsReady}
                        onEdit={openFinishedEditMode}
                        onArchive={confirmPaidArchiveJob}
                        onDelete={confirmFinishedDeleteJob}
                        onReminder={openReminderModal}
                        onCopy={copyJob}
                    />

                    {#if finishedEditMode && finishedJobToEdit && finishedJobToEditIndex === index}
                        <JobEditForm 
                            job={finishedJobToEdit}
                            {customers}
                            {vatRates}
                            onSave={saveChangedFinishedJob}
                            onCancel={stopFinishedChangeMode}
                            onNewCustomer={() => { showNewCustomerModal = true; }}
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
                placeholder="Suche in Kunde, Jobname oder Details"
            />
        </div>
        <ArchiveListHeader />
        <ul>
            {#each getFilteredArchivJobs() as job, index (job.id)}
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

<Modal
    bind:show={showPaidArchiveModal}
    title="Bezahlt & archivieren"
    message={paidArchiveMessage}
    confirmText="Ja, bezahlt – Archivieren"
    cancelText="Abbrechen"
    onConfirm={archivePaidJob}
/>

<Modal
    bind:show={showFinishedDeleteModal}
    title="Auftrag löschen"
    message={finishedDeleteMessage}
    confirmText="Trotzdem löschen"
    cancelText="Abbrechen"
    onConfirm={deleteJob}
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
        customer={customers.find(c => c.id === jobForShippedConfirm?.customerId) ?? customers.find(c => getCustomerLabel(c) === jobForShippedConfirm?.customer)}
        onConfirm={confirmShippedAndSendEmail}
        onConfirmWithoutEmail={confirmShippedWithoutEmail}
        onCancel={cancelShippedConfirm}
    />
{/if}

<InvoiceConfirmModal
    bind:show={showInvoiceModal}
    job={jobForInvoice ?? undefined}
    customer={customerForInvoice ?? undefined}
    additionalJobs={additionalJobsForInvoice}
    bind:selectedAdditionalJobIds={selectedAdditionalJobIds}
    onConfirm={createAndSendInvoice}
    onCancel={cancelInvoice}
/>

<MahnungConfirmModal
    bind:show={showReminderModal}
    job={jobForReminder ?? undefined}
    customer={customerForReminder ?? undefined}
    onConfirm={sendReminder}
    onCancel={cancelReminder}
/>

{#if showDataCheckedModal && jobForDataChecked}
    <DataCheckedModal
        job={jobForDataChecked}
        customer={customers.find(c => c.id === jobForDataChecked?.customerId) ?? customers.find(c => getCustomerLabel(c) === jobForDataChecked?.customer)}
        onConfirm={confirmDataCheckedAndSendEmail}
        onConfirmWithoutEmail={confirmDataCheckedWithoutEmail}
        onCancel={cancelDataCheckedModal}
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
        min-width: 100px;
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
        display: flex;
        gap: var(--spacing-md);
        align-items: center;
        flex-wrap: wrap;
    }

    .archive-selector select {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .search-all-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        white-space: nowrap;
    }

    .search-all-btn:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
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

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-md);
    }

    .section-header h2 {
        margin: 0;
    }

    .finished-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        white-space: nowrap;
    }

    .finished-btn:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }

    .finished-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
        padding: var(--spacing-lg);
        border-radius: var(--radius-lg);
        margin-bottom: var(--spacing-lg);
        border: 2px solid #10b981;
    }

    .finished-header h2 {
        margin: 0;
        color: #065f46;
    }

    .open-invoices-total {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: #065f46;
        background: #ffffff;
        border: 2px solid #10b981;
        border-radius: var(--radius-md);
        padding: 4px 12px;
        white-space: nowrap;
    }

    .finished-header button {
        background: #10b981;
        color: white;
    }

    .finished-header button:hover {
        background: #059669;
    }
</style>
