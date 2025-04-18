# Payment Splitter - Application React

Cette application React permet d'interagir avec le contrat Solana "Payment Splitter" déployé sur le réseau Devnet.

## Fonctionnalités

- Connexion avec un portefeuille Solana (Phantom, Solflare, etc.)
- Création de nouvelles demandes de paiement
- Consultation des détails d'une demande
- Contribution à une demande de paiement
- Réclamation des fonds (pour le créateur)

## Prérequis

- Node.js et npm installés
- Extension de portefeuille Solana (comme Phantom) installée dans votre navigateur
- SOL de test sur le réseau Devnet

## Installation

1. Installez les dépendances:

```bash
cd app
npm install
```

2. Lancez l'application en mode développement:

```bash
npm start
```

3. Ouvrez votre navigateur à l'adresse [http://localhost:3000](http://localhost:3000)

## Technologies utilisées

- React avec TypeScript
- @solana/web3.js - Bibliothèque officielle Solana pour interagir avec la blockchain
- @coral-xyz/anchor - Framework pour faciliter le développement d'applications sur Solana
- @solana/wallet-adapter - Bibliothèque pour intégrer facilement les portefeuilles Solana

## Structure du projet

- `src/components/` - Composants React de l'application
- `src/contexts/` - Contextes React pour le wallet et le programme Anchor
- `src/idl/` - IDL (Interface Description Language) du programme Solana

## Utilisation

1. **Connecter votre portefeuille**:
   - Cliquez sur le bouton "Connect Wallet" dans l'en-tête
   - Sélectionnez votre portefeuille Solana
   - Assurez-vous d'être sur le réseau Devnet

2. **Créer une demande de paiement**:
   - Remplissez le formulaire avec un montant cible et une description
   - Cliquez sur "Créer la demande"
   - Une adresse PDA (Program Derived Address) sera générée et affichée

3. **Consulter une demande de paiement**:
   - Entrez l'adresse PDA dans le formulaire "Consulter/Contribuer"
   - Cliquez sur "Consulter" pour voir les détails de la demande

4. **Contribuer à une demande**:
   - Après avoir consulté une demande, entrez le montant de votre contribution
   - Cliquez sur "Contribuer" pour envoyer des SOL à la demande

5. **Réclamer les fonds**:
   - Si vous êtes le créateur d'une demande, vous verrez un bouton "Réclamer"
   - Cliquez sur ce bouton pour transférer les fonds vers votre portefeuille

## Notes

- Cette application utilise le réseau Devnet de Solana, pas le réseau principal
- Vous aurez besoin de SOL de test, obtenables sur [Solana Faucet](https://solfaucet.com/)
- L'adresse du programme sur Devnet est: `77se4gcMSK7iKPFf9GFjrWDiqMqNhD55xHuvc8Bu3Ajm`
