export interface Quote {
  id: string;
  author: string;
  quoteText: string;
  subjects: string[];
  createdAt?: string;
  authorLink?: string;
  contributedBy?: string;
  videoLink?: string;
} 