import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tighter uppercase text-text-primary dark:text-dark-text">
            Dashboard
          </h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
            Welcome to your overview.
          </p>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
