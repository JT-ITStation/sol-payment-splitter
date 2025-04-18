import { FC, ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import BN from 'bn.js';

// Import the IDL (replace with your actual IDL)
import idl from '../idl/payment_splitter.json';

// Constants
const PROGRAM_ID = new PublicKey("77se4gcMSK7iKPFf9GFjrWDiqMqNhD55xHuvc8Bu3Ajm");
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Define interfaces for the program account types
export interface PaymentRequest {
  creator: PublicKey;
  targetAmount: BN;
  currentAmount: BN;
  description: string;
  isCompleted: boolean;
  bump: number;
}

// Define the program context interface
interface ProgramContextState {
  program: Program | null;
  isInitialized: boolean;
  loading: boolean;
  error: string | null;
  findPaymentRequestPDA: (creator: PublicKey, description: string) => Promise<[PublicKey, number]>;
  getPaymentRequest: (paymentRequestPDA: PublicKey) => Promise<PaymentRequest | null>;
  createPaymentRequest: (description: string, targetAmount: number) => Promise<string>;
  contributeToPayment: (paymentRequestPDA: PublicKey, amount: number) => Promise<string>;
  claimFunds: (paymentRequestPDA: PublicKey) => Promise<string>;
}

// Create the context
const ProgramContext = createContext<ProgramContextState>({
  program: null,
  isInitialized: false,
  loading: false,
  error: null,
  findPaymentRequestPDA: async () => [new PublicKey('11111111111111111111111111111111'), 0],
  getPaymentRequest: async () => null,
  createPaymentRequest: async () => '',
  contributeToPayment: async () => '',
  claimFunds: async () => '',
});

export const useProgram = () => useContext(ProgramContext);

interface ProgramContextProviderProps {
  children: ReactNode;
}

export const ProgramContextProvider: FC<ProgramContextProviderProps> = ({ children }) => {
  const [program, setProgram] = useState<Program | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  // Initialize the program when wallet is connected
  useEffect(() => {
    const initializeProgram = async () => {
      if (!wallet) {
        setProgram(null);
        setIsInitialized(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Create the provider
        const provider = new anchor.AnchorProvider(
          connection,
          wallet,
          { commitment: 'confirmed' }
        );

        // Create the program
        const program = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider);
        console.log('Program initialized successfully');
        
        setProgram(program);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing program:', error);
        setError('Failed to initialize program. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initializeProgram();
  }, [wallet, connection]);

  // Find Payment Request PDA
  const findPaymentRequestPDA = async (creator: PublicKey, description: string): Promise<[PublicKey, number]> => {
    try {
      return await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('payment_request'),
          creator.toBuffer(),
          Buffer.from(description)
        ],
        PROGRAM_ID
      );
    } catch (error) {
      console.error('Error finding PDA:', error);
      throw error;
    }
  };

  // Get Payment Request details
  const getPaymentRequest = async (paymentRequestPDA: PublicKey): Promise<PaymentRequest | null> => {
    if (!program) {
      setError('Program not initialized');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const account = await program.account.paymentRequest.fetch(paymentRequestPDA);
      return account as unknown as PaymentRequest;
    } catch (error) {
      console.error('Error fetching payment request:', error);
      setError('Failed to fetch payment request details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create a new Payment Request
  const createPaymentRequest = async (description: string, targetAmount: number): Promise<string> => {
    if (!program || !wallet?.publicKey) {
      setError('Program not initialized or wallet not connected');
      return '';
    }

    try {
      setLoading(true);
      setError(null);

      // Convert SOL to lamports
      const lamports = new BN(targetAmount * LAMPORTS_PER_SOL);
      
      // Find the PDA
      const [pda, _] = await findPaymentRequestPDA(wallet.publicKey, description);
      
      // Send the transaction
      const tx = await program.methods
        .createPaymentRequest(lamports, description)
        .accounts({
          paymentRequest: pda,
          creator: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      console.log('Payment request created:', tx);
      return tx;
    } catch (error) {
      console.error('Error creating payment request:', error);
      setError('Failed to create payment request. Please try again.');
      return '';
    } finally {
      setLoading(false);
    }
  };

  // Contribute to a Payment Request
  const contributeToPayment = async (paymentRequestPDA: PublicKey, amount: number): Promise<string> => {
    if (!program || !wallet?.publicKey) {
      setError('Program not initialized or wallet not connected');
      return '';
    }

    try {
      setLoading(true);
      setError(null);

      // Convert SOL to lamports
      const lamports = new BN(amount * LAMPORTS_PER_SOL);
      
      // Get the payment request to get the creator
      const paymentRequest = await getPaymentRequest(paymentRequestPDA);
      if (!paymentRequest) {
        throw new Error('Payment request not found');
      }
      
      // Send the transaction
      // Utiliser la même approche que dans les tests (creator: null)
      const tx = await program.methods
        .contributePayment(lamports)
        .accounts({
          paymentRequest: paymentRequestPDA,
          contributor: wallet.publicKey,
          creator: null as any,  // On force le type pour contourner l'erreur TypeScript
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      console.log('Contribution sent:', tx);
      return tx;
    } catch (error) {
      console.error('Error contributing to payment:', error);
      setError('Failed to contribute to payment. Please try again.');
      return '';
    } finally {
      setLoading(false);
    }
  };

  // Claim funds from a Payment Request
  const claimFunds = async (paymentRequestPDA: PublicKey): Promise<string> => {
    if (!program || !wallet?.publicKey) {
      setError('Program not initialized or wallet not connected');
      return '';
    }

    try {
      setLoading(true);
      setError(null);
      
      // Send the transaction
      const tx = await program.methods
        .claimFunds()
        .accounts({
          paymentRequest: paymentRequestPDA,
          creator: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      console.log('Funds claimed:', tx);
      return tx;
    } catch (error) {
      console.error('Error claiming funds:', error);
      setError('Failed to claim funds. Please try again.');
      return '';
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProgramContext.Provider
      value={{
        program,
        isInitialized,
        loading,
        error,
        findPaymentRequestPDA,
        getPaymentRequest,
        createPaymentRequest,
        contributeToPayment,
        claimFunds,
      }}
    >
      {children}
    </ProgramContext.Provider>
  );
};

export default ProgramContextProvider;
