import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "Boardo", short_name: "Boardo", description: "Your day, with intention", start_url: "/dashboard", display: "standalone", background_color: "#f5f4ef", theme_color: "#235741" }; }
