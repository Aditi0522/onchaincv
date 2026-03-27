#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
gh repo create onchaincv --public \
  --description "OnChainCV — Wallet-verified work history on Stellar Soroban" \
  --source "${ROOT}" --remote origin --push
CONTRACT_ID=$(grep VITE_CONTRACT_ID "${ROOT}/frontend/.env" | cut -d= -f2)
USER=$(gh api user -q .login)
gh secret set VITE_CONTRACT_ID --body "$CONTRACT_ID" --repo "$USER/onchaincv"
cd "${ROOT}/frontend" && vercel --prod --yes
echo "✓ OnChainCV published!"
