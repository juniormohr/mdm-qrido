const ASAAS_API_URL = 'https://api.asaas.com/v3'

interface AsaasCustomer {
    name: string
    email: string
    cpfCnpj?: string
    phone?: string
}

const getHeaders = () => {
    if (!process.env.ASAAS_API_KEY) {
        throw new Error('ASAAS_API_KEY is not defined')
    }
    return {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY
    }
}

export async function createAsaasCustomer(data: AsaasCustomer) {
    const res = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    })
    
    const result = await res.json()
    if (!res.ok) {
        throw new Error(result.errors?.[0]?.description || 'Failed to create Asaas customer')
    }
    
    return result
}

interface AsaasSubscription {
    customer: string
    billingType: 'UNDEFINED' | 'BOLETO' | 'CREDIT_CARD' | 'PIX'
    value: number
    nextDueDate: string
    cycle: 'MONTHLY'
    description: string
}

export async function createAsaasSubscription(data: AsaasSubscription) {
    const res = await fetch(`${ASAAS_API_URL}/subscriptions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    })
    
    const result = await res.json()
    if (!res.ok) {
        throw new Error(result.errors?.[0]?.description || 'Failed to create Asaas subscription')
    }
    
    return result
}

export async function getSubscriptionFirstPayment(subscriptionId: string) {
    const res = await fetch(`${ASAAS_API_URL}/payments?subscription=${subscriptionId}`, {
        method: 'GET',
        headers: getHeaders(),
    })
    
    const result = await res.json()
    if (!res.ok) {
        throw new Error(result.errors?.[0]?.description || 'Failed to fetch Asaas payments')
    }
    
    return result.data[0] // Return the first payment generated
}
