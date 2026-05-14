import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Writing on fractional CFOs, AI agents, and the financial operating system for creative agencies.",
  openGraph: { images: [{ url: "/og?title=Blog" }] },
};

const POSTS = [
  {
    slug: "why-our-cfo-has-a-name",
    title: "Why our CFO has a name",
    date: "May 12, 2026",
    description:
      "On the decision to build a persona instead of a feature — and why that distinction matters more than it looks.",
    readTime: "5 min",
  },
  {
    slug: "building-a-tool-for-other-ais",
    title: "What it means to build a tool for other AIs to use",
    date: "May 14, 2026",
    description:
      "Margot is callable by other agents. Here is how we thought about what that means for trust, pricing, and distribution.",
    readTime: "7 min",
  },
];

export default function BlogIndexPage() {
  return (
    <>
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12">
        <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-4">
          Blog
        </p>
        <h1
          className="text-5xl font-light text-stone-900 mb-12"
          style={{ fontFamily: "var(--font-newsreader)" }}
        >
          Writing.
        </h1>

        <div className="divide-y divide-stone-200">
          {POSTS.map((post) => (
            <article key={post.slug} className="py-8">
              <div className="flex items-center gap-3 text-xs text-stone-400 mb-2">
                <time>{post.date}</time>
                <span>·</span>
                <span>{post.readTime} read</span>
              </div>
              <h2
                className="text-2xl font-light text-stone-900 mb-2 leading-snug"
                style={{ fontFamily: "var(--font-newsreader)" }}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:underline decoration-stone-300"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-3">
                {post.description}
              </p>
              <Link
                href={`/blog/${post.slug}`}
                className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
              >
                Read →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
