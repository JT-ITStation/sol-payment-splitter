import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useProgram, PaymentRequest, LAMPORTS_PER_SOL } from '../contexts/ProgramContextProvider';

const PaymentRequestDetails: FC = () => {
  const [address, setAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [operationResult, setOperationResult] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    signature?: string;
  }>({ type: null, message: '' });

  const { publicKey } = useWallet();
  const { getPaymentRequest, contributeToPayment, claimFunds } = useProgram();

  const fetchPaymentRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!address.trim()) {
      setError('Veuillez entrer une adresse de demande de paiement');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setPaymentRequest(null);
      
      // Parse the address
      const paymentRequestPDA = new PublicKey(address.trim());
      
      // Fetch the account
      const account = await getPaymentRequest(paymentRequestPDA);
      
      if (!account) {
        throw new Error('Demande de paiement introuvable. Vérifiez l\'adresse.');
      }
      
      setPaymentRequest(account);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error);
      setError(`Erreur: ${error instanceof Error ? error.message : 'Une erreur est survenue'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      setOperationResult({ 
        type: 'error', 
        message: 'Veuillez connecter votre portefeuille d\'abord' 
      });
      return;
    }
    
    if (!address.trim() || !paymentRequest) {
      setOperationResult({ 
        type: 'error', 
        message: 'Veuillez d\'abord consulter une demande de paiement valide' 
      });
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setOperationResult({ 
        type: 'error', 
        message: 'Veuillez entrer un montant valide' 
      });
      return;
    }
    
    try {
      setLoading(true);
      setOperationResult({ type: null, message: '' });
      
      // Convert amount to number
      const amountNum = parseFloat(amount);
      
      // Send the transaction
      const signature = await contributeToPayment(new PublicKey(address), amountNum);
      
      if (signature) {
        setOperationResult({
          type: 'success',
          message: 'Contribution effectuée avec succès!',
          signature
        });
        
        // Clear amount
        setAmount('');
        
        // Refresh payment request
        await fetchPaymentRequest();
      } else {
        throw new Error('La transaction a échoué');
      }
    } catch (error) {
      console.error('Erreur lors de la contribution:', error);
      setOperationResult({
        type: 'error',
        message: `Erreur: ${error instanceof Error ? error.message : 'Une erreur est survenue'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!publicKey) {
      setOperationResult({ 
        type: 'error', 
        message: 'Veuillez connecter votre portefeuille d\'abord' 
      });
      return;
    }
    
    if (!address.trim() || !paymentRequest) {
      setOperationResult({ 
        type: 'error', 
        message: 'Veuillez d\'abord consulter une demande de paiement valide' 
      });
      return;
    }
    
    try {
      setLoading(true);
      setOperationResult({ type: null, message: '' });
      
      // Send the transaction
      const signature = await claimFunds(new PublicKey(address));
      
      if (signature) {
        setOperationResult({
          type: 'success',
          message: 'Fonds réclamés avec succès!',
          signature
        });
        
        // Refresh payment request
        await fetchPaymentRequest();
      } else {
        throw new Error('La transaction a échoué');
      }
    } catch (error) {
      console.error('Erreur lors de la réclamation des fonds:', error);
      setOperationResult({
        type: 'error',
        message: `Erreur: ${error instanceof Error ? error.message : 'Une erreur est survenue'}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate progress
  const progressPercentage = paymentRequest
    ? (paymentRequest.currentAmount.toNumber() / paymentRequest.targetAmount.toNumber()) * 100
    : 0;

  // Check if user is the creator
  const isCreator = publicKey && paymentRequest 
    ? publicKey.toString() === paymentRequest.creator.toString() 
    : false;

  // Check if payment is completed
  const isCompleted = paymentRequest ? paymentRequest.isCompleted : false;

  return (
    <div className="card">
      <h2>Consulter/Contribuer à une demande</h2>
      
      <form onSubmit={fetchPaymentRequest}>
        <div className="form-group">
          <label htmlFor="payment-address">Adresse de la demande:</label>
          <input
            type="text"
            id="payment-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Entrez l'adresse du PDA"
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
        >
          {loading ? 'Chargement...' : 'Consulter'}
        </button>
      </form>
      
      {error && <div className="result error">{error}</div>}
      
      {paymentRequest && (
        <div className="payment-details">
          <h3>Détails de la demande</h3>
          
          <div className="payment-info">
            <p><strong>Créateur:</strong> {paymentRequest.creator.toString()}</p>
            <p><strong>Montant cible:</strong> {(paymentRequest.targetAmount.toNumber() / LAMPORTS_PER_SOL).toFixed(4)} SOL</p>
            <p><strong>Montant actuel:</strong> {(paymentRequest.currentAmount.toNumber() / LAMPORTS_PER_SOL).toFixed(4)} SOL</p>
            <p><strong>Description:</strong> {paymentRequest.description}</p>
            <p><strong>Statut:</strong> {isCompleted ? 'Complété' : 'En cours'}</p>
            
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${Math.min(100, progressPercentage)}%` }}
              ></div>
            </div>
            <p><strong>Progression:</strong> {Math.round(progressPercentage)}%</p>
          </div>
          
          {!isCompleted && (
            <div className="contribute-section">
              <h3>Contribuer</h3>
              <form onSubmit={handleContribute}>
                <div className="form-group">
                  <label htmlFor="contribution-amount">Montant (SOL):</label>
                  <input
                    type="number"
                    id="contribution-amount"
                    min="0.1"
                    step="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading || !publicKey}
                >
                  {loading ? 'Traitement...' : 'Contribuer'}
                </button>
              </form>
            </div>
          )}
          
          {isCreator && paymentRequest.currentAmount.toNumber() > 0 && (
            <div className="claim-section">
              <h3>Réclamer les fonds</h3>
              <button 
                onClick={handleClaim}
                disabled={loading || !publicKey}
              >
                {loading ? 'Traitement...' : 'Réclamer'}
              </button>
            </div>
          )}
        </div>
      )}
      
      {operationResult.type && (
        <div className={`result ${operationResult.type}`}>
          {operationResult.message}
          {operationResult.type === 'success' && operationResult.signature && (
            <p>
              Transaction: <a 
                href={`https://explorer.solana.com/tx/${operationResult.signature}?cluster=devnet`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {operationResult.signature.slice(0, 8)}...{operationResult.signature.slice(-8)}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentRequestDetails;
