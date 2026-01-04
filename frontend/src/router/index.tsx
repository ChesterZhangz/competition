import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';

// Auth Pages
import { LoginPage, RegisterPage, ForgotPasswordPage } from '@/pages/auth';

// Competition Pages
import {
  CompetitionsPage,
  JoinCompetitionPage,
  CompetitionCreatePage,
  CompetitionDetailPage,
  CompetitionEditPage,
  CompetitionHostPage,
  CompetitionLivePage,
  CompetitionPlayPage,
  CompetitionResultsPage,
  CompetitionPreviewPage,
  CompetitionDemoPage,
  CompetitionRefereePage,
  CompetitionTutorialPage,
  CompetitionQuestionsPage,
  CompetitionRefereesPage,
} from '@/pages/competition';

// Problem Pages
import {
  ProblemsPage,
  ProblemBankCreatePage,
  ProblemBankDetailPage,
  ProblemBankEditPage,
  ProblemCreatePage,
  ProblemEditPage,
} from '@/pages/problem';

// Admin Pages
import {
  AdminDashboardPage,
  TeacherApplicationsPage,
  UserManagementPage,
  SystemSettingsPage,
} from '@/pages/admin';

// User Pages
import { TeacherApplicationPage } from '@/pages/user';

// Notification Pages
import { NotificationsPage } from '@/pages/notification';

// Settings Pages
import { SettingsPage } from '@/pages/settings';

// Error Pages
import { NotFoundPage } from '@/pages/error';

// Home Page
import { HomePage } from './HomePage';

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes without main layout (Auth pages) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Competition Live Display - Full screen, no layout */}
      <Route
        path="/competitions/:id/live"
        element={
          <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
            <CompetitionLivePage />
          </ProtectedRoute>
        }
      />

      {/* Main layout routes */}
      <Route element={<MainLayout />}>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/join" element={<JoinCompetitionPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Protected routes - Any authenticated user */}
        <Route
          path="/competitions"
          element={
            <ProtectedRoute>
              <CompetitionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitions/:id"
          element={
            <ProtectedRoute>
              <CompetitionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitions/:id/play"
          element={
            <ProtectedRoute>
              <CompetitionPlayPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitions/:id/results"
          element={
            <ProtectedRoute>
              <CompetitionResultsPage />
            </ProtectedRoute>
          }
        />

        {/* Teacher Application - Students only */}
        <Route
          path="/apply-teacher"
          element={
            <ProtectedRoute>
              <TeacherApplicationPage />
            </ProtectedRoute>
          }
        />

        {/* Notifications */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Teacher+ routes - Competition management */}
        <Route
          path="/competitions/create"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <CompetitionCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitions/demo"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <CompetitionDemoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitions/:id/host"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <CompetitionHostPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitions/:id/preview"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <CompetitionPreviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitions/:id/edit"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <CompetitionEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitions/:id/referee"
          element={
            <ProtectedRoute>
              <CompetitionRefereePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitions/tutorial"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <CompetitionTutorialPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitions/:id/questions"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <CompetitionQuestionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/competitions/:id/referees"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <CompetitionRefereesPage />
            </ProtectedRoute>
          }
        />

        {/* Teacher+ routes - Problem management */}
        <Route
          path="/problems"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <ProblemsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/problems/create"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <ProblemBankCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/problems/:id"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <ProblemBankDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/problems/:id/edit"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <ProblemBankEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/problems/:id/problems/create"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <ProblemCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/problems/:id/problems/:problemId"
          element={
            <ProtectedRoute requireRole={['teacher', 'admin', 'super_admin']}>
              <ProblemEditPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireRole={['admin', 'super_admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/applications"
          element={
            <ProtectedRoute requireRole={['admin', 'super_admin']}>
              <TeacherApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireRole={['admin', 'super_admin']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requireRole={['super_admin']}>
              <SystemSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
