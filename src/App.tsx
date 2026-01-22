import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SplashScreen } from "@/components/common/SplashScreen";

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
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

// PT Dashboard pages (Web)
import PTDashboard from "./pages/pt/PTDashboard";
import PTAthletesPage from "./pages/pt/PTAthletesPage";
import PTWorkoutsPage from "./pages/pt/PTWorkoutsPage";
import PTCalendarPage from "./pages/pt/PTCalendarPage";
import PTMessagesPage from "./pages/pt/PTMessagesPage";
import PTPaymentsPage from "./pages/pt/PTPaymentsPage";
import PTSettingsPage from "./pages/pt/PTSettingsPage";

// PT App pages (Mobile/PWA)
import PTAppHome from "./pages/pt/PTAppHome";
import PTAppAthletesPage from "./pages/pt/PTAppAthletesPage";
import PTAppWorkoutsPage from "./pages/pt/PTAppWorkoutsPage";
import PTAppChatPage from "./pages/pt/PTAppChatPage";
import PTAppChatDetailPage from "./pages/pt/PTAppChatDetailPage";
import PTAppCalendarPage from "./pages/pt/PTAppCalendarPage";
import PTAppProfilePage from "./pages/pt/PTAppProfilePage";

// Atleta App pages (Mobile/PWA)
import AtletaAppHome from "./pages/atleta/AtletaAppHome";
import AtletaOnboardingPage from "./pages/atleta/AtletaOnboardingPage";
import AtletaDiscoverPage from "./pages/atleta/AtletaDiscoverPage";
import AtletaPTProfilePage from "./pages/atleta/AtletaPTProfilePage";
import AtletaWorkoutPage from "./pages/atleta/AtletaWorkoutPage";
import AtletaWorkoutDetailPage from "./pages/atleta/AtletaWorkoutDetailPage";
import AtletaProgressPage from "./pages/atleta/AtletaProgressPage";
import AtletaProfilePage from "./pages/atleta/AtletaProfilePage";
import AtletaChatPage from "./pages/atleta/AtletaChatPage";
import AtletaSubscriptionPage from "./pages/atleta/AtletaSubscriptionPage";

const queryClient = new QueryClient();

// =====================================================
// APP ROUTER
// Separazione rigida routing per ruolo
// =====================================================

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        
        {/* Splash Screen - shown on first load */}
        {showSplash && (
          <SplashScreen 
            duration={1800} 
            onComplete={() => setShowSplash(false)} 
          />
        )}
        
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
                    <AdminSettingsPage />
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
                    <PTAppAthletesPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/workouts" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppWorkoutsPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/chat" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppChatPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/chat/:atletaId" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppChatDetailPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/calendar" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppCalendarPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/profile" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppProfilePage />
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
              <Route path="/app/onboarding" element={
                <AtletaRoute>
                  <AtletaOnboardingPage />
                </AtletaRoute>
              } />
              <Route path="/app/discover" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaDiscoverPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/pt/:userId" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaPTProfilePage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/workout" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaWorkoutPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/workout/:workoutId" element={
                <AtletaRoute>
                  <AtletaWorkoutDetailPage />
                </AtletaRoute>
              } />
              <Route path="/app/progress" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaProgressPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/profile" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaProfilePage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/chat" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaChatPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/chat/:recipientId" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaChatPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/subscription" element={
                <AtletaRoute>
                  <AtletaSubscriptionPage />
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
};

export default App;
