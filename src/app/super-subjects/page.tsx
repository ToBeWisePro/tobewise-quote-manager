"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, setDoc, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { storage } from "../lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../lib/firebase";
import SideNav from "../components/SideNav";
import { useAuth } from "../hooks/useAuth";
import Image from "next/image";
import toast from "react-hot-toast";

interface SuperSubject {
  id?: string; // Add unique ID field
  name: string;
  subjects: string[];
  authors: string[];
  image?: string;
  updatedAt?: string;
}

interface Lists {
  subjects: string[];
  authors: string[];
}

const DEFAULT_SUPERSUBJECTS: SuperSubject[] = [
  {
    name: "Innovation & Visionaries",
    subjects: ["innovation", "creativity", "future", "technology", "change"],
    authors: ["Steve Jobs", "Elon Musk", "Marc Andreessen", "Peter Thiel", "Clayton Christensen"],
  },
  {
    name: "Startup Foundations",
    subjects: ["startup", "business", "entrepreneur", "build", "process"],
    authors: ["Paul Graham", "Reid Hoffman", "Marc Benioff", "Naval Ravikant", "Sam Altman"],
  },
  {
    name: "Leadership & Management",
    subjects: ["leadership", "management", "teamwork", "decision", "responsibility"],
    authors: ["John C. Maxwell", "Peter Drucker", "Simon Sinek", "Jim Collins", "Warren Buffett"],
  },
  {
    name: "Growth & Scaling",
    subjects: ["growth", "progress", "scale", "opportunity", "strategy"],
    authors: ["Jeff Bezos", "Mary Meeker", "Brian Chesky", "Mark Cuban", "Howard Schultz"],
  },
  {
    name: "Fundraising & Finance",
    subjects: ["fundraising", "investment", "risk", "finance", "pricing"],
    authors: ["Bill Gurley", "Fred Wilson", "Peter Thiel", "Marc Andreessen", "Ben Horowitz"],
  },
  {
    name: "Marketing & Growth Hacking",
    subjects: ["marketing", "brand", "advertising", "social media", "storytelling"],
    authors: ["Seth Godin", "Gary Vaynerchuk", "Ann Handley", "Simon Sinek", "Jay Baer"],
  },
  {
    name: "Product Development & UX",
    subjects: ["product", "design", "customer service", "feedback", "usability"],
    authors: ["Joel Spolsky", "Steve Jobs", "Jony Ive", "Eric Ries", "Jeff Atwood"],
  },
  {
    name: "Resilience & Failure",
    subjects: ["failure", "perseverance", "courage", "grit", "overcome"],
    authors: ["J.K. Rowling", "Thomas Edison", "Winston Churchill", "Michael Jordan", "Brené Brown"],
  },
  {
    name: "Focus & Productivity",
    subjects: ["focus", "efficiency", "habit", "time", "priority"],
    authors: ["Tim Ferriss", "David Allen", "Brian Tracy", "Jim Rohn", "Sun Tzu"],
  },
  {
    name: "Mindset & Motivation",
    subjects: ["attitude", "motivation", "inspiration", "positivity", "mindset"],
    authors: ["Tony Robbins", "Zig Ziglar", "Les Brown", "Napoleon Hill", "Maya Angelou"],
  },
  {
    name: "Customer Centricity",
    subjects: ["customer service", "empathy", "feedback", "listening", "trust"],
    authors: ["Tony Hsieh", "Shep Hyken", "Jeff Bezos", "Seth Godin", "Jon Kabat-Zinn"],
  },
  {
    name: "Strategy & Tactics",
    subjects: ["strategy", "tactics", "planning", "decision", "risk"],
    authors: ["Sun Tzu", "Clayton Christensen", "Niccolò Machiavelli", "John Doerr", "Peter Drucker"],
  },
  {
    name: "Culture & Values",
    subjects: ["values", "ethics", "purpose", "culture", "integrity"],
    authors: ["Simon Sinek", "Brené Brown", "Warren Buffett", "Mahatma Gandhi", "Eleanor Roosevelt"],
  },
  {
    name: "Innovation Mindset",
    subjects: ["innovate", "creativity", "disruption", "curiosity", "vision"],
    authors: ["Steve Jobs", "Elon Musk", "Eric Ries", "Jeff Bezos", "Marc Andreessen"],
  },
  {
    name: "Networking & Influence",
    subjects: ["networking", "influence", "persuasion", "communication", "relationship"],
    authors: ["Dale Carnegie", "Seth Godin", "Chris Brogan", "Daniel Pink", "Adam Grant"],
  },
  {
    name: "Storytelling & Communication",
    subjects: ["storytelling", "communication", "narrative", "clarity", "persuasion"],
    authors: ["Seth Godin", "Simon Sinek", "Jonah Sachs", "Ann Handley", "Brené Brown"],
  },
  {
    name: "Decision Making & Risk",
    subjects: ["decision", "risk", "uncertainty", "choice", "analysis"],
    authors: ["Charlie Munger", "Warren Buffett", "Sun Tzu", "Robert Kiyosaki", "Benjamin Franklin"],
  },
  {
    name: "Frugality & Efficiency",
    subjects: ["frugality", "efficiency", "productivity", "resourcefulness", "simplicity"],
    authors: ["Elon Musk", "Tim Ferriss", "Warren Buffett", "Henry David Thoreau", "W. Edwards Deming"],
  },
  {
    name: "Scaling Teams & Talent",
    subjects: ["hiring", "teamwork", "leadership", "talent", "culture"],
    authors: ["Reid Hoffman", "Peter Drucker", "Jim Collins", "Brené Brown", "Simon Sinek"],
  },
  {
    name: "Customer Acquisition & Retention",
    subjects: ["marketing", "sales", "traction", "customer service", "loyalty"],
    authors: ["Seth Godin", "Brian Halligan", "Dharmesh Shah", "Jay Baer", "Ann Handley"],
  },
  {
    name: "Branding & Positioning",
    subjects: ["brand", "marketing", "perception", "narrative", "differentiation"],
    authors: ["Seth Godin", "Simon Sinek", "Jeff Bezos", "Richard Branson", "Jack Welch"],
  },
  {
    name: "Lean & Agile Methods",
    subjects: ["efficiency", "iteration", "process", "feedback", "learning"],
    authors: ["Eric Ries", "Jeff Bezos", "Bill Gates", "Steve Blank", "Peter Drucker"],
  },
  {
    name: "Data & Metrics",
    subjects: ["metrics", "analytics", "measurement", "efficiency", "progress"],
    authors: ["Nate Silver", "Peter Drucker", "Bill Gates", "Jeff Bezos", "Elon Musk"],
  },
  {
    name: "Design Thinking",
    subjects: ["design", "creativity", "empathy", "user experience", "problem solving"],
    authors: ["Steve Jobs", "Jony Ive", "Brené Brown", "Simon Sinek", "Daniel Pink"],
  },
  {
    name: "Vision & Purpose",
    subjects: ["vision", "purpose", "mission", "values", "legacy"],
    authors: ["Simon Sinek", "Viktor Frankl", "Maya Angelou", "Martin Luther King Jr.", "Mahatma Gandhi"],
  },
  {
    name: "Negotiation & Influence",
    subjects: ["persuasion", "communication", "negotiation", "influence", "diplomacy"],
    authors: ["Dale Carnegie", "Sun Tzu", "Warren Buffett", "Abraham Lincoln", "Benjamin Franklin"],
  },
  {
    name: "Failure as Fuel",
    subjects: ["failure", "resilience", "learning", "adaptation", "grit"],
    authors: ["Thomas Edison", "Michael Jordan", "J.K. Rowling", "Winston Churchill", "Elon Musk"],
  },
  {
    name: "Mindfulness & Well-being",
    subjects: ["mindfulness", "health", "balance", "stress", "focus"],
    authors: ["Jon Kabat-Zinn", "Thich Nhat Hanh", "Eckhart Tolle", "Deepak Chopra", "Brené Brown"],
  },
  {
    name: "Ethics & Responsibility",
    subjects: ["ethics", "responsibility", "integrity", "trust", "accountability"],
    authors: ["Warren Buffett", "Simon Sinek", "Mahatma Gandhi", "Brené Brown", "Peter Drucker"],
  },
  {
    name: "Creativity & Ideation",
    subjects: ["creativity", "imagination", "idea", "innovation", "problem solving"],
    authors: ["Albert Einstein", "Pablo Picasso", "Thomas Edison", "Maya Angelou", "Steve Jobs"],
  },
  {
    name: "Adaptability & Change",
    subjects: ["change", "agility", "resilience", "evolution", "pivot"],
    authors: ["Charles Darwin", "Elon Musk", "Jeff Bezos", "Eric Ries", "Reid Hoffman"],
  },
  {
    name: "Customer-First Growth",
    subjects: ["customer service", "feedback", "empathy", "loyalty", "retention"],
    authors: ["Tony Hsieh", "Shep Hyken", "Jeff Bezos", "Seth Godin", "Chris Brogan"],
  },
  {
    name: "Bootstrapping & Lean",
    subjects: ["frugality", "efficiency", "bootstrap", "resourcefulness", "iteration"],
    authors: ["Jason Fried", "Paul Graham", "Eric Ries", "Tim Ferriss", "Sara Blakely"],
  },
  {
    name: "Culture of Excellence",
    subjects: ["excellence", "consistency", "dedication", "discipline", "teamwork"],
    authors: ["Howard Schultz", "John Wooden", "Jim Collins", "Simon Sinek", "Brené Brown"],
  },
  {
    name: "Strategic Planning",
    subjects: ["plan", "strategy", "goal", "priority", "timeline"],
    authors: ["Benjamin Franklin", "Peter Drucker", "Jim Collins", "Warren Buffett", "John Doerr"],
  },
  {
    name: "Tech Trends & Disruption",
    subjects: ["technology", "disruption", "future", "internet", "innovation"],
    authors: ["Marc Andreessen", "Mary Meeker", "Elon Musk", "Steve Jobs", "Bill Gates"],
  },
  {
    name: "Brand Story & Messaging",
    subjects: ["storytelling", "brand", "narrative", "voice", "differentiation"],
    authors: ["Seth Godin", "Simon Sinek", "Ann Handley", "Jonah Sachs", "Brené Brown"],
  },
  {
    name: "Investor Pitch Essentials",
    subjects: ["pitch", "fundraising", "investment", "storytelling", "clarity"],
    authors: ["Paul Graham", "Guy Kawasaki", "Marc Andreessen", "Reid Hoffman", "Chris Sacca"],
  },
  {
    name: "Exit & Legacy",
    subjects: ["legacy", "exit", "succession", "impact", "purpose"],
    authors: ["Steve Jobs", "Jeff Bezos", "Warren Buffett", "John D. Rockefeller", "John Paul Getty"],
  },
  {
    name: "Mindset of Champions",
    subjects: ["attitude", "confidence", "courage", "perseverance", "resilience"],
    authors: ["Michael Jordan", "Muhammad Ali", "Winston Churchill", "Sun Tzu", "Kobe Bryant"],
  },
  {
    name: "Purpose-Driven Leadership",
    subjects: ["purpose", "vision", "values", "ethics", "servant leadership"],
    authors: ["Simon Sinek", "Peter Drucker", "Mahatma Gandhi", "Nelson Mandela", "Howard Schultz"],
  },
  {
    name: "Leveraging Data & AI",
    subjects: ["data", "technology", "automation", "efficiency", "innovation"],
    authors: ["Elon Musk", "Jeff Bezos", "Bill Gates"],
  },
  {
    name: "Emotional Intelligence",
    subjects: ["empathy", "self-awareness", "interpersonal", "communication", "mindfulness"],
    authors: ["Brené Brown", "Dalai Lama", "Thich Nhat Hanh", "Carl Jung", "Aristotle"],
  },
  {
    name: "Global & Historical Insights",
    subjects: ["history", "civics", "culture", "leadership", "strategy"],
    authors: ["Winston Churchill", "Sun Tzu", "Marcus Aurelius", "Niccolò Machiavelli", "Plutarch"],
  },
  {
    name: "Ethical Marketing",
    subjects: ["marketing", "truth", "transparency", "trust", "responsibility"],
    authors: ["Seth Godin", "Simon Sinek", "Howard Schultz", "Brené Brown", "Peter Drucker"],
  },
  {
    name: "Culture of Innovation",
    subjects: ["innovation", "creativity", "experimentation", "risk", "learning"],
    authors: ["Thomas Edison", "Elon Musk", "Jeff Bezos", "Eric Ries", "Marc Andreessen"],
  },
  {
    name: "Strategic Partnerships",
    subjects: ["collaboration", "alliance", "negotiation", "trust", "network"],
    authors: ["Reid Hoffman", "Bill Gates", "Warren Buffett", "Charlie Munger", "Andrew Carnegie"],
  },
  {
    name: "Scaling Through Systems",
    subjects: ["systems", "process", "automation", "efficiency", "consistency"],
    authors: ["W. Edwards Deming", "Peter Drucker", "Elon Musk", "Jeff Bezos"],
  },
  {
    name: "Visionary Storytelling",
    subjects: ["vision", "storytelling", "narrative", "inspiration", "creativity"],
    authors: ["Steve Jobs", "Simon Sinek", "Brené Brown", "Maya Angelou", "Oprah Winfrey"],
  },
  {
    name: "Legacy of Leaders",
    subjects: ["legacy", "leadership", "values", "history", "impact"],
    authors: ["Winston Churchill", "Nelson Mandela", "Mahatma Gandhi", "Martin Luther King Jr.", "Abraham Lincoln"],
  },
];

