import { PrivyProvider } from '@privy-io/react-auth';
import React from 'react';

const Providers = ({ children }) => {
  return (
    <PrivyProvider
      // appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
      appId="clxjfwh3d005bcewwp6vvtfm6"
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#676FFF'
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
      onSuccess={(user) => console.log(`User ${user.id} logged in!`)}
    >
      {children}
    </PrivyProvider>
  );
};

export default Providers;
