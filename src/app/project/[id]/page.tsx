'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navigation } from '@/components/navigation';
import { supabaseClient } from '@/lib/supabase-client';

interface Project {
  id: string;
  type: 'estimate' | 'invoice';
  title: string;
  number: string;
  google_folder_id: string | null;
  client_name: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  parents: string[];
}

interface DriveFolder {
  id: string;
  name: string;
  files: DriveFile[];
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const projectId = params.id as string;

  useEffect(() => {
    if (!user || authLoading) return;

    async function fetchProject() {
      try {
        // Try to fetch as estimate first
        let { data: estimate, error: estimateError } = await supabaseClient
          .from('estimates')
          .select('id, title, estimate_number, google_folder_id')
          .eq('id', projectId)
          .single();

        let projectData: Project | null = null;

        if (estimate && !estimateError) {
          projectData = {
            id: estimate.id,
            type: 'estimate',
            title: estimate.title || 'Untitled Estimate',
            number: estimate.estimate_number || 'N/A',
            google_folder_id: estimate.google_folder_id,
            client_name: 'Client', // We could join this but for now...
          };
        } else {
          // Try as invoice
          let { data: invoice, error: invoiceError } = await supabaseClient
            .from('invoices')
            .select('id, title, invoice_number, google_folder_id')
            .eq('id', projectId)
            .single();

          if (invoice && !invoiceError) {
            projectData = {
              id: invoice.id,
              type: 'invoice',
              title: invoice.title || 'Untitled Invoice',
              number: invoice.invoice_number || 'N/A',
              google_folder_id: invoice.google_folder_id,
              client_name: 'Client',
            };
          }
        }

        if (!projectData) {
          throw new Error('Project not found');
        }

        setProject(projectData);

        // If project has a folder, fetch its contents
        if (projectData.google_folder_id) {
          await fetchProjectFiles(projectData.google_folder_id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProject();
  }, [user, authLoading, projectId]);

  const fetchProjectFiles = async (folderId: string) => {
    try {
      const response = await fetch(`/api/drive/files?folderId=${folderId}`);
      const result = await response.json();

      if (result.success) {
        setFolders(result.folders);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error('Failed to fetch files:', err.message);
      // Don't set error state for files - project info is more important
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !project?.google_folder_id) return;

    const file = event.target.files[0];
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', project.google_folder_id);

      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Refresh file list
        await fetchProjectFiles(project.google_folder_id);
        alert('File uploaded successfully!');
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      // Clear the input
      event.target.value = '';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📈';
    if (mimeType.includes('folder')) return '📁';
    return '📎';
  };

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // Middleware will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">Loading project...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <div className="text-sm text-red-700">Error: {error}</div>
              </div>
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Go back
              </button>
            </div>
          ) : !project ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Project not found.</div>
              <button
                onClick={() => router.back()}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                ← Go back
              </button>
            </div>
          ) : (
            <>
              {/* Project Header */}
              <div className="border-b border-gray-200 pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <button
                      onClick={() => router.back()}
                      className="text-blue-600 hover:text-blue-800 mb-2"
                    >
                      ← Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                    <p className="mt-2 text-sm text-gray-600">
                      {project.type === 'estimate' ? 'Estimate' : 'Invoice'} #{project.number}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.type === 'estimate'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {project.type === 'estimate' ? 'Estimate' : 'Invoice'}
                  </span>
                </div>
              </div>

              {!project.google_folder_id ? (
                <div className="text-center py-12">
                  <div className="rounded-md bg-yellow-50 p-4">
                    <div className="text-sm text-yellow-700">
                      Project folder is being set up. Please check back shortly.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* File Upload Section */}
                  <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Upload Files
                    </h3>
                    <div className="flex items-center space-x-4">
                      <label className="relative cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md">
                        <span>{uploading ? 'Uploading...' : 'Choose File'}</span>
                        <input
                          type="file"
                          className="sr-only"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                      </label>
                      <span className="text-sm text-gray-500">
                        Files will be uploaded to the "Client Uploads" folder
                      </span>
                    </div>
                  </div>

                  {/* Project Files */}
                  <div className="space-y-6">
                    {folders.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-gray-500">No folders found or folder access not yet configured.</div>
                      </div>
                    ) : (
                      folders.map((folder) => (
                        <div key={folder.id} className="bg-white shadow rounded-lg">
                          <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                              📁 {folder.name}
                            </h3>

                            {folder.files.length === 0 ? (
                              <div className="text-sm text-gray-500 py-4">
                                No files in this folder.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        File
                                      </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Size
                                      </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Modified
                                      </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {folder.files.map((file) => (
                                      <tr key={file.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <span className="mr-2">{getFileIcon(file.mimeType)}</span>
                                            <span className="text-sm font-medium text-gray-900">
                                              {file.name}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {formatFileSize(file.size)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {new Date(file.modifiedTime).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                          {file.webViewLink && (
                                            <a
                                              href={file.webViewLink}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-900 mr-4"
                                            >
                                              View
                                            </a>
                                          )}
                                          {file.webContentLink && (
                                            <a
                                              href={file.webContentLink}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-green-600 hover:text-green-900"
                                            >
                                              Download
                                            </a>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}