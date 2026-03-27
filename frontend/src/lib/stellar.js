import * as StellarSdk from '@stellar/stellar-sdk'
import { isConnected, requestAccess, getAddress, signTransaction } from '@stellar/freighter-api'

const CONTRACT_ID = (import.meta.env.VITE_CONTRACT_ID || '').trim()
const NET         = (import.meta.env.VITE_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015').trim()
const RPC_URL     = (import.meta.env.VITE_SOROBAN_RPC_URL    || 'https://soroban-testnet.stellar.org').trim()
const DUMMY       = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'

export const rpc = new StellarSdk.rpc.Server(RPC_URL)

export async function connectWallet() {
  const { isConnected: connected } = await isConnected()
  if (!connected) throw new Error('Freighter not installed.')
  const { address, error } = await requestAccess()
  if (error) throw new Error(error)
  return address
}

async function sendTx(publicKey, op) {
  const account = await rpc.getAccount(publicKey)
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE, networkPassphrase: NET,
  }).addOperation(op).setTimeout(60).build()

  const sim = await rpc.simulateTransaction(tx)
  if (StellarSdk.rpc.Api.isSimulationError(sim)) throw new Error(sim.error)

  const prepared = StellarSdk.rpc.assembleTransaction(tx, sim).build()
  const result = await signTransaction(prepared.toXDR(), { networkPassphrase: NET })
  if (result.error) throw new Error(result.error)
  const signed = StellarSdk.TransactionBuilder.fromXDR(result.signedTxXdr, NET)
  const sent = await rpc.sendTransaction(signed)
  return pollTx(sent.hash)
}

async function pollTx(hash) {
  for (let i = 0; i < 30; i++) {
    const r = await rpc.getTransaction(hash)
    if (r.status === 'SUCCESS') return hash
    if (r.status === 'FAILED')  throw new Error('Transaction failed on-chain')
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Transaction timed out')
}

async function readContract(op) {
  const dummy = new StellarSdk.Account(DUMMY, '0')
  const tx = new StellarSdk.TransactionBuilder(dummy, {
    fee: StellarSdk.BASE_FEE, networkPassphrase: NET,
  }).addOperation(op).setTimeout(30).build()
  const sim = await rpc.simulateTransaction(tx)
  return StellarSdk.scValToNative(sim.result.retval)
}

const tc = () => new StellarSdk.Contract(CONTRACT_ID)

export async function setProfile(owner, name, headline, website) {
  return sendTx(owner, tc().call(
    'set_profile',
    StellarSdk.Address.fromString(owner).toScVal(),
    StellarSdk.xdr.ScVal.scvString(name),
    StellarSdk.xdr.ScVal.scvString(headline),
    StellarSdk.xdr.ScVal.scvString(website),
  ))
}

export async function addEntry(owner, title, company, description, fromYear, toYear, isCurrent) {
  return sendTx(owner, tc().call(
    'add_entry',
    StellarSdk.Address.fromString(owner).toScVal(),
    StellarSdk.xdr.ScVal.scvString(title),
    StellarSdk.xdr.ScVal.scvString(company),
    StellarSdk.xdr.ScVal.scvString(description),
    StellarSdk.xdr.ScVal.scvU32(fromYear),
    StellarSdk.xdr.ScVal.scvU32(isCurrent ? 0 : toYear),
    StellarSdk.xdr.ScVal.scvBool(isCurrent),
  ))
}

export async function removeEntry(owner, entryId) {
  return sendTx(owner, tc().call(
    'remove_entry',
    StellarSdk.Address.fromString(owner).toScVal(),
    StellarSdk.xdr.ScVal.scvU32(entryId),
  ))
}

export async function getProfile(owner) {
  try {
    return await readContract(tc().call(
      'get_profile',
      StellarSdk.Address.fromString(owner).toScVal(),
    ))
  } catch { return null }
}

export async function getEntries(owner) {
  try {
    const entries = await readContract(tc().call(
      'get_entries',
      StellarSdk.Address.fromString(owner).toScVal(),
    ))
    return Array.isArray(entries) ? entries : []
  } catch { return [] }
}

export async function getTotalProfiles() {
  try {
    return Number(await readContract(tc().call('total_profiles')))
  } catch { return 0 }
}

export const short = (a) => a ? `${a.toString().slice(0, 6)}…${a.toString().slice(-4)}` : '—'
export { CONTRACT_ID }


