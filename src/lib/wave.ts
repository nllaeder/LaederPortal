import { request, gql } from 'graphql-request';

const WAVE_API_URL = 'https://gql.waveapps.com/graphql/public';

function getWaveConfig() {
    const WAVE_API_TOKEN = process.env.WAVE_API_KEY;
    const WAVE_BUSINESS_ID = process.env.WAVE_BUSINESS_ID;

    if (!WAVE_API_TOKEN || !WAVE_BUSINESS_ID) {
        throw new Error('Missing Wave environment variables: WAVE_API_KEY and WAVE_BUSINESS_ID must be set');
    }

    return {
        token: WAVE_API_TOKEN,
        businessId: WAVE_BUSINESS_ID,
        headers: {
            Authorization: `Bearer ${WAVE_API_TOKEN}`,
            'Content-Type': 'application/json',
        }
    };
}

// --- QUERIES ---

const CUSTOMERS_QUERY = gql`
  query FetchCustomers($businessId: ID!, $page: Int!) {
    business(id: $businessId) {
      customers(page: $page, pageSize: 200) {
        pageInfo {
          totalPages
          currentPage
        }
        edges {
          node {
            id
            name
            firstName
            lastName
            email
            phone
            mobile
            website
            address {
              addressLine1
              addressLine2
              city
              province { name }
              country { name }
              postalCode
            }
            currency { code }
            internalNotes
            isArchived
            createdAt
            modifiedAt
          }
        }
      }
    }
  }
`;

const ESTIMATES_QUERY = gql`
  query FetchEstimates($businessId: ID!, $page: Int!) {
    business(id: $businessId) {
      estimates(page: $page, pageSize: 200) {
        pageInfo {
          totalPages
          currentPage
        }
        edges {
          node {
            id
            estimateNumber
            title
            reference
            estimateDate
            dueDate
            customer { id name }
            amountDue { value }
            amountPaid { value }
            subtotal { value }
            taxTotal { value }
            total { value }
            currency { code }
            memo
            footer
            lastSentAt
            lastViewedAt
            createdAt
            modifiedAt
          }
        }
      }
    }
  }
`;

const INVOICES_QUERY = gql`
  query FetchInvoices($businessId: ID!, $page: Int!) {
    business(id: $businessId) {
      invoices(page: $page, pageSize: 200) {
        pageInfo {
          totalPages
          currentPage
        }
        edges {
          node {
            id
            invoiceNumber
            title
            reference
            status
            invoiceDate
            dueDate
            customer { id name }
            amountDue { value }
            amountPaid { value }
            subtotal { value }
            taxTotal { value }
            total { value }
            currency { code }
            memo
            footer
            lastSentAt
            lastViewedAt
            createdAt
            modifiedAt
          }
        }
      }
    }
  }
`;

// --- FETCH FUNCTIONS ---

export async function fetchWaveCustomers(page = 1) {
    const config = getWaveConfig();
    const data: any = await request(WAVE_API_URL, CUSTOMERS_QUERY, { businessId: config.businessId, page }, config.headers);
    return data.business.customers;
}

export async function fetchWaveEstimates(page = 1) {
    const config = getWaveConfig();
    const data: any = await request(WAVE_API_URL, ESTIMATES_QUERY, { businessId: config.businessId, page }, config.headers);
    return data.business.estimates;
}

export async function fetchWaveInvoices(page = 1) {
    const config = getWaveConfig();
    const data: any = await request(WAVE_API_URL, INVOICES_QUERY, { businessId: config.businessId, page }, config.headers);
    return data.business.invoices;
}
