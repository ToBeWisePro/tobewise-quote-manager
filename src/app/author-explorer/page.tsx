"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import CenteredStatus from "../components/CenteredStatus";
import DashboardPageHeader from "../components/DashboardPageHeader";
import DashboardPageShell from "../components/DashboardPageShell";
import PasswordGateCard from "../components/PasswordGateCard";
import SimpleCountTable from "../components/SimpleCountTable";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

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
      const list: AuthorCount[] = Array.from(counter.entries()).map(
        ([author, count]) => ({ author, count }),
      );
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
        <CenteredStatus message="Loading authors..." />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell contentClassName="flex w-full min-w-0 flex-col gap-6">
      <DashboardPageHeader
        className="dashboard-page-header"
        eyebrow="Explorer"
        title="Author Counts"
        description="A quick rollup of quote volume by author name across the current library."
      />

      <SimpleCountTable
        rows={authors.map(({ author, count }) => ({
          id: author,
          label: author,
          count,
        }))}
        labelHeading="Author"
        countHeading="Quotes"
        emptyMessage="No authors are available yet."
      />
    </DashboardPageShell>
  );
}
