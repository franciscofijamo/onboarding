import { ASAAS_CONFIG } from './config';

interface AsaasCustomer {
    id: string;
    name: string;
    email: string;
    cpfCnpj?: string;
}

interface AsaasCallback {
    successUrl: string;
    autoRedirect?: boolean;
}

interface AsaasSubscription {
    id: string;
    customer: string;
    value: number;
    nextDueDate: string;
    cycle: 'MONTHLY' | 'YEARLY';
    billingType: 'UNDEFINED';
    externalReference?: string;
    callback?: AsaasCallback;
}

export class AsaasClient {
    private headers: HeadersInit;

    constructor() {
        this.headers = {
            'Content-Type': 'application/json',
        };
    }

    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const apiKey = ASAAS_CONFIG.apiKey;

        const url = `${ASAAS_CONFIG.apiUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.headers,
                'access_token': apiKey,
                ...options?.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Asaas API Error: ${response.status} - ${JSON.stringify(error)}`);
        }

        return response.json();
    }

    async createCustomer(data: Partial<AsaasCustomer>): Promise<AsaasCustomer> {
        return this.request<AsaasCustomer>('/customers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getCustomerByEmail(email: string): Promise<AsaasCustomer | null> {
        const response = await this.request<{ data: AsaasCustomer[] }>(`/customers?email=${email}`);
        return response.data[0] || null;
    }

    async updateCustomer(customerId: string, data: Partial<AsaasCustomer>): Promise<AsaasCustomer> {
        return this.request<AsaasCustomer>(`/customers/${customerId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async createSubscription(data: Partial<AsaasSubscription>): Promise<AsaasSubscription> {
        return this.request<AsaasSubscription>('/subscriptions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getSubscription(id: string): Promise<AsaasSubscription> {
        return this.request<AsaasSubscription>(`/subscriptions/${id}`);
    }

    async getSubscriptionPayments(subscriptionId: string): Promise<{ data: unknown[] }> {
        return this.request<{ data: unknown[] }>(`/subscriptions/${subscriptionId}/payments`);
    }

    async cancelSubscription(subscriptionId: string): Promise<{ deleted: boolean; id: string }> {
        return this.request<{ deleted: boolean; id: string }>(`/subscriptions/${subscriptionId}`, {
            method: 'DELETE',
        });
    }

    async listCustomerSubscriptions(customerId: string): Promise<{ data: AsaasSubscription[] }> {
        return this.request<{ data: AsaasSubscription[] }>(`/subscriptions?customer=${customerId}`);
    }
}

export const asaasClient = new AsaasClient();
