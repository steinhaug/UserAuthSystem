import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginWithEmail, loginWithGoogle, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { DEVELOPMENT_MODE } from '@/lib/constants';
import { FaGoogle, FaFacebook, FaApple } from 'react-icons/fa';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<string>('Checking...');
  
  useEffect(() => {
    // Display whether we're using real or mock authentication
    if (DEVELOPMENT_MODE) {
      setAuthMode('Mock Authentication (Development Mode)');
    } else {
      setAuthMode('Real Firebase Authentication');
    }
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      console.log('Attempting login with email:', data.email);
      
      // Check if we're in development mode
      if (DEVELOPMENT_MODE) {
        console.log('Using development mode for login - setting mock user');
        // In development mode, just set the localStorage flag to enable the mock user
        localStorage.setItem('devModeLoggedIn', 'true');
        toast({
          title: 'Development mode login',
          description: 'Logged in with mock user',
          variant: 'default',
        });
        setLocation('/map');
        return;
      }
      
      // Normal Firebase login
      await loginWithEmail(data.email, data.password);
      toast({
        title: 'Login successful',
        description: 'Welcome back!',
        variant: 'default',
      });
      setLocation('/map');
    } catch (error: any) {
      console.error("Login error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      let errorMessage = 'Please check your credentials and try again';
      
      // Firebase error codes: https://firebase.google.com/docs/auth/admin/errors
      if (error.code === 'auth/invalid-api-key') {
        errorMessage = 'Firebase API key is invalid. Please contact the administrator.';
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later or reset your password.';
      } else if (error.code === 'auth/app-deleted' || error.code === 'auth/app-not-authorized') {
        errorMessage = 'Authentication service is not configured properly. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      console.log('Attempting login with Google');
      
      // Check if we're in development mode
      if (DEVELOPMENT_MODE) {
        console.log('Using development mode for Google login - setting mock user');
        // In development mode, just set the localStorage flag to enable the mock user
        localStorage.setItem('devModeLoggedIn', 'true');
        toast({
          title: 'Development mode login',
          description: 'Logged in with mock user via Google',
          variant: 'default',
        });
        setLocation('/map');
        return;
      }
      
      // Normal Google login
      await loginWithGoogle();
      toast({
        title: 'Login successful',
        description: 'Welcome back!',
        variant: 'default',
      });
      setLocation('/map');
    } catch (error: any) {
      console.error("Google login error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      let errorMessage = 'Could not sign in with Google';
      
      if (error.code === 'auth/invalid-api-key') {
        errorMessage = 'Firebase API key is invalid. Please contact the administrator.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login popup was closed. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Login popup was blocked. Please allow popups for this site.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for OAuth operations. Please contact the administrator.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google login is not enabled for this project. Please contact the administrator.';
      } else if (error.code === 'auth/app-deleted' || error.code === 'auth/app-not-authorized') {
        errorMessage = 'Authentication service is not configured properly. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Google login failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
        <div className="text-center mb-6">
          <div className={`text-sm py-1 px-3 rounded-full inline-block ${
            DEVELOPMENT_MODE ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
          }`}>
            {authMode}
          </div>
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel className="block text-gray-700 text-sm font-medium mb-2">Email</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="email" 
                  placeholder="your@email.com" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="mb-6">
              <FormLabel className="block text-gray-700 text-sm font-medium mb-2">Password</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
              <p className="text-right text-sm text-primary mt-2 cursor-pointer">Forgot password?</p>
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-md"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">Or continue with</p>
          <div className="flex justify-center space-x-4 mt-3">
            <Button 
              type="button" 
              onClick={handleGoogleLogin}
              className="flex items-center justify-center w-12 h-12 rounded-full border border-gray-300 bg-white"
              variant="outline"
              disabled={isLoading}
            >
              <FaGoogle className="w-5 h-5 text-[#4285F4]" />
            </Button>
            <Button 
              type="button" 
              className="flex items-center justify-center w-12 h-12 rounded-full border border-gray-300 bg-white"
              variant="outline"
              disabled={isLoading}
            >
              <FaFacebook className="w-5 h-5 text-[#1877F2]" />
            </Button>
            <Button 
              type="button" 
              className="flex items-center justify-center w-12 h-12 rounded-full border border-gray-300 bg-white"
              variant="outline"
              disabled={isLoading}
            >
              <FaApple className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
