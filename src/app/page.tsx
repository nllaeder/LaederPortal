export default function Home() {
  // This page will be redirected by middleware to /login or /dashboard
  // based on authentication state. This component is just a fallback.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          LaederPortal
        </h1>
        <p className="text-gray-600">
          Loading...
        </p>
      </div>
    </div>
  );
}
