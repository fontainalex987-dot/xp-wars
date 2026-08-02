import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  useAcceptFriendRequest,
  useCreateDuel,
  useMyDuels,
  useMyFriendRequests,
  useMyFriends,
  useProfile,
  useRejectFriendRequest,
  useRemoveFriend,
  useSearchUsers,
  useSendFriendRequest,
  useAcceptDuel,
  useCancelDuel,
} from "@/lib/store";
import { Search, UserPlus, UserCheck, UserX, Swords, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/friends")({
  component: FriendsPage,
});

function FriendsPage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const [activeTab, setActiveTab] = useState<"search" | "requests" | "friends">("friends");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: friends = [] } = useMyFriends();
  const { data: requests = [] } = useMyFriendRequests();
  const { data: searchResults = [] } = useSearchUsers(searchQuery);
  const { data: myDuels = [] } = useMyDuels();
  const privateDuels = myDuels.filter(
    (d) => !d.groupId && (d.status === "pending" || d.status === "active"),
  );

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const removeFriend = useRemoveFriend();
  const createDuel = useCreateDuel();
  const acceptDuel = useAcceptDuel();
  const cancelDuel = useCancelDuel();


  return (
    <AppShell>
      <div className="px-5 pt-6 pb-4">
        <button
          onClick={() => navigate({ to: "/group" })}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          Retour
        </button>
        <h1 className="text-2xl font-bold">Amis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {friends.length} ami{friends.length > 1 ? "s" : ""} · {requests.length} demande{requests.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="flex p-1 rounded-2xl bg-black/40 ring-1 ring-white/5">
          {(["friends", "requests", "search"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "friends" && `Amis (${friends.length})`}
              {tab === "requests" && `Demandes (${requests.length})`}
              {tab === "search" && "Rechercher"}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: MES AMIS */}
      {activeTab === "friends" && (
        <div className="px-5 space-y-3 pb-8">
          {friends.length === 0 ? (
            <div className="p-6 rounded-2xl bg-card/60 ring-1 ring-white/5 text-center">
              <p className="text-sm text-muted-foreground">Tu n'as pas encore d'amis.</p>
              <p className="text-xs text-zinc-500 mt-1">Va dans l'onglet Rechercher pour en ajouter !</p>
            </div>
          ) : (
            friends.map((f) => {
              const activeDuel = privateDuels.find(
                (d) => d.challengerId === f.id || d.challengedId === f.id
              );

              return (
                <div
                  key={f.id}
                  className="p-4 rounded-2xl bg-card ring-1 ring-white/5 flex items-center gap-3"
                >
                  <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                    {f.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{f.pseudo}</p>
                    <p className="text-xs text-muted-foreground">
                      Niv. {f.level} · {f.totalPoints.toLocaleString()} pts · 🔥 {f.streak}j
                    </p>
                  </div>

                  {activeDuel ? (
                    <span className="text-xs font-bold text-brand bg-brand/10 px-3 py-2 rounded-xl ring-1 ring-brand/20">
                      {activeDuel.status === "pending" ? "En attente" : "En cours"}
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          await createDuel.mutateAsync({ challengedId: f.id });
                          toast.success(`Défi envoyé à ${f.pseudo} !`);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Erreur");
                        }
                      }}
                      disabled={createDuel.isPending}
                      className="flex items-center gap-1 text-xs font-bold text-brand bg-brand/10 px-3 py-2 rounded-xl ring-1 ring-brand/20 active:scale-95 transition-transform disabled:opacity-40"
                    >
                      <Swords className="size-3" />
                      Défier
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      if (!confirm(`Retirer ${f.pseudo} de tes amis ?`)) return;
                      try {
                        await removeFriend.mutateAsync(f.id);
                        toast.success("Ami retiré");
                      } catch {
                        toast.error("Erreur");
                      }
                    }}
                    className="text-zinc-600 hover:text-red-400 transition-colors"
                    title="Retirer"
                  >
                    <UserX className="size-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Duels privés (invisibles pour le groupe) */}
      {activeTab === "friends" && privateDuels.length > 0 && (
        <div className="px-5 pb-8 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Swords className="size-4 text-brand" />
            <h2 className="text-sm font-bold">Duels privés</h2>
          </div>
          <p className="text-[11px] text-zinc-500 mb-2">Visibles uniquement par toi et ton adversaire.</p>
          {privateDuels.map((d) => {
            const isChallenger = d.challengerId === profile?.id;
            const isChallenged = d.challengedId === profile?.id;
            return (
              <div key={d.id} className="p-4 rounded-2xl bg-card ring-1 ring-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand ring-1 ring-brand/20 uppercase">
                    {d.status === "pending" ? "En attente" : "En cours"}
                  </span>
                  <div className="flex items-center gap-2">
                    {d.status === "pending" && isChallenged && (
                      <button
                        onClick={async () => {
                          try {
                            await acceptDuel.mutateAsync(d.id);
                            toast.success("Défi accepté 💪");
                          } catch {
                            toast.error("Erreur");
                          }
                        }}
                        className="text-xs font-bold text-brand bg-brand/10 px-3 py-1 rounded-full ring-1 ring-brand/20 active:scale-95"
                      >
                        Accepter
                      </button>
                    )}
                    {(isChallenger || isChallenged) && (
                      <button
                        onClick={async () => {
                          if (!confirm(d.status === "active" ? "Abandonner ce duel ?" : "Supprimer ce défi ?")) return;
                          try {
                            await cancelDuel.mutateAsync(d.id);
                            toast.success("Défi supprimé");
                          } catch {
                            toast.error("Erreur");
                          }
                        }}
                        className="text-[10px] text-zinc-500 hover:text-red-400"
                      >
                        {d.status === "active" ? "Abandonner" : "Supprimer"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-center">
                    <div className="text-2xl">{d.challengerAvatar}</div>
                    <p className="text-xs font-semibold mt-1 truncate">{d.challengerPseudo}</p>
                    <p className="text-lg font-bold text-brand">{d.challengerPoints}</p>
                  </div>
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">VS</div>
                  <div className="flex-1 text-center">
                    <div className="text-2xl">{d.challengedAvatar}</div>
                    <p className="text-xs font-semibold mt-1 truncate">{d.challengedPseudo}</p>
                    <p className="text-lg font-bold text-brand">{d.challengedPoints}</p>
                  </div>
                </div>
                {d.status === "active" && d.daysLeft > 0 && (
                  <p className="text-[10px] text-muted-foreground text-center mt-2">{d.daysLeft}j restants</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB: DEMANDES */}
      {activeTab === "requests" && (
        <div className="px-5 space-y-3 pb-8">
          {requests.length === 0 ? (
            <div className="p-6 rounded-2xl bg-card/60 ring-1 ring-white/5 text-center">
              <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
            </div>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-card ring-1 ring-white/5 flex items-center gap-3"
              >
                <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                  {r.senderAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.senderPseudo}</p>
                  <p className="text-xs text-muted-foreground">Niv. {r.senderLevel} · veut être ami</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await acceptRequest.mutateAsync(r.id);
                      toast.success(`${r.senderPseudo} est maintenant ton ami !`);
                    } catch {
                      toast.error("Erreur");
                    }
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-xl ring-1 ring-emerald-400/20 active:scale-95"
                >
                  <UserCheck className="size-3" />
                  Accepter
                </button>
                <button
                  onClick={async () => {
                    try {
                      await rejectRequest.mutateAsync(r.id);
                      toast("Demande refusée");
                    } catch {
                      toast.error("Erreur");
                    }
                  }}
                  className="text-xs font-bold text-zinc-500 bg-zinc-800 px-3 py-2 rounded-xl active:scale-95"
                >
                  Refuser
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: RECHERCHER */}
      {activeTab === "search" && (
        <div className="px-5 space-y-3 pb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un joueur..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card ring-1 ring-white/5 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>

          {searchQuery.length < 2 ? (
            <p className="text-center text-xs text-zinc-500 py-8">
              Tape au moins 2 caractères pour rechercher
            </p>
          ) : searchResults.length === 0 ? (
            <p className="text-center text-xs text-zinc-500 py-8">Aucun résultat</p>
          ) : (
            searchResults.map((u) => (
              <div
                key={u.id}
                className="p-4 rounded-2xl bg-card ring-1 ring-white/5 flex items-center gap-3"
              >
                <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                  {u.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{u.pseudo}</p>
                  <p className="text-xs text-muted-foreground">Niv. {u.level}</p>
                </div>

                {u.isFriend ? (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-xl ring-1 ring-emerald-400/20">
                    <UserCheck className="size-3 inline mr-1" />
                    Ami
                  </span>
                ) : u.requestSent ? (
                  <span className="text-xs text-zinc-500 px-3 py-2">Demande envoyée</span>
                ) : u.requestReceived ? (
                  <span className="text-xs text-brand px-3 py-2">Demande reçue</span>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        await sendRequest.mutateAsync(u.id);
                        toast.success(`Demande envoyée à ${u.pseudo} !`);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Erreur");
                      }
                    }}
                    disabled={sendRequest.isPending}
                    className="flex items-center gap-1 text-xs font-bold text-brand bg-brand/10 px-3 py-2 rounded-xl ring-1 ring-brand/20 active:scale-95 disabled:opacity-40"
                  >
                    <UserPlus className="size-3" />
                    Ajouter
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </AppShell>
  );
}
