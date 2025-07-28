"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import SideNav from "../components/SideNav";
import { useAuth } from "../hooks/useAuth";
import Image from "next/image";

interface AuthorCount {
  author: string;
  count: number;
}

export default function AuthorExplorerPage() {
  const { authenticated, loading: authLoading, login } = useAuth();
  const [password, setPassword] = useState("");
  const [authors, setAuthors] = useState<AuthorCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuthors = async () => {
    try {
      const snap = await getDocs(collection(db!, "quotes"));
      const counter = new Map<string, number>();
      snap.docs.forEach((d) => {
        const data = d.data() as { author?: string };
        const name = (data.author || "unknown").trim();
        if (!name) return;
        counter.set(name, (counter.get(name) || 0) + 1);
      });
      const list: AuthorCount[] = Array.from(counter.entries()).map(([author, count]) => ({ author, count }));
      list.sort((a, b) => a.author.localeCompare(b.author));
      setAuthors(list);
    } catch (e) {
      console.error("Error fetching author counts", e);
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

  const handleLogin = () => {
    if (login(password)) {
      setLoading(true);
      fetchAuthors();
    } else {
      alert("Incorrect password. Please try again.");
    }
  };

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
            <Image src="/images/image.png" alt="Icon" width={64} height={64} className="rounded-full" />
          </div>
          <h2 className="text-xl font-bold mb-4 text-primary text-center">Enter Password</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input input-bordered w-full mb-4 text-black"
          />
          <button onClick={handleLogin} className="bg-primary text-white px-4 py-2 rounded shadow w-full">
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
      <main className="flex-1 ml-64 p-8 overflow-hidden">
        <div className="h-full bg-white shadow-md rounded-lg overflow-y-auto">
          <table className="table-fixed border-collapse w-full text-black h-full">
            <thead>
              <tr className="bg-gray-800 text-white sticky top-0 z-30">
                <th className="px-4 py-2 text-left w-1/2">Author</th>
                <th className="px-4 py-2 text-left w-1/2">Quotes</th>
              </tr>
            </thead>
            <tbody>
              {authors.map(({ author, count }) => (
                <tr key={author} className="border-b last:border-b-0">
                  <td className="px-4 py-2 whitespace-nowrap break-all text-black">{author}</td>
                  <td className="px-4 py-2 text-black">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
} 