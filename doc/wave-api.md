# Wave API Reference

## Connection

- **Endpoint**: `https://gql.waveapps.com/graphql/public`

- **Method**: POST

- **Auth header**: `Authorization: Bearer YOUR_WAVE_API_KEY`

- **Content-Type**: `application/json`

- **Business ID**: `QnVzaW5lc3M6MTc3OTBmM2QtZTE5Zi00NWZjLWI5NTMtNzAxZDVmNTFkODI5`

---

## Known Schema Quirks

These were confirmed through live API testing. Do not deviate.

| Issue                          | Wrong              | Correct          |

|--------------------------------|--------------------|------------------|

| Estimate status                | `status`           | Does not exist on AREstimate |

| Estimate expiry                | `expiresAt`        | `dueDate`        |

| Estimate client view timestamp | `viewedByCustomerAt` | `lastViewedAt` |

| Monetary values                | `amountDue`        | `amountDue { value }` |

| Currency                       | `currency`         | `currency { code }` |

| Customer reference             | `customerId`       | `customer { id name }` |

Invoice type DOES have a `status` field.

Valid values: `DRAFT | SENT | VIEWED | PAID | PARTIAL | OVERDUE | UNPAID`

---

## Field Extraction Patterns

All monetary fields are nested objects. Always extract `.value`:

- `amountDue.value`

- `amountPaid.value`

- `subtotal.value`

- `taxTotal.value`

- `total.value`

Currency is nested. Extract `.code`:

- `currency.code`

Address is nested under customers:

- `address.addressLine1`

- `address.addressLine2`

- `address.city`

- `address.province.name`

- `address.country.name`

- `address.postalCode`

Customer reference on estimates and invoices:

- `customer.id` → store as `wave_client_id` (string, not resolved to UUID)

- `customer.name` → for reference only, not stored

---

## Validated Queries

### Customers

```json

{

  "query": "{ business(id: \"QnVzaW5lc3M6MTc3OTBmM2QtZTE5Zi00NWZjLWI5NTMtNzAxZDVmNTFkODI5\") { customers(page: 1, pageSize: 200) { edges { node { id name firstName lastName email phone mobile website address { addressLine1 addressLine2 city province { name } country { name } postalCode } currency { code } internalNotes isArchived createdAt modifiedAt } } } } }"

}

Field mapping to Supabase clients table:

| Wave field            | Supabase column  |
| --------------------- | ---------------- |
| id                    | wave_id          |
| name                  | name             |
| firstName             | first_name       |
| lastName              | last_name        |
| email                 | email            |
| phone                 | phone            |
| mobile                | mobile           |
| website               | website          |
| address.addressLine1  | address_line1    |
| address.addressLine2  | address_line2    |
| address.city          | city             |
| address.province.name | province         |
| address.country.name  | country          |
| address.postalCode    | postal_code      |
| currency.code         | currency_code    |
| internalNotes         | internal_notes   |
| isArchived            | is_archived      |
| createdAt             | wave_created_at  |
| modifiedAt            | wave_modified_at |

Estimates

json

{

  "query": "{ business(id: \"QnVzaW5lc3M6MTc3OTBmM2QtZTE5Zi00NWZjLWI5NTMtNzAxZDVmNTFkODI5\") { estimates(page: 1, pageSize: 200) { edges { node { id estimateNumber title estimateDate dueDate customer { id name } amountDue { value } amountPaid { value } subtotal { value } taxTotal { value } total { value } currency { code } memo footer lastSentAt lastViewedAt createdAt modifiedAt } } } } }"

}

Field mapping to Supabase estimates table:

| Wave field       | Supabase column  |
| ---------------- | ---------------- |
| id               | wave_id          |
| customer.id      | wave_client_id   |
| estimateNumber   | estimate_number  |
| title            | title            |
| estimateDate     | estimate_date    |
| dueDate          | due_date         |
| amountDue.value  | amount_due       |
| amountPaid.value | amount_paid      |
| subtotal.value   | subtotal         |
| taxTotal.value   | tax_total        |
| total.value      | total            |
| currency.code    | currency_code    |
| memo             | memo             |
| footer           | footer           |
| lastSentAt       | last_sent_at     |
| lastViewedAt     | last_viewed_at   |
| createdAt        | wave_created_at  |
| modifiedAt       | wave_modified_at |

Invoices

json

{

  "query": "{ business(id: \"QnVzaW5lc3M6MTc3OTBmM2QtZTE5Zi00NWZjLWI5NTMtNzAxZDVmNTFkODI5\") { invoices(page: 1, pageSize: 200) { edges { node { id invoiceNumber title status invoiceDate dueDate customer { id name } amountDue { value } amountPaid { value } subtotal { value } taxTotal { value } total { value } currency { code } memo footer lastSentAt lastViewedAt createdAt modifiedAt } } } } }"

}

Field mapping to Supabase invoices table:

| Wave field       | Supabase column  |
| ---------------- | ---------------- |
| id               | wave_id          |
| customer.id      | wave_client_id   |
| invoiceNumber    | invoice_number   |
| title            | title            |
| status           | status           |
| invoiceDate      | invoice_date     |
| dueDate          | due_date         |
| amountDue.value  | amount_due       |
| amountPaid.value | amount_paid      |
| subtotal.value   | subtotal         |
| taxTotal.value   | tax_total        |
| total.value      | total            |
| currency.code    | currency_code    |
| memo             | memo             |
| footer           | footer           |
| lastSentAt       | last_sent_at     |
| lastViewedAt     | last_viewed_at   |
| createdAt        | wave_created_at  |
| modifiedAt       | wave_modified_at |

Pagination

Current implementation uses page 1, pageSize 200.

If the business grows beyond 200 records per entity type,

implement cursor-based pagination using the Wave API's

pageInfo { hasNextPage endCursor } pattern.