export default function SuperSubjectsPage() {
  const { authenticated, loading: authLoading, login } = useAuth();
  const [password, setPassword] = useState("");
  const [superSubjects, setSuperSubjects] = useState<SuperSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<Lists>({ subjects: [], authors: [] });
  const [editing, setEditing] = useState<SuperSubject | null>(null);
  const [form, setForm] = useState<SuperSubject>({ name: "", subjects: [], authors: [], image: "" });

  // Local text inputs so users can freely type comma-separated values without losing the comma/space while editing
  const [subjectsInput, setSubjectsInput] = useState<string>("");
  const [authorsInput, setAuthorsInput] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deletingId,setDeletingId]=useState<string|null>(null);

  const fetchSuperSubjects = async () => {
    try {
      const snap = await getDocs(collection(db!, "quote_supersubjects"));
      const list: SuperSubject[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      } as any));

      // back-fill missing updatedAt
      await Promise.all(list.map(async ss=>{
        if (!ss.updatedAt) {
          const now = new Date().toISOString();
          try {
            await updateDoc(doc(db!, 'quote_supersubjects', ss.id!), { updatedAt: now });
            ss.updatedAt = now;
          } catch (e) {
            console.warn('Failed to set updatedAt for', ss.name, e);
          }
        }
      }));
      setSuperSubjects(list);
    } catch (e) {
      console.error("Error fetching supersubjects", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    try {
      // subjects
      const qSnap = await getDocs(collection(db!, "quotes"));
      const subjSet = new Set<string>();
      qSnap.docs.forEach((d) => {
        const data = d.data() as { subjects?: string[] };
        (data.subjects || []).forEach((s) => subjSet.add(s.trim().toLowerCase()));
      });

      // authors
      const aSnap = await getDocs(collection(db!, "quote_authors"));
      const authArrRaw: string[] = aSnap.docs.map((d) => (d.data() as any).name).filter(Boolean);
      const authArr = Array.from(new Set(authArrRaw));

      setLists({ subjects: Array.from(subjSet).sort(), authors: authArr.sort() });
    } catch (e) {
      console.warn("Failed fetching lists", e);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchSuperSubjects();
      fetchLists();
    } else {
      setLoading(false);
    }
  }, [authenticated]);

  const handleLogin = () => {
    if (login(password)) {
      setLoading(true);
      fetchSuperSubjects();
    } else {
      toast.error("Incorrect password. Please try again.");
    }
  };

  const startNew = () => {
    setEditing({ name: "", subjects: [], authors: [] });
    setForm({ name: "", subjects: [], authors: [], image: "" });
    setSubjectsInput("");
    setAuthorsInput("");
  };

  const startEdit = (ss: SuperSubject) => {
    console.log("Starting edit for:", ss.name); // Debug log
    setEditing(ss);
    setForm({ ...ss });

    // Populate text inputs with existing comma-separated values
    setSubjectsInput(ss.subjects.join(', '));
    setAuthorsInput(ss.authors.join(', '));
    
    // If there's an existing image, create a blob URL for preview
    if (ss.image && !ss.image.startsWith('blob:') && ss.image !== "/images/image.png") {
      // For existing images, we'll keep the original URL for now
      // The user can choose to upload a new one if needed
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { 
      toast.error("Name required"); 
      return; 
    }
    
    if (saving) return; // Prevent double-save
    
    // Convert comma-separated strings → arrays (trim & remove empties)
    const subjectsArr = subjectsInput.split(',').map(s=>s.trim()).filter(Boolean);
    const authorsArr  = authorsInput.split(',').map(a=>a.trim()).filter(Boolean);

    setSaving(true);
    
    try {
      let imgUrl = form.image || "";
      
      // Handle image upload if a new file was selected
      if (form.image && form.image.startsWith("blob:")) {
        try {
          console.log("Uploading new image...");
          const resp = await fetch(form.image);
          const raw = await resp.blob();
          const blob = await squareImageBlob(raw);
          const ext = (blob.type.split("/")[1] || "jpg").split(";")[0];
          const clean = form.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
          const refS = storageRef(storage!, `supersubject_images/${clean}.${ext}`);
          
          console.log("Uploading to Firebase Storage...");
          await uploadBytes(refS, blob, { contentType: blob.type });
          imgUrl = await getDownloadURL(refS);
          console.log("Image uploaded successfully:", imgUrl);
        } catch (e) { 
          console.error("Image upload failed:", e); 
          toast.error("Image upload failed. Please try again.");
          return;
        }
      }
      
      // Use the original ID if editing, or generate a new one for new items
      const docId = editing?.id || form.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      
      console.log("Saving super-subject:", { docId, name: form.name, image: imgUrl });
      
      await setDoc(doc(db!, "quote_supersubjects", docId), { 
        ...form, 
        subjects: subjectsArr,
        authors: authorsArr,
        id: docId,
        image: imgUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      await fetchSuperSubjects();
      setEditing(null);
      
      // Show success message
      const action = editing ? "updated" : "created";
      toast.success(`Super-subject "${form.name}" ${action} successfully!`);
      
    } catch (e) { 
      console.error("Save failed:", e); 
      toast.error("Save failed. Please try again."); 
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setEditing(null); };

  const handleDelete = async (ss: SuperSubject) => {
    if (deletingId) return; // avoid concurrent deletes
    if (!confirm(`Delete "${ss.name}"? This action is irreversible.`)) return;
    setDeletingId(ss.id||ss.name);
    try {
      const id = ss.id || ss.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      await deleteDoc(doc(db!, 'quote_supersubjects', id));
      await fetchSuperSubjects();
      const stillThere = superSubjects.some(s=> (s.id||s.name)===id);
      if (stillThere) {
        toast.error('Delete failed (document still exists).');
      } else {
        toast.success(`"${ss.name}" deleted.`);
      }
    } catch (e:any) {
      console.error(e);
      toast.error(`Delete failed: ${e.message||e}`);
    } finally {
      setDeletingId(null);
    }
  };

  // helper squareImageBlob
  const squareImageBlob = async (blob: Blob): Promise<Blob> => {
    const imgBitmap = await createImageBitmap(blob);
    const minSize = Math.min(imgBitmap.width, imgBitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = 384; // 3:4 aspect ratio
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const sx = (imgBitmap.width - minSize) / 2;
    const sy = (imgBitmap.height - minSize) / 2;
    ctx.drawImage(imgBitmap, sx, sy, minSize, minSize, 0, 0, 384, 512);
    return new Promise((resolve) => canvas.toBlob((b)=>resolve(b as Blob), "image/jpeg", 0.9));
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
              <p className="mt-4 text-primary">Loading SuperSubjects...</p>
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
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-primary">SuperSubjects</h1>
          <button onClick={startNew} className="bg-primary text-white px-4 py-2 rounded shadow">New</button>
        </div>
        <div className="h-full bg-white shadow-md rounded-lg overflow-y-auto">
          <table className="table-fixed border-collapse w-full text-black h-full">
            <thead>
              <tr className="bg-gray-800 text-white sticky top-0 z-30">
                <th className="px-4 py-2 text-left w-1/4">Name</th>
                <th className="px-4 py-2 text-left w-1/4">Subjects</th>
                <th className="px-4 py-2 text-left w-1/4">Authors</th>
                <th className="px-4 py-2 w-16" />
                <th className="px-4 py-2 w-20">Img</th>
              </tr>
            </thead>
            <tbody>
              {/* Show editing row for new items at the top */}
              {editing && !editing.id && (
                <tr className="border-b bg-gray-50">
                  <td className="px-2 py-1">
                    <input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="input input-bordered w-full text-black" />
                  </td>
                  <td className="px-2 py-1">
                    <input value={subjectsInput} onChange={(e)=>setSubjectsInput(e.target.value)} className="input input-bordered w-full text-black" />
                  </td>
                  <td className="px-2 py-1">
                    <input value={authorsInput} onChange={(e)=>setAuthorsInput(e.target.value)} className="input input-bordered w-full text-black" />
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={async(e)=>{
                            const file = e.target.files?.[0];
                            if(file){
                              const url = URL.createObjectURL(file);
                              setForm({...form, image: url});
                            }
                          }} 
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {form.image && (
                          <button 
                            onClick={() => setForm({...form, image: ""})}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      {/* Drag and drop area */}
                      <div 
                        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                          form.image 
                            ? 'border-green-300 bg-green-50' 
                            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-blue-500', 'bg-blue-100');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100');
                          const files = e.dataTransfer.files;
                          if (files.length > 0) {
                            const file = files[0];
                            if (file.type.startsWith('image/')) {
                              const url = URL.createObjectURL(file);
                              setForm({...form, image: url});
                            }
                          }
                        }}
                      >
                        {form.image ? (
                          <div className="relative">
                            <img 
                              src={form.image} 
                              alt="preview" 
                              className="h-16 w-16 object-cover rounded border mx-auto"
                            />
                            <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              ✓
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {form.image.startsWith('blob:') ? 'New image selected' : 'Current image'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-500">
                            <div className="text-sm mb-1">📷</div>
                            <div className="text-xs">Drag image here or click to browse</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1 text-right space-x-1">
                    <button 
                      onClick={handleSave} 
                      disabled={saving}
                      className={`px-3 py-1 rounded text-white font-medium ${
                        saving 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {saving ? (
                        <span className="flex items-center gap-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                          Saving...
                        </span>
                      ) : (
                        'Save'
                      )}
                    </button>
                    <button 
                      onClick={handleCancel} 
                      disabled={saving}
                      className={`px-3 py-1 rounded font-medium ${
                        saving 
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                      }`}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              )}
              
              {superSubjects.map((ss, index) => (
                <tr key={ss.id || `${ss.name}-${index}`} className={`border-b last:border-b-0 transition-all duration-200 ${
                  editing && editing.id === ss.id 
                    ? 'bg-blue-50 border-blue-300 shadow-sm' 
                    : 'hover:bg-gray-50'
                }`}>
                  {editing && editing.id === ss.id ? (
                    // Editing row - show form inputs
                    <>
                      <td className="px-2 py-1">
                        <input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="input input-bordered w-full text-black" />
                      </td>
                      <td className="px-2 py-1">
                        <input value={subjectsInput} onChange={(e)=>setSubjectsInput(e.target.value)} className="input input-bordered w-full text-black" />
                      </td>
                      <td className="px-2 py-1">
                        <input value={authorsInput} onChange={(e)=>setAuthorsInput(e.target.value)} className="input input-bordered w-full text-black" />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={async(e)=>{
                                const file = e.target.files?.[0];
                                if(file){
                                  const url = URL.createObjectURL(file);
                                  setForm({...form, image: url});
                                }
                              }} 
                              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {form.image && (
                              <button 
                                onClick={() => setForm({...form, image: ""})}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          
                          {/* Drag and drop area */}
                          <div 
                            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                              form.image 
                                ? 'border-green-300 bg-green-50' 
                                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.add('border-blue-500', 'bg-blue-100');
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100');
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100');
                              const files = e.dataTransfer.files;
                              if (files.length > 0) {
                                const file = files[0];
                                if (file.type.startsWith('image/')) {
                                  const url = URL.createObjectURL(file);
                                  setForm({...form, image: url});
                                }
                              }
                            }}
                          >
                            {form.image ? (
                              <div className="relative">
                                <img 
                                  src={form.image} 
                                  alt="preview" 
                                  className="h-16 w-16 object-cover rounded border mx-auto"
                                />
                                <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                  ✓
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {form.image.startsWith('blob:') ? 'New image selected' : 'Current image'}
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-500">
                                <div className="text-sm mb-1">📷</div>
                                <div className="text-xs">Drag image here or click to browse</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1 text-right space-x-1">
                        <button 
                          onClick={handleSave} 
                          disabled={saving}
                          className={`px-3 py-1 rounded text-white font-medium ${
                            saving 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {saving ? (
                            <span className="flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                              Saving...
                            </span>
                          ) : (
                            'Save'
                          )}
                        </button>
                        <button 
                          onClick={handleCancel} 
                          disabled={saving}
                          className={`px-3 py-1 rounded font-medium ${
                            saving 
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                          }`}
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    // Normal row - show data
                    <>
                  <td className="px-4 py-2 font-semibold">{ss.name}</td>
                  <td className="px-4 py-2 break-all">{ss.subjects.join(', ')}</td>
                  <td className="px-4 py-2 break-all">{ss.authors.join(', ')}</td>
                      <td className="px-4 py-2">
                        <div className="relative group">
                          <img 
                            src={ss.image||"/images/image.png"} 
                            alt="img" 
                            className="h-10 w-10 object-cover rounded border cursor-pointer hover:scale-110 transition-transform duration-200"
                            onClick={() => {
                              if (ss.image && ss.image !== "/images/image.png") {
                                window.open(ss.image, '_blank');
                              }
                            }}
                          />
                          {ss.image && ss.image !== "/images/image.png" && (
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all duration-200 flex items-center justify-center">
                              <span className="text-white text-xs opacity-0 group-hover:opacity-100">Click to view</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <button 
                          onClick={() => startEdit(ss)} 
                          className="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(ss)}
                          disabled={deletingId=== (ss.id||ss.name)}
                          className={`cursor-pointer ${deletingId=== (ss.id||ss.name) ? 'text-gray-400' : 'text-red-600 hover:text-red-800'}`}
                        >
                          {deletingId=== (ss.id||ss.name) ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      {/* Autocomplete removed as per requirements */}
    </div>
  );
}

// datalists for autocomplete
// eslint-disable-next-line @next/next/no-sync-scripts
export const dynamic = 'force-dynamic'; 