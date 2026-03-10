import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Todo + Kanban",
    short_name: "Todo Kanban",
    description: "Todo and Kanban with daily morning email",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#4f46e5",
  };
}
