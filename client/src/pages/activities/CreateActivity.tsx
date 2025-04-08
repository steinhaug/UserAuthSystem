import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Map, Calendar, Clock, Users } from 'lucide-react';
import { addDoc } from 'firebase/firestore';
import { activitiesCollection } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { ActivityCategory } from '@/types';

const createActivitySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(50, 'Title must be less than 50 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be less than 500 characters'),
  locationName: z.string().min(3, 'Location name must be at least 3 characters'),
  category: z.enum(['sports', 'social', 'food_drinks', 'games', 'other'] as const),
  startDate: z.string().refine(val => !!val, 'Start date is required'),
  startTime: z.string().refine(val => !!val, 'Start time is required'),
  durationHours: z.string().refine(val => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 0 && num <= 24;
  }, 'Duration must be between 0 and 24 hours'),
  durationMinutes: z.string().refine(val => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 0 && num <= 59;
  }, 'Duration must be between 0 and 59 minutes'),
  maxParticipants: z.string().refine(val => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 100;
  }, 'Max participants must be between 1 and 100')
});

type CreateActivityFormValues = z.infer<typeof createActivitySchema>;

export default function CreateActivity() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<CreateActivityFormValues>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: {
      title: '',
      description: '',
      locationName: '',
      category: 'social',
      startDate: new Date().toISOString().split('T')[0], // Today's date
      startTime: '12:00',
      durationHours: '1',
      durationMinutes: '0',
      maxParticipants: '10'
    }
  });

  const onSubmit = async (data: CreateActivityFormValues) => {
    if (!currentUser) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to create an activity',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert form data to timestamp
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      const startTime = startDateTime.getTime();
      
      // Calculate end time based on duration
      const durationMs = (parseInt(data.durationHours) * 60 * 60 * 1000) + 
                         (parseInt(data.durationMinutes) * 60 * 1000);
      const endTime = startTime + durationMs;
      
      // For now, use a default location until we implement real location picking
      const location = {
        latitude: 59.9139,
        longitude: 10.7522 // Oslo coordinates
      };
      
      // Create activity document
      await addDoc(activitiesCollection, {
        title: data.title,
        description: data.description,
        creatorId: currentUser.uid,
        location,
        locationName: data.locationName,
        category: data.category,
        startTime,
        endTime,
        maxParticipants: parseInt(data.maxParticipants),
        status: 'upcoming',
        createdAt: Date.now()
      });
      
      toast({
        title: 'Activity created',
        description: 'Your activity has been successfully created!',
      });
      
      // Redirect to activities page
      setLocation('/activities');
      
    } catch (error: any) {
      toast({
        title: 'Failed to create activity',
        description: error.message || 'There was an error creating your activity',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    setLocation('/activities');
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Button onClick={goBack} variant="ghost" className="p-0 mr-3">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold font-heading">Create Activity</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Give your activity a name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What's this activity about?" 
                      className="min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="food_drinks">Food & Drinks</SelectItem>
                      <SelectItem value="games">Games</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Location */}
          <div className="space-y-4">
            <div className="flex items-center mb-2">
              <Map className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Location</h2>
            </div>
            
            <FormField
              control={form.control}
              name="locationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Central Park Café" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="bg-gray-100 h-[150px] rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-sm">Map placeholder - pick location</p>
            </div>
          </div>
          
          {/* Date & Time */}
          <div className="space-y-4">
            <div className="flex items-center mb-2">
              <Calendar className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Date & Time</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-sm font-medium">Duration</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="durationHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutes</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="59" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          {/* Participants */}
          <div className="space-y-4">
            <div className="flex items-center mb-2">
              <Users className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Participants</h2>
            </div>
            
            <FormField
              control={form.control}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Participants</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-[#FF5252] to-[#FF1744] text-white py-3 px-4 rounded-lg font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Activity'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
