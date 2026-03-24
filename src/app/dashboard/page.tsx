'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Navigation } from '@/components/navigation';
import { supabaseClient } from '@/lib/supabase-client';

interface Project {
  id: string;
  type: 'estimate' | 'invoice';
  title: string;
  number: string;
  date: string;
  status?: string;
  amount: number;
  currency_code: string;
  client_name: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || authLoading) return;

    async function fetchProjects() {
      try {
        // Fetch estimates with client names
        const { data: estimates, error: estimatesError } = await supabaseClient
          .from('estimates')
          .select(`
            id, title, estimate_number, estimate_date, total, currency_code,
            clients!estimates_wave_client_id_fkey(name)
          `)
          .order('estimate_date', { ascending: false });

        if (estimatesError) throw estimatesError;

        // Fetch invoices with client names
        const { data: invoices, error: invoicesError } = await supabaseClient
          .from('invoices')
          .select(`
            id, title, invoice_number, invoice_date, status, total, currency_code,
            clients!invoices_wave_client_id_fkey(name)
          `)
          .order('invoice_date', { ascending: false });

        if (invoicesError) throw invoicesError;

        // Combine and format projects
        const allProjects: Project[] = [
          ...(estimates || []).map(est => ({
            id: est.id,
            type: 'estimate' as const,
            title: est.title || 'Untitled Estimate',
            number: est.estimate_number || 'N/A',
            date: est.estimate_date || '',
            amount: est.total || 0,
            currency_code: est.currency_code || 'CAD',
            client_name: (est.clients as any)?.name || 'Unknown Client',
          })),
          ...(invoices || []).map(inv => ({
            id: inv.id,
            type: 'invoice' as const,
            title: inv.title || 'Untitled Invoice',
            number: inv.invoice_number || 'N/A',
            date: inv.invoice_date || '',
            status: inv.status,
            amount: inv.total || 0,
            currency_code: inv.currency_code || 'CAD',
            client_name: (inv.clients as any)?.name || 'Unknown Client',
          })),
        ];

        // Sort by date descending
        allProjects.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setProjects(allProjects);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [user, authLoading]);

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // Middleware will redirect
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency || 'CAD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (type: string, status?: string) => {
    if (type === 'estimate') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Estimate</span>;
    }

    const statusColors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-yellow-100 text-yellow-800',
      VIEWED: 'bg-blue-100 text-blue-800',
      PAID: 'bg-green-100 text-green-800',
      PARTIAL: 'bg-orange-100 text-orange-800',
      OVERDUE: 'bg-red-100 text-red-800',
      UNPAID: 'bg-red-100 text-red-800',
    };

    const colorClass = statusColors[status || ''] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {status || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
            <p className="mt-2 text-sm text-gray-600">
              View all your estimates and invoices in one place.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">Loading projects...</div>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 mt-6">
              <div className="text-sm text-red-700">
                Error loading projects: {error}
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">No projects found.</div>
            </div>
          ) : (
            <div className="mt-6">
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {projects.map((project) => (
                    <li key={`${project.type}-${project.id}`}>
                      <Link href={`/project/${project.id}`}>
                        <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {project.client_name} - {project.title}
                              </p>
                              {getStatusBadge(project.type, project.status)}
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                              <span className="font-medium">{project.number}</span>
                              <span className="mx-2">•</span>
                              <span>{formatDate(project.date)}</span>
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0 text-right">
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(project.amount, project.currency_code)}
                            </p>
                          </div>
                        </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}