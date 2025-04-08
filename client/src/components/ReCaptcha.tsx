import { useEffect, useRef, useState } from 'react';
import { DEVELOPMENT_MODE } from '@/lib/constants';

// reCAPTCHA site key - registered for comemingel.com
const SITE_KEY = '6LfB1w4rAAAAAE3jDWJtl0rETiW2j0MRS7yxPdFK';

interface ReCaptchaProps {
  onVerify: (token: string) => void;
}

declare global {
  interface Window {
    grecaptcha: any;
    onReCaptchaLoad: () => void;
  }
}

export default function ReCaptcha({ onVerify }: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // In development mode, just use a mock token for verification
    if (DEVELOPMENT_MODE) {
      console.log('Development mode: Skipping real reCAPTCHA');
      // Simulate verification with a fake token
      setTimeout(() => {
        onVerify('dev-mode-recaptcha-token');
      }, 500);
      return;
    }

    // Only load ReCaptcha in production mode
    try {
      // Add reCAPTCHA script if not already added
      if (!document.querySelector('script[src*="recaptcha"]')) {
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=explicit&onload=onReCaptchaLoad`;
        script.async = true;
        script.defer = true;
        
        // Define the callback for when reCAPTCHA is loaded
        window.onReCaptchaLoad = () => {
          try {
            if (containerRef.current && window.grecaptcha) {
              setLoaded(true);
              const widgetId = window.grecaptcha.render(containerRef.current, {
                sitekey: SITE_KEY,
                callback: onVerify,
                size: 'normal',
                theme: 'light',
              });
              widgetIdRef.current = widgetId;
            }
          } catch (err) {
            console.error('Error rendering reCAPTCHA:', err);
            setError('Failed to render reCAPTCHA. Please refresh the page.');
          }
        };
        
        document.body.appendChild(script);
      } else if (window.grecaptcha && containerRef.current && !widgetIdRef.current) {
        // If script is already loaded but widget not rendered
        try {
          setLoaded(true);
          const widgetId = window.grecaptcha.render(containerRef.current, {
            sitekey: SITE_KEY,
            callback: onVerify,
            size: 'normal',
            theme: 'light',
          });
          widgetIdRef.current = widgetId;
        } catch (err) {
          console.error('Error rendering reCAPTCHA:', err);
          setError('Failed to render reCAPTCHA. Please refresh the page.');
        }
      }
    } catch (err) {
      console.error('Error initializing reCAPTCHA:', err);
      setError('Failed to initialize reCAPTCHA. Please refresh the page.');
    }

    return () => {
      // Clean up script when component unmounts
      if (widgetIdRef.current !== null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch (err) {
          console.error('Error resetting reCAPTCHA:', err);
        }
      }
    };
  }, [onVerify]);

  if (DEVELOPMENT_MODE) {
    return (
      <div className="recaptcha-container mt-4 text-sm text-gray-500">
        reCAPTCHA verification bypassed in development mode
      </div>
    );
  }

  if (error) {
    return <div className="recaptcha-container mt-4 text-sm text-red-500">{error}</div>;
  }

  return <div ref={containerRef} className="recaptcha-container mt-4"></div>;
}