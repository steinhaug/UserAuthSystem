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
      path: '/recommendations', 
      label: 'For You', 
      icon: ({ className }: { className?: string }) => (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
      )
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
            {typeof Icon === 'function' ? (
              <div className="h-6 w-6 flex items-center justify-center">
                <Icon className="h-6 w-6" />
              </div>
            ) : (
              <div className="h-6 w-6 flex items-center justify-center">
                {/* @ts-ignore - known issue with lucide-react type definitions */}
                <Icon className="h-6 w-6" />
              </div>
            )}
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
