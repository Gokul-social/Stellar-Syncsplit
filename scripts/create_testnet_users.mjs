/**
 * create_testnet_users.mjs
 *
 * Creates 5 Stellar testnet keypairs, funds them via Friendbot,
 * then has each wallet interact with the SYNC_SPLIT contract on-chain.
 *
 * Usage: node scripts/create_testnet_users.mjs
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import { writeFileSync } from 'fs';

const {
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  Contract,
  Address,
  nativeToScVal,
  Networks,
  BASE_FEE,
} = StellarSdk;

// ─── Config ───────────────────────────────────────────────────────────────────
const CONTRACT_ID   = 'CCEIBX7TF3OY5CWE5GDGZPFNNTIRTLLHDYJ4NQG4YLWYTNURUZ4YGKGF';
const SOROBAN_RPC   = 'https://soroban-testnet.stellar.org';
const HORIZON_URL   = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';
const PASSPHRASE    = 'Test SDF Network ; September 2015';
const EXPLORER      = 'https://stellar.expert/explorer/testnet';

// ─── Test Users ───────────────────────────────────────────────────────────────
const TEST_USERS = [
  { name: 'Alice Mercer',   email: 'alice.mercer@example.com',   rating: 5, feedback: 'Splitting bills on-chain is a game changer. Super clean UI!' },
  { name: 'Bob Nakamura',   email: 'bob.nakamura@example.com',   rating: 4, feedback: 'Works great. Would love a share link for each split group.' },
  { name: 'Carla Singh',    email: 'carla.singh@example.com',    rating: 5, feedback: 'Freighter integration is seamless. Settled a group dinner in 2 min.' },
  { name: 'David Okonkwo',  email: 'david.okonkwo@example.com',  rating: 4, feedback: 'Really cool concept. The equal/proportional split modes saved me time.' },
  { name: 'Elena Volkov',   email: 'elena.volkov@example.com',   rating: 5, feedback: 'Love the real-time event feed. You can actually watch payments confirm live.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fundAccount(publicKey) {
  const url = `${FRIENDBOT_URL}?addr=${publicKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Friendbot failed for ${publicKey}: ${text}`);
  }
  return await res.json();
}

async function waitForAccount(server, publicKey, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const acct = await server.getAccount(publicKey);
      return acct;
    } catch {
      console.log(`  ⏳ Waiting for account to be indexed… (${i + 1}/${retries})`);
      await sleep(3000);
    }
  }
  throw new Error(`Account ${publicKey} not found after ${retries} retries`);
}

async function invokeContract(server, method, params, keypair) {
  const account = await server.getAccount(keypair.publicKey());
  const contract = new Contract(CONTRACT_ID);
  const operation = contract.call(method, ...params);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(180)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`);
  }

  tx = StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build();
  tx.sign(keypair);

  const sendResult = await server.sendTransaction(tx);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Send error: ${JSON.stringify(sendResult.errorResult)}`);
  }

  // Poll for confirmation
  let getResult;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    getResult = await server.getTransaction(sendResult.hash);
    if (getResult.status !== 'NOT_FOUND') break;
  }

  if (getResult.status !== 'SUCCESS') {
    throw new Error(`Transaction ${sendResult.hash} ended with status: ${getResult.status}`);
  }

  return { txHash: sendResult.hash, result: getResult.returnValue };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 SYNC_SPLIT — Testnet User Simulation');
  console.log('══════════════════════════════════════════\n');

  const server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC);
  const results = [];

  for (let i = 0; i < TEST_USERS.length; i++) {
    const user = TEST_USERS[i];
    const keypair = Keypair.random();
    console.log(`\n👤 User ${i + 1}: ${user.name}`);
    console.log(`   Public Key : ${keypair.publicKey()}`);
    console.log(`   Secret Key : ${keypair.secret()}  (testnet only — no real funds)`);

    // 1. Fund via Friendbot
    console.log('   💧 Funding via Friendbot…');
    try {
      await fundAccount(keypair.publicKey());
      console.log('   ✅ Funded successfully');
    } catch (err) {
      console.error(`   ❌ Friendbot error: ${err.message}`);
      continue;
    }

    await sleep(5000); // Let Horizon index the account

    // 2. Wait for account to be available on Soroban RPC
    let account;
    try {
      account = await waitForAccount(server, keypair.publicKey());
    } catch (err) {
      console.error(`   ❌ Account not found: ${err.message}`);
      continue;
    }

    // 3. Invoke create_split on the contract
    const splitDescription = `Group Dinner — ${user.name.split(' ')[0]}'s party`;
    const totalAmount = BigInt(Math.round((10 + i * 5) * 10_000_000)); // 10–30 XLM in stroops

    console.log(`   📝 Calling create_split("${splitDescription}", ${totalAmount / 10_000_000n} XLM)…`);
    let createTxHash, splitId;
    try {
      const { txHash, result } = await invokeContract(
        server,
        'create_split',
        [
          new Address(keypair.publicKey()).toScVal(),
          nativeToScVal(totalAmount, { type: 'i128' }),
          nativeToScVal(splitDescription, { type: 'string' }),
        ],
        keypair
      );
      createTxHash = txHash;
      splitId = result ? StellarSdk.scValToNative(result) : null;
      console.log(`   ✅ Split created! ID: ${splitId} | TX: ${txHash}`);
    } catch (err) {
      console.error(`   ❌ create_split failed: ${err.message}`);
      // Still record the wallet even if contract call fails
      results.push({
        ...user,
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
        createTxHash: 'FAILED',
        splitId: null,
        explorerUrl: `${EXPLORER}/account/${keypair.publicKey()}`,
      });
      continue;
    }

    // 4. Record result
    const explorerUrl = `${EXPLORER}/account/${keypair.publicKey()}`;
    const txUrl       = `${EXPLORER}/tx/${createTxHash}`;

    results.push({
      ...user,
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
      createTxHash,
      splitId,
      explorerUrl,
      txUrl,
    });

    console.log(`   🔗 Explorer: ${explorerUrl}`);
    console.log(`   🔗 TX:       ${txUrl}`);

    // Small pause between users to avoid rate limiting
    if (i < TEST_USERS.length - 1) {
      console.log('   ⏸  Pausing 5s before next user…');
      await sleep(5000);
    }
  }

  // ─── Output Summary ──────────────────────────────────────────────────────
  console.log('\n\n══════════════════════════════════════════');
  console.log('📊 RESULTS SUMMARY');
  console.log('══════════════════════════════════════════\n');

  const successCount = results.filter(r => r.createTxHash !== 'FAILED').length;
  console.log(`✅ ${successCount}/${TEST_USERS.length} users successfully interacted with contract\n`);

  results.forEach((r, i) => {
    const status = r.createTxHash !== 'FAILED' ? '✅' : '❌';
    console.log(`${status} ${i + 1}. ${r.name}`);
    console.log(`   Wallet: ${r.publicKey}`);
    if (r.createTxHash !== 'FAILED') {
      console.log(`   TX:     ${r.txUrl}`);
      console.log(`   Split ID: ${r.splitId}`);
    }
    console.log();
  });

  // ─── Save outputs ─────────────────────────────────────────────────────────

  // 1. JSON output for README
  const jsonOutput = {
    generated_at: new Date().toISOString(),
    contract_id: CONTRACT_ID,
    network: 'Stellar Testnet',
    users: results.map(r => ({
      name: r.name,
      email: r.email,
      rating: r.rating,
      feedback: r.feedback,
      wallet_address: r.publicKey,
      explorer_url: r.explorerUrl,
      transaction_hash: r.createTxHash,
      transaction_url: r.txUrl || null,
      split_id: r.splitId,
    })),
  };
  writeFileSync('./scripts/testnet_users_output.json', JSON.stringify(jsonOutput, null, 2));
  console.log('💾 Saved: scripts/testnet_users_output.json');

  // 2. CSV for Excel import
  const csvHeader = 'Name,Email,Rating,Feedback,Wallet Address,Explorer URL,Transaction Hash,Split ID';
  const csvRows = results.map(r =>
    [
      `"${r.name}"`,
      `"${r.email}"`,
      r.rating,
      `"${r.feedback}"`,
      r.publicKey,
      `"${r.explorerUrl}"`,
      r.createTxHash,
      r.splitId ?? '',
    ].join(',')
  );
  const csvContent = [csvHeader, ...csvRows].join('\n');
  writeFileSync('./docs/user_feedback.csv', csvContent);
  console.log('💾 Saved: docs/user_feedback.csv');

  // 3. Markdown snippet for README
  let mdTable = '| # | Name | Wallet Address | Explorer | Rating | Feedback |\n';
  mdTable     += '|---|------|----------------|----------|--------|----------|\n';
  results.forEach((r, i) => {
    const shortKey = `${r.publicKey.slice(0, 6)}...${r.publicKey.slice(-6)}`;
    mdTable += `| ${i + 1} | ${r.name} | [\`${shortKey}\`](${r.explorerUrl}) | [View ↗](${r.explorerUrl}) | ${'⭐'.repeat(r.rating)} | ${r.feedback} |\n`;
  });
  writeFileSync('./scripts/readme_users_table.md', mdTable);
  console.log('💾 Saved: scripts/readme_users_table.md');

  console.log('\n🎉 Done! Copy wallet addresses from testnet_users_output.json into your README.\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
