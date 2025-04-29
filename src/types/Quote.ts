export interface Quote {
  id: string;
  author: string;
  quoteText: string;
  subjects: string[];
  authorLink?: string;
  contributedBy?: string;
  videoLink?: string;
  createdAt?: string;
} 