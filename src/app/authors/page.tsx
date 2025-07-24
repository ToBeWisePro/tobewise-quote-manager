"use client";

/* -------------------------------------------------------------------------- */
/*                                    imports                                */
/* -------------------------------------------------------------------------- */
import { useState, useEffect } from "react";
import { db, storage } from "../lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import EditableAuthorRow from "../components/EditableAuthorRow";
import SideNav from "../components/SideNav";
import { useAuth } from "../hooks/useAuth";
import { Author } from "../types/Author";
import ResizableTableHeader from "../components/ResizableTableHeader";
import Image from "next/image";

/* -------------------------------------------------------------------------- */
/*                               helper functions                             */
/* -------------------------------------------------------------------------- */

const squareImageBlob = async (blob: Blob): Promise<Blob> => {
  const imgBitmap = await createImageBitmap(blob);
  const size = Math.min(imgBitmap.width, imgBitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;

  const ctx = canvas.getContext("2d")!;
  const sx = (imgBitmap.width - size) / 2;
  const sy = (imgBitmap.height - size) / 2;
  ctx.drawImage(imgBitmap, sx, sy, size, size, 0, 0, 512, 512);

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.9),
  );
};

const fetchWikipediaPhoto = async (personName: string): Promise<Blob | null> => {
  try {
    const title = encodeURIComponent(personName.trim().replace(/ /g, "_"));
    const req = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
    );
    if (!req.ok) return null;
    const data = await req.json();
    const url: string | undefined =
      data.originalimage?.source || data.thumbnail?.source;
    if (!url) return null;
    const imgRes = await fetch(url);
    if (!imgRes.ok) return null;
    const blob = await imgRes.blob();
    if (!blob.type.startsWith("image")) return null;
    return blob;
  } catch {
    return null;
  }
};

const extractUrl = (text: string): string | null => {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
};

/* -------------------------------------------------------------------------- */
/*                                   component                                */
/* -------------------------------------------------------------------------- */

