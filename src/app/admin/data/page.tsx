'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Navigation } from '@/components/navigation';
import { supabaseClient } from '@/lib/supabase-client';

interface AdminStats {
  totalClients: number;
  totalEstimates: number;
  totalInvoices: number;
  clientsNeedingFolders: number;
  estimatesNeedingFolders: number;
  invoicesNeedingFolders: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  google_folder_id: string | null;
  portal_enabled: boolean;
  estimate_count: number;
  invoice_count: number;
}

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin || authLoading) return;

    async function fetchAdminData() {
      try {
        // Fetch stats
        const [
          { count: totalClients },
          { count: totalEstimates },
          { count: totalInvoices },
          { count: clientsNeedingFolders },
          { count: estimatesNeedingFolders },
          { count: invoicesNeedingFolders },
        ] = await Promise.all([
          supabaseClient.from('clients').select('*', { count: 'exact', head: true }),
          supabaseClient.from('estimates').select('*', { count: 'exact', head: true }),
          supabaseClient.from('invoices').select('*', { count: 'exact', head: true }),
          supabaseClient.from('clients').select('*', { count: 'exact', head: true }).is('google_folder_id', null),
          supabaseClient.from('estimates').select('*', { count: 'exact', head: true }).is('google_folder_id', null),
          supabaseClient.from('invoices').select('*', { count: 'exact', head: true }).is('google_folder_id', null),
        ]);

        setStats({
          totalClients: totalClients || 0,
          totalEstimates: totalEstimates || 0,
          totalInvoices: totalInvoices || 0,
          clientsNeedingFolders: clientsNeedingFolders || 0,
          estimatesNeedingFolders: estimatesNeedingFolders || 0,
          invoicesNeedingFolders: invoicesNeedingFolders || 0,
        });

        // Fetch clients with project counts
        const { data: clientsData, error: clientsError } = await supabaseClient
          .from('clients')
          .select(`
            id,
            name,
            email,
            google_folder_id,
            portal_enabled
          `)
          .order('name');

        if (clientsError) throw clientsError;

        // Get project counts for each client
        const clientsWithCounts = await Promise.all(
          (clientsData || []).map(async (client) => {
            const [
              { count: estimateCount },
              { count: invoiceCount }
            ] = await Promise.all([
              supabaseClient.from('estimates').select('*', { count: 'exact', head: true }).eq('wave_client_id', client.id),
              supabaseClient.from('invoices').select('*', { count: 'exact', head: true }).eq('wave_client_id', client.id)
            ]);

            return {
              ...client,
              estimate_count: estimateCount || 0,
              invoice_count: invoiceCount || 0,
            };
          })
        );

        setClients(clientsWithCounts);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminData();
  }, [user, isAdmin, authLoading]);

  const handleManualProvision = async () => {
    try {
      const response = await fetch('/api/provision', { method: 'POST' });
      const result = await response.json();

      if (result.success) {
        alert('Provisioning completed successfully!');
        // Refresh data
        window.location.reload();
      } else {
        alert(`Provisioning failed: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              System overview and management tools.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">Loading admin data...</div>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <div className="text-sm text-red-700">
                Error loading admin data: {error}
              </div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">C</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Clients
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats?.totalClients}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">E</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Estimates
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats?.totalEstimates}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">I</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Invoices
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats?.totalInvoices}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provisioning Status */}
              <div className="bg-white shadow rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Folder Provisioning Status
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {stats?.clientsNeedingFolders}
                      </div>
                      <div className="text-sm text-gray-500">Clients need folders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {stats?.estimatesNeedingFolders}
                      </div>
                      <div className="text-sm text-gray-500">Estimates need folders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {stats?.invoicesNeedingFolders}
                      </div>
                      <div className="text-sm text-gray-500">Invoices need folders</div>
                    </div>
                  </div>
                  <button
                    onClick={handleManualProvision}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                  >
                    Run Manual Provisioning
                  </button>
                </div>
              </div>

              {/* Clients Table */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    All Clients
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Projects
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Folder Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Portal Access
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clients.map((client) => (
                          <tr key={client.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {client.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {client.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {client.estimate_count}E / {client.invoice_count}I
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {client.google_folder_id ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Provisioned
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {client.portal_enabled ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Enabled
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Disabled
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}