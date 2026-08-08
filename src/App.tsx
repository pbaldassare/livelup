import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { LastAppPathTracker } from "@/components/pwa/LastAppPathTracker";
import { AuthProvider } from "@/hooks/useAuth";
import { SplashScreen } from "@/components/common/SplashScreen";
// InstallBanner is mounted inside AppLayout (PWA-only), not globally.
import { PWAUpdatePrompt } from "@/components/pwa/PWAUpdatePrompt";
import { ThemeProvider } from 'next-themes';
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
import AuthResetPasswordPage from "./pages/auth/AuthResetPasswordPage";

// Public pages
import PTDiscoveryPage from "./pages/public/PTDiscoveryPage";
import PTProfilePage from "./pages/public/PTProfilePage";
import BlogPostPage from "./pages/public/BlogPostPage";
import BlogIndexPage from "./pages/public/BlogIndexPage";
import {
  AboutPage,
  ContactPage,
  CookiesPage,
  FaqPage,
  HelpPage,
  PricingPage,
  PrivacyPage,
  TermsPage,
} from "./pages/public/PublicInfoPage";
import InstallPage from "./pages/public/InstallPage";
import UtenteAppPreviewPage from "./pages/dev/UtenteAppPreviewPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPTsPage from "./pages/admin/AdminPTsPage";
import AdminSubscriptionsPage from "./pages/admin/AdminSubscriptionsPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import AdminCouponTemplatesPage from "./pages/admin/AdminCouponTemplatesPage";
import AdminSupportPage from "./pages/admin/AdminSupportPage";
import AdminTicketDetailPage from "./pages/admin/AdminTicketDetailPage";
import AdminAuditLogPage from "./pages/admin/AdminAuditLogPage";
import AdminAuditCoherencePage from "./pages/admin/AdminAuditCoherencePage";
import AdminPTReadinessPage from "./pages/admin/AdminPTReadinessPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminCoursesPage from "./pages/admin/AdminCoursesPage";
import AdminBlogPage from "./pages/admin/AdminBlogPage";
import AdminMessagesPage from "./pages/admin/AdminMessagesPage";
import AdminSitemapPage from "./pages/admin/AdminSitemapPage";
import AdminExercisesPage from "./pages/admin/AdminExercisesPage";
import AdminGroupsPage from "./pages/admin/AdminGroupsPage";

// PT Dashboard pages (Web)
import PTDashboard from "./pages/pt/PTDashboard";
import PTAthletesPage from "./pages/pt/PTAthletesPage";
import PTAthleteDetailPage from "./pages/pt/PTAthleteDetailPage";
import PTWorkoutsPage from "./pages/pt/PTWorkoutsPage";
import PTAssistantPage from "./pages/pt/PTAssistantPage";
import PTTemplateDetailPage from "./pages/pt/PTTemplateDetailPage";
import PTCalendarPage from "./pages/pt/PTCalendarPage";
import PTEventDetailPage from "./pages/pt/PTEventDetailPage";
import PTMessagesPage from "./pages/pt/PTMessagesPage";
import PTPaymentsPage from "./pages/pt/PTPaymentsPage";
import PTSettingsPage from "./pages/pt/PTSettingsPage";
import PTBlogPage from "./pages/pt/PTBlogPage";
import PTCouponsPage from "./pages/pt/PTCouponsPage";
import PTExercisesArchivePage from "./pages/pt/PTExercisesArchivePage";
import PTColleagueSearchPage from "./pages/pt/PTColleagueSearchPage";
import PTCoursesPage from "./pages/pt/PTCoursesPage";

// PT App pages (Mobile/PWA)
import PTAppHome from "./pages/pt/PTAppHome";
import PTAppAthletesPage from "./pages/pt/PTAppAthletesPage";
import PTAppWorkoutsPage from "./pages/pt/PTAppWorkoutsPage";
import PTAppChatPage from "./pages/pt/PTAppChatPage";
import PTAppChatDetailPage from "./pages/pt/PTAppChatDetailPage";
import PTAppChatGroupDetailPage from "./pages/pt/PTAppChatGroupDetailPage";
import PTAppCalendarPage from "./pages/pt/PTAppCalendarPage";
import PTAppProfilePage from "./pages/pt/PTAppProfilePage";
import PTAppExercisesPage from "./pages/pt/PTAppExercisesPage";
import PTAppCoursesPage from "./pages/pt/PTAppCoursesPage";
import PTAppTemplatesPage from "./pages/pt/PTAppTemplatesPage";
import PTAppCouponsPage from "./pages/pt/PTAppCouponsPage";
import PTAppPaymentsPage from "./pages/pt/PTAppPaymentsPage";
import PTAppBlogPage from "./pages/pt/PTAppBlogPage";
import PTAppSettingsPage from "./pages/pt/PTAppSettingsPage";
import PTAppAthleteTransferPage from "./pages/pt/PTAppAthleteTransferPage";
import PTAppColleagueSearchPage from "./pages/pt/PTAppColleagueSearchPage";

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
import AtletaChatGroupDetailPage from "./pages/atleta/AtletaChatGroupDetailPage";
import AtletaSubscriptionPage from "./pages/atleta/AtletaSubscriptionPage";
import AtletaNotificationsPage from "./pages/atleta/AtletaNotificationsPage";
import AtletaSettingsPage from "./pages/atleta/AtletaSettingsPage";
import AtletaHelpPage from "./pages/atleta/AtletaHelpPage";
import AtletaEventDetailPage from "./pages/atleta/AtletaEventDetailPage";
import AtletaProfessionalProfilePage from "./pages/atleta/AtletaProfessionalProfilePage";
import AtletaBookingPage from "./pages/atleta/AtletaBookingPage";
import AtletaCoursesPage from "./pages/atleta/AtletaCoursesPage";
import AtletaCourseDetailPage from "./pages/atleta/AtletaCourseDetailPage";
import AtletaCourseStepRunPage from "./pages/atleta/AtletaCourseStepRunPage";
import AtletaSchedaPage from "./pages/atleta/AtletaSchedaPage";
import AtletaProgrammaPage from "./pages/atleta/AtletaProgrammaPage";
import AtletaEserciziPage from "./pages/atleta/AtletaEserciziPage";
import AtletaCouponsPage from "./pages/atleta/AtletaCouponsPage";
import AtletaAttivitaPage from "./pages/atleta/AtletaAttivitaPage";
import AtletaDocumentsPage from "./pages/atleta/AtletaDocumentsPage";

