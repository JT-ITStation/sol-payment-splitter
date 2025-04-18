import { FC, useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const WalletButton: FC = () => {
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  
  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const lamports = await connection.getBalance(publicKey);
        setBalance(lamports);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance(null);
      }
    };

    fetchBalance();
    // Set up an interval to refresh the balance every 30 seconds
    const intervalId = setInterval(fetchBalance, 30000);

    return () => clearInterval(intervalId);
  }, [publicKey, connection]);

  return (
    <div className="wallet-container">
      <WalletMultiButton />
      {publicKey && balance !== null && (
        <div className="wallet-info">
          <span className="wallet-address">
            {publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-4)}
          </span>
          <span className="wallet-balance">
            {(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL
          </span>
        </div>
      )}
    </div>
  );
};

export default WalletButton;
