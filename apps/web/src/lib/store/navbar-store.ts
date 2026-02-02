import { create } from "zustand";

interface NavbarState {
  navbarHeight: number;
  setNavbarHeight: (height: number) => void;
}

export const useNavbarStore = create<NavbarState>((set) => ({
  navbarHeight: 0,
  setNavbarHeight: (height) => set({ navbarHeight: height }),
}));
