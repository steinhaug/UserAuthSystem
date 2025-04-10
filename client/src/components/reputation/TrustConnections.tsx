import React, { useState } from 'react';
import { User, TrustConnection } from '@shared/schema';
import { 
  UserCheck, 
  UserPlus, 
  Shield, 
  Users, 
  Handshake, 
  Link, 
  Search,
  User as UserIcon,
  ChevronRight,
  Trash2,
  PencilLine
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface TrustConnectionsProps {
  currentUserId: string;
  trustedUsers: Array<TrustConnection & { user: User }>;
  trustedByUsers: Array<TrustConnection & { user: User }>;
  onAddTrust?: (userId: string, level: number, notes?: string) => Promise<void>;
  onUpdateTrust?: (userId: string, level: number, notes?: string) => Promise<void>;
  onRemoveTrust?: (userId: string) => Promise<void>;
  searchUsers?: (query: string) => Promise<User[]>;
  className?: string;
}

export function TrustConnections({
  currentUserId,
  trustedUsers,
  trustedByUsers,
  onAddTrust,
  onUpdateTrust,
  onRemoveTrust,
  searchUsers,
  className,
}: TrustConnectionsProps) {
  const { toast } = useToast();
  const [addTrustDialogOpen, setAddTrustDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [trustLevel, setTrustLevel] = useState(1);
  const [trustNotes, setTrustNotes] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !searchUsers) return;
    
    try {
      setIsSearching(true);
      const results = await searchUsers(searchQuery);
      // Filter out current user
      const filteredResults = results.filter(user => user.firebaseId !== currentUserId);
      // Filter out already trusted users
      const notTrustedYet = filteredResults.filter(
        user => !trustedUsers.some(trust => trust.trustedId === user.firebaseId)
      );
      setSearchResults(notTrustedYet);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Søk feilet',
        description: 'Kunne ikke søke etter brukere',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTrust = async () => {
    if (!selectedUser || !onAddTrust) return;
    
    try {
      setIsSubmitting(true);
      await onAddTrust(selectedUser.firebaseId, trustLevel, trustNotes);
      setAddTrustDialogOpen(false);
      setSelectedUser(null);
      setTrustLevel(1);
      setTrustNotes('');
      setSearchQuery('');
      setSearchResults([]);
      
      toast({
        title: 'Tillit lagt til',
        description: `Du stoler nå på ${selectedUser.displayName}`,
      });
    } catch (error) {
      console.error('Error adding trust:', error);
      toast({
        title: 'Kunne ikke legge til tillit',
        description: 'Det oppstod en feil ved tillegging av tillit',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTrust = async (userId: string, level: number, notes?: string) => {
    if (!onUpdateTrust) return;
    
    try {
      await onUpdateTrust(userId, level, notes);
      toast({
        title: 'Tillit oppdatert',
        description: 'Ditt tillitsnivå har blitt oppdatert',
      });
    } catch (error) {
      console.error('Error updating trust:', error);
      toast({
        title: 'Kunne ikke oppdatere tillit',
        description: 'Det oppstod en feil ved oppdatering av tillit',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveTrust = async (userId: string) => {
    if (!onRemoveTrust) return;
    
    try {
      await onRemoveTrust(userId);
      toast({
        title: 'Tillit fjernet',
        description: 'Du stoler ikke lenger på denne brukeren',
      });
    } catch (error) {
      console.error('Error removing trust:', error);
      toast({
        title: 'Kunne ikke fjerne tillit',
        description: 'Det oppstod en feil ved fjerning av tillit',
        variant: 'destructive',
      });
    }
  };

  const getTrustLevelLabel = (level: number) => {
    switch (level) {
      case 1: return 'Lavt nivå';
      case 2: return 'Middels nivå';
      case 3: return 'Høyt nivå';
      default: return 'Ukjent nivå';
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Tillitsnettverk</CardTitle>
            <CardDescription>Personer du stoler på og som stoler på deg</CardDescription>
          </div>
          <Dialog open={addTrustDialogOpen} onOpenChange={setAddTrustDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-1">
                <UserPlus className="h-4 w-4" />
                <span>Legg til</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Legg til tillitsrelasjon</DialogTitle>
                <DialogDescription>
                  Søk etter en person du stoler på og angi tillitsnivå.
                </DialogDescription>
              </DialogHeader>
              
              {selectedUser ? (
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedUser.photoURL || undefined} alt={selectedUser.displayName} />
                      <AvatarFallback>{selectedUser.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedUser.displayName}</p>
                      <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-auto"
                      onClick={() => setSelectedUser(null)}
                    >
                      Endre
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tillitsnivå</label>
                    <Select value={String(trustLevel)} onValueChange={(value) => setTrustLevel(Number(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Velg tillitsnivå" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Lavt nivå - Kjenner personen</SelectItem>
                        <SelectItem value="2">Middels nivå - Har møtt flere ganger</SelectItem>
                        <SelectItem value="3">Høyt nivå - Nær venn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notater (valgfritt)</label>
                    <Textarea 
                      placeholder="Legg til notater om denne tillitsrelasjonen"
                      value={trustNotes}
                      onChange={(e) => setTrustNotes(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Søk etter bruker..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button 
                      size="sm"
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {isSearching ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Søker...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {searchResults.map(user => (
                        <div 
                          key={user.firebaseId}
                          className="flex items-center gap-3 p-2 border rounded-md hover:bg-accent hover:cursor-pointer"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Avatar>
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName} />
                            <AvatarFallback>{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.displayName}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  ) : searchQuery && !isSearching ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Ingen brukere funnet
                    </div>
                  ) : null}
                </div>
              )}
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setAddTrustDialogOpen(false);
                    setSelectedUser(null);
                    setTrustLevel(1);
                    setTrustNotes('');
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  Avbryt
                </Button>
                {selectedUser && (
                  <Button onClick={handleAddTrust} disabled={isSubmitting}>
                    {isSubmitting ? 'Lagrer...' : 'Legg til tillit'}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="trusted" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trusted" className="flex items-center gap-1">
              <UserCheck className="h-4 w-4" />
              <span>Du stoler på ({trustedUsers.length})</span>
            </TabsTrigger>
            <TabsTrigger value="trustedBy" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span>Stoler på deg ({trustedByUsers.length})</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="trusted" className="space-y-4 mt-4">
            {trustedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Du har ikke lagt til noen du stoler på ennå</p>
                <Button 
                  variant="outline"
                  className="mt-4"
                  onClick={() => setAddTrustDialogOpen(true)}
                >
                  Legg til tillitsrelasjon
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {trustedUsers.map((trust) => (
                  <div 
                    key={trust.id}
                    className="flex items-center gap-3 p-3 border rounded-md"
                  >
                    <Avatar>
                      <AvatarImage src={trust.user.photoURL || undefined} alt={trust.user.displayName} />
                      <AvatarFallback>{trust.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{trust.user.displayName}</p>
                      <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <div className="flex items-center">
                          <Handshake className="h-3 w-3 mr-1" />
                          <span>{getTrustLevelLabel(trust.level)}</span>
                        </div>
                        {trust.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px] sm:max-w-[200px]">
                              {trust.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <TrustActionMenu 
                      trust={trust}
                      onUpdate={handleUpdateTrust}
                      onRemove={handleRemoveTrust}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trustedBy" className="space-y-4 mt-4">
            {trustedByUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Ingen stoler på deg ennå</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trustedByUsers.map((trust) => (
                  <div 
                    key={trust.id}
                    className="flex items-center gap-3 p-3 border rounded-md"
                  >
                    <Avatar>
                      <AvatarImage src={trust.user.photoURL || undefined} alt={trust.user.displayName} />
                      <AvatarFallback>{trust.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{trust.user.displayName}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Handshake className="h-3 w-3 mr-1" />
                        <span>{getTrustLevelLabel(trust.level)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between text-xs text-muted-foreground border-t pt-4">
        <div className="flex items-center">
          <Link className="h-4 w-4 mr-1" />
          <span>{trustedUsers.length + trustedByUsers.length} tillitsrelasjoner totalt</span>
        </div>
        <div>
          <span>Oppdatert nettverk</span>
        </div>
      </CardFooter>
    </Card>
  );
}

interface TrustActionMenuProps {
  trust: TrustConnection & { user: User };
  onUpdate?: (userId: string, level: number, notes?: string) => Promise<void>;
  onRemove?: (userId: string) => Promise<void>;
}

function TrustActionMenu({ trust, onUpdate, onRemove }: TrustActionMenuProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [trustLevel, setTrustLevel] = useState(trust.level);
  const [trustNotes, setTrustNotes] = useState(trust.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleUpdate = async () => {
    if (!onUpdate) return;
    
    try {
      setIsSubmitting(true);
      await onUpdate(trust.trustedId, trustLevel, trustNotes);
      setIsEditDialogOpen(false);
      toast({
        title: 'Tillit oppdatert',
        description: `Tillitsnivå for ${trust.user.displayName} er oppdatert`,
      });
    } catch (error) {
      console.error('Error updating trust:', error);
      toast({
        title: 'Kunne ikke oppdatere tillit',
        description: 'Det oppstod en feil ved oppdatering av tillit',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Administrer tillit</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
            <PencilLine className="h-4 w-4 mr-2" />
            Rediger tillit
          </DropdownMenuItem>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                <span className="text-destructive">Fjern tillit</span>
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Fjern tillit?</AlertDialogTitle>
                <AlertDialogDescription>
                  Er du sikker på at du vil fjerne tilliten din til {trust.user.displayName}?
                  Dette kan ikke angres.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onRemove && onRemove(trust.trustedId)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Fjern
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rediger tillitsrelasjon</DialogTitle>
            <DialogDescription>
              Oppdater tillitsnivå og notater for {trust.user.displayName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={trust.user.photoURL || undefined} alt={trust.user.displayName} />
                <AvatarFallback>{trust.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{trust.user.displayName}</p>
                <p className="text-sm text-muted-foreground">@{trust.user.username}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tillitsnivå</label>
              <Select 
                value={String(trustLevel)} 
                onValueChange={(value) => setTrustLevel(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg tillitsnivå" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Lavt nivå - Kjenner personen</SelectItem>
                  <SelectItem value="2">Middels nivå - Har møtt flere ganger</SelectItem>
                  <SelectItem value="3">Høyt nivå - Nær venn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Notater (valgfritt)</label>
              <Textarea 
                placeholder="Legg til notater om denne tillitsrelasjonen"
                value={trustNotes}
                onChange={(e) => setTrustNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                setTrustLevel(trust.level);
                setTrustNotes(trust.notes || '');
              }}
            >
              Avbryt
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? 'Lagrer...' : 'Oppdater'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}