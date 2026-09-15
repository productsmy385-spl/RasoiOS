"use client";

import { useEffect, useState, useTransition } from "react";
import { SocialPostStatus } from "@prisma/client";
import {
  createSocialPostAction,
  getSocialPostsAction,
  updateSocialPostStatusAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Share2, Calendar, Send, Image, RefreshCw, CheckCircle, Clock } from "lucide-react";

interface SocialPostData {
  id: string;
  content: string;
  mediaUrl: string | null;
  status: SocialPostStatus;
  scheduledAt: string | null;
  createdAt: string | Date;
}

export default function SocialMarketingPage() {
  const [posts, setPosts] = useState<SocialPostData[]>([]);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

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
        if (res.success) {
          setPosts(res.posts as any);
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
    if (!content.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await createSocialPostAction({
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
        scheduledAt: scheduledAt || undefined,
      });

      if (res.success) {
        setSuccessMsg("Promotional social post created successfully!");
        setContent("");
        setImageUrl("");
        setScheduledAt("");
        fetchPosts();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create social post");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(postId: string, status: SocialPostStatus) {
    try {
      setErrorMsg(null);
      const res = await updateSocialPostStatusAction(postId, status);
      if (res.success) {
        setSuccessMsg(`Post status updated to ${status}`);
        fetchPosts();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update post status");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3D3732] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Share2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-[#F3F1EE]">
              Social Marketing & Promo Sharing
            </h1>
            <p className="text-xs text-[#A8A29E]">
              Compose daily menu cards, special offer announcements, and social campaigns
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
        <div className="p-4 bg-red-950/40 text-red-400 border border-red-500/30 rounded-xl text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Composer Form */}
        <Card className="p-6 space-y-4 bg-[#24201D] border-[#3D3732] lg:col-span-1 h-fit">
          <h2 className="text-lg font-bold font-display text-white border-b border-[#3D3732] pb-3">
            Compose New Announcement
          </h2>

          <form onSubmit={handleCreatePost} className="space-y-4">
            <div>
              <label className="text-xs text-[#A8A29E]">Post Content / Offer Details *</label>
              <textarea
                required
                rows={4}
                placeholder="e.g. 🌟 Chef's Daily Special: Tandoori Murgh Makhani is served today! Enjoy 10% off on all dine-in orders!"
                className="w-full mt-1 p-3 bg-[#1A1715] border border-[#3D3732] rounded-xl text-xs text-[#F3F1EE] focus:outline-none focus:border-amber-500"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-[#A8A29E]">Banner Image URL (Optional)</label>
              <Input
                placeholder="https://images.unsplash.com/photo-..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-[#A8A29E]">Schedule Date & Time (Optional)</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              className="w-full py-2.5 font-bold"
            >
              {isSubmitting ? "Creating Post..." : "Create Promo Post"}
            </Button>
          </form>
        </Card>

        {/* Posts List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold font-display text-white border-b border-[#3D3732] pb-3">
            Promotional Posts Campaign Log ({posts.length})
          </h2>

          {isLoading && posts.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-sm text-[#A8A29E]">Loading social posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-12 text-center space-y-3 bg-[#24201D] border-[#3D3732]">
              <Share2 className="w-10 h-10 text-[#A8A29E] mx-auto" />
              <h3 className="text-base font-semibold text-[#F3F1EE]">No Marketing Posts</h3>
              <p className="text-xs text-[#A8A29E]">
                Compose your first promotional daily announcement to share across social channels.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className="p-5 space-y-3 bg-[#24201D] border-[#3D3732]"
                >
                  <div className="flex items-center justify-between border-b border-[#3D3732] pb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          post.status === "PUBLISHED"
                            ? "success"
                            : post.status === "SCHEDULED"
                            ? "warning"
                            : "outline"
                        }
                      >
                        {post.status}
                      </Badge>
                      <span className="text-[11px] font-mono text-[#A8A29E]">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {post.scheduledAt && (
                      <span className="text-xs text-amber-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" /> Scheduled for:{" "}
                        {new Date(post.scheduledAt).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-[#F3F1EE] leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {post.mediaUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.mediaUrl}
                      alt="Social Banner"
                      className="w-full max-h-48 object-cover rounded-xl border border-[#3D3732]"
                    />
                  )}

                  <div className="pt-2 border-t border-[#3D3732] flex items-center justify-between">
                    <span className="text-[10px] text-[#A8A29E] font-mono">
                      ID: {post.id.slice(0, 8)}
                    </span>

                    <div className="flex items-center gap-2">
                      {post.status !== "PUBLISHED" && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="bg-emerald-600 hover:bg-emerald-500"
                          onClick={() => handleStatusChange(post.id, SocialPostStatus.PUBLISHED)}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" /> Publish Now
                        </Button>
                      )}
                    </div>
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
