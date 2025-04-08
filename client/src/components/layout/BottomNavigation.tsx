import { Link } from 'wouter';
import { 
  Home, 
  Users, 
  Calendar, 
  MessageSquare, 
  User,
  Award
} from 'lucide-react';

interface BottomNavigationProps {
  activePath: string;
}

export default function BottomNavigation({ activePath }: BottomNavigationProps) {
  // Navigation items
  const navItems = [
    { 
      path: '/map', 
      label: 'Map', 
      icon: Home 
    },
    { 
      path: '/nearby', 
      label: 'Nearby', 
      icon: Users 
    },
    { 
      path: '/activities', 
      label: 'Activities', 
      icon: Calendar 
    },
    { 
      path: '/chat', 
      label: 'Chat', 
      icon: MessageSquare 
    },
    {
      path: '/challenges', 
      label: 'Challenges', 
      icon: Award
    },
    { 
      path: '/profile', 
      label: 'Profile', 
      icon: User 
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 px-4 z-10">
      {navItems.map((item) => {
        const isActive = activePath === item.path || activePath.startsWith(`${item.path}/`);
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center py-1 ${
              isActive ? 'text-primary border-t-2 border-primary -mt-[2px]' : 'text-gray-600'
            }`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
