import React, { useState, useEffect } from 'react';
import './App.css';
import WalletContextProvider from './contexts/WalletContextProvider';
import ProgramContextProvider from './contexts/ProgramContextProvider';
import WalletButton from './components/WalletButton';
import CreatePaymentRequest from './components/CreatePaymentRequest';
import PaymentRequestDetails from './components/PaymentRequestDetails';
import { useWallet } from '@solana/wallet-adapter-react';

function AppContent() {
  const { publicKey } = useWallet();
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    setWalletConnected(!!publicKey);
  }, [publicKey]);

  return (
    <div className="App">
      <header className="App-header">
        <div className="app-title">
          <h1>Payment Splitter <span className="network-badge">Devnet</span></h1>
        </div>
        <WalletButton />
      </header>

      <div className="app-description">
        <p>Cette application vous permet de créer et gérer des demandes de paiement sur le réseau Solana Devnet.</p>
        {!walletConnected && (
          <div className="wallet-notice">
            Connectez votre portefeuille pour interagir avec l'application. Si vous n'avez pas de SOL sur le Devnet, 
            <a href="https://solfaucet.com/" target="_blank" rel="noopener noreferrer"> obtenez des SOL de test ici</a>.
          </div>
        )}
      </div>

      <main className="content">
        <CreatePaymentRequest />
        <PaymentRequestDetails />
      </main>
    </div>
  );
}

function App() {
  return (
    <WalletContextProvider>
      <ProgramContextProvider>
        <AppContent />
      </ProgramContextProvider>
    </WalletContextProvider>
  );
}

export default App;
