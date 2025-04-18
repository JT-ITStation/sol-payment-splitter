import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '../contexts/ProgramContextProvider';

const CreatePaymentRequest: FC = () => {
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    pda?: string;
    signature?: string;
  }>({ type: null, message: '' });

  const { publicKey } = useWallet();
  const { createPaymentRequest, findPaymentRequestPDA } = useProgram();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      setResult({ 
        type: 'error', 
        message: 'Veuillez connecter votre portefeuille d\'abord' 
      });
      return;
    }
    
    if (!targetAmount || !description) {
      setResult({ 
        type: 'error', 
        message: 'Veuillez remplir tous les champs' 
      });
      return;
    }
    
    try {
      setLoading(true);
      setResult({ type: null, message: '' });
      
      // Convert target amount to number
      const amountNum = parseFloat(targetAmount);
      
      // Find the PDA that will be created
      const [pda, _] = await findPaymentRequestPDA(publicKey, description);
      
      // Send the transaction
      const signature = await createPaymentRequest(description, amountNum);
      
      if (signature) {
        setResult({
          type: 'success',
          message: 'Demande de paiement créée avec succès!',
          pda: pda.toString(),
          signature
        });
        
        // Clear form
        setTargetAmount('');
        setDescription('');
      } else {
        throw new Error('La transaction a échoué');
      }
    } catch (error) {
      console.error('Erreur lors de la création de la demande:', error);
      setResult({
        type: 'error',
        message: `Erreur: ${error instanceof Error ? error.message : 'Une erreur est survenue'}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Show a temporary tooltip
        alert('Copié dans le presse-papier!');
      })
      .catch(err => {
        console.error('Erreur lors de la copie: ', err);
      });
  };

  return (
    <div className="card">
      <h2>Créer une demande de paiement</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="target-amount">Montant cible (SOL):</label>
          <input
            type="number"
            id="target-amount"
            min="0.1"
            step="0.1"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading || !publicKey}
        >
          {loading ? 'Création en cours...' : 'Créer la demande'}
        </button>
      </form>
      
      {result.type && (
        <div className={`result ${result.type}`}>
          {result.message}
          {result.type === 'success' && result.pda && (
            <div className="success-details">
              <p>
                Transaction: <a href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                  {result.signature?.slice(0, 8)}...{result.signature?.slice(-8)}
                </a>
              </p>
              <p>
                Adresse de la demande: <span 
                  className="copyable" 
                  onClick={() => result.pda && copyToClipboard(result.pda)}
                >
                  {result.pda} 📋
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatePaymentRequest;
