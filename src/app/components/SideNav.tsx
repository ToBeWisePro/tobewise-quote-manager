"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';
import { collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { getFirestoreDb, storage } from '../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
// IMPORTANT: requires NEXT_PUBLIC_GEMINI_API_KEY to be set
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { downloadQuotesAsCSV } from '../lib/csvExport';
import { readDocuments } from '../lib/firebaseCrud';

export default function SideNav() {
  const pathname = usePathname();
  // const { authenticated } = useAuth();

  // -----------------------------
  // Update Author Profiles Script
  // -----------------------------
  const [scriptRunning, setScriptRunning] = useState(false);

  // -----------------------------
  // Download Database Functionality
  // -----------------------------
  const [downloadLoading, setDownloadLoading] = useState(false);

  const handleDownloadDatabase = useCallback(async () => {
    if (downloadLoading) return;
    
    setDownloadLoading(true);
    try {
      toast.loading('Fetching all quotes...');
      
      // Fetch all quotes from the database
      const quotes = await readDocuments('quotes');
      
      if (quotes.length === 0) {
        toast.error('No quotes found in database');
        return;
      }
      
      // Download as CSV
      downloadQuotesAsCSV(quotes);
      toast.success(`Downloaded ${quotes.length} quotes as CSV`);
      
    } catch (error) {
      console.error('Download database failed:', error);
      toast.error('Failed to download database');
    } finally {
      setDownloadLoading(false);
      toast.dismiss();
    }
  }, [downloadLoading]);

  const handleUpdateAuthorProfiles = useCallback(async () => {
    console.log('[PHOTO] ===== Starting author profile update process =====');
    if (scriptRunning) return;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      toast.error('Gemini API key missing (NEXT_PUBLIC_GEMINI_API_KEY)');
      return;
    }

    setScriptRunning(true);
    try {
      const db = getFirestoreDb();

      // Prepare Gemini models
      const flashModel = new ChatGoogleGenerativeAI({
        apiKey,
        model: 'gemini-2.5-flash',
        temperature: 0.2,
      });

      const proModel = new ChatGoogleGenerativeAI({
        apiKey,
        model: 'gemini-2.5-pro',
        temperature: 0.4,
      });

      // Helper: extract URL from AI response
      const extractUrl = (text: string): string => {
        const urlMatch = text.match(/https?:\/\/[^\s]+/);
        return urlMatch ? urlMatch[0] : '';
      };

      // Helper: validate image URL
      const isValidImageUrl = async (url: string): Promise<boolean> => {
        try {
          const res = await fetch(url, { method: 'GET', mode: 'no-cors' });
          // In no-cors, successful cross-origin requests are returned as opaque
          // Treat opaque as valid since we can't inspect headers
          return res.type === 'opaque' || res.ok;
        } catch {
          return false;
        }
      };

      // Try Wikipedia REST API first
      const fetchWikipediaPhoto = async (personName: string): Promise<Blob | null> => {
        try {
          const title = encodeURIComponent(personName.trim().replace(/ /g, '_'));
          const req = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
          if (!req.ok) return null;
          const data = await req.json();
          const url: string | undefined = data.thumbnail?.source;
          if (!url) return null;
          const imgRes = await fetch(url);
          if (!imgRes.ok) return null;
          const blob = await imgRes.blob();
          if (!blob.type.startsWith('image')) return null;
          return blob;
        } catch {
          return null;
        }
      };

      // Helper to fetch potential website via LLM and parse photo
      const fetchPhotoViaWebsite = async (personName: string): Promise<Blob | null> => {
        try {
          // Step 1: ask LLM for a page URL
          const pagePrompt = `Provide ONLY one URL (no markdown) to a web page that contains a clear headshot photograph of ${personName}. Prioritise official websites, biographies, or reputable news outlets. If none, reply NONE.`;
          const resp1 = await flashModel.invoke(pagePrompt);
          const pageText = typeof resp1 === 'string' ? resp1 : (resp1 as any).content || (resp1 as any).text || String(resp1);
          const pageUrlMatch = pageText.match(/https?:\/\/[^\s]+/i);
          const pageUrl = pageUrlMatch ? pageUrlMatch[0] : null;
          if (!pageUrl) return null;

          // Fetch html via server-side API to avoid CORS
          const htmlRes = await fetch(`/api/fetch-page?url=${encodeURIComponent(pageUrl)}`);
          if (!htmlRes.ok) return null;
          const { html } = await htmlRes.json();

          // Step 2: ask LLM to extract image URL
          const imgPrompt = `From the HTML content below, extract ONLY the direct URL of the largest headshot or portrait image of ${personName}. If none found, reply NONE.\n\nHTML:\n${html.substring(0, 15000)}`; // cap tokens
          const resp2 = await flashModel.invoke(imgPrompt);
          const imgText = typeof resp2 === 'string' ? resp2 : (resp2 as any).content || (resp2 as any).text || String(resp2);
          const imgUrlMatch = imgText.match(/https?:\/\/[^\s]+/i);
          const imgUrl = imgUrlMatch ? imgUrlMatch[0] : null;
          if (!imgUrl) return null;

          // Fetch image blob
          const imgRes = await fetch(imgUrl, { mode: 'no-cors' });
          if (!imgRes.ok) return null;
          const blob = await imgRes.blob();
          if (!blob.type.startsWith('image')) return null;
          return blob;
        } catch {
          return null;
        }
      };

      // Fetch all authors (currently filtered to Greg Voisen)
      console.log('[PHOTO] Fetching authors…');
      const authorsSnapshot = await getDocs(collection(db!, 'quote_authors'));
      let updatedCount = 0;

      for (const authorDoc of authorsSnapshot.docs) {
        const data = authorDoc.data() as { name?: string; profile_url?: string; description?: string };
        console.log(`[PHOTO] Processing "${data.name}"`);
        const name = (data.name || '').trim();
        if (!name) continue;

        if (data.profile_url && data.description) {
          // Already complete, skip
          continue;
        }

        //------------------
        // Step 3: Get photo
        //------------------
        console.log('[PHOTO] Step 3: Acquire profile photo');
        // 3a. Try Wikipedia first
        let profileUrl = data.profile_url || '';
        if (!profileUrl) {
          console.log('[PHOTO] Trying Wikipedia summary API…');
          const wikiBlob = await fetchWikipediaPhoto(name);
          if (wikiBlob) {
            // Validate dimensions
            const wikiOk = await new Promise<boolean>((resolve) => {
              const img = new globalThis.Image();
              const url = URL.createObjectURL(wikiBlob);
              img.onload = () => {
                const good = img.width >= 300 && img.height >= 300;
                URL.revokeObjectURL(url);
                resolve(good);
              };
              img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(false);
              };
              img.src = url;
            });
            if (wikiOk) {
              const ext = (wikiBlob.type.split('/')[1] || 'jpg').split(';')[0];
              const cleanName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              const photoRef = storageRef(storage!, `author_photos/${cleanName}.${ext}`);
              await uploadBytes(photoRef, wikiBlob, { contentType: wikiBlob.type });
              profileUrl = await getDownloadURL(photoRef);
              console.log('[PHOTO] Wikipedia image accepted, uploaded, URL:', profileUrl);
            }
          }
        }

        // 3b. Gemini webpage discovery then HTML parse
        if (!profileUrl) {
          console.log('[PHOTO] Wikipedia failed. Using Gemini to discover a page with photo…');

          const MAX_PAGE_TRIES = 3;
          for (let p = 1; p <= MAX_PAGE_TRIES && !profileUrl; p++) {
            console.log(`[PHOTO] Gemini page attempt ${p}`);
            const pagePrompt = `Provide ONLY one new URL (no markdown) to a web page that contains a clear portrait or headshot of ${name}. Prefer official bio pages or reputable news outlets. Do not repeat a previous URL. If none found reply NONE.`;
            const respPage = await flashModel.invoke(pagePrompt);
            const pageText = typeof respPage === 'string' ? respPage : (respPage as any).content || (respPage as any).text || String(respPage);
            const pageUrl = extractUrl(pageText);
            console.log('[PHOTO] Gemini page suggestion:', pageUrl);

            if (!pageUrl) continue;

            // Fetch HTML server-side
            const htmlRes = await fetch(`/api/fetch-page?url=${encodeURIComponent(pageUrl)}`);
            if (!htmlRes.ok) {
              console.log('[PHOTO] Page fetch failed status', htmlRes.status);
              continue;
            }

            const { html } = await htmlRes.json();

            // Parse HTML for candidate image
            const doc = new DOMParser().parseFromString(html, 'text/html');
            let imgSrc: string | null = null;

            // 1) og:image/meta
            const og = doc.querySelector('meta[property="og:image" i]') as HTMLMetaElement | null;
            if (og?.content) imgSrc = og.content;

            // 2) twitter:image
            if (!imgSrc) {
              const tw = doc.querySelector('meta[name="twitter:image" i]') as HTMLMetaElement | null;
              if (tw?.content) imgSrc = tw.content;
            }

            // 3) img with alt containing name
            if (!imgSrc) {
              const imgs = Array.from(doc.images) as HTMLImageElement[];
              const lower = name.toLowerCase();
              const cand = imgs.find((im) => im.alt.toLowerCase().includes(lower) || im.src.toLowerCase().includes(lower));
              if (cand) imgSrc = cand.src;
            }

            if (imgSrc) {
              console.log('[PHOTO] Extracted img:', imgSrc);
              try {
                const imgRes = await fetch(imgSrc, { mode: 'no-cors' });
                const blob = await imgRes.blob();
                if (blob.type.startsWith('image')) {
                  const ext = (blob.type.split('/')[1] || 'jpg').split(';')[0];
                  const cleanName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                  const photoRef = storageRef(storage!, `author_photos/${cleanName}.${ext}`);
                  await uploadBytes(photoRef, blob, { contentType: blob.type });
                  profileUrl = await getDownloadURL(photoRef);
                  console.log('[PHOTO] Page image uploaded, URL:', profileUrl);
                }
              } catch (e) {
                console.warn('[PHOTO] Failed downloading extracted image', e);
              }
            } else {
              console.log('[PHOTO] No suitable img found in HTML');
            }
          }
        }

        //---------------------------
        // Step 4: Cache image & get description
        //---------------------------
        // Upload to Firebase Storage if we obtained remote URL and haven't cached yet
        if (profileUrl && !profileUrl.includes('firebasestorage.googleapis.com')) {
          try {
            const response = await fetch(profileUrl);
            const blob = await response.blob();
            const ext = (blob.type.split('/')[1] || 'jpg').split(';')[0];
            const cleanName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const photoRef = storageRef(storage!, `author_photos/${cleanName}.${ext}`);
            await uploadBytes(photoRef, blob, { contentType: blob.type });
            profileUrl = await getDownloadURL(photoRef);
          } catch (e) {
            console.error('Failed to cache image to Firebase Storage', e);
          }
        }

        let description = data.description || '';
        if (!description) {
          // Fetch quotes for this author
          const quotesSnapshot = await getDocs(query(collection(db, 'quotes'), where('author', '==', name)));
          const quotes = quotesSnapshot.docs.map((q) => q.data().quoteText).filter(Boolean);
          const quotesText = quotes.length ? `Here are some of their quotes:\n${quotes.join('\n')}` : '';

          const prompt = `Write exactly 5 sentences describing the author ${name}. ${quotesText}`.trim();
          const resp = await proModel.invoke(prompt);
          const text = typeof resp === 'string' ? resp : (resp as any).content || (resp as any).text || JSON.stringify(resp);
          description = text.replace(/\n/g, ' ').trim();
        }

        // Save back to Firestore
        await updateDoc(authorDoc.ref, {
          profile_url: profileUrl,
          description,
          updatedAt: new Date().toISOString(),
        });

        updatedCount += 1;
      }

      console.log(`[PHOTO] ===== Completed. Updated ${updatedCount} author${updatedCount !== 1 ? 's' : ''}. =====`);
      toast.success(`Author profile update complete. Updated ${updatedCount} author${updatedCount !== 1 ? 's' : ''}.`);
    } catch (err) {
      console.error('Update author profiles script failed:', err);
    } finally {
      setScriptRunning(false);
    }
  }, [scriptRunning]);

  const isActive = (path: string) => pathname === path;

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 shadow-lg">
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <Image
            src="/images/image.png"
            alt="Quote Manager Icon"
            width={32}
            height={32}
            className="rounded-full"
          />
          <h1 className="text-2xl font-bold text-primary">Quote Manager</h1>
        </div>
        <nav className="space-y-2">
          <Link
            href="/"
            className={`block px-4 py-2 rounded-md ${
              isActive("/")
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Quotes
          </Link>
          <Link
            href="/authors"
            className={`block px-4 py-2 rounded-md ${
              isActive("/authors")
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Authors
          </Link>
          <Link
            href="/subjects"
            className={`block px-4 py-2 rounded-md ${
              isActive("/subjects")
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Subject Explorer
          </Link>
          <Link
            href="/author-explorer"
            className={`block px-4 py-2 rounded-md ${
              isActive("/author-explorer") ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Author Explorer
          </Link>
          <Link
            href="/super-subjects"
            className={`block px-4 py-2 rounded-md ${
              isActive("/super-subjects") ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            SuperSubjects
          </Link>
          {/* Divider */}
          <div className="border-t border-gray-200 my-2"></div>

          <Link
            href="/add-quote"
            className={`block px-4 py-2 rounded-md ${
              isActive("/add-quote")
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Add Quote
          </Link>
          <Link
            href="/bulk-upload"
            className={`block px-4 py-2 rounded-md ${
              isActive("/bulk-upload") ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Bulk Upload
          </Link>
        </nav>

        {/* Bottom Tools Section */}
        <div className="mt-auto pt-8 border-t border-gray-200">
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleDownloadDatabase}
              disabled={downloadLoading}
              className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                downloadLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {downloadLoading ? 'Downloading...' : 'Download Database (CSV)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}