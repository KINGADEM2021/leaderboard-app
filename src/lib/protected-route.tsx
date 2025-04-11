import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";

// Admin email from environment variable or use the default
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'ademmsallem782@gmail.com';

type ProtectedRouteProps = {
  path: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
};

export function ProtectedRoute({
  path,
  component: Component,
  adminOnly = false,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : user ? (
        // If adminOnly is true, check if user is admin
        adminOnly ? (
          isAdmin ? (
            <Component />
          ) : (
            <Redirect to="/" />
          )
        ) : (
          <Component />
        )
      ) : (
        <Redirect to="/auth" />
      )}
    </Route>
  );
}
