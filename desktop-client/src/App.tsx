import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/components/Layout/AppLayout";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import LoginPage from "@/pages/Auth/LoginPage";
import DashboardPage from "@/pages/Dashboard/DashboardPage";
import FundListPage from "@/pages/Funds/FundListPage";
import PortfolioListPage from "@/pages/Portfolios/PortfolioListPage";
import AssetClassListPage from "@/pages/AssetClasses/AssetClassListPage";
import SecurityListPage from "@/pages/Securities/SecurityListPage";
import FileUploadPage from "@/pages/Upload/FileUploadPage";
import ValuationPage from "@/pages/Valuation/ValuationPage";
import ResultsPage from "@/pages/Results/ResultsPage";
import AuditPage from "@/pages/Audit/AuditPage";

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="funds" element={<FundListPage />} />
        <Route path="portfolios" element={<PortfolioListPage />} />
        <Route path="asset-classes" element={<AssetClassListPage />} />
        <Route path="securities" element={<SecurityListPage />} />
        <Route path="uploads" element={<FileUploadPage />} />
        <Route path="valuation" element={<ValuationPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
