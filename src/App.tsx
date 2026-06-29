import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AuthPage } from "./pages/AuthPage";
import { CommunityPage } from "./pages/CommunityPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { HomePage } from "./pages/HomePage";
import { MemoryPage } from "./pages/MemoryPage";
import { MePage } from "./pages/MePage";
import { NutritionPage } from "./pages/NutritionPage";
import { RecordsPage } from "./pages/RecordsPage";
import { TrainPage } from "./pages/TrainPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="train" element={<TrainPage />} />
        <Route path="memory" element={<MemoryPage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="records" element={<RecordsPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="nutrition" element={<NutritionPage />} />
        <Route path="me" element={<MePage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
