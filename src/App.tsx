import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth-context";
import { AppLayout } from "./components/AppLayout";
import { AuthPage } from "./pages/AuthPage";
import { TodayPage } from "./pages/TodayPage";
import { RecordsPage } from "./pages/RecordsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AdminPage } from "./pages/AdminPage";
function RequireUser({ admin = false }: {
    admin?: boolean;
}) {
    const { user, loading } = useAuth();
    if (loading)
        return <div className="loading-skeleton" aria-label="正在加载账号"/>;
    if (!user)
        return <Navigate to="/login" replace/>;
    if (admin && user.role !== "admin")
        return <Navigate to="/" replace/>;
    return <Outlet />;
}
export default function App() {
    return <Routes><Route element={<AppLayout />}>
    <Route path="login" element={<AuthPage mode="login"/>}/>
    <Route path="register" element={<AuthPage mode="register"/>}/>
    <Route element={<RequireUser />}>
      <Route index element={<TodayPage />}/>
      <Route path="records" element={<RecordsPage />}/>
      <Route path="me" element={<SettingsPage />}/>
      <Route element={<RequireUser admin/>}><Route path="admin" element={<AdminPage />}/></Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Route></Routes>;
}
