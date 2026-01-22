import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Layouts
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { PTDashboardLayout } from "@/components/layouts/PTDashboardLayout";
import { AppLayout } from "@/components/layouts/AppLayout";

// Route protection
import { 
  AdminRoute, 
  PTDashboardRoute, 
  PTAppRoute, 
  AtletaRoute 
} from "@/components/auth/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/auth/AuthPage";

// Public pages
import PTDiscoveryPage from "./pages/public/PTDiscoveryPage";
import PTProfilePage from "./pages/public/PTProfilePage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPTsPage from "./pages/admin/AdminPTsPage";
import AdminAthletesPage from "./pages/admin/AdminAthletesPage";
import AdminSubscriptionsPage from "./pages/admin/AdminSubscriptionsPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import AdminSupportPage from "./pages/admin/AdminSupportPage";

// PT Dashboard pages
import PTDashboard from "./pages/pt/PTDashboard";
import PTAthletesPage from "./pages/pt/PTAthletesPage";
import PTWorkoutsPage from "./pages/pt/PTWorkoutsPage";
import PTCalendarPage from "./pages/pt/PTCalendarPage";
import PTMessagesPage from "./pages/pt/PTMessagesPage";
import PTPaymentsPage from "./pages/pt/PTPaymentsPage";
import PTSettingsPage from "./pages/pt/PTSettingsPage";

// PT App pages
import PTAppHome from "./pages/pt/PTAppHome";

// Atleta pages
import AtletaAppHome from "./pages/atleta/AtletaAppHome";

const queryClient = new QueryClient();

// =====================================================
// APP ROUTER
// Separazione rigida routing per ruolo
// =====================================================

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ============================================= */}
            {/* PUBLIC ROUTES - Accessibili a tutti          */}
            {/* ============================================= */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Public PT Discovery page */}
            <Route path="/pts" element={<PTDiscoveryPage />} />
            <Route path="/pts/:userId" element={<PTProfilePage />} />

            {/* ============================================= */}
            {/* ADMIN ROUTES - Solo ruolo admin              */}
            {/* ============================================= */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/pts" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminPTsPage />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/athletes" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminAthletesPage />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/subscriptions" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminSubscriptionsPage />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/payments" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminPaymentsPage />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/coupons" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminCouponsPage />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/support" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminSupportPage />
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/settings" element={
              <AdminRoute>
                <AdminLayout>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Impostazioni Sistema</h2>
                    <p className="text-muted-foreground">Shell - Da implementare</p>
                  </div>
                </AdminLayout>
              </AdminRoute>
            } />

            {/* ============================================= */}
            {/* PT DASHBOARD ROUTES - Solo ruolo pt (web)    */}
            {/* ============================================= */}
            <Route path="/pt" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <PTDashboard />
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />
            <Route path="/pt/athletes" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <PTAthletesPage />
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />
            <Route path="/pt/workouts" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <PTWorkoutsPage />
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />
            <Route path="/pt/calendar" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <PTCalendarPage />
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />
            <Route path="/pt/messages" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <PTMessagesPage />
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />
            <Route path="/pt/payments" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <PTPaymentsPage />
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />
            <Route path="/pt/settings" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <PTSettingsPage />
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />

            {/* ============================================= */}
            {/* PT APP ROUTES - Solo ruolo pt (mobile/PWA)   */}
            {/* ============================================= */}
            <Route path="/pt/app" element={
              <PTAppRoute>
                <AppLayout>
                  <PTAppHome />
                </AppLayout>
              </PTAppRoute>
            } />
            <Route path="/pt/app/athletes" element={
              <PTAppRoute>
                <AppLayout>
                  <div className="p-4">
                    <h2 className="text-xl font-bold">Atleti</h2>
                    <p className="text-muted-foreground mt-2">Shell - Da implementare</p>
                  </div>
                </AppLayout>
              </PTAppRoute>
            } />
            <Route path="/pt/app/workouts" element={
              <PTAppRoute>
                <AppLayout>
                  <div className="p-4">
                    <h2 className="text-xl font-bold">Workout</h2>
                    <p className="text-muted-foreground mt-2">Shell - Da implementare</p>
                  </div>
                </AppLayout>
              </PTAppRoute>
            } />
            <Route path="/pt/app/chat" element={
              <PTAppRoute>
                <AppLayout>
                  <div className="p-4">
                    <h2 className="text-xl font-bold">Chat</h2>
                    <p className="text-muted-foreground mt-2">Shell - Da implementare</p>
                  </div>
                </AppLayout>
              </PTAppRoute>
            } />
            <Route path="/pt/app/profile" element={
              <PTAppRoute>
                <AppLayout>
                  <div className="p-4">
                    <h2 className="text-xl font-bold">Il Mio Profilo</h2>
                    <p className="text-muted-foreground mt-2">Shell - Da implementare</p>
                  </div>
                </AppLayout>
              </PTAppRoute>
            } />

            {/* ============================================= */}
            {/* ATLETA APP ROUTES - Solo ruolo atleta        */}
            {/* ============================================= */}
            <Route path="/app" element={
              <AtletaRoute>
                <AppLayout>
                  <AtletaAppHome />
                </AppLayout>
              </AtletaRoute>
            } />
            <Route path="/app/workout" element={
              <AtletaRoute>
                <AppLayout>
                  <div className="p-4">
                    <h2 className="text-xl font-bold">I Miei Allenamenti</h2>
                    <p className="text-muted-foreground mt-2">Shell - Da implementare</p>
                  </div>
                </AppLayout>
              </AtletaRoute>
            } />
            <Route path="/app/discover" element={
              <AtletaRoute>
                <AppLayout>
                  <div className="p-4">
                    <h2 className="text-xl font-bold">Scopri Personal Trainer</h2>
                    <p className="text-muted-foreground mt-2">Shell - Ricerca PT da implementare</p>
                  </div>
                </AppLayout>
              </AtletaRoute>
            } />
            <Route path="/app/progress" element={
              <AtletaRoute>
                <AppLayout>
                  <div className="p-4">
                    <h2 className="text-xl font-bold">I Miei Progressi</h2>
                    <p className="text-muted-foreground mt-2">Shell - Da implementare</p>
                  </div>
                </AppLayout>
              </AtletaRoute>
            } />
            <Route path="/app/profile" element={
              <AtletaRoute>
                <AppLayout>
                  <div className="p-4">
                    <h2 className="text-xl font-bold">Il Mio Profilo</h2>
                    <p className="text-muted-foreground mt-2">Shell - Da implementare</p>
                  </div>
                </AppLayout>
              </AtletaRoute>
            } />

            {/* ============================================= */}
            {/* CATCH-ALL                                    */}
            {/* ============================================= */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
