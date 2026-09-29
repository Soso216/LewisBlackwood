export type PetAnimationState = 'idle' | 'walk' | 'pet' | 'talk' | 'sleep' | 'pout' | 'work';

export interface PetAnimationSlot {
  id: PetAnimationState;
  label: string;
  description: string;
  defaultIconName: string;
  samplePrompt: string;
}

export interface PetConfig {
  enabled: boolean;
  screenMode: 'fullscreen' | 'window';
  behavior: 'wander' | 'follow' | 'still';
  size: 'sm' | 'md' | 'lg';
  customScale: number; // 0.8 to 2.0
  soundEnabled: boolean;
  speechBubblesEnabled: boolean;
  speed: number;
  affectionLevel: number;
  totalPets: number;
  animations: Partial<Record<PetAnimationState, string>>;
  allowPeripheralControl?: boolean;
  notificationsEnabled?: boolean;
  notificationInterval?: number; // In seconds
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  parts: any[];
  sources?: any[];
}
