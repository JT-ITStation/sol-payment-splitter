use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;

declare_id!("77se4gcMSK7iKPFf9GFjrWDiqMqNhD55xHuvc8Bu3Ajm");

#[program]
pub mod payment_splitter {
    use super::*;

    // Initialiser une nouvelle demande de paiement
    pub fn create_payment_request(
        ctx: Context<CreatePaymentRequest>, 
        target_amount: u64,
        description: String,
    ) -> Result<()> {
        let payment_request = &mut ctx.accounts.payment_request;
        let creator = &ctx.accounts.creator;
        
        payment_request.creator = creator.key();
        payment_request.target_amount = target_amount;
        payment_request.current_amount = 0;
        payment_request.description = description;
        payment_request.is_completed = false;
        payment_request.bump = ctx.bumps.payment_request;
        
        msg!("Demande de paiement créée avec montant cible: {} SOL", lamports_to_sol(target_amount));
        
        Ok(())
    }

    // Contribuer à une demande de paiement existante
    pub fn contribute_payment(
        ctx: Context<ContributePayment>, 
        amount: u64
    ) -> Result<()> {
        let payment_request = &mut ctx.accounts.payment_request;
        let contributor = &ctx.accounts.contributor;
        let system_program = &ctx.accounts.system_program;
        
        // Vérifier si la demande est déjà complétée
        require!(!payment_request.is_completed, PaymentSplitterError::PaymentRequestCompleted);
        
        // Transférer les SOL du contributeur vers le PDA
        invoke(
            &system_instruction::transfer(
                &contributor.key(),
                &payment_request.key(),
                amount,
            ),
            &[
                contributor.to_account_info(),
                payment_request.to_account_info(),
                system_program.to_account_info(),
            ],
        )?;
        
        // Mettre à jour le montant actuel
        payment_request.current_amount = payment_request.current_amount.checked_add(amount).unwrap();
        
        msg!("Contribution de {} SOL reçue", lamports_to_sol(amount));
        
        // Vérifier si le montant cible est atteint
        if payment_request.current_amount >= payment_request.target_amount {
            payment_request.is_completed = true;
            msg!("Montant cible atteint! La demande de paiement est maintenant complétée.");
            
            // Auto-claim: si le créateur est présent, effectuer la réclamation des fonds
            if let Some(creator) = &ctx.accounts.creator {
                if creator.is_signer && creator.key() == payment_request.creator {
                    let pda_starting_lamports = payment_request.to_account_info().lamports();
                    let rent = Rent::get()?;
                    let min_rent = rent.minimum_balance(payment_request.to_account_info().data_len());
                    let lamports_to_transfer = pda_starting_lamports.saturating_sub(min_rent);
                    
                    **payment_request.to_account_info().try_borrow_mut_lamports()? = 
                        payment_request.to_account_info().lamports().saturating_sub(lamports_to_transfer);
                        
                    **creator.try_borrow_mut_lamports()? = 
                        creator.lamports().checked_add(lamports_to_transfer).unwrap();
                        
                    msg!("Fonds de {} SOL transférés automatiquement au créateur", lamports_to_sol(lamports_to_transfer));
                }
            }
        }
        
        Ok(())
    }

    // Récupérer les fonds une fois le montant cible atteint
    pub fn claim_funds(ctx: Context<ClaimFunds>) -> Result<()> {
        let payment_request = &mut ctx.accounts.payment_request;
        
        // Vérifier si la demande est complétée ou si le créateur veut récupérer partiellement
        require!(
            payment_request.is_completed || 
            payment_request.creator.eq(&ctx.accounts.creator.key()),
            PaymentSplitterError::NotAuthorized
        );
        
        // Calculer le montant à transférer (en tenant compte des frais de location)
        let rent = Rent::get()?;
        let account_info = payment_request.to_account_info();
        let lamports_to_transfer = account_info.lamports().saturating_sub(
            rent.minimum_balance(account_info.data_len())
        );
        
        // Transférer les SOL du PDA vers le créateur
        **account_info.try_borrow_mut_lamports()? = account_info
            .lamports()
            .saturating_sub(lamports_to_transfer);
            
        **ctx.accounts.creator.try_borrow_mut_lamports()? = ctx
            .accounts.creator
            .lamports()
            .checked_add(lamports_to_transfer)
            .unwrap();
            
        msg!("Fonds de {} SOL récupérés par le créateur", lamports_to_sol(lamports_to_transfer));
        
        // Si toutes les conditions sont remplies, on peut fermer le compte
        if payment_request.is_completed {
            msg!("Demande de paiement close");
        }
        
        Ok(())
    }
}

// Helper function to convert lamports to SOL for logging
fn lamports_to_sol(lamports: u64) -> f64 {
    lamports as f64 / 1_000_000_000.0
}

#[derive(Accounts)]
#[instruction(target_amount: u64, description: String)]
pub struct CreatePaymentRequest<'info> {
    #[account(
        init,
        payer = creator,
        space = PaymentRequest::space(&description),
        seeds = [
            b"payment_request",
            creator.key().as_ref(),
            description.as_bytes()
        ],
        bump
    )]
    pub payment_request: Account<'info, PaymentRequest>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct ContributePayment<'info> {
    #[account(mut)]
    pub payment_request: Account<'info, PaymentRequest>,
    
    #[account(mut)]
    pub contributor: Signer<'info>,
    
    /// CHECK: Ce compte est optionnel et est vérifié dans la logique si utilisé
    #[account(mut)]
    pub creator: Option<Signer<'info>>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimFunds<'info> {
    #[account(
        mut,
        constraint = payment_request.creator == creator.key() @ PaymentSplitterError::NotAuthorized
    )]
    pub payment_request: Account<'info, PaymentRequest>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct PaymentRequest {
    pub creator: Pubkey,
    pub target_amount: u64,
    pub current_amount: u64,
    pub description: String,
    pub is_completed: bool,
    pub bump: u8,
}

impl PaymentRequest {
    fn space(description: &str) -> usize {
        8 +  // discriminator
        32 + // creator (Pubkey)
        8 +  // target_amount (u64)
        8 +  // current_amount (u64)
        4 + description.len() + // description (String)
        1 +  // is_completed (bool)
        1    // bump (u8)
    }
}

#[error_code]
pub enum PaymentSplitterError {
    #[msg("La demande de paiement est déjà complétée")]
    PaymentRequestCompleted,
    #[msg("Vous n'êtes pas autorisé à réclamer ces fonds")]
    NotAuthorized,
}
