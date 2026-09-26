import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, EyeOff } from "lucide-react";
import { auth } from "@/lib/auth";
import { getPostView, isBanned } from "@/lib/services/community";
import { KIND_LABELS } from "@/lib/community/rules";
import { timeAgo } from "@/lib/notifications/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AcceptButton, CommentForm, DeleteButton, LikeButton, PinButton, ReportButton } from "@/components/community/controls";

export const metadata = { title: "Community — BanglaEnglish" };

function Author({ name, badge }: { name: string; badge: string | null }) {
  return (
    <span className="text-sm font-medium text-ink">
      {name}
      {badge && <span className="ml-1.5 rounded bg-success-soft px-1.5 py-0.5 text-[10px] font-medium text-success">{badge}</span>}
    </span>
  );
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user as any;
  // A hidden post is visible only to its author and to moderators; anyone else gets a 404.
  const view = getPostView({ id: user.id, role: user.role }, id);
  if (!view) notFound();
  const { post, author, comments, category } = view;
  const restricted = isBanned(user.id);
  const isAuthor = post.authorId === user.id;
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link href="/dashboard/community" className="text-sm text-ink-soft hover:text-ink">
        ← Community
      </Link>

      {post.status === "HIDDEN" && (
        <Card className="flex items-start gap-2 border-danger/40 bg-danger-soft/40 p-4 text-sm text-ink" data-testid="hidden-notice">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p>This post is hidden from other members while a moderator checks it.</p>
        </Card>
      )}

      <Card className="p-5" data-testid="post">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <Badge tone={post.kind === "QUESTION" ? "primary" : "neutral"}>{KIND_LABELS[post.kind]}</Badge>
          {category && <Badge tone="accent">{category.name}</Badge>}
          {post.acceptedCommentId && (
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" /> Answered
            </Badge>
          )}
          <Author name={author.name} badge={author.badge} />
          <span>· {timeAgo(post.createdAt)}</span>
        </div>
        <h1 className="mt-2 font-display text-2xl text-ink">{post.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">{post.body}</p>
        {(post.tags ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(post.tags ?? []).map((t) => (
              <Link key={t} href={`/dashboard/community?tag=${encodeURIComponent(t)}`} className="text-xs text-primary hover:underline">
                #{t}
              </Link>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3">
          <LikeButton targetType="POST" targetId={post.id} count={view.likes} liked={view.liked} disabled={isAuthor || restricted || post.status === "HIDDEN"} />
          {isAuthor || isAdmin ? <DeleteButton kind="post" id={post.id} afterDelete="/dashboard/community" /> : <ReportButton targetType="POST" targetId={post.id} reported={view.reported} />}
          {isAdmin && <PinButton postId={post.id} pinned={post.pinned} />}
        </div>
      </Card>

      <section className="flex flex-col gap-3" aria-label="Replies">
        <h2 className="font-display text-lg text-ink">
          {comments.length} repl{comments.length === 1 ? "y" : "ies"}
        </h2>
        <div className="flex flex-col gap-3" data-testid="comments">
          {comments.map(({ comment, author: ca, likes, liked, reported, accepted }) => (
            <Card key={comment.id} className={accepted ? "border-success/50 p-4" : "p-4"} data-accepted={accepted || undefined}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                <Author name={ca.name} badge={ca.badge} />
                <span>· {timeAgo(comment.createdAt)}</span>
                {accepted && (
                  <Badge tone="success">
                    <CheckCircle2 className="h-3 w-3" /> Accepted answer
                  </Badge>
                )}
                {comment.status === "HIDDEN" && <Badge tone="danger">Hidden</Badge>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{comment.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <LikeButton targetType="COMMENT" targetId={comment.id} count={likes} liked={liked} disabled={comment.authorId === user.id || restricted || comment.status === "HIDDEN"} />
                {view.mayAccept && comment.status === "PUBLISHED" && <AcceptButton postId={post.id} commentId={comment.id} accepted={accepted} />}
                {comment.authorId === user.id || isAdmin ? <DeleteButton kind="comment" id={comment.id} /> : <ReportButton targetType="COMMENT" targetId={comment.id} reported={reported} />}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {post.status === "PUBLISHED" &&
        (restricted ? (
          <Card className="p-4 text-sm text-ink-soft">Your account can read the community but can&apos;t reply right now.</Card>
        ) : (
          <Card className="p-5">
            <h2 className="mb-3 font-display text-lg text-ink">Your reply</h2>
            <CommentForm postId={post.id} />
          </Card>
        ))}
    </div>
  );
}
