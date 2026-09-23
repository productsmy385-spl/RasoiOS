"use client";

import { useEffect, useState, useTransition } from "react";
import { SocialChannel, SocialPostStatus } from "@prisma/client";
import {
  createSocialPostAction,
  getSocialPostsAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, RefreshCw, Link2 } from "lucide-react";

interface SocialPostData {
  id: string;
  caption: string;
  channel: SocialChannel;
  shareUrl: string;
  status: SocialPostStatus;
  postedUrl: string | null;
  createdAt: string;
}

const CHANNEL_LABELS: Record<SocialChannel, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  OTHER: "Other",
};

function statusVariant(status: SocialPostStatus): "success" | "warning" | "outline" {
  if (status === "MARKED_POSTED") return "success";
  if (status === "READY") return "warning";
  return "outline";
}

export default function SocialMarketingPage() {
  const [posts, setPosts] = useState<SocialPostData[]>([]);
  const [caption, setCaption] = useState("");
  const [channel, setChannel] = useState<SocialChannel>(SocialChannel.INSTAGRAM);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function fetchPosts() {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const res = await getSocialPostsAction();
        if (res.ok) {
          setPosts(res.data);
        } else {
          setErrorMsg(res.error.message);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load social posts");
      } finally {
        setIsLoading(false);
      }
    });
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await createSocialPostAction({
        caption: caption.trim(),
        channel,
      });

      if (res.ok) {
        setSuccessMsg("Draft saved. Share it from your own account when ready.");
        setCaption("");
        fetchPosts();
      } else {
        setErrorMsg(res.error.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create social post");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-action-primary/10 text-fg-accent rounded-2xl border border-action-primary/20">
            <Share2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-fg-primary">
              Social Sharing
            </h1>
            <p className="text-xs text-fg-secondary">
              Draft captions for your menu and share them from your own social accounts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={fetchPosts}
            disabled={isLoading || isPending}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-status-danger/40 text-status-danger border border-status-danger/30 rounded-xl text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-status-danger hover:text-fg-primary">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-status-success/40 text-status-success border border-status-success/30 rounded-xl text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-status-success hover:text-fg-primary">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Composer Form */}
        <Card className="p-6 space-y-4 bg-card border-border-subtle lg:col-span-1 h-fit">
          <h2 className="text-lg font-bold font-display text-fg-primary border-b border-border-subtle pb-3">
            New Caption
          </h2>

          <form onSubmit={handleCreatePost} className="space-y-4">
            <div>
              <label htmlFor="social-caption" className="text-xs text-fg-secondary">Caption *</label>
              <textarea
                id="social-caption"
                required
                rows={4}
                maxLength={2200}
                placeholder="Today's special: Tandoori Murgh Makhani. See the full menu at the link."
                className="w-full mt-1 p-3 bg-canvas border border-border-subtle rounded-xl text-xs text-fg-primary focus:outline-none focus:border-action-primary"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="social-channel" className="text-xs text-fg-secondary">Intended channel</label>
              <select
                id="social-channel"
                className="w-full mt-1 p-2.5 bg-canvas border border-border-subtle rounded-xl text-xs text-fg-primary focus:outline-none focus:border-action-primary"
                value={channel}
                onChange={(e) => setChannel(e.target.value as SocialChannel)}
              >
                {Object.values(SocialChannel).map((value) => (
                  <option key={value} value={value}>
                    {CHANNEL_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              className="w-full py-2.5 font-bold"
            >
              {isSubmitting ? "Saving..." : "Save Draft"}
            </Button>
          </form>
        </Card>

        {/* Posts List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold font-display text-fg-primary border-b border-border-subtle pb-3">
            Drafts and Shared Posts ({posts.length})
          </h2>

          {isLoading && posts.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 text-fg-accent animate-spin mx-auto" />
              <p className="text-sm text-fg-secondary">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-12 text-center space-y-3 bg-card border-border-subtle">
              <Share2 className="w-10 h-10 text-fg-secondary mx-auto" />
              <h3 className="text-base font-semibold text-fg-primary">No posts yet</h3>
              <p className="text-xs text-fg-secondary">
                Write a caption for today&apos;s menu to get started.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className="p-5 space-y-3 bg-card border-border-subtle"
                >
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(post.status)}>
                        {post.status.replace("_", " ")}
                      </Badge>
                      <span className="text-caption tabular-nums text-fg-secondary">
                        {CHANNEL_LABELS[post.channel]} • {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <a
                      href={post.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-fg-accent flex items-center gap-1 tabular-nums hover:underline"
                    >
                      <Link2 className="w-3.5 h-3.5" /> {post.shareUrl}
                    </a>
                  </div>

                  <p className="text-sm text-fg-primary leading-relaxed whitespace-pre-wrap">
                    {post.caption}
                  </p>

                  {post.postedUrl && (
                    <a
                      href={post.postedUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-xs text-fg-secondary hover:text-fg-primary underline"
                    >
                      View shared post
                    </a>
                  )}

                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                    <span className="text-caption text-fg-secondary tabular-nums">
                      ID: {post.id.slice(0, 8)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