// Gruppi (condivisi atleta + PT)
import { GroupsHubPage } from "./pages/groups/GroupsHubPage";
import { GroupCreatePage } from "./pages/groups/GroupCreatePage";
import { GroupEditPage } from "./pages/groups/GroupEditPage";
import { GroupDetailPage } from "./pages/groups/GroupDetailPage";
import { GroupJoinPage } from "./pages/groups/GroupJoinPage";

// PT pages
import PTOnboardingPage from "./pages/pt/PTOnboardingPage";

const queryClient = new QueryClient();

function RedirectPTCalendarEventToManage() {
  const { eventId } = useParams<{ eventId: string }>();
  return <Navigate to={`/pt/events/${eventId}`} replace />;
}

// =====================================================
// APP ROUTER
// Separazione rigida routing per ruolo
// =====================================================

const App = () => {
  // Mostra splash solo al primo ingresso della sessione (no HMR, no re-mount).
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('livellapp:splash-shown') !== '1';
    } catch {
      return true;
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="livellapp-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        
        {/* Splash Screen - shown only once per session */}
        {showSplash && (
          <SplashScreen 
            duration={900} 
            onComplete={() => {
              try { sessionStorage.setItem('livellapp:splash-shown', '1'); } catch {}
              setShowSplash(false);
            }} 
          />
        )}
        
        {/* PWA Install Banner is mounted only inside the mobile AppLayout
            (Atleta PWA & PT PWA), not on web dashboards or public pages. */}
        
        {/* PWA Update Prompt */}
        <PWAUpdatePrompt />
        
        <BrowserRouter>
          <AuthProvider>
            <LastAppPathTracker />
            <TourProvider>
            <AppTour />
            <AppTourPrompt />
            <Routes>
              {/* ============================================= */}
              {/* PUBLIC ROUTES - Accessibili a tutti          */}
              {/* ============================================= */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/reset-password" element={<AuthResetPasswordPage />} />
              <Route path="/install" element={<InstallPage />} />
              {/* Dev: anteprima localhost app atleta (cornice mobile) */}
              <Route path="/utente" element={<UtenteAppPreviewPage />} />
              
              {/* Public PT Discovery page */}
              <Route path="/pts" element={<PTDiscoveryPage />} />
              <Route path="/pts/:userId" element={<PTProfilePage />} />
              <Route path="/blog" element={<BlogIndexPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/chi-siamo" element={<Navigate to="/about" replace />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/cookies" element={<CookiesPage />} />

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
              <Route path="/admin/coupon-templates" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminCouponTemplatesPage />
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
              <Route path="/admin/audit" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminAuditCoherencePage />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/pt-readiness" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminPTReadinessPage />
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
              <Route path="/admin/blog" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminBlogPage />
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
              <Route path="/admin/groups" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminGroupsPage />
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
              <Route path="/pt/assistant" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <PTAssistantPage />
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
              <Route path="/pt/calendar" element={<Navigate to="/pt/events" replace />} />
              <Route path="/pt/calendar/eventi" element={<Navigate to="/pt/events" replace />} />
              <Route path="/pt/events" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <PTCalendarPage mode="eventi" />
                  </PTDashboardLayout>
                </PTDashboardRoute>
              } />
              <Route path="/pt/events/:eventId" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <PTEventDetailPage />
                  </PTDashboardLayout>
                </PTDashboardRoute>
              } />
              <Route path="/pt/calendar/eventi/:eventId" element={<RedirectPTCalendarEventToManage />} />
              <Route path="/pt/calendar/appuntamenti" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <PTCalendarPage mode="appuntamenti" />
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
              <Route path="/pt/courses" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <PTCoursesPage />
                  </PTDashboardLayout>
                </PTDashboardRoute>
              } />
              <Route path="/pt/cerca-professionisti" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <PTColleagueSearchPage />
                  </PTDashboardLayout>
                </PTDashboardRoute>
              } />
              <Route path="/pt/groups" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <GroupsHubPage basePath="/pt/groups" />
                  </PTDashboardLayout>
                </PTDashboardRoute>
              } />
              <Route path="/pt/groups/new" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <GroupCreatePage basePath="/pt/groups" />
                  </PTDashboardLayout>
                </PTDashboardRoute>
              } />
              <Route path="/pt/groups/join/:token" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <GroupJoinPage basePath="/pt/groups" />
                  </PTDashboardLayout>
                </PTDashboardRoute>
              } />
              <Route path="/pt/groups/:groupId/edit" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <GroupEditPage basePath="/pt/groups" />
                  </PTDashboardLayout>
                </PTDashboardRoute>
              } />
              <Route path="/pt/groups/:groupId" element={
                <PTDashboardRoute>
                  <PTDashboardLayout>
                    <GroupDetailPage basePath="/pt/groups" />
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
              <Route path="/pt/app/chat/group/:groupId" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppChatGroupDetailPage />
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
              {/* PT-PWA extra surfaces — parità feature con la dashboard web */}
              <Route path="/pt/app/exercises" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppExercisesPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/courses" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppCoursesPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/templates" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppTemplatesPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/coupons" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppCouponsPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/payments" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppPaymentsPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/blog" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppBlogPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/settings" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppSettingsPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route
                path="/pt/app/collaboratori"
                element={<Navigate to="/pt/app/athlete-transfer" replace />}
              />
              <Route path="/pt/app/athlete-transfer" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppAthleteTransferPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/cerca-professionisti" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAppColleagueSearchPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              {/* Athlete detail nella PWA — riusa la pagina web (responsive) */}
              <Route path="/pt/app/athlete/:atletaId" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAthleteDetailPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/athlete/:atletaId/workouts" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTAthleteDetailPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              {/* (alias plurale rimosso: i link interni usano la forma singolare /pt/app/athlete/:id) */}
              {/* Template detail */}
              <Route path="/pt/app/templates/:templateId" element={
                <PTAppRoute>
                  <AppLayout>
                    <PTTemplateDetailPage />
                  </AppLayout>
                </PTAppRoute>
              } />
              {/* Legacy/web aliases dentro la PWA */}
              <Route path="/pt/app/groups" element={
                <PTAppRoute>
                  <AppLayout>
                    <GroupsHubPage basePath="/pt/app/groups" />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/groups/new" element={
                <PTAppRoute>
                  <AppLayout>
                    <GroupCreatePage basePath="/pt/app/groups" />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/groups/join/:token" element={
                <PTAppRoute>
                  <AppLayout>
                    <GroupJoinPage basePath="/pt/app/groups" />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/groups/:groupId/edit" element={
                <PTAppRoute>
                  <AppLayout>
                    <GroupEditPage basePath="/pt/app/groups" />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/groups/:groupId" element={
                <PTAppRoute>
                  <AppLayout>
                    <GroupDetailPage basePath="/pt/app/groups" />
                  </AppLayout>
                </PTAppRoute>
              } />
              <Route path="/pt/app/messages" element={<Navigate to="/pt/app/chat" replace />} />
              <Route path="/pt/app/calendar/eventi" element={<Navigate to="/pt/app/calendar" replace />} />
              <Route path="/pt/app/calendar/appuntamenti" element={<Navigate to="/pt/app/calendar?view=appuntamenti" replace />} />


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
              <Route path="/app/documenti" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaDocumentsPage />
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
              <Route path="/app/chat/group/:groupId" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaChatGroupDetailPage />
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
              <Route path="/app/courses/:courseId" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaCourseDetailPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/courses/:courseId/steps/:stepId/run" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaCourseStepRunPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/booking" element={
                <AtletaRoute>
                  <AtletaBookingPage />
                </AtletaRoute>
              } />
              <Route path="/app/attivita" element={
                <AtletaRoute>
                  <AppLayout>
                    <AtletaAttivitaPage />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/appuntamenti" element={<Navigate to="/app/attivita" replace />} />
              <Route path="/app/coupons" element={
                <AtletaRoute>
                  <AtletaCouponsPage />
                </AtletaRoute>
              } />
              <Route path="/app/groups" element={
                <AtletaRoute>
                  <AppLayout>
                    <GroupsHubPage basePath="/app/groups" />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/groups/new" element={
                <AtletaRoute>
                  <AppLayout>
                    <GroupCreatePage basePath="/app/groups" />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/groups/join/:token" element={
                <AtletaRoute>
                  <AppLayout>
                    <GroupJoinPage basePath="/app/groups" />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/groups/:groupId/edit" element={
                <AtletaRoute>
                  <AppLayout>
                    <GroupEditPage basePath="/app/groups" />
                  </AppLayout>
                </AtletaRoute>
              } />
              <Route path="/app/groups/:groupId" element={
                <AtletaRoute>
                  <AppLayout>
                    <GroupDetailPage basePath="/app/groups" />
                  </AppLayout>
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
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
