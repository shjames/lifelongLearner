import Image from "next/image";

export default function Home() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold">Lifelong Learner</h1>
      <p className="mt-3 text-zinc-600">一个同时记录开发笔记、个人日记、生活随笔与观点的博客。</p>
      <div className="mt-6">
        <a href="/blog" className="inline-block rounded bg-black px-4 py-2 text-white hover:bg-zinc-800">进入博客</a>
      </div>
    </section>
  );
}
