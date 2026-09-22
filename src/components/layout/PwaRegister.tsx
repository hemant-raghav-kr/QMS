'use client';

import * as React from 'react';

export function PwaRegister() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('QMS ServiceWorker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('QMS ServiceWorker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
