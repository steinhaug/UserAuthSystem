import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    // Add reCAPTCHA script if not already added
    if (!document.querySelector('script[src*="recaptcha"]')) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=explicit&onload=onReCaptchaLoad`;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      
      // Define the callback for when reCAPTCHA is loaded
      window.onReCaptchaLoad = () => {
        if (containerRef.current) {
          const widgetId = window.grecaptcha.render(containerRef.current, {
            sitekey: SITE_KEY,
            callback: onVerify,
            size: 'normal',
            theme: 'light',
          });
          widgetIdRef.current = widgetId;
        }
      };
    } else if (window.grecaptcha && containerRef.current) {
      // If script is already loaded
      if (widgetIdRef.current === null) {
        const widgetId = window.grecaptcha.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: onVerify,
          size: 'normal',
          theme: 'light',
        });
        widgetIdRef.current = widgetId;
      }
    }

    return () => {
      // Clean up script when component unmounts
      if (widgetIdRef.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
    };
  }, [onVerify]);

  return <div ref={containerRef} className="recaptcha-container mt-4"></div>;
}