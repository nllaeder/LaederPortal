'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navigation } from '@/components/navigation';
import { supabaseClient } from '@/lib/supabase-client';

interface Client {
  id: string;
  wave_id: string;
  name: string;
}

export default function NewProjectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [formData, setFormData] = useState({
    type: 'estimate' as 'estimate' | 'invoice',
    client_id: '',
    title: '',
    number: '',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: '',
    currency_code: 'CAD',
    memo: '',
    status: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClients() {
      try {
        const { data, error } = await supabaseClient
          .from('clients')
          .select('id, wave_id, name')
          .order('name');

        if (error) throw error;
        setClients(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load clients');
      } finally {
        setLoadingClients(false);
      }
    }

    if (user?.email === 'nicholas@laederconsulting.com') {
      fetchClients();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || user.email !== 'nicholas@laederconsulting.com') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="text-center text-red-600">Access denied. Admin access required.</div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Find selected client
      const selectedClient = clients.find(c => c.id === formData.client_id);
      if (!selectedClient) {
        throw new Error('Please select a client');
      }

      // Generate a unique wave_id for manual entries
      const manualWaveId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const projectData = {
        wave_id: manualWaveId,
        wave_client_id: selectedClient.wave_id,
        title: formData.title,
        [formData.type === 'estimate' ? 'estimate_number' : 'invoice_number']: formData.number,
        [formData.type === 'estimate' ? 'estimate_date' : 'invoice_date']: formData.date,
        due_date: formData.due_date || null,
        total: parseFloat(formData.amount) || 0,
        subtotal: parseFloat(formData.amount) || 0,
        amount_due: parseFloat(formData.amount) || 0,
        amount_paid: 0,
        tax_total: 0,
        currency_code: formData.currency_code,
        memo: formData.memo || null,
        ...(formData.type === 'invoice' && formData.status ? { status: formData.status } : {})
      };

      const tableName = formData.type === 'estimate' ? 'estimates' : 'invoices';
      const { error: insertError } = await supabaseClient
        .from(tableName)
        .insert(projectData);

      if (insertError) throw insertError;

      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const invoiceStatuses = ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIAL', 'OVERDUE', 'UNPAID'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
            <button
              onClick={() => router.push('/admin')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Project Type *
              </label>
              <select
                id="type"
                name="type"
                required
                value={formData.type}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="estimate">Estimate</option>
                <option value="invoice">Invoice</option>
              </select>
            </div>

            <div>
              <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
                Client *
              </label>
              <select
                id="client_id"
                name="client_id"
                required
                value={formData.client_id}
                onChange={handleChange}
                disabled={loadingClients}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">
                  {loadingClients ? 'Loading clients...' : 'Select a client'}
                </option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Project Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="number" className="block text-sm font-medium text-gray-700">
                {formData.type === 'estimate' ? 'Estimate' : 'Invoice'} Number
              </label>
              <input
                type="text"
                id="number"
                name="number"
                value={formData.number}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  {formData.type === 'estimate' ? 'Estimate' : 'Invoice'} Date *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Total Amount *
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  required
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="currency_code" className="block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  id="currency_code"
                  name="currency_code"
                  value={formData.currency_code}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {formData.type === 'invoice' && (
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Invoice Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select status</option>
                  {invoiceStatuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="memo" className="block text-sm font-medium text-gray-700">
                Memo/Notes
              </label>
              <textarea
                id="memo"
                name="memo"
                rows={3}
                value={formData.memo}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : `Create ${formData.type === 'estimate' ? 'Estimate' : 'Invoice'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}