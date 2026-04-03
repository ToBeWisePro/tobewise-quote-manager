"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import CenteredStatus from "../components/CenteredStatus";
import DashboardPageHeader from "../components/DashboardPageHeader";
import DashboardPageShell from "../components/DashboardPageShell";
import PasswordGateCard from "../components/PasswordGateCard";
import SimpleCountTable from "../components/SimpleCountTable";
import { useAuth } from "../hooks/useAuth";
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
          const promises: Promise<void>[] = [];
          snap.docs.forEach((d) => {
            const data = d.data() as { subjects?: unknown };
            if (Array.isArray(data.subjects) && data.subjects.length === 1) {
              const first = data.subjects[0];
              if (typeof first === "string" && first.includes(",")) {
                const newSubjects = first
                  .split(/[,\n]/)
                  .map((s) => s.trim().toLowerCase())
                  .filter((token) => token && !/^\d+$/.test(token));
                if (newSubjects.length > 1) {
                  promises.push(
                    updateDoc(doc(db!, "quotes", d.id), {
                      subjects: newSubjects,
                      updatedAt: new Date().toISOString(),
                    }),
                  );
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
      <CenteredStatus
        message="Loading..."
        className="flex min-h-screen items-center justify-center bg-neutral-light"
      />
    );
  }

  if (!authenticated) {
    return (
      <PasswordGateCard
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  if (loading) {
    return (
      <DashboardPageShell contentClassName="h-full">
        <CenteredStatus message="Loading subjects..." />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell contentClassName="flex w-full min-w-0 flex-col gap-6">
      <DashboardPageHeader
        className="dashboard-page-header"
        eyebrow="Explorer"
        title="Subjects"
        description="A clean list of normalized subjects and how many quotes currently map to each one."
      />

      <SimpleCountTable
        rows={filtered.map(({ subject, count }) => ({
          id: subject,
          label: subject,
          count,
        }))}
        labelHeading="Subject"
        countHeading="Quotes"
        emptyMessage="No subjects are available yet."
      />
    </DashboardPageShell>
  );
}
