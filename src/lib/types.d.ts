export type Customer = {
    id?: string;
    firstName: string;
    lastName: string;
    company?: string;
    address: string;
    zip: string;
    city: string;
    countryCode: string;
    email: string;
    companyName?: string;
    companyName2?: string;
    address1?: string;
    address2?: string;
};

export type JobFormData = {
    customerId: string;
    customer: string;
    jobname: string;
    quantity: number;
    details: string;
    amount: number;
    producer: string;
};

export type Job = JobFormData & {
    id: string;
    jobstart: number;
    archiv: boolean;
    paper_ready?: boolean;
    plates_ready?: boolean;
    print_ready?: boolean;
    shipped_ready?: boolean;
    invoice_ready?: boolean;
    payed_ready?: boolean;
    FixGuenstig?: boolean;
    toShip?: boolean;
    trackingNumber?: string;
};

export type ReadyType = 'paper' | 'plates' | 'print' | 'shipped' | 'invoice' | 'payed' | 'toShip';

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
