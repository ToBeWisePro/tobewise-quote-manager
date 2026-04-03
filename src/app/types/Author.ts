export interface Author {
  id: string;
  name: string;
  profile_url?: string;
  imageSource?: "upload" | "external_url" | "wikipedia" | "ai_discovery";
  imageOriginalUrl?: string;
  imageCropX?: number;
  imageCropY?: number;
  imageCropZoom?: number;
  description?: string;
  amazonPage?: string;
  amazonAffiliate?: string;
  createdAt?: string;
  updatedAt?: string;
}
