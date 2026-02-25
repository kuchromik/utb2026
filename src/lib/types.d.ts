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
    companyName?: string;
    companyName2?: string;
    address1?: string;
    address2?: string;
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
    producer: string;
    vatRate: number;
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
    billingEmail?: string;
    billingAddress?: {
        firma?: string;
        strasse?: string;
        plz?: string;
        ort?: string;
        land?: string;
    };
};

export type ReadyType = 'paper' | 'plates' | 'print' | 'shipped' | 'invoice' | 'toShip';

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
