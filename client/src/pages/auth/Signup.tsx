import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signupWithEmail, updateUserProfile } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { DEVELOPMENT_MODE } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<string>('Checking...');
  
  // Display the current authentication mode
  useEffect(() => {
    if (DEVELOPMENT_MODE) {
      setAuthMode('Mock Authentication (Development Mode)');
    } else {
      setAuthMode('Real Firebase Authentication');
    }
  }, []);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      // Mask email for privacy in logs
      const maskedEmail = data.email.replace(/^(.{2})(.*)@(.{2})(.*)$/, '$1***@$3***');
      console.log('Attempting signup with email:', maskedEmail);
      
      // Check if we're in development mode
      if (DEVELOPMENT_MODE) {
        console.log('Using development mode for signup - setting mock user');
        
        // For development mode, create a personalized mock user with the entered data
        const mockUserData = {
          displayName: data.name,
          email: data.email,
          // Create a unique-ish ID for the mock user in dev mode
          firebaseId: `dev-${Date.now().toString(36)}`
        };
        
        // Store the mock user data in localStorage for simulated persistence
        localStorage.setItem('devModeLoggedIn', 'true');
        localStorage.setItem('devUserData', JSON.stringify(mockUserData));
        
        // Show success message
        toast({
          title: 'Development mode signup',
          description: `Account created for ${data.name} in development mode`,
          variant: 'default',
        });
        
        // Short delay to simulate authentication process
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Force page reload to ensure AuthContext picks up the new user
        window.location.href = '/map';
        return;
      }
      
      // --- PRODUCTION MODE SIGNUP ---
      
      // Create user with email and password
      const userCredential = await signupWithEmail(data.email, data.password);
      
      // Update user profile with display name
      await updateUserProfile(data.name);
      
      toast({
        title: 'Account created',
        description: 'Your account has been created successfully!',
        variant: 'default',
      });
      
      // Redirect to map view
      setLocation('/map');
    } catch (error: any) {
      console.error("Signup error:", error);
      
      let errorMessage = 'There was an error creating your account';
      
      // Handle specific Firebase error codes for better user feedback
      if (error.code === 'auth/invalid-api-key') {
        errorMessage = 'Firebase API key is invalid. Please contact the administrator.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use. Please try logging in.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format. Please check your email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.code === 'auth/app-deleted' || error.code === 'auth/app-not-authorized') {
        errorMessage = 'Authentication service is not configured properly. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Signup failed',
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
          <Badge 
            variant={DEVELOPMENT_MODE ? "outline" : "default"}
            className={`py-1 px-3 ${
              DEVELOPMENT_MODE ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-green-100 text-green-800 hover:bg-green-100'
            }`}
          >
            {authMode}
          </Badge>
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel className="block text-gray-700 text-sm font-medium mb-2">Full Name</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="text" 
                  placeholder="John Doe" 
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
            <FormItem className="mb-4">
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
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem className="mb-6">
              <FormLabel className="block text-gray-700 text-sm font-medium mb-2">Confirm Password</FormLabel>
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
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-md"
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            By signing up, you agree to our <a href="#" className="text-primary">Terms</a> and <a href="#" className="text-primary">Privacy Policy</a>.
          </p>
        </div>
      </form>
    </Form>
  );
}
