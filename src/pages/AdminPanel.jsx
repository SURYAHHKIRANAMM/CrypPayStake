import AdminGuard from "../components/AdminGuard";
import AdminDashboard from "../components/AdminDashboard";

export default function AdminPanel({ account, signer, provider, isViewer }) {

  return (
    <AdminGuard account={account}>
      <AdminDashboard
        account={account}
        signer={signer}
        provider={provider}
        isViewer={isViewer}
      />
    </AdminGuard>
  );
}