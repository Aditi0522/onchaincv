#!/usr/bin/env bash
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}ONCHAINCV — DEPLOY${NC}"
echo ""

echo -e "${YELLOW}[1/5] Setting up identity...${NC}"
stellar keys generate --global deployer --network testnet 2>/dev/null || true
stellar keys fund deployer --network testnet
DEPLOYER=$(stellar keys address deployer)
echo -e "${GREEN}✓ Deployer: ${DEPLOYER}${NC}"

echo -e "${YELLOW}[2/5] Building WASM...${NC}"
cd contract
cargo build --target wasm32-unknown-unknown --release
WASM="target/wasm32-unknown-unknown/release/onchaincv.wasm"
cd ..

echo -e "${YELLOW}[3/5] Uploading & Deploying...${NC}"
WASM_HASH=$(stellar contract upload --network testnet --source deployer --wasm contract/${WASM})
CONTRACT_ID=$(stellar contract deploy --network testnet --source deployer --wasm-hash ${WASM_HASH})
echo -e "${GREEN}✓ CONTRACT_ID: ${CONTRACT_ID}${NC}"

echo -e "${YELLOW}[4/5] Creating proof profile...${NC}"
stellar contract invoke \
  --network testnet --source deployer --id ${CONTRACT_ID} \
  -- set_profile \
  --owner ${DEPLOYER} \
  --name '"Satoshi Nakamoto"' \
  --headline '"Blockchain Engineer & Open-Source Builder"' \
  --website '"https://stellar.org"' 2>&1 || true

echo -e "${YELLOW}[5/5] Adding proof entry...${NC}"
TX_RESULT=$(stellar contract invoke \
  --network testnet --source deployer --id ${CONTRACT_ID} \
  -- add_entry \
  --owner ${DEPLOYER} \
  --title '"Senior Protocol Engineer"' \
  --company '"Stellar Development Foundation"' \
  --description '"Designed and implemented Soroban smart contract infrastructure."' \
  --from_year 2022 \
  --to_year 0 \
  --is_current true 2>&1)

TX_HASH=$(echo "$TX_RESULT" | grep -oP '[0-9a-f]{64}' | head -1)
echo -e "${GREEN}✓ Proof TX: ${TX_HASH}${NC}"

cat > frontend/.env << EOF
VITE_CONTRACT_ID=${CONTRACT_ID}
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
EOF

echo ""
echo -e "${CYAN}CONTRACT : ${CONTRACT_ID}${NC}"
echo -e "${CYAN}PROOF TX : ${TX_HASH}${NC}"
echo -e "${CYAN}EXPLORER : https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}${NC}"
echo ""
echo "Next: cd frontend && npm install && npm run dev"
