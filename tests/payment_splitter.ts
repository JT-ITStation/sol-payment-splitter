import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PaymentSplitter } from "../target/types/payment_splitter";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

describe("payment_splitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.PaymentSplitter as Program<PaymentSplitter>;
  const provider = anchor.getProvider();

  // Constantes pour les tests
  const LAMPORTS_PER_SOL = 1_000_000_000;
  const TARGET_AMOUNT = new anchor.BN(2 * LAMPORTS_PER_SOL); // 2 SOL
  const CONTRIBUTION_AMOUNT = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL
  const DESCRIPTION = "Test payment request";

  // Définition des comptes utilisateur pour les tests
  const creator = anchor.web3.Keypair.generate();
  const contributor = anchor.web3.Keypair.generate();

  // PDA pour la demande de paiement
  let paymentRequestPDA;
  
  // Airdrop de SOL pour les tests
  before(async () => {
    // Airdrop SOL au créateur
    const creatorAirdrop = await provider.connection.requestAirdrop(
      creator.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(creatorAirdrop);
    
    // Airdrop SOL au contributeur
    const contributorAirdrop = await provider.connection.requestAirdrop(
      contributor.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(contributorAirdrop);
    
    // Dérivation du PDA pour la demande de paiement
    const [pda, _] = await anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_request"),
        creator.publicKey.toBuffer(),
        Buffer.from(DESCRIPTION)
      ],
      program.programId
    );
    paymentRequestPDA = pda;
  });

  // Test 1: Création d'une demande de paiement
  it("Crée une demande de paiement", async () => {
    const tx = await program.methods
      .createPaymentRequest(TARGET_AMOUNT, DESCRIPTION)
      .accounts({
        paymentRequest: paymentRequestPDA,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
    
    console.log("Transaction signature:", tx);
    
    // Vérification que la demande a été correctement créée
    const paymentRequestAccount = await program.account.paymentRequest.fetch(paymentRequestPDA);
    expect(paymentRequestAccount.creator.toString()).to.equal(creator.publicKey.toString());
    expect(paymentRequestAccount.targetAmount.toString()).to.equal(TARGET_AMOUNT.toString());
    expect(paymentRequestAccount.currentAmount.toString()).to.equal("0");
    expect(paymentRequestAccount.description).to.equal(DESCRIPTION);
    expect(paymentRequestAccount.isCompleted).to.be.false;
  });

  // Test 2: Contribution à une demande de paiement
  it("Contribue à une demande de paiement", async () => {
    const tx = await program.methods
      .contributePayment(CONTRIBUTION_AMOUNT)
      .accounts({
        paymentRequest: paymentRequestPDA,
        contributor: contributor.publicKey,
        creator: null,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([contributor])
      .rpc();
    
    console.log("Transaction signature:", tx);
    
    // Vérification que la contribution a été correctement prise en compte
    const paymentRequestAccount = await program.account.paymentRequest.fetch(paymentRequestPDA);
    expect(paymentRequestAccount.currentAmount.toString()).to.equal(CONTRIBUTION_AMOUNT.toString());
    expect(paymentRequestAccount.isCompleted).to.be.false;
  });

  // Test 3: Compléter une demande de paiement avec contribution finale
  it("Complète une demande de paiement avec une contribution finale", async () => {
    const balanceBeforeClaim = await provider.connection.getBalance(creator.publicKey);
    
    const tx = await program.methods
      .contributePayment(CONTRIBUTION_AMOUNT)
      .accounts({
        paymentRequest: paymentRequestPDA,
        contributor: contributor.publicKey,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([contributor, creator])
      .rpc();
    
    console.log("Transaction signature:", tx);
    
    // Vérification que la demande est complétée
    const paymentRequestAccount = await program.account.paymentRequest.fetch(paymentRequestPDA);
    expect(paymentRequestAccount.currentAmount.toString()).to.equal(TARGET_AMOUNT.toString());
    expect(paymentRequestAccount.isCompleted).to.be.true;
    
    // Vérification que les fonds ont été récupérés
    const balanceAfterClaim = await provider.connection.getBalance(creator.publicKey);
    expect(balanceAfterClaim).to.be.greaterThan(balanceBeforeClaim);
  });

  // Test 4: Réclamation de fonds manuellement
  it("Permet au créateur de réclamer les fonds partiellement", async () => {
    // Créer une nouvelle demande de paiement pour ce test
    const newDescription = "Test Claim"; // Description plus courte
    const [newPDA, _] = await anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_request"),
        creator.publicKey.toBuffer(),
        Buffer.from(newDescription)
      ],
      program.programId
    );
    
    // Créer la demande
    await program.methods
      .createPaymentRequest(TARGET_AMOUNT, newDescription)
      .accounts({
        paymentRequest: newPDA,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
    
    // Contribuer partiellement
    await program.methods
      .contributePayment(CONTRIBUTION_AMOUNT)
      .accounts({
        paymentRequest: newPDA,
        contributor: contributor.publicKey,
        creator: null,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([contributor])
      .rpc();
    
    // Mesurer le solde avant réclamation
    const balanceBeforeClaim = await provider.connection.getBalance(creator.publicKey);
    
    // Réclamer les fonds
    await program.methods
      .claimFunds()
      .accounts({
        paymentRequest: newPDA,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
    
    // Vérifier que les fonds ont été transférés
    const balanceAfterClaim = await provider.connection.getBalance(creator.publicKey);
    expect(balanceAfterClaim).to.be.greaterThan(balanceBeforeClaim);
    
    // Vérifier que la demande n'est pas marquée comme complétée
    const paymentRequestAccount = await program.account.paymentRequest.fetch(newPDA);
    expect(paymentRequestAccount.isCompleted).to.be.false;
  });
});
