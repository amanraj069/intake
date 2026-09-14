import 'dotenv/config';

import mongoose from 'mongoose';

/**
 * One-time migration from separate confirmation messages to confirmed proposals.
 *
 *   npm run migrate:chat-confirmations             # show what would change, write nothing
 *   npm run migrate:chat-confirmations -- --apply  # back up, then migrate
 *
 * Confirming a change used to store a second assistant message ("Logged
 * breakfast for today: ...") after the proposal ("Log breakfast for today:
 * ..."), so history showed the change twice. Where a confirmation directly
 * follows its proposal in the same thread, the proposal is marked confirmed and
 * the confirmation is deleted. Deleted messages are copied to a timestamped
 * backup collection first. Running it again is safe: converted proposals carry
 * an action and no longer match.
 */

const COLLECTION = 'chatmessages';

type ChatWriteTool = 'logMeal' | 'setGoal';

interface StoredMessage {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  action?: { tool: ChatWriteTool; status: string };
  createdAt: Date;
}

interface ConfirmedPair {
  tool: ChatWriteTool;
  proposal: StoredMessage;
  confirmation: StoredMessage;
}

/** The exact wording the old previews and confirmations were written with, so nothing else can match. */
const PAIR_PATTERNS: readonly { tool: ChatWriteTool; proposal: RegExp; confirmation: RegExp }[] = [
  { tool: 'logMeal', proposal: /^Log (breakfast|lunch|dinner|snack) for /, confirmation: /^Logged (breakfast|lunch|dinner|snack) for / },
  { tool: 'setGoal', proposal: /^(Set|Update) daily goal: /, confirmation: /^Goal saved: / },
];

function matchPair(proposal: StoredMessage, confirmation: StoredMessage): ConfirmedPair | null {
  if (proposal.role !== 'assistant' || confirmation.role !== 'assistant' || proposal.action) return null;
  const pattern = PAIR_PATTERNS.find(
    ({ proposal: proposalPattern, confirmation: confirmationPattern }) =>
      proposalPattern.test(proposal.content) && confirmationPattern.test(confirmation.content)
  );
  return pattern ? { tool: pattern.tool, proposal, confirmation } : null;
}

/** Messages arrive sorted by user, then time, so a pair is two neighbours in the same thread. */
function findConfirmedPairs(messages: readonly StoredMessage[]): ConfirmedPair[] {
  const pairs: ConfirmedPair[] = [];
  for (let index = 1; index < messages.length; index += 1) {
    const [previous, current] = [messages[index - 1], messages[index]];
    if (!previous.userId.equals(current.userId)) continue;
    const pair = matchPair(previous, current);
    if (pair) pairs.push(pair);
  }
  return pairs;
}

async function backUp(pairs: readonly ConfirmedPair[]): Promise<string> {
  const backupName = `${COLLECTION}_backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const documents = pairs.flatMap(({ proposal, confirmation }) => [{ ...proposal }, { ...confirmation }]);
  await mongoose.connection.db!.collection(backupName).insertMany(documents);
  return backupName;
}

async function migrate(pairs: readonly ConfirmedPair[]): Promise<void> {
  await mongoose.connection.db!.collection(COLLECTION).bulkWrite(
    pairs.flatMap(({ tool, proposal, confirmation }) => [
      {
        updateOne: {
          filter: { _id: proposal._id, action: { $exists: false } },
          update: { $set: { action: { tool, status: 'confirmed' } } },
        },
      },
      { deleteOne: { filter: { _id: confirmation._id } } },
    ])
  );
}

async function run(): Promise<void> {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/t-starter');

  try {
    const messages = await mongoose.connection
      .db!.collection<StoredMessage>(COLLECTION)
      .find({})
      .sort({ userId: 1, createdAt: 1, _id: 1 })
      .toArray();
    const pairs = findConfirmedPairs(messages);

    console.log(`${pairs.length} confirmed proposals to merge.`);
    pairs.forEach(({ tool, proposal, confirmation }) =>
      console.log(`  ${proposal._id} (${tool}): "${proposal.content.slice(0, 60)}" <- delete ${confirmation._id}`)
    );
    if (pairs.length === 0 || !apply) {
      if (pairs.length > 0) console.log('Dry run: nothing written. Re-run with --apply to migrate.');
      return;
    }

    const backupName = await backUp(pairs);
    console.log(`Backed up ${pairs.length * 2} messages to "${backupName}".`);
    await migrate(pairs);
    console.log(`Merged ${pairs.length} proposals.`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
