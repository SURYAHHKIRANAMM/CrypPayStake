import AdminGuard from "../components/AdminGuard";
import AdminDashboard from "../components/AdminDashboard";

export default function AdminPanel({ account, signer, provider }) {

  return (
    <AdminGuard account={account}>
      <AdminDashboard
        account={account}
        signer={signer}
        provider={provider}
      />
    </AdminGuard>
  );
}