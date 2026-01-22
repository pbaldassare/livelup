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
import { PublicLayout } from "@/components/layouts/PublicLayout";

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

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";

// PT pages
import PTDashboard from "./pages/pt/PTDashboard";
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
            
            {/* Public pages with layout */}
            <Route path="/pts" element={
              <PublicLayout>
                <div className="container-wide py-12">
                  <h1 className="text-2xl font-bold">Trova un Personal Trainer</h1>
                  <p className="text-muted-foreground mt-2">Shell - Lista PT da implementare</p>
                </div>
              </PublicLayout>
            } />

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
            <Route path="/admin/users" element={
              <AdminRoute>
                <AdminLayout>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Gestione Utenti</h2>
                    <p className="text-muted-foreground">Shell - Da implementare</p>
                  </div>
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/pts" element={
              <AdminRoute>
                <AdminLayout>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Gestione Personal Trainers</h2>
                    <p className="text-muted-foreground">Shell - Da implementare</p>
                  </div>
                </AdminLayout>
              </AdminRoute>
            } />
            <Route path="/admin/permissions" element={
              <AdminRoute>
                <AdminLayout>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Gestione Permessi</h2>
                    <p className="text-muted-foreground">Shell - Da implementare</p>
                  </div>
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
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">I Miei Atleti</h2>
                    <p className="text-muted-foreground">Shell - Da implementare</p>
                  </div>
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />
            <Route path="/pt/workouts" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Allenamenti</h2>
                    <p className="text-muted-foreground">Shell - Da implementare</p>
                  </div>
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />
            <Route path="/pt/calendar" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Calendario</h2>
                    <p className="text-muted-foreground">Shell - Da implementare</p>
                  </div>
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />
            <Route path="/pt/messages" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Messaggi</h2>
                    <p className="text-muted-foreground">Shell - Da implementare</p>
                  </div>
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />
            <Route path="/pt/payments" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Pagamenti</h2>
                    <p className="text-muted-foreground">Shell - Da implementare</p>
                  </div>
                </PTDashboardLayout>
              </PTDashboardRoute>
            } />
            <Route path="/pt/settings" element={
              <PTDashboardRoute>
                <PTDashboardLayout>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Impostazioni</h2>
                    <p className="text-muted-foreground">Shell - Da implementare</p>
                  </div>
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
