import { useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export function RequireSubscription({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasActiveSubscription, hasAccount } = useApp();
  if (!isAuthenticated) return <Navigate to={hasAccount ? "/login" : "/signup"} replace />;
  if (!hasActiveSubscription) return <Navigate to="/payment" replace />;
  return <>{children}</>;
}

/**
 * Signup page: bounce fully-onboarded students into the app, half-onboarded ones to
 * payment, and anyone who already has an account but is logged out to the login page
 * instead of letting them create a second account.
 */
export function SignUpGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasActiveSubscription, hasAccount } = useApp();
  if (isAuthenticated && hasActiveSubscription) return <Navigate to="/profile" replace />;
  if (isAuthenticated && !hasActiveSubscription) return <Navigate to="/payment" replace />;
  if (hasAccount) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Login page: only bounce students who are already logged in; everyone else sees the form. */
export function LoginGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasActiveSubscription } = useApp();
  if (isAuthenticated && hasActiveSubscription) return <Navigate to="/profile" replace />;
  if (isAuthenticated && !hasActiveSubscription) return <Navigate to="/payment" replace />;
  return <>{children}</>;
}

/**
 * Payment page: requires a registered, logged-in student; a student who was ALREADY
 * subscribed before landing here goes straight into the app. Subscribing while on this
 * page must not bounce the student away mid-flow, so only the subscription status at
 * first mount is used to gate entry — the checkout screen owns navigating away once its
 * own success state has been shown.
 */
export function PaymentGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasActiveSubscription, hasAccount } = useApp();
  const [wasAlreadySubscribed] = useState(hasActiveSubscription);
  if (!isAuthenticated) return <Navigate to={hasAccount ? "/login" : "/signup"} replace />;
  if (wasAlreadySubscribed) return <Navigate to="/profile" replace />;
  return <>{children}</>;
}
