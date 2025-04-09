import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useQueryClient } from "@tanstack/react-query";
import { useActivityPreferences, useUpdateActivityPreferences } from "@/hooks/use-activity-preferences";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define the category options
const categoryOptions = [
  { id: "sports", label: "Sport" },
  { id: "music", label: "Musikk" },
  { id: "food_drinks", label: "Mat og drikke" },
  { id: "culture", label: "Kultur" },
  { id: "games", label: "Spill" },
  { id: "education", label: "Utdanning" },
  { id: "networking", label: "Nettverk" },
  { id: "tech", label: "Teknologi" },
  { id: "outdoors", label: "Friluft" },
  { id: "social", label: "Sosialt" },
  { id: "other", label: "Annet" },
];

// Define the day of week options
const dayOfWeekOptions = [
  { id: 0, label: "Søndag" },
  { id: 1, label: "Mandag" },
  { id: 2, label: "Tirsdag" },
  { id: 3, label: "Onsdag" },
  { id: 4, label: "Torsdag" },
  { id: 5, label: "Fredag" },
  { id: 6, label: "Lørdag" },
];

// Define the time of day options
const timeOfDayOptions = [
  { id: "morning", label: "Morgen (6-12)" },
  { id: "afternoon", label: "Ettermiddag (12-18)" },
  { id: "evening", label: "Kveld (18-22)" },
  { id: "night", label: "Natt (22-6)" },
];

// Define the form schema with Zod
const formSchema = z.object({
  preferredCategories: z.array(z.string()).min(1, "Velg minst én kategori"),
  preferredDayOfWeek: z.array(z.number()).min(1, "Velg minst én dag"),
  preferredTimeOfDay: z.array(z.string()).min(1, "Velg minst ett tidspunkt"),
  preferredDistance: z.number().min(1).max(50),
});

type FormValues = z.infer<typeof formSchema>;

type ActivityPreferencesFormProps = {
  onSuccess?: () => void;
};

export function ActivityPreferencesForm({ onSuccess }: ActivityPreferencesFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the user's existing preferences
  const { data: preferences, isLoading } = useActivityPreferences();

  // Setup the form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      preferredCategories: [],
      preferredDayOfWeek: [],
      preferredTimeOfDay: [],
      preferredDistance: 10,
    },
  });

  // Update form values when preferences are loaded
  React.useEffect(() => {
    if (preferences) {
      form.reset({
        preferredCategories: preferences.preferredCategories || [],
        preferredDayOfWeek: preferences.preferredDayOfWeek || [],
        preferredTimeOfDay: preferences.preferredTimeOfDay || [],
        preferredDistance: preferences.preferredDistance || 10,
      });
    }
  }, [preferences, form]);

  // Mutation for updating preferences
  const { mutate, isPending } = useUpdateActivityPreferences();
  
  const onSubmit = (data: FormValues) => {
    mutate(data, {
      onSuccess: () => {
        toast({
          title: "Preferanser oppdatert",
          description: "Dine aktivitetspreferanser har blitt lagret.",
        });
        
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: any) => {
        toast({
          title: "Feil ved lagring",
          description: `Det oppstod en feil ved lagring av preferanser: ${error}`,
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivitetspreferanser</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="preferredCategories"
              render={() => (
                <FormItem>
                  <FormLabel>Foretrukne kategorier</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                    {categoryOptions.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name="preferredCategories"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={option.id}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, option.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== option.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredDayOfWeek"
              render={() => (
                <FormItem>
                  <FormLabel>Foretrukne dager</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    {dayOfWeekOptions.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name="preferredDayOfWeek"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={option.id}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, option.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== option.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredTimeOfDay"
              render={() => (
                <FormItem>
                  <FormLabel>Foretrukne tidspunkter</FormLabel>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {timeOfDayOptions.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name="preferredTimeOfDay"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={option.id}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, option.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== option.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredDistance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maksimal avstand (km): {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={50}
                      step={1}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Hvor langt er du villig til å reise for aktiviteter
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Lagrer...
                </>
              ) : (
                "Lagre preferanser"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}