export default function AuthorsPage() {
  const { authenticated, loading: authLoading, login } = useAuth();

  /* ----------------------------- local state ----------------------------- */
  const [password, setPassword] = useState("");
  const [authors, setAuthors] = useState<Author[]>([]);
  const [filteredAuthors, setFilteredAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<"all" | "name" | "description">(
    "all",
  );
  const [columnWidths, setColumnWidths] = useState({
    name: 200,
    profile: 120,
    description: 480,
  });
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  /* ---------------------------- auth side‑effect ---------------------------- */
  useEffect(() => {
    if (!authenticated) {
      const adminPw = process.env
        .NEXT_PUBLIC_ADMIN_PASSWORD as string | undefined;
      if (adminPw) {
        login(adminPw);
      }
    }
  }, [authenticated, login]);

  /* ---------------------------- data fetching ---------------------------- */
  const fetchAuthors = async () => {
    try {
      const snapshot = await getDocs(collection(db!, "quote_authors"));
      const fetched = (await Promise.all(
        snapshot.docs.map(async (docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })),
      )) as Author[];

      // Sort alphabetically by name
      const sorted = fetched.sort((a, b) => a.name.localeCompare(b.name));
      setAuthors(sorted);
      setFilteredAuthors(sorted);
    } catch (e) {
      console.error("Error fetching authors", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchAuthors();
    } else {
      setLoading(false);
    }
  }, [authenticated]);

  /* ----------------------------- event handlers ----------------------------- */

  const handleSearch = (term: string, field: typeof searchField) => {
    if (!term.trim()) {
      setFilteredAuthors(authors);
      return;
    }
    const lower = term.toLowerCase();
    const filtered = authors.filter((author) => {
      if (field === "all") {
        return (
          author.name.toLowerCase().includes(lower) ||
          (author.description?.toLowerCase().includes(lower) ?? false)
        );
      } else if (field === "name") {
        return author.name.toLowerCase().includes(lower);
      } else if (field === "description") {
        return author.description?.toLowerCase().includes(lower) ?? false;
      }
      return false;
    });
    setFilteredAuthors(filtered);
  };

  const handleLogin = () => {
    if (login(password)) {
      setLoading(true);
      fetchAuthors();
    } else {
      alert("Incorrect password. Please try again.");
    }
  };

  const handleSave = async (updated: Author) => {
    const ref = doc(db!, "quote_authors", updated.id);
    let profileUrl = updated.profile_url ?? "";
    const prevUrl = updated.profile_url;

    // If user pasted an external URL, cache to Storage
    if (profileUrl && !profileUrl.includes("firebasestorage.googleapis.com")) {
      try {
        const res = await fetch(profileUrl, { mode: "no-cors" });
        const raw = await res.blob();
        if (raw.type.startsWith("image")) {
          const blob = await squareImageBlob(raw);
          const ext = "jpg";
          const cleanName = updated.name
            .replace(/[^a-z0-9]/gi, "_")
            .toLowerCase();
          const photoRef = storageRef(
            storage!,
            `author_photos/${cleanName}.${ext}`,
          );
          await uploadBytes(photoRef, blob, { contentType: blob.type });
          profileUrl = await getDownloadURL(photoRef);
        }
      } catch (e) {
        console.warn("Failed to cache manual profile URL", e);
      }
    }

    // Delete previous photo from Storage if url changed or removed
    if (prevUrl && prevUrl !== profileUrl && prevUrl.includes('firebasestorage.googleapis.com')) {
      try {
        const pathMatch = prevUrl.match(/o\/([^?]+)/);
        if (pathMatch) {
          const decoded = decodeURIComponent(pathMatch[1]);
          await deleteObject(storageRef(storage!, decoded));
        }
      } catch {}
    }

    const data: any = {
      name: updated.name,
      updatedAt: new Date().toISOString(),
    };
    if (profileUrl) data.profile_url = profileUrl; else data.profile_url = "";
    if (updated.description !== undefined) data.description = updated.description || "";

    await updateDoc(ref, data);
    await fetchAuthors();
  };

  /* ----------------------- AI: generate missing fields ---------------------- */

  const handleGenerate = async (author: Author) => {
    try {
      if (generatingIds.has(author.id)) return;
      console.log("[GEN] Starting generation for", author.name);
      setGeneratingIds(prev => new Set(prev).add(author.id));

      let profileUrl = "";
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

      /* --------- 1) (optional) generate description in parallel ---------- */
      let descriptionText = author.description || "";
      let descriptionPromise: Promise<string | null> | null = null;

      if (!descriptionText && apiKey) {
        const pro = new ChatGoogleGenerativeAI({
          apiKey,
          model: "gemini-2.5-pro",
          temperature: 0.4,
        });

        const quotesSnapshot = await getDocs(
          query(collection(db!, "quotes"), where("author", "==", author.name)),
        );
        const quotes = quotesSnapshot.docs
          .map((d) => d.data().quoteText)
          .filter(Boolean);

        const quotesText = quotes.length
          ? `Here are some of their quotes:\n${quotes.join("\n")}`
          : "";

        const promptDesc = `Write exactly 5 sentences describing the author ${author.name}. ${quotesText}`.trim();

        descriptionPromise = pro
          .invoke(promptDesc)
          .then((resp) => {
            const text =
              typeof resp === "string"
                ? resp
                : (resp as any).content || (resp as any).text || String(resp);
            return text.replace(/\n/g, " ").trim();
          })
          .catch(() => null);
      }

      /* --------------------- 2) Wikipedia head‑shot --------------------- */
      const wikiBlob = await fetchWikipediaPhoto(author.name);
      if (wikiBlob) {
        const ext = (wikiBlob.type.split("/")[1] || "jpg").split(";")[0];
        const clean = author.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const refStorage = storageRef(
          storage!,
          `author_photos/${clean}.${ext}`,
        );

        const square = await squareImageBlob(wikiBlob);
        await uploadBytes(refStorage, square, { contentType: "image/jpeg" });
        profileUrl = await getDownloadURL(refStorage);
      }

      /* -------- 3) Gemini "flash" discovery if the above failed --------- */
      if (!profileUrl && apiKey) {
        const flash = new ChatGoogleGenerativeAI({
          apiKey,
          model: "gemini-2.5-flash",
          temperature: 0.2,
        });

        const MAX_TRIES = 3;
        for (let i = 1; i <= MAX_TRIES && !profileUrl; i++) {
          console.log(`[GEN] Gemini page attempt ${i}`);

          const prompt =
            `Provide ONLY one new URL (no markdown) to a web page that contains a clear portrait or headshot of ${author.name}. ` +
            `Prefer official bio pages or reputable news outlets. Do not repeat a previous URL. If none found reply NONE.`;

          const resp = await flash.invoke(prompt);
          const text =
            typeof resp === "string"
              ? resp
              : (resp as any).content || (resp as any).text || String(resp);

          const pageUrl = extractUrl(text);
          if (!pageUrl) continue;

          const htmlRes = await fetch(
            `/api/fetch-page?url=${encodeURIComponent(pageUrl)}`,
          );
          if (!htmlRes.ok) continue;
          const { html } = await htmlRes.json();

          const docHTML = new DOMParser().parseFromString(html, "text/html");

          let imgSrc: string | null = null;
          const og = docHTML.querySelector(
            'meta[property="og:image" i]',
          ) as HTMLMetaElement | null;
          if (og?.content) imgSrc = og.content;

          if (!imgSrc) {
            const tw = docHTML.querySelector(
              'meta[name="twitter:image" i]',
            ) as HTMLMetaElement | null;
            if (tw?.content) imgSrc = tw.content;
          }

          if (!imgSrc) {
            const imgs = Array.from(docHTML.images) as HTMLImageElement[];
            const lower = author.name.toLowerCase();
            const cand = imgs.find(
              (im) =>
                im.alt.toLowerCase().includes(lower) ||
                im.src.toLowerCase().includes(lower),
            );
            if (cand) imgSrc = cand.src;
          }
          if (!imgSrc) continue;

          try {
            const imgResp = await fetch(imgSrc, { mode: "no-cors" });
            const rawBlob = await imgResp.blob();
            if (!rawBlob.type.startsWith("image")) continue;

            const blob = await squareImageBlob(rawBlob);
            const ext = (blob.type.split("/")[1] || "jpg").split(";")[0];
            const clean = author.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
            const refStorage = storageRef(
              storage!,
              `author_photos/${clean}.${ext}`,
            );
            await uploadBytes(refStorage, blob, { contentType: blob.type });
            profileUrl = await getDownloadURL(refStorage);
          } catch {
            continue;
          }
        }
      }

      if (!profileUrl) {
        console.warn("Unable to generate photo automatically.");
      }

      /* ---------------------- await parallel description ---------------------- */
      if (descriptionPromise) {
        const txt = await descriptionPromise;
        if (txt) descriptionText = txt;
      }

      /* ---------------------- write back to Firestore ------------------------- */
      await updateDoc(doc(db!, "quote_authors", author.id), {
        profile_url: profileUrl || author.profile_url || "",
        description: descriptionText,
        updatedAt: new Date().toISOString(),
      });

      await fetchAuthors();
      setGeneratingIds(prev=>{const s=new Set(prev);s.delete(author.id);return s;});
    } catch (e) {
      console.error("Generate failed", e);
    } finally {
      setGeneratingIds(prev=>{const s=new Set(prev);s.delete(author.id);return s;});
    }
  };

  const handleColumnResize =
    (column: keyof typeof columnWidths) => (width: number) => {
      setColumnWidths((prev) => ({ ...prev, [column]: width }));
    };

  /* -------------------------- keep search on refresh ------------------------- */
  useEffect(() => {
    // Re-apply the current search/filter whenever the underlying data changes
    handleSearch(searchTerm, searchField);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authors]);

  /* ------------------------------------------------------------------------ */
  /*                                 render                                   */
  /* ------------------------------------------------------------------------ */

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-primary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-light">
        <div className="bg-white p-6 rounded-md shadow">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/images/image.png"
              alt="Icon"
              width={64}
              height={64}
              className="rounded-full"
            />
          </div>
          <h2 className="text-xl font-bold mb-4 text-primary text-center">
            Enter Password
          </h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input input-bordered w-full mb-4 text-black"
          />
          <button
            onClick={handleLogin}
            className="bg-primary text-white px-4 py-2 rounded shadow w-full"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-neutral-light">
        <SideNav />
        <main className="flex-1 ml-64 p-8">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p className="mt-4 text-primary">Loading authors...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-light">
      <SideNav />
      <main className="flex-1 ml-64 p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
          {/* --------------------------- search panel -------------------------- */}
          <div className="flex-none">
            <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start sm:items-center">
              <select
                value={searchField}
                onChange={(e) => {
                  const field = e.target.value as typeof searchField;
                  setSearchField(field);
                  handleSearch(searchTerm, field);
                }}
                className="select select-bordered bg-white border-gray-300 text-black focus:border-primary focus:ring-2 focus:ring-primary w-full sm:w-auto"
              >
                <option value="all">All Fields</option>
                <option value="name">Name</option>
                <option value="description">Description</option>
              </select>

              <div className="relative w-full sm:w-auto sm:flex-1">
                <input
                  type="text"
                  placeholder="Search authors..."
                  value={searchTerm}
                  onChange={(e) => {
                    const newTerm = e.target.value;
                    setSearchTerm(newTerm);
                    handleSearch(newTerm, searchField);
                  }}
                  className="input input-bordered w-full pl-10 bg-white border-gray-300 text-black focus:border-primary focus:ring-2 focus:ring-primary"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------- table ------------------------------ */}
          <div className="flex-1 overflow-hidden bg-white shadow-md rounded-lg">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <div className="w-full overflow-x-auto">
                <table className="table-fixed border-collapse w-full">
                  <colgroup>
                    <col style={{ width: `${columnWidths.name}px` }} />
                    <col style={{ width: `${columnWidths.profile}px` }} />
                    <col style={{ width: `${columnWidths.description}px` }} />
                  </colgroup>

                  <thead>
                    <tr className="bg-gray-800 text-white sticky top-0 z-30">
                      <ResizableTableHeader
                        initialWidth={columnWidths.name}
                        minWidth={150}
                        onResize={handleColumnResize("name")}
                      >
                        Name
                      </ResizableTableHeader>

                      <ResizableTableHeader
                        initialWidth={columnWidths.profile}
                        minWidth={100}
                        onResize={handleColumnResize("profile")}
                      >
                        Profile Photo
                      </ResizableTableHeader>

                      <ResizableTableHeader
                        initialWidth={columnWidths.description}
                        minWidth={200}
                        onResize={handleColumnResize("description")}
                        isLastColumn
                      >
                        Description
                      </ResizableTableHeader>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAuthors.map((author) => (
                      <EditableAuthorRow
                        key={author.id}
                        author={author}
                        onSave={handleSave}
                        onGenerate={handleGenerate}
                        isGenerating={generatingIds.has(author.id)}
                        columnWidths={columnWidths}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
