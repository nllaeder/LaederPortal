# OpenWolf

@.wolf/OPENWOLF.md

This project uses OpenWolf for context management. Read and follow .wolf/OPENWOLF.md every session. Check .wolf/cerebrum.md before generating code. Check .wolf/anatomy.md before reading files.


Remaining Nodes - LaederPortal Wave Sync FlowESTIMATES (2 nodes remaining)Node: Supabase: Create Estimate
Type: Supabase node
Operation: Create a row
Table: estimates
Fields: same as Update Estimate table above, all referencing $('Transform: Flatten Estimates').item.json.*
No Select Conditions (it's a fresh insert)
Node: Merge: Estimate Upsert Done
Type: Merge node
Mode: Append
Input 1: Supabase: Update Estimate
Input 2: Supabase: Create Estimate
Feeds into: Wave: Fetch Invoices
INVOICES (full chain)Node: Wave: Fetch Invoices
Type: HTTP Request
Method: POST
URL: https://gql.waveapps.com/graphql/public
Auth: Header Auth (Wave API key)
Headers: Content-Type: application/json
Body (Using JSON):
json{  "query": "{ business(id: \"QnVzaW5lc3M6MTc3OTBmM2QtZTE5Zi00NWZjLWI5NTMtNzAxZDVmNTFkODI5\") { invoices(page: 1, pageSize: 200) { edges { node { id invoiceNumber title status invoiceDate dueDate customer { id name } amountDue { value } amountPaid { value } subtotal { value } taxTotal { value } total { value } currency { code } memo footer lastSentAt lastViewedAt createdAt modifiedAt } } } } }"}
Note: Invoices DO have a status field (DRAFT, SENT, VIEWED, PAID, PARTIAL, OVERDUE, UNPAID) unlike estimates.
Node: Transform: Flatten Invoices
Type: Code node
Language: JavaScript
javascriptconst edges = $input.first().json.data.business.invoices.edges;return edges.map(({ node }) => ({  json: {    wave_id: node.id,    wave_client_id: node.customer?.id ?? null,    invoice_number: node.invoiceNumber ?? null,    title: node.title ?? null,    status: node.status ?? null,    invoice_date: node.invoiceDate ?? null,    due_date: node.dueDate ?? null,    amount_due: node.amountDue?.value ?? null,    amount_paid: node.amountPaid?.value ?? null,    subtotal: node.subtotal?.value ?? null,    tax_total: node.taxTotal?.value ?? null,    total: node.total?.value ?? null,    currency_code: node.currency?.code ?? null,    memo: node.memo ?? null,    footer: node.footer ?? null,    last_sent_at: node.lastSentAt ?? null,    last_viewed_at: node.lastViewedAt ?? null,    wave_created_at: node.createdAt ?? null,    wave_modified_at: node.modifiedAt ?? null  }}));Node: Supabase: Find Invoice
Type: Supabase node
Operation: Get a row
Table: invoices
Filter: wave_id = {{ $json.wave_id }}
Settings → On Error: Continue
Node: Invoice: New or Existing?
Type: IF node
Condition: {{ $json.id }} is not empty
Convert types where required: ON
True → Supabase: Update Invoice
False → Supabase: Create Invoice
Node: Supabase: Update Invoice
Type: Supabase node
Operation: Update a row
Table: invoices
Select Conditions: wave_id = {{ $json.wave_id }}
Fields to Send:
ColumnValuewave_client_id{{ $('Transform: Flatten Invoices').item.json.wave_client_id }}invoice_number{{ $('Transform: Flatten Invoices').item.json.invoice_number }}title{{ $('Transform: Flatten Invoices').item.json.title }}status{{ $('Transform: Flatten Invoices').item.json.status }}invoice_date{{ $('Transform: Flatten Invoices').item.json.invoice_date }}due_date{{ $('Transform: Flatten Invoices').item.json.due_date }}amount_due{{ $('Transform: Flatten Invoices').item.json.amount_due }}amount_paid{{ $('Transform: Flatten Invoices').item.json.amount_paid }}subtotal{{ $('Transform: Flatten Invoices').item.json.subtotal }}tax_total{{ $('Transform: Flatten Invoices').item.json.tax_total }}total{{ $('Transform: Flatten Invoices').item.json.total }}currency_code{{ $('Transform: Flatten Invoices').item.json.currency_code }}memo{{ $('Transform: Flatten Invoices').item.json.memo }}footer{{ $('Transform: Flatten Invoices').item.json.footer }}last_sent_at{{ $('Transform: Flatten Invoices').item.json.last_sent_at }}last_viewed_at{{ $('Transform: Flatten Invoices').item.json.last_viewed_at }}wave_created_at{{ $('Transform: Flatten Invoices').item.json.wave_created_at }}wave_modified_at{{ $('Transform: Flatten Invoices').item.json.wave_modified_at }}Node: Supabase: Create Invoice
Type: Supabase node
Operation: Create a row
Table: invoices
Same fields and values as Update Invoice above
No Select Conditions
Node: Merge: Invoice Upsert Done
Type: Merge node
Mode: Append
Input 1: Supabase: Update Invoice
Input 2: Supabase: Create Invoice
This is the end of Flow 1. Optionally connect to a Telegram success notification.
STICKY NOTE for Invoices section:textINVOICE SYNCInvoices DO have a status field (DRAFT, SENT, VIEWED, PAID, PARTIAL, OVERDUE, UNPAID) - unlike estimates.wave_client_id stored for client linkage.google_folder_id and portal_enabled managed separately by the folder-creation flow, not overwritten here.
