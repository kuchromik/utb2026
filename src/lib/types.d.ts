export type Contact = {
    firstName: string;
    lastName: string;
    email: string;
    invoiceMail?: string;
};

export type Customer = {
    id?: string;
    firstName: string;
    lastName: string;
    company?: string;
    address: string;
    street?: string;
    zip: string;
    city: string;
    country?: string;
    countryCode: string;
    email: string;
    invoiceMail?: string;
    single?: boolean;
    contacts?: Contact[];
    companyName?: string;
    companyName2?: string;
    address1?: string;
    address2?: string;
};

export type ShipmentAddress = {
    id?: string;
    name?: string;
    street?: string;
    zip?: string;
    city?: string;
    countryCode?: string;
    customerId?: string;
    createdAt?: number;
};

export type ShipmentAddressInput = {
    name?: string;
    street?: string;
    zip?: string;
    city?: string;
    countryCode?: string;
};

export type VatRate = {
    id?: string;
    rate: number;
    label: string;
    isDefault?: boolean;
};

export type JobFormData = {
    customerId: string;
    customer: string;
    jobname: string;
    quantity: number;
    details: string;
    amount: number;
    shippingCosts?: number;
    producer: string;
    vatRate: number;
    contactEmail?: string;
    shipmentAddress?: ShipmentAddressInput | null;
};

export type Job = JobFormData & {
    id: string;
    jobstart: number;
    archiv: boolean;
    finished?: boolean;
    paper_ready?: boolean;
    plates_ready?: boolean;
    print_ready?: boolean;
    shipped_ready?: boolean;
    invoice_ready?: boolean;
    FixGuenstig?: boolean;
    toShip?: boolean;
    trackingNumber?: string;
    invoiceNumber?: number;
    invoicePath?: string;
    invoiceDate?: number;
    reminderDate?: number;
    payDate?: number;
    billingEmail?: string;
    billingAddress?: {
        firma?: string;
        strasse?: string;
        plz?: string;
        ort?: string;
        land?: string;
    };
    shipmentAddressId?: string;
    dataChecked?: boolean;
    shipDate?: string;
};

export type ReadyType = 'paper' | 'plates' | 'print' | 'shipped' | 'invoice' | 'toShip' | 'dataChecked';

export type UnsubscribeFn = () => void;

export type VoidHandler = () => void | Promise<void>;
export type SignInHandler = (email: string, password: string) => void | Promise<void>;
export type SignOutHandler = () => void | Promise<void>;
export type JobSubmitHandler = (job: JobFormData) => void | Promise<void>;
export type JobEditHandler = (job: Job, index: number) => void | Promise<void>;
export type JobSaveHandler = (job: JobFormData) => void | Promise<void>;
export type JobToggleReadyHandler = (type: ReadyType, id: string, isReady: boolean) => void | Promise<void>;
export type JobIdHandler = (id: string) => void | Promise<void>;
export type CustomerLabelHandler = (customerLabel: string) => void | Promise<void>;
export type CustomerCompleteHandler = (customer: Customer) => void | Promise<void>;
export type ModalConfirmHandler = (inputValue?: string) => void | Promise<void>;
