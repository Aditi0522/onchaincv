# OnChainCV

Your work history, permanently stored on the Stellar blockchain and cryptographically linked to your wallet address. No platform owns it. No one can edit or delete it. Paste any Stellar address to read their on-chain resume.

## Live Links

| | |
|---|---|
| **Frontend** | `https://onchaincv.vercel.app` |
| **Contract** | `https://stellar.expert/explorer/testnet/contract/CDAYPMP5AEWTKZGUKWA3DGT4VYK4OL5XCFAWRLNGAB767QDHDMTB46VW` |

## How It Works

1. Connect your Freighter wallet
2. Set a profile — name, headline, website
3. Add work entries — title, company, description, years
4. Each save is a signed Soroban transaction
5. Share your Stellar address — anyone can view your CV

## Why This Project Matters

This project turns a familiar real-world workflow into a verifiable on-chain primitive on Stellar: transparent state transitions, user-authenticated actions, and deterministic outcomes.

## Architecture

- **Smart Contract Layer**: Soroban contract enforces business rules, authorization, and state transitions.
- **Client Layer**: React + Vite frontend handles wallet UX, transaction composition, and real-time status views.
- **Wallet/Auth Layer**: Freighter signs every state-changing action so operations are attributable and non-repudiable.
- **Infra Layer**: Stellar Testnet + Soroban RPC for execution; Vercel for frontend hosting.
## Contract Functions

```rust
set_profile(owner, name, headline, website)
add_entry(owner, title, company, description, from_year, to_year, is_current) -> u32
remove_entry(owner, entry_id)
get_profile(owner) -> Option<Profile>
get_entries(owner) -> Vec<WorkEntry>
total_profiles() -> u32
```

## Stack

| Layer | Tech |
|---|---|
| Contract | Rust + Soroban SDK v22 |
| Network | Stellar Testnet |
| Frontend | React 18 + Vite |
| Wallet | Freighter v1.7.1 |
| Hosting | Vercel |

## Run Locally

```bash
chmod +x scripts/deploy.sh && ./scripts/deploy.sh
cd frontend && npm install && npm run dev
```


