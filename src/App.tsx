import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SplashScreen } from "@/components/common/SplashScreen";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { PWAUpdatePrompt } from "@/components/pwa/PWAUpdatePrompt";
import { TourProvider } from "@/components/AppTourContext";
import AppTour from "@/components/AppTour";
import AppTourPrompt from "@/components/AppTourPrompt";

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
import BlogPostPage from "./pages/public/BlogPostPage";
import InstallPage from "./pages/public/InstallPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPTsPage from "./pages/admin/AdminPTsPage";
import AdminSubscriptionsPage from "./pages/admin/AdminSubscriptionsPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import AdminSupportPage from "./pages/admin/AdminSupportPage";
import AdminTicketDetailPage from "./pages/admin/AdminTicketDetailPage";
import AdminAuditLogPage from "./pages/admin/AdminAuditLogPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminCoursesPage from "./pages/admin/AdminCoursesPage";
import AdminMessagesPage from "./pages/admin/AdminMessagesPage";
import AdminSitemapPage from "./pages/admin/AdminSitemapPage";
import AdminExercisesPage from "./pages/admin/AdminExercisesPage";

// PT Dashboard pages (Web)
import PTDashboard from "./pages/pt/PTDashboard";
import PTAthletesPage from "./pages/pt/PTAthletesPage";
import PTAthleteDetailPage from "./pages/pt/PTAthleteDetailPage";
import PTWorkoutsPage from "./pages/pt/PTWorkoutsPage";
import PTTemplateDetailPage from "./pages/pt/PTTemplateDetailPage";
import PTCalendarPage from "./pages/pt/PTCalendarPage";
import PTMessagesPage from "./pages/pt/PTMessagesPage";
import PTPaymentsPage from "./pages/pt/PTPaymentsPage";
import PTSettingsPage from "./pages/pt/PTSettingsPage";
import PTBlogPage from "./pages/pt/PTBlogPage";
import PTCouponsPage from "./pages/pt/PTCouponsPage";
import PTExercisesArchivePage from "./pages/pt/PTExercisesArchivePage";

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
import AtletaNotificationsPage from "./pages/atleta/AtletaNotificationsPage";
import AtletaSettingsPage from "./pages/atleta/AtletaSettingsPage";
import AtletaHelpPage from "./pages/atleta/AtletaHelpPage";
import AtletaEventDetailPage from "./pages/atleta/AtletaEventDetailPage";
import AtletaProfessionalProfilePage from "./pages/atleta/AtletaProfessionalProfilePage";
import AtletaBookingPage from "./pages/atleta/AtletaBookingPage";
import AtletaCoursesPage from "./pages/atleta/AtletaCoursesPage";
import AtletaSchedaPage from "./pages/atleta/AtletaSchedaPage";
import AtletaProgrammaPage from "./pages/atleta/AtletaProgrammaPage";
import AtletaEserciziPage from "./pages/atleta/AtletaEserciziPage";

// PT pages
import PTOnboardingPage from "./pages/pt/PTOnboardingPage";

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
        
        {/* PWA Install Banner - shown on mobile */}
        <InstallBanner />
        
        {/* PWA Update Prompt */}
        <PWAUpdatePrompt />
        
        <BrowserRouter>
          <AuthProvider>
            <TourProvider>
            <AppTour />
            <AppTourPrompt />
            <Routes>
              {/* ============================================= */}
              {/* PUBLIC ROUTES - Accessibili a tutti          */}
              {/* ============================================= */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/install" element={<InstallPage />} />
              
              {/* Public PT Discovery page */}
              <Route path="/pts" element={<PTDiscoveryPage />} />
              <Route path="/pts/:userId" element={<PTProfilePage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />

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
              <Route path="/admin/support/:ticketId" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminTicketDetailPage />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/audit-log" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminAuditLogPage />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/courses" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminCoursesPage />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/exercises" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminExercisesPage />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/messages" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminMessagesPage />
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
              <Route path="/admin/sitemap" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminSitemapPage />
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
              <Route path="/pt/athletes/:atletaId" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <PTAthleteDetailPage />
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
              <Route path="/pt/templates/:templateId" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <PTTemplateDetailPage />
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
              <Route path="/pt/blog" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <PTBlogPage />
                  </PTDashboardLayout>
                </PTDashboardRoute>
              } />
              <Route path="/pt/coupons" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <PTCouponsPage />
                  </PTDashboardLayout>
                </PTDashboardRoute>
              } />
              <Route path="/pt/exercises" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <PTExercisesArchivePage />
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
              <Route path="/app/programma" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaProgrammaPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              {/* Legacy redirect */}
              <Route path="/app/scheda" element={
                <AtletaRoute>
                  <AtletaSchedaPage />
                </AtletaRoute>
              } />
              <Route path="/app/esercizi" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaEserciziPage />
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
              <Route path="/app/notifications" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaNotificationsPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/settings" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaSettingsPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/help" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaHelpPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/events/:eventId" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaEventDetailPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/professional/:professionalId" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaProfessionalProfilePage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/courses" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaCoursesPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/booking" element={
                <AtletaRoute>
                  <AtletaBookingPage />
                </AtletaRoute>
              } />

              {/* PT Onboarding */}
              <Route path="/pt/onboarding" element={
                <PTAppRoute>
                  <PTOnboardingPage />
                </PTAppRoute>
              } />

              {/* ============================================= */}
              {/* LEGACY REDIRECTS - typo URL comuni            */}
              {/* ============================================= */}
              <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
              <Route path="/pt/dashboard" element={<Navigate to="/pt" replace />} />
              <Route path="/app/home" element={<Navigate to="/app" replace />} />
              <Route path="/app/workouts" element={<Navigate to="/app/esercizi" replace />} />

              {/* ============================================= */}
              {/* CATCH-ALL                                    */}
              {/* ============================================= */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TourProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
