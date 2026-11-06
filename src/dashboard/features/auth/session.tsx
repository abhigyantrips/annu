import { Brand } from "@/components/brand";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Login } from "./login";
export function Session() {
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api("/api/session"),
    retry: false,
    staleTime: Infinity,
  });
  useEffect(() => {
    const unauthorized = () => {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "session",
      });
      queryClient.setQueryData(["session"], false);
    };
    window.addEventListener("annu:unauthorized", unauthorized);
    return () => window.removeEventListener("annu:unauthorized", unauthorized);
  }, []);
  if (session.isPending)
    return (
      <div className="splash">
        <Brand />
        <Loader2 className="spin" size={20} />
      </div>
    );
  if (session.isError || session.data === false)
    return (
      <Login
        onLogin={() => {
          queryClient.removeQueries({
            predicate: (query) => query.queryKey[0] !== "session",
          });
          queryClient.setQueryData(["session"], true);
        }}
      />
    );
  return <Outlet />;
}
export async function logout() {
  await api("/api/logout", {});
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "session",
  });
  queryClient.setQueryData(["session"], false);
}
