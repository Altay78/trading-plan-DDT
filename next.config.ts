import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Garde l'indicateur de dev hors de la barre d'onglets du bas
  devIndicators: {
    position: "top-right",
  },
};

export default nextConfig;
