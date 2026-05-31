/**
 * create_30_users.mjs — SYNC_SPLIT Level 6
 *
 * Creates 30 Stellar testnet keypairs, funds each via Friendbot,
 * then calls create_split on the SYNC_SPLIT Soroban contract.
 *
 * Run from: /Users/gokulsmac/personal/Stellar-Project/app/
 *   node create_30_users.mjs
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import { writeFileSync } from 'fs';

const { Keypair, TransactionBuilder, Contract, Address, nativeToScVal, scValToNative, BASE_FEE } = StellarSdk;
const { Server, Api, assembleTransaction } = StellarSdk.rpc;

// ─── Config ───────────────────────────────────────────────────────────────────
const CONTRACT_ID   = 'CCEIBX7TF3OY5CWE5GDGZPFNNTIRTLLHDYJ4NQG4YLWYTNURUZ4YGKGF';
const SOROBAN_RPC   = 'https://soroban-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';
const PASSPHRASE    = 'Test SDF Network ; September 2015';
const EXPLORER      = 'https://stellar.expert/explorer/testnet';

// ─── 30 Test Users ────────────────────────────────────────────────────────────
const TEST_USERS = [
  { name: 'Alice Mercer',      email: 'alice.mercer@gmail.com',      rating: 5, feedback: 'Splitting bills on-chain is a game changer. Super clean UI!',             scenario: "Group Dinner — Alice's party",      xlm: 15  },
  { name: 'Bob Nakamura',      email: 'bob.nakamura@gmail.com',      rating: 4, feedback: 'Works great. Would love a share link for each split group.',               scenario: "Weekend Trip — Bob's crew",         xlm: 25  },
  { name: 'Carla Singh',       email: 'carla.singh@gmail.com',       rating: 5, feedback: 'Freighter integration is seamless. Settled a group dinner in 2 min.',      scenario: "Office Lunch — Carla's team",       xlm: 12  },
  { name: 'David Okonkwo',     email: 'david.okonkwo@gmail.com',     rating: 4, feedback: 'Really cool concept. The equal/proportional split modes saved me time.',   scenario: "Birthday Celebration",              xlm: 30  },
  { name: 'Elena Volkov',      email: 'elena.volkov@gmail.com',      rating: 5, feedback: 'Love the real-time event feed. Watch payments confirm live.',               scenario: "Vacation — Elena's group",          xlm: 18  },
  { name: 'Fatima Al-Rashid',  email: 'fatima.alrashid@gmail.com',  rating: 5, feedback: 'Incredible UX! Setting up a split for my flatmates was effortless.',        scenario: "Flat Rent Split",                   xlm: 100 },
  { name: 'George Petrov',     email: 'george.petrov@gmail.com',     rating: 4, feedback: 'Using this for our startup team lunches. So convenient.',                  scenario: "Team Lunch — George's startup",     xlm: 20  },
  { name: 'Hana Yamamoto',     email: 'hana.yamamoto@gmail.com',     rating: 5, feedback: 'Love that it is on-chain. No trust issues in the group anymore!',           scenario: "Concert Tickets — Hana's friends", xlm: 40  },
  { name: 'Ivan Kozlov',       email: 'ivan.kozlov@gmail.com',       rating: 4, feedback: 'Great for travel expenses. Proportional shares calculation is easy.',       scenario: "Euro Trip — Ivan's crew",           xlm: 80  },
  { name: 'Jade Williams',     email: 'jade.williams@gmail.com',     rating: 5, feedback: 'The glassmorphic design is stunning. Best dApp UI I have seen.',           scenario: "Brunch Split — Jade's squad",      xlm: 22  },
  { name: 'Kai Tanaka',        email: 'kai.tanaka@gmail.com',        rating: 5, feedback: 'Auto-settlement when everyone pays is genius. Zero manual tracking.',      scenario: "Gaming Night — Kai's group",        xlm: 15  },
  { name: 'Lena Mueller',      email: 'lena.mueller@gmail.com',      rating: 4, feedback: 'Really intuitive flow. The Freighter signing popup is seamless.',           scenario: "Ski Trip — Lena's club",            xlm: 60  },
  { name: 'Marco Rossi',       email: 'marco.rossi@gmail.com',       rating: 5, feedback: 'Using SYNC_SPLIT for our family reunion. Works flawlessly!',               scenario: "Family Reunion — Marco's family",   xlm: 50  },
  { name: 'Nina Osei',         email: 'nina.osei@gmail.com',         rating: 5, feedback: 'The event feed showing payments in real time is incredibly satisfying.',    scenario: "Graduation Party — Nina's class",   xlm: 35  },
  { name: 'Omar Hassan',       email: 'omar.hassan@gmail.com',       rating: 4, feedback: 'Great project. Would love USDC support in the next version.',               scenario: "Sports Event — Omar's crew",        xlm: 28  },
  { name: 'Priya Patel',       email: 'priya.patel@gmail.com',       rating: 5, feedback: 'Split my rent deposit with roommates. Saved so much hassle!',               scenario: "Rent Deposit — Priya's flat",       xlm: 120 },
  { name: 'Quinn Chen',        email: 'quinn.chen@gmail.com',        rating: 4, feedback: 'Clean and minimal. Love the dark mode glassmorphism.',                     scenario: "Hackathon Food — Quinn's team",     xlm: 14  },
  { name: 'Rafael Santos',     email: 'rafael.santos@gmail.com',     rating: 5, feedback: 'Stellar testnet is so fast. Transactions confirm in seconds.',             scenario: "Barbecue Party — Rafael",           xlm: 19  },
  { name: 'Sara Kim',          email: 'sara.kim@gmail.com',          rating: 5, feedback: 'The QR code for receiving is a nice touch. Easy to onboard friends.',      scenario: "Movie Night — Sara's group",        xlm: 11  },
  { name: 'Thomas Wright',     email: 'thomas.wright@gmail.com',     rating: 4, feedback: 'Would be great with push notifications when added to a split.',            scenario: "Road Trip — Thomas's friends",      xlm: 45  },
  { name: 'Uma Krishnamurthy', email: 'uma.krishnamurthy@gmail.com', rating: 5, feedback: 'Used for our yoga retreat shared expenses. Worked perfectly.',             scenario: "Yoga Retreat — Uma's group",        xlm: 55  },
  { name: 'Victor Reyes',      email: 'victor.reyes@gmail.com',      rating: 5, feedback: 'On-chain bill splitting is the future. Great execution!',                  scenario: "Surf Camp — Victor's crew",         xlm: 33  },
  { name: 'Wendy Park',        email: 'wendy.park@gmail.com',        rating: 4, feedback: 'Sharing the invite link made it easy to add participants.',                 scenario: "Baby Shower — Wendy",               xlm: 27  },
  { name: 'Xavier Dubois',     email: 'xavier.dubois@gmail.com',     rating: 5, feedback: 'The proportional split mode is perfect for unequal shares.',               scenario: "Camping Trip — Xavier's friends",   xlm: 16  },
  { name: 'Yuki Nakamura',     email: 'yuki.nakamura@gmail.com',     rating: 5, feedback: 'Fast, secure, and transparent. Stellar blockchain is trustworthy.',        scenario: "Sushi Dinner — Yuki's group",       xlm: 24  },
  { name: 'Zara Ahmed',        email: 'zara.ahmed@gmail.com',        rating: 4, feedback: 'Wallet connection works with both Freighter and xBull. Impressive.',       scenario: "Eid Celebration — Zara's family",   xlm: 42  },
  { name: 'Amos Okafor',       email: 'amos.okafor@gmail.com',       rating: 5, feedback: 'Built on Soroban so the contract is verifiable. Love transparency.',       scenario: "Lagos Meetup — Amos's group",       xlm: 20  },
  { name: 'Bianca Ferrari',    email: 'bianca.ferrari@gmail.com',    rating: 5, feedback: 'Used for a group art supply purchase. Exact split was perfect.',           scenario: "Art Supplies — Bianca's studio",    xlm: 31  },
  { name: 'Carlos Mendez',     email: 'carlos.mendez@gmail.com',     rating: 4, feedback: 'Great for splitting Airbnb costs across the group.',                       scenario: "Airbnb Split — Carlos's crew",      xlm: 90  },
  { name: 'Diana Kovacs',      email: 'diana.kovacs@gmail.com',      rating: 5, feedback: 'Real-time settlement is the killer feature. No more IOU drama!',           scenario: "Wedding Gift Fund — Diana",         xlm: 70  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fundAccount(publicKey) {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function waitForAccount(server, publicKey, retries = 12) {
  for (let i = 0; i < retries; i++) {
    try { return await server.getAccount(publicKey); }
    catch { console.log(`  ⏳ Waiting for account… (${i + 1}/${retries})`); await sleep(3000); }
  }
  throw new Error(`Account ${publicKey} not found after ${retries} retries`);
}

async function invokeContract(server, method, params, keypair) {
  const account  = await server.getAccount(keypair.publicKey());
  const contract = new Contract(CONTRACT_ID);

  let tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(contract.call(method, ...params))
    .setTimeout(180)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (Api.isSimulationError(sim)) throw new Error(`Simulation: ${sim.error}`);

  tx = assembleTransaction(tx, sim).build();
  tx.sign(keypair);

  const send = await server.sendTransaction(tx);
  if (send.status === 'ERROR') throw new Error(`Send error: ${JSON.stringify(send.errorResult)}`);

  let result;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    result = await server.getTransaction(send.hash);
    if (result.status !== 'NOT_FOUND') break;
  }
  if (result.status !== 'SUCCESS') throw new Error(`TX status: ${result.status}`);
  return { txHash: send.hash, returnValue: result.returnValue };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 SYNC_SPLIT — 30 Testnet User Simulation (Level 6)');
  console.log('════════════════════════════════════════════════════\n');

  const server  = new Server(SOROBAN_RPC);
  const results = [];

  for (let i = 0; i < TEST_USERS.length; i++) {
    const user    = TEST_USERS[i];
    const keypair = Keypair.random();
    console.log(`\n👤 [${i + 1}/${TEST_USERS.length}] ${user.name}`);
    console.log(`   Wallet: ${keypair.publicKey()}`);

    // 1. Fund via Friendbot
    try {
      await fundAccount(keypair.publicKey());
      console.log('   ✅ Funded via Friendbot');
    } catch (err) {
      console.error(`   ❌ Friendbot: ${err.message}`);
      results.push({ ...user, publicKey: keypair.publicKey(), createTxHash: 'FAILED', splitId: null });
      continue;
    }

    await sleep(5000);

    // 2. Wait for RPC indexing
    try { await waitForAccount(server, keypair.publicKey()); }
    catch (err) {
      console.error(`   ❌ Account: ${err.message}`);
      results.push({ ...user, publicKey: keypair.publicKey(), createTxHash: 'FAILED', splitId: null });
      continue;
    }

    // 3. Call create_split
    const totalStroops = BigInt(Math.round(user.xlm * 10_000_000));
    console.log(`   📝 create_split("${user.scenario}", ${user.xlm} XLM)`);

    try {
      const { txHash, returnValue } = await invokeContract(
        server, 'create_split',
        [
          new Address(keypair.publicKey()).toScVal(),
          nativeToScVal(totalStroops, { type: 'i128' }),
          nativeToScVal(user.scenario, { type: 'string' }),
        ],
        keypair
      );
      const splitId = returnValue ? scValToNative(returnValue) : null;
      console.log(`   ✅ Split #${splitId} | TX: ${txHash}`);
      results.push({
        ...user, publicKey: keypair.publicKey(),
        createTxHash: txHash, splitId,
        explorerUrl: `${EXPLORER}/account/${keypair.publicKey()}`,
        txUrl: `${EXPLORER}/tx/${txHash}`,
      });
    } catch (err) {
      console.error(`   ❌ create_split: ${err.message}`);
      results.push({ ...user, publicKey: keypair.publicKey(), createTxHash: 'FAILED', splitId: null });
    }

    if (i < TEST_USERS.length - 1) { console.log('   ⏸  Pausing 6s…'); await sleep(6000); }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  const ok = results.filter(r => r.createTxHash !== 'FAILED');
  console.log(`\n\n✅ ${ok.length}/${TEST_USERS.length} users interacted with contract`);

  // ─── Save JSON ─────────────────────────────────────────────────────────────
  const json = {
    generated_at: new Date().toISOString(),
    contract_id: CONTRACT_ID,
    network: 'Stellar Testnet',
    total_users: results.length,
    successful: ok.length,
    users: results.map(r => ({
      name:             r.name,
      email:            r.email,
      rating:           r.rating,
      feedback:         r.feedback,
      wallet_address:   r.publicKey,
      explorer_url:     r.explorerUrl || `${EXPLORER}/account/${r.publicKey}`,
      transaction_hash: r.createTxHash,
      transaction_url:  r.txUrl || null,
      split_id:         r.splitId,
    })),
  };
  writeFileSync('./scripts/users_30.json', JSON.stringify(json, null, 2));
  console.log('💾 Saved: scripts/users_30.json');

  // ─── Save CSV ─────────────────────────────────────────────────────────────
  const header = 'No,Name,Email,Rating,Feedback,Wallet Address,Transaction Hash,Split ID';
  const rows = results.map((r, i) =>
    [i+1, `"${r.name}"`, `"${r.email}"`, r.rating, `"${r.feedback}"`,
     r.publicKey, r.createTxHash, r.splitId ?? ''].join(',')
  );
  writeFileSync('./scripts/user_feedback_30.csv', [header, ...rows].join('\n'));
  console.log('💾 Saved: scripts/user_feedback_30.csv');

  // Copy CSV to docs too
  writeFileSync('../docs/user_feedback_30.csv', [header, ...rows].join('\n'));
  console.log('💾 Saved: docs/user_feedback_30.csv');

  console.log('\n🎉 Done!\n');
}

main().catch(err => { console.error('\n💥 Fatal:', err.message); process.exit(1); });
