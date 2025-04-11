import React from 'react';
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "./hooks/use-auth";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ShopPage from "@/pages/shop-page";
import AdminConfigPage from "@/pages/admin-config-page";
import ProfilePage from "@/pages/profile-page";
import AnnouncementsConfigPage from "@/pages/announcements-config-page";
import AnnouncementsPage from "@/pages/announcements-page";
import { ProtectedRoute } from "./lib/protected-route";
import EquipmentPage from "./pages/equipment-page";
import AdminEquipmentPage from "@/pages/admin-equipment-page";
import BorrowingsPage from "./pages/borrowings-page";
import UserProfilePage from "./pages/user-profile-page";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <Switch>
        <Route path="/auth">
          {user ? <Redirect to="/home" /> : <AuthPage />}
        </Route>
        <Route path="/home" component={HomePage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <ProtectedRoute path="/equipment" component={EquipmentPage} />
        <ProtectedRoute path="/borrowings" component={BorrowingsPage} />
        <ProtectedRoute path="/user-profile/:id" component={UserProfilePage} />
        <ProtectedRoute path="/shop" component={ShopPage} />
        <ProtectedRoute path="/announcements" component={AnnouncementsPage} adminOnly={true} />
        <ProtectedRoute path="/admin/club-info" component={AnnouncementsConfigPage} adminOnly={true} />
        <ProtectedRoute path="/admin/config" component={AdminConfigPage} adminOnly={true} />
        <ProtectedRoute path="/admin/equipment" component={AdminEquipmentPage} adminOnly={true} />
        <Route path="/">
          {user ? <Redirect to="/home" /> : <Redirect to="/auth" />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}
