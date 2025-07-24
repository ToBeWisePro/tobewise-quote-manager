/**
 * Script: populateQuoteAuthors.ts
 * ---------------------------------------------------------------------------
 * Purpose:
 *   One-off utility used to back-fill a new Firestore collection called
 *   `quote_authors` with a single document for every distinct author already
 *   present in the existing `quotes` collection.
 *
 * Behaviour (originally executed via a temporary UI button on 2025-07-24):
 *   1. Fetch all documents from `quotes`.
 *   2. Extract the `author` field from each quote and build a unique set.
 *   3. Fetch `quote_authors` to avoid inserting duplicates if the script is
 *      executed more than once.
 *   4. Insert a new document for each author not yet present with the shape:
 *        {
 *          name: <author name>,
 *          createdAt: <ISO timestamp>
 *        }
 *
 * This file is kept inside `src/scripts/archive` for historical reference so we
 * can reproduce or inspect the migration logic later. It is **NOT** imported by
 * the application at runtime.
 * ---------------------------------------------------------------------------
 */

import { collection, getDocs, addDoc } from 'firebase/firestore';
import { getFirestoreDb } from '../../app/lib/firebase';

export async function runPopulateQuoteAuthors() {
  const db = getFirestoreDb();

  // Gather unique authors from quotes
  const quotesSnapshot = await getDocs(collection(db, 'quotes'));
  const authorsSet = new Set<string>();
  quotesSnapshot.forEach((doc) => {
    const author = (doc.data().author || '').trim();
    if (author) authorsSet.add(author);
  });

  // Get existing authors to avoid duplicates
  const existingSnapshot = await getDocs(collection(db, 'quote_authors'));
  const existingAuthors = new Set<string>();
  existingSnapshot.forEach((doc) => {
    const name = (doc.data().name || '').trim();
    if (name) existingAuthors.add(name);
  });

  let addedCount = 0;
  for (const author of authorsSet) {
    if (!existingAuthors.has(author)) {
      await addDoc(collection(db, 'quote_authors'), {
        name: author,
        createdAt: new Date().toISOString(),
      });
      addedCount += 1;
    }
  }

  console.log(`PopulateQuoteAuthors: added ${addedCount} new author${addedCount !== 1 ? 's' : ''}.`);
}

// If executed directly via `ts-node` or `node` after compilation
if (require.main === module) {
  runPopulateQuoteAuthors().then(() => {
    console.log('Script completed ✅');
    process.exit(0);
  }).catch((err) => {
    console.error('Script failed', err);
    process.exit(1);
  });
} 