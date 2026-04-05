'use client';

import { useAuth } from '@/contexts/auth-context';
import { Navigation } from '@/components/navigation';
import Link from 'next/link';

export default function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || user.email !== 'nicholas@laederconsulting.com') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center text-red-600">Access denied. Admin access required.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* View Projects Button */}
            <Link
              href="/dashboard"
              className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">View My Projects</h3>
              <p className="text-gray-600">Access the main projects dashboard</p>
            </Link>

            {/* Create Client Button */}
            <Link
              href="/admin/clients/new"
              className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-green-500 rounded-lg mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Client</h3>
              <p className="text-gray-600">Add a client outside of Wave system</p>
            </Link>

            {/* Create Project Button */}
            <Link
              href="/admin/projects/new"
              className="block p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-lg mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Project</h3>
              <p className="text-gray-600">Add a project outside of Wave system</p>
            </Link>
          </div>

          {/* Quick Links */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/admin/data"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View Raw Data
              </Link>
              <Link
                href="/api/sync/wave"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Sync Wave Data
              </Link>
              <Link
                href="/api/cleanup"
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Reset Google Drive Folders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}