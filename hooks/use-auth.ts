/**
 * Authentication Hook
 * Manages user authentication state and role-based access
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { initFirebase } from '@/lib/firebase';
import { UserRole, UserProfile, getRedirectRoute } from '@/lib/rbac';
import { useRouter } from 'next/navigation';

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const { auth, db } = initFirebase();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userProfile: null,
    loading: true,
    error: null
  });

  const fetchUserProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.error('User profile not found in Firestore');
        return null;
      }

      const data = userDoc.data();
      return {
        uid,
        role: data.role as UserRole,
        name: data.name,
        email: data.email,
        designation: data.designation,
        state: data.state,
        hospitalId: data.hospitalId,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, [db]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        setAuthState({
          user,
          userProfile: profile,
          loading: false,
          error: profile ? null : 'Failed to load user profile'
        });
      } else {
        setAuthState({
          user: null,
          userProfile: null,
          loading: false,
          error: null
        });
      }
    });

    return () => unsubscribe();
  }, [auth, fetchUserProfile]);

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const profile = await fetchUserProfile(user.uid);

      if (!profile) {
        throw new Error('User profile not found. Please contact administrator.');
      }

      setAuthState({
        user,
        userProfile: profile,
        loading: false,
        error: null
      });

      const redirectRoute = getRedirectRoute(profile.role);
      router.push(redirectRoute);

      return { success: true, profile };
    } catch (error: any) {
      const errorMessage = error.code === 'auth/invalid-credential'
        ? 'Invalid email or password'
        : error.code === 'auth/too-many-requests'
        ? 'Too many failed attempts. Please try again later.'
        : error.message || 'Failed to sign in';

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setAuthState({
        user: null,
        userProfile: null,
        loading: false,
        error: null
      });
      router.push('/');
    } catch (error: any) {
      console.error('Sign out error:', error);
    }
  };

  return {
    user: authState.user,
    userProfile: authState.userProfile,
    loading: authState.loading,
    error: authState.error,
    signIn,
    signOut,
    isAuthenticated: !!authState.user
  };
};
