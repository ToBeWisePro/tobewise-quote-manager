"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import SideNav from "../components/SideNav";
import { useAuth } from "../hooks/useAuth";
import Image from "next/image";
import toast from "react-hot-toast";
// No need to import Quote now

interface SubjectCount {
  subject: string;
  count: number;
}

export default function SubjectExplorerPage() {
  const { authenticated, loading: authLoading, login } = useAuth();
  const [password, setPassword] = useState("");
  const [subjects, setSubjects] = useState<SubjectCount[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch subjects and their quote counts
  const fetchSubjects = async () => {
    try {
      const snapshot = await getDocs(collection(db!, "quotes"));

      const counter = new Map<string, number>();
      // Only count subjects – we don't need individual quote lists on this page
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as { subjects?: string[] };
        (data.subjects || []).forEach((s) => {
          const subjectKey = s.trim().toLowerCase();
          if (!subjectKey) return;
          // update count map
          counter.set(subjectKey, (counter.get(subjectKey) || 0) + 1);
        });
      });

      const list: SubjectCount[] = Array.from(counter.entries()).map(
        ([subject, count]) => ({ subject, count }),
      );
      list.sort((a, b) => a.subject.localeCompare(b.subject));
      setSubjects(list);
      // nothing else to set – we only need the counts
    } catch (e) {
      console.error("Error fetching subjects", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      const runCleanup = async () => {
        try {
          const snap = await getDocs(collection(db!, "quotes"));
          const promises: Promise<any>[] = [];
          snap.docs.forEach((d) => {
            const data = d.data() as { subjects?: any };
            if (Array.isArray(data.subjects) && data.subjects.length === 1) {
              const first = data.subjects[0];
              if (typeof first === "string" && first.includes(",")) {
                const newSubjects = first.split(/[,\n]/)
                  .map((s)=>s.trim().toLowerCase())
                  .filter((token)=>token && !/^\d+$/.test(token));
                if (newSubjects.length > 1) {
                  promises.push(updateDoc(doc(db!, "quotes", d.id), { subjects: newSubjects, updatedAt: new Date().toISOString() }));
                }
              }
            }
          });
          if (promises.length) await Promise.all(promises);
        } catch (e) {
          console.warn("Subject cleanup failed", e);
        }
      };

      runCleanup().then(fetchSubjects);
    } else {
      setLoading(false);
    }
  }, [authenticated]);

  const filtered = subjects; // no search; show all subjects

  const handleLogin = () => {
    if (login(password)) {
      setLoading(true);
      fetchSubjects();
    } else {
      toast.error("Incorrect password. Please try again.");
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
              <p className="mt-4 text-primary">Loading subjects...</p>
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
                <th className="px-4 py-2 text-left w-1/2">Subject</th>
                <th className="px-4 py-2 text-left w-1/2">Quotes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ subject, count }) => (
                <tr key={subject} className="border-b last:border-b-0">
                  <td className="px-4 py-2 whitespace-nowrap break-all text-black">
                    {subject}
                  </td>
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