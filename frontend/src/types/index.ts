export type Theme = 'light' | 'dark';

export type ProviderCategory = 'chat' | 'image' | 'segmentation';

export type ProviderStatus = 'available' | 'quota-exhausted' | 'unavailable' | 'not-configured';

export interface ProviderQuota {
  name: string;
  model: string;
  category: ProviderCategory;
  dailyRequests: number;
  dailyImages: number;
  usageUnits: number;
  rateLimitPerMinute?: number;
  dailyResetTime?: string; // ISO
  quotaRemaining?: number | null;
  quotaRemainingLabel?: string; // e.g. "estimated"
  available: boolean;
  lastSuccess?: string;
  lastError?: string | null;
  estimatedDailyImageCapacity?: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string; // mime
  size: number;
  dataUrl: string; // preview
  kind: 'image' | 'document';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  imageUrl?: string; // generated/edited image result
  inputImageUrl?: string; // attached reference image
  attachments?: Attachment[];
  editingOps?: any; // structured operations applied
  versionOf?: string; // parent message id (for version history)
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface ImageVersion {
  id: string;
  messageId: string;
  url: string;
  createdAt: string;
  label: string; // e.g. "Original", "After background change"
  isManual?: boolean;
}

export interface Project {
  id: string;
  name: string;
  type: 'passport' | 'editor' | 'background' | 'chat';
  createdAt: string;
  updatedAt: string;
  originalImageUrl?: string;
  currentImageUrl?: string;
  versions: ImageVersion[];
  conversationId?: string;
  exportHistory: Array<{ format: string; createdAt: string }>;
}

export interface ManualAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  temperature: number;
  tint: number;
  sharpness: number;
  highlights: number;
  shadows: number;
}

export interface CropState {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'percent' | 'px';
}

export interface TransformState {
  rotate: number; // degrees
  flipH: boolean;
  flipV: boolean;
  resizeWidth?: number;
  resizeHeight?: number;
}

export interface EditorState {
  adjustments: ManualAdjustments;
  crop: CropState;
  transform: TransformState;
  historyIndex: number;
  history: string[]; // data URLs
}

export interface PassportSettings {
  sheetWidthIn: number; // 6
  sheetHeightIn: number; // 4
  dpi: number; // 300
  copies: number; // 8
  cols: number; // 4
  rows: number; // 2
  orientation: 'landscape' | 'portrait';
  backgroundColor: string; // light blue
  border: boolean;
  borderColor: string;
  borderWidthPx: number;
  gapPx: number;
  photoWidthIn: number;
  photoHeightIn: number;
}

export interface UsageSnapshot {
  date: string;
  chatRequests: number;
  imageGenerations: number;
  imageEdits: number;
  segmentations: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
}
